export interface LLMConfig {
    provider: 'gemini' | 'deepseek' | 'openai' | 'openrouter';
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export interface ProcessingResult {
    summary: string;
    category: string;
    tags?: string[];
    tagsZh?: string[];
    aiSummaryZh?: string;
    titleTranslated?: string;
}

export interface LLMClient {
    generateSummaryAndCategory(title: string, content: string): Promise<ProcessingResult>;
}
