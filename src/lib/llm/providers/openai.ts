import OpenAI from 'openai';
import { LLMClient, ProcessingResult, BatchProcessingResult } from '../types';
import pLimit from 'p-limit';

function isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { status?: number; code?: string };
    return candidate.status === 429 || candidate.code === 'rate_limit_exceeded';
}

export class OpenAIClient implements LLMClient {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, baseUrl?: string, model?: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: baseUrl,
        });
        this.model = model || 'gpt-3.5-turbo';
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
        const baseDelay = 1000; // 1 second

        while (retries <= maxRetries) {
            try {
                const completion = await this.client.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.model,
                    response_format: { type: 'json_object' },
                });

                const contentStr = completion.choices[0].message.content;
                if (!contentStr) throw new Error('No content from LLM');

                return JSON.parse(contentStr) as ProcessingResult;
            } catch (error: unknown) {
                // Check for rate limit error (429)
                if (isRateLimitError(error)) {
                    console.warn(`Rate limit exceeded. Retrying attempt ${retries + 1}/${maxRetries}...`);
                    if (retries === maxRetries) {
                        console.error('Max retries reached for rate limiting.');
                        break; // Fall through to fallback
                    }

                    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                    const delay = baseDelay * Math.pow(2, retries);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                    continue;
                }

                console.error('OpenAI LLM Error:', error);
                // For non-rate-limit errors, break immediately and return fallback
                break;
            }
        }

        // Fallback
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
        // 使用 p-limit 限制并发数量
        const limit = pLimit(5);

        const results = await Promise.all(
            signals.map(signal =>
                limit(async () => {
                    const result = await this.generateSummaryAndCategory(signal.title, signal.content);
                    return {
                        signalId: signal.id,
                        ...result
                    };
                })
            )
        );

        return results;
    }

    async generate(prompt: string): Promise<string> {
        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
            });
            return completion.choices[0].message.content || '';
        } catch (error) {
            console.error('OpenAI Generate Error:', error);
            throw error;
        }
    }

    async *stream(prompt: string): AsyncIterable<string> {
        try {
            const stream = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                stream: true,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    yield content;
                }
            }
        } catch (error) {
            console.error('OpenAI Stream Error:', error);
            throw error;
        }
    }
}
