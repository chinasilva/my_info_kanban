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
    "tags": ["tag1", "tag2"]
}
`;

        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                response_format: { type: 'json_object' },
            });

            const contentStr = completion.choices[0].message.content;
            if (!contentStr) throw new Error('No content from LLM');

            return JSON.parse(contentStr) as ProcessingResult;
        } catch (error) {
            console.error('OpenAI LLM Error:', error);
            // Fallback
            return {
                summary: 'Summary generation failed.',
                category: 'Uncategorized',
                tags: []
            };
        }
    }
}
