import { prisma } from "../prisma/db";
import { BaseScraper } from "./base";
import { HackerNewsScraper } from "./hacker-news";
import { GitHubTrendingScraper } from "./github-trending";

export class ScraperRunner {
    private scrapers: BaseScraper[] = [
        new HackerNewsScraper(),
        new GitHubTrendingScraper(),
    ];

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
                                summary: signal.summary,
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

        console.log("Runner finished:", results);
        return results;
    }
}
