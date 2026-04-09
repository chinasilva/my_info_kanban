import { LLMClient, ProcessingResult, BatchProcessingResult } from '../types';

interface MiniMaxTextBlock {
    type?: string;
    text?: string;
}

interface MiniMaxApiResponse {
    content?: MiniMaxTextBlock[];
}

interface MiniMaxErrorPayload {
    error?: {
        message?: string;
        type?: string;
    };
    message?: string;
    base_resp?: {
        status_code?: number;
        status_msg?: string;
    };
}

const TRANSIENT_MINIMAX_CODES = new Set([1000, 1001, 1002, 1013, 1024, 1033, 1041, 2045]);
const TRANSIENT_ERROR_PATTERNS = [
    /timeout/i,
    /unknown error/i,
    /internal server error/i,
    /temporarily unavailable/i,
    /fetch failed/i,
    /network/i,
    /socket hang up/i,
    /connection reset/i,
];

class MiniMaxRequestError extends Error {
    status?: number;
    code?: number;
    retryAfterMs?: number;

    constructor(message: string, options: { status?: number; code?: number; retryAfterMs?: number } = {}) {
        super(message);
        this.name = 'MiniMaxRequestError';
        this.status = options.status;
        this.code = options.code;
        this.retryAfterMs = options.retryAfterMs;
    }
}

function extractTextBlock(response: MiniMaxApiResponse): string | null {
    const textBlock = response.content?.find((block) => block.type === 'text');
    return textBlock?.text?.trim() || null;
}

function parseMiniMaxErrorPayload(raw: string): { code?: number; detail: string } {
    try {
        const payload = JSON.parse(raw) as MiniMaxErrorPayload;
        const code = payload.base_resp?.status_code;
        const detail =
            payload.error?.message ||
            payload.message ||
            payload.base_resp?.status_msg ||
            raw;

        return {
            code,
            detail: detail?.trim() || raw,
        };
    } catch {
        const codeMatch = raw.match(/\((\d{4})\)/);
        return {
            code: codeMatch ? Number(codeMatch[1]) : undefined,
            detail: raw.trim() || 'Unknown error',
        };
    }
}

function parseRetryAfterMs(value: string | null): number | undefined {
    if (!value) return undefined;

    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
        return Math.max(0, Math.floor(seconds * 1000));
    }

    const dateMs = Date.parse(value);
    if (!Number.isNaN(dateMs)) {
        return Math.max(0, dateMs - Date.now());
    }

    return undefined;
}

function isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { status?: number; message?: string; code?: number };
    return (
        candidate.status === 429 ||
        candidate.code === 1002 ||
        candidate.message?.includes('rate_limit') === true
    );
}

function isJsonError(error: unknown): boolean {
    if (error instanceof SyntaxError) return true;
    if (!error || typeof error !== "object") return false;
    const candidate = error as { message?: string };
    return candidate.message?.includes('JSON') === true;
}

function isTransientMiniMaxError(error: unknown): boolean {
    if (error instanceof MiniMaxRequestError) {
        if (error.status === 429 || (typeof error.status === "number" && error.status >= 500)) {
            return true;
        }
        if (typeof error.code === "number" && TRANSIENT_MINIMAX_CODES.has(error.code)) {
            return true;
        }
    }

    if (!error || typeof error !== "object") return false;
    const candidate = error as { message?: string };
    return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(candidate.message || ""));
}

function getRetryDelayMs(attempt: number, baseDelay: number, retryAfterMs?: number): number {
    const backoffDelay = Math.min(baseDelay * Math.pow(2, attempt), 15_000);
    const jitter = Math.floor(Math.random() * 500);
    return Math.max(retryAfterMs ?? 0, backoffDelay + jitter);
}

export class MiniMaxClient implements LLMClient {
    private apiKey: string;
    private baseUrl: string;
    private model: string;
    private requestTimeoutMs: number;

    constructor(apiKey: string, baseUrl?: string, model?: string) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl || 'https://api.minimaxi.com/anthropic';
        this.model = model || 'MiniMax-M2.5';
        this.requestTimeoutMs = Math.max(
            10_000,
            Number(process.env.MINIMAX_REQUEST_TIMEOUT_MS || "45000")
        );
    }

    private async callApi(endpoint: string, body: object): Promise<MiniMaxApiResponse> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
        let response: Response;

        try {
            response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new MiniMaxRequestError(`MiniMax API timeout after ${this.requestTimeoutMs}ms`, {
                    code: 1001,
                });
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            const errorText = await response.text();
            const { code, detail } = parseMiniMaxErrorPayload(errorText);
            throw new MiniMaxRequestError(`MiniMax API error: ${response.status} - ${detail}`, {
                status: response.status,
                code,
                retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
            });
        }

        return response.json();
    }

    private async waitBeforeRetry(retries: number, baseDelay: number, error: unknown, label: string): Promise<boolean> {
        const canRetry = isJsonError(error) || isRateLimitError(error) || isTransientMiniMaxError(error);
        if (!canRetry) {
            return false;
        }

        const retryAfterMs = error instanceof MiniMaxRequestError ? error.retryAfterMs : undefined;
        const delay = getRetryDelayMs(retries, baseDelay, retryAfterMs);
        const detail = error instanceof Error ? error.message : String(error);
        console.warn(`${label}. Retrying attempt ${retries + 1} after ${delay}ms. ${detail}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return true;
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
Return valid raw JSON only. Do not wrap the response in markdown fences or add any commentary.
`;

        let retries = 0;
        const maxRetries = 5;
        const baseDelay = 1500;

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
                if (retries < maxRetries) {
                    const didWait = await this.waitBeforeRetry(
                        retries,
                        baseDelay,
                        error,
                        'MiniMax single-item request failed'
                    );
                    if (didWait) {
                        retries++;
                        continue;
                    }
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
Return valid raw JSON only. Do not wrap the response in markdown fences or add any commentary.
`;

        let retries = 0;
        const maxRetries = 5;
        const baseDelay = 1500;
        const batchMaxTokens = Math.min(4096, Math.max(2048, signals.length * 512));

        while (retries <= maxRetries) {
            try {
                // 单次 API 调用获取所有结果
                const response = await this.callApi('/v1/messages', {
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: batchMaxTokens,
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
                if (retries < maxRetries) {
                    const didWait = await this.waitBeforeRetry(
                        retries,
                        baseDelay,
                        error,
                        'MiniMax batch request failed'
                    );
                    if (didWait) {
                        retries++;
                        continue;
                    }
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
