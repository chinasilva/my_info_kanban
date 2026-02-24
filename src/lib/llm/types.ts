export interface LLMConfig {
    provider: 'gemini' | 'deepseek' | 'openai' | 'openrouter' | 'zhipu' | 'minimax';
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

// 批量处理结果
export interface BatchProcessingResult extends ProcessingResult {
    signalId: string;
}

export interface LLMClient {
    generateSummaryAndCategory(title: string, content: string): Promise<ProcessingResult>;
    // 批量处理方法
    generateSummaryAndCategories(signals: Array<{id: string, title: string, content: string}>): Promise<BatchProcessingResult[]>;
    generate(prompt: string): Promise<string>;
    stream(prompt: string): AsyncIterable<string>;
}
