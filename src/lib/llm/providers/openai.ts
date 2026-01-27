import OpenAI from 'openai';
import { LLMClient, ProcessingResult } from '../types';

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
            } catch (error: any) {
                // Check for rate limit error (429)
                if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
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
}
