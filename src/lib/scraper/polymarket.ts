import { BaseScraper, ScrapedSignal } from "./base";

interface PolymarketMarket {
    id: string;
    question: string;
    slug: string;
    volume24hr: number;
    description: string;
    tags: string[];
    outcomes: string[];
    outcomePrices: string[];
}

export class PolymarketScraper extends BaseScraper {
    name = "Polymarket";
    source = "polymarket";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            // Gamma API to get markets, sorted by 24h volume
            const response = await fetch("https://gamma-api.polymarket.com/markets?limit=20&active=true&closed=false&order=volume24hr&ascending=false");

            if (!response.ok) {
                throw new Error(`Polymarket API returned ${response.status}`);
            }

            const markets: PolymarketMarket[] = await response.json();

            return markets.map(market => {
                // Calculate prediction probability for "Yes" if binary, or just show top outcome?
                // Usually binary markets have [No, Yes] outcomes.
                // Or just show the title.

                return {
                    title: market.question,
                    url: `https://polymarket.com/event/${market.slug}`,
                    summary: market.description || "Prediction market",
                    score: Math.round(market.volume24hr || 0), // Use volume as score
                    category: market.tags?.[0] || "Prediction",
                    externalId: market.id,
                };
            });
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }
}
