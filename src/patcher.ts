import * as Diff from 'diff';
import * as fs from 'fs';

export class Patcher {
    /**
     * Applies a unified diff to a file content.
     * @param originalContent The original file content
     * @param patch The unified diff string
     * @returns The patched content or throws error
     */
    public applyPatch(originalContent: string, patch: string): string {
        // Clean up the patch string if necessary (e.g. remove markdown code blocks)
        const cleanPatch = patch.replace(/```diff/g, '').replace(/```/g, '').trim();

        const result = Diff.applyPatch(originalContent, cleanPatch);

        if (result === false) {
            throw new Error('Failed to apply patch. Hunk mismatch or invalid format.');
        }

        return result;
    }

    /**
     * Creates a temp file with the patched content.
     */
    public async applyToTempFile(originalPath: string, patch: string): Promise<string> {
        const content = await fs.promises.readFile(originalPath, 'utf8');
        const patchedContent = this.applyPatch(content, patch);

        const tempPath = originalPath + '.patched'; // Simple temp naming for now
        await fs.promises.writeFile(tempPath, patchedContent, 'utf8');

        return tempPath;
    }
}
