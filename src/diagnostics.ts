import * as vscode from 'vscode';

export interface RuntimeTrace {
    file: string;
    line: number;
    message: string;
    raw: string;
}

export interface DiagnosticProfile {
    staticDiagnostics: vscode.Diagnostic[];
    runtimeError?: RuntimeTrace;
    stderr: string;
}

export class DiagnosticsCollector {
    /**
     * Collects static diagnostics for a given file uri.
     */
    public getStaticDiagnostics(uri: vscode.Uri): vscode.Diagnostic[] {
        return vscode.languages.getDiagnostics(uri);
    }

    /**
     * Parses stderr to find the last error trace.
     * Currently supports Python-style tracebacks.
     */
    public parseRuntimeError(stderr: string): RuntimeTrace | undefined {
        // Simple regex for Python tracebacks:
        // File "path/to/file.py", line 10, in <module>
        // ErrorType: Message

        const lines = stderr.split('\n');
        let lastFile = '';
        let lastLine = -1;
        let errorMessage = '';

        const fileLineRegex = /File "(.*?)", line (\d+)/;

        // Scan for the last "File ..." line which usually indicates the location of the error in user code
        for (const line of lines) {
            const match = line.match(fileLineRegex);
            if (match) {
                lastFile = match[1];
                lastLine = parseInt(match[2], 10);
            }
        }

        // The last line of the traceback is usually the error message
        // We'll grab the last non-empty line
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().length > 0) {
                errorMessage = lines[i].trim();
                break;
            }
        }

        if (lastLine !== -1 && errorMessage) {
            return {
                file: lastFile,
                line: lastLine,
                message: errorMessage,
                raw: stderr
            };
        }

        return undefined;
    }
}
