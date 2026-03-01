import { LLMClient, ProcessingResult, BatchProcessingResult } from '../types';

interface MiniMaxTextBlock {
    type?: string;
    text?: string;
}

interface MiniMaxApiResponse {
    content?: MiniMaxTextBlock[];
}

function extractTextBlock(response: MiniMaxApiResponse): string | null {
    const textBlock = response.content?.find((block) => block.type === 'text');
    return textBlock?.text?.trim() || null;
}

function isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { status?: number; message?: string };
    return candidate.status === 429 || candidate.message?.includes('rate_limit') === true;
}

function isJsonError(error: unknown): boolean {
    if (error instanceof SyntaxError) return true;
    if (!error || typeof error !== "object") return false;
    const candidate = error as { message?: string };
    return candidate.message?.includes('JSON') === true;
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

    private async callApi(endpoint: string, body: object): Promise<MiniMaxApiResponse> {
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

                let contentStr = extractTextBlock(response);
                if (!contentStr) throw new Error('No content from MiniMax');

                // Remove markdown code block wrapper if present
                contentStr = contentStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

                return JSON.parse(contentStr) as ProcessingResult;
            } catch (error: unknown) {
                // Handle JSON parse errors with retry
                if (isJsonError(error)) {
                    console.warn(`JSON parse error. Retrying attempt ${retries + 1}/${maxRetries}...`);
                    if (retries < maxRetries) {
                        const delay = baseDelay * Math.pow(2, retries);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        retries++;
                        continue;
                    }
                }

                if (isRateLimitError(error)) {
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

    async generateSummaryAndCategories(
        signals: Array<{id: string, title: string, content: string}>
    ): Promise<BatchProcessingResult[]> {
        // 构建批量 prompt
        const signalsText = signals.map((s, i) =>
            `${i + 1}. Title: ${s.title}\n   Content: ${s.content || 'No content provided, please infer from title.'}`
        ).join('\n\n');

        const prompt = `
You are an expert content curator. Analyze the following content items and provide concise summaries and relevant categories for EACH item.

${signalsText}

Output JSON array format (one object per item, in the same order):
[
    {"index": 1, "summary": "...", "category": "...", "tags": [], "tagsZh": [], "aiSummaryZh": "...", "titleTranslated": "..."},
    {"index": 2, "summary": "...", "category": "...", ...}
]
Each summary should be max 2 sentences. Category must be one of: AI, Crypto, Tech, Startups, Design, Other.
`;

        let retries = 0;
        const maxRetries = 5;
        const baseDelay = 1000;

        while (retries <= maxRetries) {
            try {
                // 单次 API 调用获取所有结果
                const response = await this.callApi('/v1/messages', {
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 8192,  // 增大输出限制
                });

                // 解析响应并关联 signalId
                let contentStr = extractTextBlock(response);
                if (!contentStr) throw new Error('No content from MiniMax');

                // Remove markdown code block wrapper if present
                contentStr = contentStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

                const parsed = JSON.parse(contentStr);
                const results = Array.isArray(parsed) ? parsed : [];

                return results.reduce<BatchProcessingResult[]>((acc, r) => {
                        const item = r as {
                            index?: number;
                            summary?: string | null;
                            category?: string | null;
                            tags?: string[];
                            tagsZh?: string[];
                            aiSummaryZh?: string;
                            titleTranslated?: string;
                        };
                        if (typeof item.index !== "number" || !signals[item.index - 1]) {
                            return acc;
                        }
                        acc.push({
                            signalId: signals[item.index - 1].id,
                            summary: item.summary ?? null,
                            category: item.category ?? "Uncategorized",
                            tags: item.tags || [],
                            tagsZh: item.tagsZh || [],
                            aiSummaryZh: item.aiSummaryZh || "",
                            titleTranslated: item.titleTranslated || ""
                        });
                        return acc;
                    }, []);
            } catch (error: unknown) {
                // Handle JSON parse errors with retry
                if (isJsonError(error)) {
                    console.warn(`Batch JSON parse error. Retrying attempt ${retries + 1}/${maxRetries}...`);
                    if (retries < maxRetries) {
                        const delay = baseDelay * Math.pow(2, retries);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        retries++;
                        continue;
                    }
                }

                if (isRateLimitError(error)) {
                    console.warn(`Batch rate limit exceeded. Retrying attempt ${retries + 1}/${maxRetries}...`);
                    if (retries === maxRetries) {
                        console.error('Max retries reached for rate limiting.');
                        break;
                    }

                    const delay = baseDelay * Math.pow(2, retries);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                    continue;
                }

                console.error('MiniMax Batch LLM Error:', error);
                break;
            }
        }

        // Return empty array on failure
        return [];
    }

    async generate(prompt: string): Promise<string> {
        try {
            const response = await this.callApi('/v1/messages', {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1024,
            });
            const contentStr = extractTextBlock(response);
            return contentStr?.replace(/^```json?\n?/, '').replace(/\n?```$/, '') || '';
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
                            const parsed = JSON.parse(data) as {
                                delta?: { text?: string };
                                content?: Array<{ text?: string }>;
                            };
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
