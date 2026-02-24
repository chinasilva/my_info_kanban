import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMClient, ProcessingResult, BatchProcessingResult } from '../types';
import pLimit from 'p-limit';

export class GeminiClient implements LLMClient {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });
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
    "aiSummaryZh": "Chinese summary (max 2 sentences)",
    "titleTranslated": "Chinese translation of the title"
}
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return JSON.parse(text) as ProcessingResult;
        } catch (error) {
            console.error('Gemini LLM Error:', error);
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini Generate Error:', error);
            throw error;
        }
    }

    async *stream(prompt: string): AsyncIterable<string> {
        try {
            const result = await this.model.generateContentStream(prompt);
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    yield chunkText;
                }
            }
        } catch (error) {
            console.error('Gemini Stream Error:', error);
            throw error;
        }
    }
}
