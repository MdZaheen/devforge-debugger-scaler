import { Runner } from './runner';
import * as fs from 'fs';

export interface VerificationResult {
    success: boolean;
    stdout: string;
    stderr: string;
    message: string;
}

export class Verifier {
    private runner: Runner;

    constructor() {
        this.runner = new Runner();
    }

    /**
     * Verifies a patched file by running it.
     * @param filePath Path to the patched file
     * @param command Command to run (e.g. 'python')
     */
    public async verify(filePath: string, command: string): Promise<VerificationResult> {
        // Basic syntax check could go here

        // Run the file
        const result = await this.runner.runScript(command, [filePath]);

        if (result.exitCode === 0) {
            return {
                success: true,
                stdout: result.stdout,
                stderr: result.stderr,
                message: 'Execution successful.'
            };
        } else {
            return {
                success: false,
                stdout: result.stdout,
                stderr: result.stderr,
                message: `Execution failed with code ${result.exitCode}`
            };
        }
    }

    public async cleanup(filePath: string): Promise<void> {
        try {
            await fs.promises.unlink(filePath);
        } catch (e) {
            // ignore
        }
    }
}
