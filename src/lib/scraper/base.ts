import { Signal } from "../prisma/client";

export interface ScrapedSignal {
    title: string;
    url: string;
    summary?: string | null;
    score: number;
    externalId?: string;
    category?: string;
    metadata?: any;
}

export abstract class BaseScraper {
    abstract name: string;
    abstract source: string;

    abstract fetch(): Promise<ScrapedSignal[]>;

    protected async logError(error: any) {
        console.error(`Scraper error [${this.name}]:`, error);
    }

    // Common utility to clean text or format data could be added here
    protected cleanText(text: string): string {
        if (!text) return '';

        // Decode HTML entities
        let cleaned = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
            .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

        // Remove null bytes and other control characters (except newlines and tabs)
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Normalize whitespace
        cleaned = cleaned.trim().replace(/\s+/g, ' ');

        return cleaned;
    }
}
