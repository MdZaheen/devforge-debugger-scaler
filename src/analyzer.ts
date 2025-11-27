import { DiagnosticProfile } from './diagnostics';

export interface ErrorSignal {
    type: string; // e.g., 'ZeroDivisionError', 'SyntaxError'
    message: string;
    line: number;
    file: string;
    confidence: number; // 0.0 to 1.0
    context?: string;
}

export class Analyzer {
    public analyze(profile: DiagnosticProfile): ErrorSignal {
        // Priority 1: Runtime Error
        if (profile.runtimeError) {
            return this.analyzeRuntimeError(profile.runtimeError);
        }

        // Priority 2: Static Diagnostics
        if (profile.staticDiagnostics.length > 0) {
            return this.analyzeStaticDiagnostics(profile.staticDiagnostics);
        }

        return {
            type: 'Unknown',
            message: 'No clear error detected.',
            line: 0,
            file: '',
            confidence: 0.0
        };
    }

    private analyzeRuntimeError(trace: { file: string; line: number; message: string }): ErrorSignal {
        const parts = trace.message.split(':');
        const errorType = parts[0].trim();
        const msg = parts.slice(1).join(':').trim();

        return {
            type: errorType,
            message: msg || trace.message,
            line: trace.line,
            file: trace.file,
            confidence: 1.0
        };
    }

    private analyzeStaticDiagnostics(diagnostics: any[]): ErrorSignal {
        // Take the first error
        const diag = diagnostics[0];
        return {
            type: 'StaticAnalysisError',
            message: diag.message,
            line: diag.range.start.line + 1, // VS Code is 0-indexed
            file: 'current', // Context dependent
            confidence: 0.8
        };
    }
}
