import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class Reporter {
    private traceDir: string;
    private events: any[] = [];

    constructor(workspaceRoot: string) {
        this.traceDir = path.join(workspaceRoot, '.devforge');
        if (!fs.existsSync(this.traceDir)) {
            fs.mkdirSync(this.traceDir, { recursive: true });
        }
    }

    public logEvent(type: string, data: any) {
        this.events.push({
            timestamp: new Date().toISOString(),
            type,
            data
        });
    }

    public async exportTrace() {
        const traceFile = path.join(this.traceDir, `repair_trace_${Date.now()}.json`);
        await fs.promises.writeFile(traceFile, JSON.stringify(this.events, null, 2), 'utf8');
        vscode.window.showInformationMessage(`DevForge: Trace exported to ${traceFile}`);
    }
}
