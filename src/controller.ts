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
        this.llm = new LocalLLMClient('http://localhost:11434', 'gemma3:1b');
        this.patcher = new Patcher();
        this.verifier = new Verifier();
    }

    public async startRepair(document: vscode.TextDocument) {
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
        let runResult = await this.runner.runScript(command, [filePath]);

        // Collect Diagnostics
        let staticDiags = this.diagnostics.getStaticDiagnostics(document.uri);
        let runtimeTrace = this.diagnostics.parseRuntimeError(runResult.stderr);

        let profile = {
            staticDiagnostics: staticDiags,
            runtimeError: runtimeTrace,
            stderr: runResult.stderr
        };

        // Analyze
        let errorSignal = this.analyzer.analyze(profile);

        if (errorSignal.confidence < 0.5 && !runResult.stderr) {
            vscode.window.showInformationMessage('DevForge: No significant errors detected.');
            return;
        }

        let attempts = 0;
        const MAX_ATTEMPTS = 3;
        let previousErrors = '';
        let currentCode = document.getText();

        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            vscode.window.showInformationMessage(`DevForge: Attempt ${attempts}/${MAX_ATTEMPTS}...`);

            // LLM Prompt
            const errorDesc = JSON.stringify(errorSignal, null, 2) + "\n\nStderr:\n" + runResult.stderr;
            const prompt = PromptBuilder.buildExplainAndPatch(filePath, languageId, currentCode, errorDesc, previousErrors);

            try {
                vscode.window.showInformationMessage('DevForge: Consulting Local LLM...');
                const llmResponse = await this.llm.generate(prompt, SYSTEM_PROMPT);

                // Parse JSON
                let jsonStr = llmResponse.content.replace(/```json/g, '').replace(/```/g, '').trim();
                const suggestion = JSON.parse(jsonStr);

                // Ask user only on first attempt
                if (attempts === 1) {
                    const choice = await vscode.window.showInformationMessage(
                        `Suggested Fix: ${suggestion.explanation}`,
                        'Apply & Repair',
                        'Cancel'
                    );
                    if (choice !== 'Apply & Repair') return;
                }

                // Apply
                let patchedCode = suggestion.patchedCode;
                console.log('[DevForge] Raw LLM Output:', JSON.stringify(patchedCode));

                // Clean markdown
                patchedCode = patchedCode.replace(/^```[\w-]*\s*$/gm, '');
                patchedCode = patchedCode.replace(/^```\s*$/gm, '');
                patchedCode = patchedCode.replace(/^(python|javascript|typescript)\s*$/i, '');
                patchedCode = patchedCode.trim();
                console.log('[DevForge] Cleaned Code:', JSON.stringify(patchedCode));

                const tempFile = await this.patcher.savePatchedFile(filePath, patchedCode);

                // Verify
                vscode.window.showInformationMessage('DevForge: Verifying fix...');
                const verifyResult = await this.verifier.verify(tempFile, command);

                if (verifyResult.success) {
                    vscode.window.showInformationMessage('DevForge: Fix Verified! Applying to original file...');

                    const edit = new vscode.WorkspaceEdit();
                    const newContent = await import('fs').then(fs => fs.promises.readFile(tempFile, 'utf8'));
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    edit.replace(document.uri, fullRange, newContent);
                    await vscode.workspace.applyEdit(edit);

                    await this.verifier.cleanup(tempFile);
                    return; // Success!
                } else {
                    // Verification Failed
                    previousErrors += `\nAttempt ${attempts} Failed:\n${verifyResult.message}\n`;

                    // Update context for next loop
                    currentCode = patchedCode;
                    runResult = { stdout: verifyResult.stdout, stderr: verifyResult.stderr, exitCode: 1, timedOut: false };

                    // Re-analyze
                    runtimeTrace = this.diagnostics.parseRuntimeError(runResult.stderr);
                    profile = {
                        staticDiagnostics: [],
                        runtimeError: runtimeTrace,
                        stderr: runResult.stderr
                    };
                    errorSignal = this.analyzer.analyze(profile);

                    await this.verifier.cleanup(tempFile);

                    if (attempts === MAX_ATTEMPTS) {
                        vscode.window.showErrorMessage(`DevForge: Failed to repair after ${MAX_ATTEMPTS} attempts.`);
                    }
                }

            } catch (err: any) {
                vscode.window.showErrorMessage(`DevForge Error: ${err.message}`);
                break;
            }
        }
    }
}
