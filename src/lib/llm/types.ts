export interface LLMConfig {
    provider: 'gemini' | 'deepseek' | 'openai' | 'openrouter' | 'zhipu';
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export interface ProcessingResult {
    summary: string | null;
    category: string;
    tags?: string[];
    tagsZh?: string[];
    aiSummaryZh?: string;
    titleTranslated?: string;
}

export interface LLMClient {
    generateSummaryAndCategory(title: string, content: string): Promise<ProcessingResult>;
    generate(prompt: string): Promise<string>;
    stream(prompt: string): AsyncIterable<string>;
}
