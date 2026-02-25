import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

const SUBSTACK_FEEDS = [
    { name: "One Useful Thing (AI)", url: "https://www.oneusefulthing.org/feed" },
    { name: "Platformer", url: "https://www.platformer.news/feed" },
    { name: "AI Snake Oil", url: "https://www.aisnakeoil.com/feed" },
    { name: "Not Boring", url: "https://notboring.co/feed" }
];

export class SubstackScraper extends BaseScraper {
    name = "Substack";
    source = "substack";

    async fetch(): Promise<ScrapedSignal[]> {
        const allSignals: ScrapedSignal[] = [];

        for (const feed of SUBSTACK_FEEDS) {
            try {
                // console.log(`Fetching Substack: ${feed.name}`);
                const response = await fetch(feed.url);
                if (!response.ok) continue;

                const xml = await response.text();
                const $ = cheerio.load(xml, { xmlMode: true });

                $("item").each((_, element) => {
                    const $item = $(element);
                    const title = $item.find("title").text();
                    const link = $item.find("link").text();
                    const description = $item.find("description").text() || $item.find("content\\:encoded").text();
                    // content:encoded often has the full HTML in RSS

                    if (title && link) {
                        allSignals.push({
                            title: title.trim(),
                            url: link.trim(),
                            summary: this.cleanText(description),
                            score: 0,
                            category: "Newsletter", // Or feed.name
                            externalId: link.trim(),
                        });
                    }
                });

            } catch (error) {
                console.error(`Failed to fetch ${feed.name}:`, error);
            }
        }

        // Return top 20 most recent overall (assuming feeds are somewhat sorted, but we should sort by date ideally)
        // RSS does not always guarantee order across multiple feeds.
        // For simplicity, we just slice.
        return allSignals.slice(0, 20);
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
