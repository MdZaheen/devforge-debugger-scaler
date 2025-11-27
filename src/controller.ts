import * as vscode from 'vscode';
import { Runner } from './runner';
import { DiagnosticsCollector } from './diagnostics';
import { Analyzer } from './analyzer';
import { LocalLLMClient } from './llm/client';
import { PromptBuilder, SYSTEM_PROMPT } from './llm/prompts';
import { Patcher } from './patcher';
import { Verifier } from './verifier';

export class RepairController {
    private runner: Runner;
    private diagnostics: DiagnosticsCollector;
    private analyzer: Analyzer;
    private llm: LocalLLMClient;
    private patcher: Patcher;
    private verifier: Verifier;

    constructor() {
        this.runner = new Runner();
        this.diagnostics = new DiagnosticsCollector();
        this.analyzer = new Analyzer();
        this.llm = new LocalLLMClient(); // Default to localhost:11434
        this.patcher = new Patcher();
        this.verifier = new Verifier();
    }

    public async startRepair(document: vscode.TextDocument) {
        // 1. Run the buggy code to get initial trace
        // For MVP, assume it's a script we can run with 'python' or 'node' based on extension
        const filePath = document.fileName;
        const languageId = document.languageId;
        let command = '';

        if (languageId === 'python') command = 'python';
        else if (languageId === 'javascript') command = 'node';
        else {
            vscode.window.showErrorMessage(`Unsupported language: ${languageId}`);
            return;
        }

        vscode.window.showInformationMessage(`DevForge: Analyzing ${filePath}...`);

        // Initial Run
        const runResult = await this.runner.runScript(command, [filePath]);

        // Collect Diagnostics
        const staticDiags = this.diagnostics.getStaticDiagnostics(document.uri);
        const runtimeTrace = this.diagnostics.parseRuntimeError(runResult.stderr);

        const profile = {
            staticDiagnostics: staticDiags,
            runtimeError: runtimeTrace,
            stderr: runResult.stderr
        };

        // Analyze
        const errorSignal = this.analyzer.analyze(profile);

        if (errorSignal.confidence < 0.5 && !runResult.stderr) {
            vscode.window.showInformationMessage('DevForge: No significant errors detected.');
            return;
        }

        // LLM Prompt
        const code = document.getText();
        const errorDesc = JSON.stringify(errorSignal, null, 2) + "\n\nStderr:\n" + runResult.stderr;
        const prompt = PromptBuilder.buildExplainAndPatch(filePath, languageId, code, errorDesc);

        try {
            vscode.window.showInformationMessage('DevForge: Consulting Local LLM...');
            const llmResponse = await this.llm.generate(prompt, SYSTEM_PROMPT);

            // Parse JSON
            // LLM might wrap JSON in markdown blocks, clean it
            let jsonStr = llmResponse.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const suggestion = JSON.parse(jsonStr);

            // Show suggestion (in future: Webview)
            const choice = await vscode.window.showInformationMessage(
                `Suggested Fix: ${suggestion.explanation}`,
                'Apply Patch',
                'Cancel'
            );

            if (choice === 'Apply Patch') {
                // Apply
                const tempFile = await this.patcher.applyToTempFile(filePath, suggestion.diff);

                // Verify
                vscode.window.showInformationMessage('DevForge: Verifying fix...');
                const verifyResult = await this.verifier.verify(tempFile, command);

                if (verifyResult.success) {
                    vscode.window.showInformationMessage('DevForge: Fix Verified! Applying to original file...');
                    // Apply to original document via WorkspaceEdit to support Undo
                    const edit = new vscode.WorkspaceEdit();
                    // We need to calculate the edits from the diff, but Patcher.applyPatch returns full content.
                    // For MVP, we'll replace the whole file content.
                    const newContent = await import('fs').then(fs => fs.promises.readFile(tempFile, 'utf8'));
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    edit.replace(document.uri, fullRange, newContent);
                    await vscode.workspace.applyEdit(edit);
                } else {
                    vscode.window.showErrorMessage(`DevForge: Verification Failed. ${verifyResult.message}`);
                }

                // Cleanup
                await this.verifier.cleanup(tempFile);
            }

        } catch (err: any) {
            vscode.window.showErrorMessage(`DevForge Error: ${err.message}`);
        }
    }
}
