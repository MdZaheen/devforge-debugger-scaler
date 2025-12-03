import * as fs from 'fs';

export class Patcher {
    /**
     * Saves the patched content to a temp file.
     */
    public async savePatchedFile(originalPath: string, content: string): Promise<string> {
        const tempPath = originalPath + '.patched';
        await fs.promises.writeFile(tempPath, content, 'utf8');
        return tempPath;
    }
}
