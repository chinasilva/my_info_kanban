import { LLMClient } from './types';
import { OpenAIClient } from './providers/openai';
import { GeminiClient } from './providers/gemini';

export class LLMFactory {
    static createClient(): LLMClient | null {
        const provider = process.env.LLM_PROVIDER?.toLowerCase();
        const apiKey = process.env[
            provider === 'gemini' ? 'GEMINI_API_KEY' :
                provider === 'deepseek' ? 'DEEPSEEK_API_KEY' :
                    provider === 'openrouter' ? 'OPENROUTER_API_KEY' :
                        'OPENAI_API_KEY'
        ];

        if (!apiKey) {
            console.warn(`No API key found for provider ${provider}. LLM features will be disabled.`);
            return null;
        }

        switch (provider) {
            case 'gemini':
                return new GeminiClient(apiKey, process.env.LLM_MODEL);
            case 'deepseek':
                return new OpenAIClient(
                    apiKey,
                    process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
                    process.env.LLM_MODEL || 'deepseek-chat'
                );
            case 'openrouter':
                return new OpenAIClient(
                    apiKey,
                    process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
                    process.env.LLM_MODEL || 'google/gemini-2.5-pro-exp-03-25:free'
                );
            case 'openai':
                return new OpenAIClient(
                    apiKey,
                    undefined,
                    process.env.LLM_MODEL || 'gpt-3.5-turbo'
                );
            default:
                console.warn(`Unknown LLM provider: ${provider}`);
                return null;
        }
    }
}
