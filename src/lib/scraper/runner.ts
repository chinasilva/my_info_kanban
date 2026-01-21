import { prisma } from "../prisma/db";
import { BaseScraper, ScrapedSignal } from "./base";
import { HackerNewsScraper } from "./hacker-news";
import { GitHubTrendingScraper } from "./github-trending";
import { HuggingFaceScraper } from "./hugging-face";
import { ProductHuntScraper } from "./product-hunt";
import { DevToScraper } from "./dev-to";
import { CryptoPanicScraper } from "./cryptopanic";
import { PolymarketScraper } from "./polymarket";
import { DuneScraper } from "./dune";
import { SubstackScraper } from "./substack";
import { GenericRssScraper } from "./generic-rss";
import { SignalProcessor } from "../llm/processor";
import { Source } from "@prisma/client";

// 内置 Scraper 映射
const BUILTIN_SCRAPERS: Record<string, () => BaseScraper> = {
    hackernews: () => new HackerNewsScraper(),
    github: () => new GitHubTrendingScraper(),
    huggingface: () => new HuggingFaceScraper(),
    producthunt: () => new ProductHuntScraper(),
    devto: () => new DevToScraper(),
    cryptopanic: () => new CryptoPanicScraper(),
    polymarket: () => new PolymarketScraper(),
    dune: () => new DuneScraper(),
    substack: () => new SubstackScraper(),
};

interface ScraperWithSource {
    scraper: BaseScraper;
    sourceId: string;
}

export class ScraperRunner {
    private processor = new SignalProcessor();

    /**
     * 从数据库动态获取所有活跃的数据源并创建对应的 Scraper
     */
    private async getScrapers(): Promise<ScraperWithSource[]> {
        const sources = await prisma.source.findMany({
            where: { isActive: true },
        });

        const scrapers: ScraperWithSource[] = [];

        for (const source of sources) {
            const scraper = this.createScraperForSource(source);
            if (scraper) {
                scrapers.push({
                    scraper,
                    sourceId: source.id,
                });
            }
        }

        return scrapers;
    }

    /**
     * 根据数据源类型创建对应的 Scraper 实例
     */
    private createScraperForSource(source: Source): BaseScraper | null {
        // 检查是否是内置类型
        const builtinFactory = BUILTIN_SCRAPERS[source.type];
        if (builtinFactory) {
            return builtinFactory();
        }

        // RSS 类型使用通用 RSS Scraper
        if (source.type === "rss") {
            return new GenericRssScraper(source);
        }

        console.warn(`Unknown source type: ${source.type} for source ${source.name}`);
        return null;
    }

    async runAll() {
        console.log("Starting scraper runner...");
        const results = {
            total: 0,
            new: 0,
            updated: 0,
            errors: 0,
        };

        // 动态获取所有 Scraper
        const scraperList = await this.getScrapers();
        console.log(`Found ${scraperList.length} active sources`);

        for (const { scraper, sourceId } of scraperList) {
            try {
                console.log(`Running scraper: ${scraper.name}`);
                const signals = await scraper.fetch();
                console.log(`Scraper ${scraper.name} found ${signals.length} signals.`);

                for (const signal of signals) {
                    try {
                        await prisma.signal.upsert({
                            where: { url: signal.url },
                            update: {
                                score: signal.score,
                                ...(signal.summary !== undefined ? { summary: signal.summary } : {}),
                                ...(signal.metadata !== undefined ? { metadata: signal.metadata } : {}),
                            },
                            create: {
                                title: signal.title,
                                url: signal.url,
                                score: signal.score,
                                sourceId: sourceId,
                                category: signal.category,
                                externalId: signal.externalId,
                                summary: signal.summary,
                                metadata: (signal.metadata as any) || {},
                            },
                        });
                        results.total++;
                    } catch (e) {
                        console.error(`Error saving signal ${signal.url}:`, e);
                    }
                }

                // 更新数据源的最后抓取时间
                await prisma.source.update({
                    where: { id: sourceId },
                    data: { lastFetched: new Date() },
                });

            } catch (error) {
                console.error(`Scraper ${scraper.name} failed:`, error);
                results.errors++;
            }
        }

        console.log("Scraping finished. Starting LLM enrichment...");
        try {
            // 增加处理批次，确保更多信号被处理
            // 每批处理 50 条，最多处理 3 批（150 条）
            for (let batch = 0; batch < 3; batch++) {
                const pendingCount = await prisma.signal.count({
                    where: { aiSummary: null }
                });

                if (pendingCount === 0) {
                    console.log("✅ All signals have been processed by LLM.");
                    break;
                }

                console.log(`⏳ LLM Batch ${batch + 1}: ${pendingCount} signals pending...`);
                await this.processor.processSignals(50);
            }
        } catch (error) {
            console.error("LLM enrichment failed:", error);
        }

        console.log("Runner finished:", results);
        return results;
    }
}
