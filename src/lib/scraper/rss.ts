import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

export abstract class RssScraper extends BaseScraper {
    abstract rssUrl: string;

    private async fetchWithRetry(url: string, retries = 2): Promise<Response> {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        };

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    headers,
                    signal: AbortSignal.timeout(20000), // Increase timeout to 20s
                });
                if (response.ok) {
                    return response;
                }
                // 4xx 错误不重试
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`${this.name} RSS returned ${response.status}`);
                }
                // 5xx 错误继续重试
                if (attempt < retries) {
                    console.log(`Retry ${attempt + 1}/${retries} for ${this.name}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            } catch (error: any) {
                if (attempt >= retries) throw error;
                console.log(`Retry ${attempt + 1}/${retries} for ${this.name} due to: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        throw new Error(`${this.name} RSS fetch failed after ${retries} retries`);
    }

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            const response = await this.fetchWithRetry(this.rssUrl);
            if (!response.ok) {
                throw new Error(`${this.name} RSS returned ${response.status}`);
            }

            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const signals: ScrapedSignal[] = [];

            const items = $("item").length ? $("item") : $("entry");

            items.each((_, element) => {
                const $item = $(element);
                const title = $item.find("title").text();
                // RSS uses link, Atom uses link[href]
                let url = $item.find("link").text();
                if (!url) {
                    url = $item.find("link").attr("href") || "";
                }

                const description = $item.find("description").text() || $item.find("content").text() || $item.find("summary").text();
                const pubDate = $item.find("pubDate").text() || $item.find("published").text();

                // Simple dedup logic or validation could go here
                if (title && url) {
                    signals.push({
                        title: title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
                        url: url.trim(),
                        summary: this.cleanText(description),
                        score: 0,
                        category: this.getCategory($item),
                        externalId: url.trim(), // URL as ID for RSS usually
                    });
                }
            });

            return signals.slice(0, 20);
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    protected getCategory($item: any): string {
        return "General";
    }

    protected cleanText(text: string): string {
        if (!text) return '';

        // Remove CDATA if present
        text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

        // Use cheerio to safely remove HTML tags
        const $ = cheerio.load(text, null, false);
        const plainText = $.text();

        // Truncate
        return plainText.trim().substring(0, 300) + (plainText.length > 300 ? "..." : "");
    }
}
