import { LLMClient, ProcessingResult } from '../types';

interface MiniMaxMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface MiniMaxChoice {
    message: MiniMaxMessage;
    stop_reason?: string;
}

interface MiniMaxResponse {
    choices: MiniMaxChoice[];
}

export class MiniMaxClient implements LLMClient {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor(apiKey: string, baseUrl?: string, model?: string) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl || 'https://api.minimaxi.com/anthropic';
        this.model = model || 'claude-sonnet-4-20250514';
    }

    private async callApi(endpoint: string, body: object): Promise<any> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`MiniMax API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    async generateSummaryAndCategory(title: string, content: string): Promise<ProcessingResult> {
        const prompt = `
You are an expert content curator. Analyze the following content item and provide a concise summary and a relevant category.

Title: ${title}
Content: ${content || 'No content provided, please infer from title.'}

Output JSON format:
{
    "summary": "A concise summary (max 2 sentences)",
    "category": "One of: AI, Crypto, Tech, Startups, Design, Other",
    "tags": ["tag1", "tag2"],
    "tagsZh": ["标签1", "标签2"],
    "aiSummaryZh": "Chinese summary",
    "titleTranslated": "Chinese translation of the title"
}
`;

        let retries = 0;
        const maxRetries = 5;
        const baseDelay = 1000;

        while (retries <= maxRetries) {
            try {
                const response = await this.callApi('/v1/messages', {
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024,
                });

                console.log('MiniMax raw response:', JSON.stringify(response, null, 2));
                // Find the text content block (skip thinking block)
                const textBlock = response.content?.find((block: any) => block.type === 'text');
                let contentStr = textBlock?.text?.trim();
                if (!contentStr) throw new Error('No content from MiniMax');

                // Remove markdown code block wrapper if present
                contentStr = contentStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

                return JSON.parse(contentStr) as ProcessingResult;
            } catch (error: any) {
                if (error?.status === 429 || error?.message?.includes('rate_limit')) {
                    console.warn(`Rate limit exceeded. Retrying attempt ${retries + 1}/${maxRetries}...`);
                    if (retries === maxRetries) {
                        console.error('Max retries reached for rate limiting.');
                        break;
                    }

                    const delay = baseDelay * Math.pow(2, retries);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                    continue;
                }

                console.error('MiniMax LLM Error:', error);
                break;
            }
        }

        return {
            summary: null,
            category: 'Uncategorized',
            tags: [],
            tagsZh: [],
            aiSummaryZh: '',
            titleTranslated: ''
        };
    }

    async generate(prompt: string): Promise<string> {
        try {
            const response = await this.callApi('/v1/messages', {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1024,
            });
            const textBlock = response.content?.find((block: any) => block.type === 'text');
            return textBlock?.text?.trim()?.replace(/^```json?\n?/, '').replace(/\n?```$/, '') || '';
        } catch (error) {
            console.error('MiniMax Generate Error:', error);
            throw error;
        }
    }

    async *stream(prompt: string): AsyncIterable<string> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`MiniMax API error: ${response.status} - ${error}`);
            }

            const reader = response.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') return;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.delta?.text || parsed.content?.[0]?.text || '';
                            if (content) {
                                yield content;
                            }
                        } catch {
                            // Skip non-JSON lines
                        }
                    }
                }
            }
        } catch (error) {
            console.error('MiniMax Stream Error:', error);
            throw error;
        }
    }
}
