
import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

export class DuneScraper extends BaseScraper {
    name = "Dune Analytics";
    source = "dune";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            // Since Dune doesn't have a public "Trending Dashboards" API endpoint without authentication or complex query setup,
            // we will fallback to scraping their 'Dune Digest' Substack RSS which highlights top dashboards.
            // This acts as a proxy for "Trending" quality content.
            const response = await fetch("https://dune.substack.com/feed");
            if (!response.ok) {
                throw new Error(`Dune RSS returned ${response.status}`);
            }

            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const signals: ScrapedSignal[] = [];

            $("item").each((_, element) => {
                const $item = $(element);
                const title = $item.find("title").text();
                const link = $item.find("link").text();
                const description = $item.find("description").text();

                // Only include if it looks like a dashboard highlight or interesting analysis
                if (title && link) {
                    signals.push({
                        title: title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
                        url: link.trim(),
                        summary: this.cleanText(description),
                        score: 0, // No score available from RSS
                        category: "Crypto Analytics",
                        externalId: link.trim(),
                    });
                }
            });

            return signals.slice(0, 10);
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    protected cleanText(text: string): string {
        text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        text = text.replace(/<[^>]*>?/gm, "");
        return text.trim().substring(0, 300) + (text.length > 300 ? "..." : "");
    }
}
