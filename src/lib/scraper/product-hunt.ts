import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

export class ProductHuntScraper extends BaseScraper {
    name = "Product Hunt";
    source = "producthunt";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            const response = await fetch("https://www.producthunt.com/feed");
            if (!response.ok) {
                throw new Error(`Product Hunt RSS returned ${response.status}`);
            }

            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const signals: ScrapedSignal[] = [];

            $("entry").each((_, element) => {
                const $entry = $(element);
                const title = $entry.find("title").text();
                const link = $entry.find("link").attr("href") || "";
                const content = $entry.find("content").text();
                // Extract score/upvotes/comments if available in content or summary
                // Product Hunt RSS content usually has "Description: ... <br> Comments: ... <br> Votes: ..." or similar? 
                // Actually standard Atom/RSS might just have description.
                // Let's assume description is in content.
                // We might not get exact score easily without parsing the description text.

                // Usually content is HTML.
                // Let's just take the title and link and summary.

                signals.push({
                    title,
                    url: link,
                    summary: this.cleanContent(content),
                    score: 0, // RSS might not have live score
                    category: "Product",
                    externalId: link,
                });
            });

            // Also support standard RSS <item> format just in case
            $("item").each((_, element) => {
                const $item = $(element);
                const title = $item.find("title").text();
                const link = $item.find("link").text();
                const description = $item.find("description").text();

                signals.push({
                    title,
                    url: link,
                    summary: this.cleanContent(description),
                    score: 0,
                    category: "Product",
                    externalId: link,
                });
            });

            return signals.slice(0, 20); // Top 20
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    private cleanContent(html: string): string {
        // Strip HTML tags for summary
        return html.replace(/<[^>]*>?/gm, "").trim().substring(0, 300) + (html.length > 300 ? "..." : "");
    }
}
