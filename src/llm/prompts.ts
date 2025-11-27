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
    "diff": "A unified diff string representing the minimal fix. Start with --- original and +++ modified."
}
`;

export class PromptBuilder {
    public static buildExplainAndPatch(filename: string, language: string, code: string, errors: string): string {
        return EXPLAIN_AND_PATCH_TEMPLATE
            .replace('{filename}', filename)
            .replace('{language}', language)
            .replace('{code}', code)
            .replace('{errors}', errors);
    }
}
