import { prisma } from "../prisma/db";
import { BaseScraper } from "./base";
import { HackerNewsScraper } from "./hacker-news";
import { GitHubTrendingScraper } from "./github-trending";
import { HuggingFaceScraper } from "./hugging-face";
import { ProductHuntScraper } from "./product-hunt";
import { DevToScraper } from "./dev-to";
import { CryptoPanicScraper } from "./cryptopanic";
import { PolymarketScraper } from "./polymarket";
import { DuneScraper } from "./dune";
import { SubstackScraper } from "./substack";
import { SignalProcessor } from "../llm/processor";

export class ScraperRunner {
    private scrapers: BaseScraper[] = [
        new HackerNewsScraper(),
        new GitHubTrendingScraper(),
        new HuggingFaceScraper(),
        new ProductHuntScraper(),
        new DevToScraper(),
        new CryptoPanicScraper(),
        new PolymarketScraper(),
        new DuneScraper(),
        new SubstackScraper(),
    ];
    private processor = new SignalProcessor();

    async runAll() {
        console.log("Starting scraper runner...");
        const results = {
            total: 0,
            new: 0,
            updated: 0,
            errors: 0,
        };

        for (const scraper of this.scrapers) {
            try {
                console.log(`Running scraper: ${scraper.name}`);
                const signals = await scraper.fetch();
                console.log(`Scraper ${scraper.name} found ${signals.length} signals.`);

                for (const signal of signals) {
                    try {
                        const upserted = await prisma.signal.upsert({
                            where: { url: signal.url },
                            update: {
                                score: signal.score,
                                // Only update summary if it's not null in the new data, 
                                // or preserve existing if we want to keep LLM generated ones?
                                // If scraper provides summary, it might overwrite LLM summary.
                                // For now, let's assume scraper summary is better if present, 
                                // or maybe we only update if existing is null?
                                // Let's keep it simple: overwrite.
                                // But wait, HackerNews scraper usually has no summary.
                                ...(signal.summary ? { summary: signal.summary } : {}),
                            },
                            create: {
                                title: signal.title,
                                url: signal.url,
                                score: signal.score,
                                source: scraper.source,
                                category: signal.category,
                                externalId: signal.externalId,
                                summary: signal.summary,
                            },
                        });
                        results.total++;
                    } catch (e) {
                        console.error(`Error saving signal ${signal.url}:`, e);
                    }
                }
            } catch (error) {
                console.error(`Scraper ${scraper.name} failed:`, error);
                results.errors++;
            }
        }

        console.log("Scraping finished. Starting LLM enrichment...");
        try {
            await this.processor.processSignals();
        } catch (error) {
            console.error("LLM enrichment failed:", error);
        }

        console.log("Runner finished:", results);
        return results;
    }
}
