export interface ScrapedSignal {
    title: string;
    url: string;
    summary?: string | null;
    score: number;
    externalId?: string;
    category?: string;
    platform?: string;
    metadata?: unknown;
}

export type FetchErrorCode =
    | "HTTP_403"
    | "HTTP_429"
    | "TIMEOUT"
    | "PARSE"
    | "ANTI_BOT"
    | "UNKNOWN";

export type SourceFetchStatus = "success" | "empty" | "soft_fail" | "hard_fail";

export interface SourceFetchResult {
    sourceId: string;
    sourceName: string;
    attemptedEndpoint: string | null;
    status: SourceFetchStatus;
    errorCode: FetchErrorCode | null;
    signalCount: number;
    durationMs: number;
}

export function classifyFetchError(error: unknown): FetchErrorCode {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (normalized.includes("403")) return "HTTP_403";
    if (normalized.includes("429")) return "HTTP_429";
    if (
        normalized.includes("timeout")
        || normalized.includes("timed out")
        || normalized.includes("aborterror")
        || normalized.includes("etimedout")
        || normalized.includes("und_err_connect_timeout")
    ) {
        return "TIMEOUT";
    }
    if (
        normalized.includes("precondition failed")
        || normalized.includes("anti-bot")
        || normalized.includes("captcha")
        || normalized.includes("cloudflare")
        || normalized.includes("js challenge")
        || normalized.includes("反爬")
    ) {
        return "ANTI_BOT";
    }
    if (
        normalized.includes("parse")
        || normalized.includes("invalid json")
        || normalized.includes("unexpected token")
        || normalized.includes("xml")
    ) {
        return "PARSE";
    }
    return "UNKNOWN";
}

export abstract class BaseScraper {
    abstract name: string;
    abstract source: string;

    private lastErrorCode: FetchErrorCode | null = null;
    private lastAttemptedEndpoint: string | null = null;

    abstract fetch(): Promise<ScrapedSignal[]>;

    public resetRunState() {
        this.lastErrorCode = null;
        this.lastAttemptedEndpoint = null;
    }

    public getLastErrorCode(): FetchErrorCode | null {
        return this.lastErrorCode;
    }

    public getAttemptedEndpoint(): string | null {
        return this.lastAttemptedEndpoint;
    }

    protected setAttemptedEndpoint(endpoint: string | null) {
        this.lastAttemptedEndpoint = endpoint;
    }

    protected async logError(error: unknown, options?: { endpoint?: string; errorCode?: FetchErrorCode }) {
        if (options?.endpoint) {
            this.lastAttemptedEndpoint = options.endpoint;
        }
        this.lastErrorCode = options?.errorCode || classifyFetchError(error);
        console.error(`Scraper error [${this.name}]:`, error);
    }

    // Common utility to clean text or format data could be added here
    protected cleanText(text: string): string {
        if (!text) return '';

        // Remove control characters (except newlines and tabs)
        let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Normalize whitespace
        cleaned = cleaned.trim().replace(/\s+/g, ' ');

        return cleaned;
    }
}
