import * as cp from 'child_process';
import * as path from 'path';

export interface RunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
}

export interface RunOptions {
    timeout?: number; // milliseconds
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}

export class Runner {
    /**
     * Runs a script in a subprocess with a timeout.
     * @param command The command to run (e.g., 'python', 'node')
     * @param args Arguments for the command (e.g., script path)
     * @param options Execution options
     */
    public async runScript(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
        return new Promise((resolve) => {
            const timeout = options.timeout || 5000; // Default 5s timeout
            let timedOut = false;

            const child = cp.spawn(command, args, {
                cwd: options.cwd || path.dirname(args[0]) || process.cwd(),
                env: options.env || process.env,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }

            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            const timer = setTimeout(() => {
                timedOut = true;
                child.kill(); // Default SIGTERM
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timer);
                resolve({
                    stdout,
                    stderr,
                    exitCode: code,
                    timedOut
                });
            });

            child.on('error', (err) => {
                clearTimeout(timer);
                resolve({
                    stdout,
                    stderr: stderr + `\nExecution error: ${err.message}`,
                    exitCode: -1,
                    timedOut
                });
            });
        });
    }
}
