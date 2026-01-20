import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

export abstract class RssScraper extends BaseScraper {
    abstract rssUrl: string;

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            const response = await fetch(this.rssUrl);
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
        // Remove CDATA if present
        text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        // Remove HTML
        text = text.replace(/<[^>]*>?/gm, "");
        // Truncate
        return text.trim().substring(0, 300) + (text.length > 300 ? "..." : "");
    }
}
