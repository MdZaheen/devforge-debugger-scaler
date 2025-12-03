import axios from 'axios';

export interface LLMResponse {
    content: string;
    raw: any;
}

export class LocalLLMClient {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'gemma3:1b') {
        this.baseUrl = baseUrl;
        this.model = model;

        if (!this.isLocalhost(this.baseUrl)) {
            throw new Error('Security Violation: LLM endpoint must be localhost.');
        }
    }

    private isLocalhost(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        } catch {
            return false;
        }
    }

    public async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
        try {
            // Ollama API format
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature: 0.2 // Low temp for code
                }
            });

            return {
                content: response.data.response,
                raw: response.data
            };
        } catch (error: any) {
            throw new Error(`LLM Request Failed: ${error.message}`);
        }
    }
}
