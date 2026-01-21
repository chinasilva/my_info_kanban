import { BaseScraper, ScrapedSignal } from "./base";

/**
 * DuneScraper - Crypto Analytics Insights
 * 
 * Note: Dune.com has Cloudflare protection and no public RSS.
 * Using Decrypt.co as an alternative source for crypto/blockchain data and analytics news.
 */
export class DuneScraper extends BaseScraper {
    name = "Crypto Analytics";
    source = "dune";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            // Use Decrypt.co RSS - reliable crypto/blockchain news source
            const response = await fetch("https://decrypt.co/feed");

            if (!response.ok) {
                console.warn(`Dune scraper fallback (Decrypt RSS) returned ${response.status}`);
                return [];
            }

            const xml = await response.text();

            // Parse RSS using regex
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
            const signals: ScrapedSignal[] = [];

            for (const item of items.slice(0, 10)) {
                const titleMatch = item.match(/<title>(.*?)<\/title>/);
                const linkMatch = item.match(/<link>(.*?)<\/link>/);
                const descMatch = item.match(/<description>(.*?)<\/description>/);
                const categoryMatch = item.match(/<category>(.*?)<\/category>/);

                if (titleMatch && linkMatch) {
                    const title = titleMatch[1].trim();
                    const category = categoryMatch ? categoryMatch[1].trim() : "Crypto";

                    // Filter for data/analytics related content
                    const isRelevant =
                        title.toLowerCase().includes('data') ||
                        title.toLowerCase().includes('analytics') ||
                        title.toLowerCase().includes('metrics') ||
                        title.toLowerCase().includes('onchain') ||
                        title.toLowerCase().includes('market') ||
                        category.toLowerCase().includes('data') ||
                        category.toLowerCase().includes('market');

                    if (isRelevant || signals.length < 3) {  // Ensure at least 3 signals
                        signals.push({
                            title: this.cleanText(title),
                            url: linkMatch[1].trim(),
                            summary: descMatch ? this.cleanText(descMatch[1]) : null,
                            score: 0,
                            category: category,
                            externalId: linkMatch[1].trim(),
                        });
                    }
                }
            }

            return signals.slice(0, 10);
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }
}
