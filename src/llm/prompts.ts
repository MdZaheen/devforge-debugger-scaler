export const SYSTEM_PROMPT = `You are an expert coding assistant and debugger.
Your goal is to analyze code errors, explain the root cause, and provide a minimal fix.
You must output your response in a strict JSON format.
Do not include any text outside the JSON object.
`;

export const EXPLAIN_AND_PATCH_TEMPLATE = `
I have a buggy file: {filename}
Language: {language}

Here is the code content:
\`\`\`
{code}
\`\`\`

Here are the errors:
{errors}

Please analyze the error and provide a fix.
Return a JSON object with the following structure:
{
    "explanation": "A clear, concise explanation of the root cause.",
    "patchedCode": "The complete, corrected code for the file. Do not use diffs. Return the entire file content."
}
`;

export class PromptBuilder {
    public static buildExplainAndPatch(filename: string, language: string, code: string, errors: string, previousErrors: string = ''): string {
        let prompt = EXPLAIN_AND_PATCH_TEMPLATE
            .replace('{filename}', filename)
            .replace('{language}', language)
            .replace('{code}', code)
            .replace('{errors}', errors);

        if (previousErrors) {
            prompt += `\n\nPREVIOUS FAILED ATTEMPTS:\n${previousErrors}\n\nIMPORTANT: The previous patches failed. Analyze the previous errors and try a different approach.`;
        }

        return prompt;
    }
}
