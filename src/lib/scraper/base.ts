import { Signal } from "../prisma/client";

export interface ScrapedSignal {
    title: string;
    url: string;
    summary?: string;
    score: number;
    externalId?: string;
    category?: string;
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
        return text.trim().replace(/\s+/g, " ");
    }
}
