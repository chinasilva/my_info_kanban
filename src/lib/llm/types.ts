export interface LLMConfig {
    provider: 'gemini' | 'deepseek' | 'openai';
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export interface ProcessingResult {
    summary: string;
    category: string;
    tags?: string[];
}

export interface LLMClient {
    generateSummaryAndCategory(title: string, content: string): Promise<ProcessingResult>;
}
