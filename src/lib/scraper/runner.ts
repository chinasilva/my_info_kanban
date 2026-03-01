import { prisma } from "../prisma/db";
import { BaseScraper, FetchErrorCode, SourceFetchResult, classifyFetchError } from "./base";
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
import { GovProcurementScraper } from "./gov-procurement";
import { ResearchReportScraper } from "./research-report";
import { RecruitmentScraper } from "./recruitment";
import { AppRankScraper } from "./app-rank";
import { SocialDemandScraper } from "./social-demand";
import { OverseasTrendScraper } from "./overseas-trend";
import { SignalProcessor } from "../llm/processor";
import { Prisma, Source } from "@prisma/client";

// 内置 Scraper 映射
const BUILTIN_SCRAPERS: Record<string, (source: Source) => BaseScraper> = {
    hackernews: () => new HackerNewsScraper(),
    github: () => new GitHubTrendingScraper(),
    huggingface: () => new HuggingFaceScraper(),
    producthunt: () => new ProductHuntScraper(),
    devto: () => new DevToScraper(),
    cryptopanic: () => new CryptoPanicScraper(),
    polymarket: () => new PolymarketScraper(),
    dune: () => new DuneScraper(),
    substack: () => new SubstackScraper(),
    // 需求挖掘分组
    gov_procurement: (source) => new GovProcurementScraper(source),
    research_report: (source) => new ResearchReportScraper(source),
    recruitment: (source) => new RecruitmentScraper(source),
    app_rank: (source) => new AppRankScraper(source),
    social_demand: (source) => new SocialDemandScraper(source),
    overseas_trend: (source) => new OverseasTrendScraper(source),
};

interface ScraperWithSource {
    scraper: BaseScraper;
    sourceId: string;
}

interface RunnerStatusCounts {
    success: number;
    empty: number;
    soft_fail: number;
    hard_fail: number;
}

export interface ScraperRunResults {
    total: number;
    new: number;
    updated: number;
    errors: number;
    sourceSummary: SourceFetchResult[];
    failureStats: Partial<Record<FetchErrorCode, number>>;
    statusCounts: RunnerStatusCounts;
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
            return builtinFactory(source);
        }

        // RSS 类型使用通用 RSS Scraper
        if (source.type === "rss") {
            return new GenericRssScraper(source);
        }

        console.warn(`Unknown source type: ${source.type} for source ${source.name}`);
        return null;
    }

    async runAll(): Promise<ScraperRunResults> {
        console.log("Starting scraper runner...");
        const results: ScraperRunResults = {
            total: 0,
            new: 0,
            updated: 0,
            errors: 0,
            sourceSummary: [],
            failureStats: {},
            statusCounts: {
                success: 0,
                empty: 0,
                soft_fail: 0,
                hard_fail: 0,
            },
        };

        // 动态获取所有 Scraper
        const scraperList = await this.getScrapers();
        console.log(`Found ${scraperList.length} active sources`);

        for (const { scraper, sourceId } of scraperList) {
            scraper.resetRunState();
            const startedAt = Date.now();

            try {
                console.log(`Running scraper: ${scraper.name}`);
                const signals = await scraper.fetch();
                console.log(`Scraper ${scraper.name} found ${signals.length} signals.`);

                const errorCode = scraper.getLastErrorCode();
                const status =
                    signals.length > 0
                        ? "success"
                        : errorCode
                            ? "soft_fail"
                            : "empty";

                if (status === "soft_fail" && errorCode) {
                    results.errors++;
                    results.failureStats[errorCode] = (results.failureStats[errorCode] || 0) + 1;
                }
                results.statusCounts[status]++;

                for (const signal of signals) {
                    try {
                        // 先检查是否存在，以区分 new 和 updated
                        const existing = await prisma.signal.findUnique({
                            where: { url: signal.url },
                            select: { id: true },
                        });

                        if (existing) {
                            // 更新现有记录
                            await prisma.signal.update({
                                where: { url: signal.url },
                                data: {
                                    score: signal.score,
                                    ...(signal.summary !== undefined ? { summary: signal.summary } : {}),
                                    ...(signal.metadata !== undefined
                                        ? {
                                            metadata:
                                                signal.metadata === null
                                                    ? Prisma.JsonNull
                                                    : (signal.metadata as Prisma.InputJsonValue),
                                        }
                                        : {}),
                                    ...(signal.platform !== undefined ? { platform: signal.platform } : {}),
                                },
                            });
                            results.updated++;
                        } else {
                            // 创建新记录
                            await prisma.signal.create({
                                data: {
                                    title: signal.title,
                                    url: signal.url,
                                    score: signal.score,
                                    sourceId: sourceId,
                                    category: signal.category,
                                    externalId: signal.externalId,
                                    summary: signal.summary,
                                    platform: signal.platform,
                                    metadata:
                                        signal.metadata === null
                                            ? Prisma.JsonNull
                                            : ((signal.metadata ?? {}) as Prisma.InputJsonValue),
                                },
                            });
                            results.new++;
                        }
                        results.total++;
                    } catch (e) {
                        console.error(`Error saving signal ${signal.url}:`, e);
                        results.errors++;
                    }
                }

                // 更新数据源的最后抓取时间
                await prisma.source.update({
                    where: { id: sourceId },
                    data: { lastFetched: new Date() },
                });

                results.sourceSummary.push({
                    sourceId,
                    sourceName: scraper.name,
                    attemptedEndpoint: scraper.getAttemptedEndpoint(),
                    status,
                    errorCode,
                    signalCount: signals.length,
                    durationMs: Date.now() - startedAt,
                });
            } catch (error) {
                console.error(`Scraper ${scraper.name} failed:`, error);
                results.errors++;
                const errorCode = classifyFetchError(error);
                results.failureStats[errorCode] = (results.failureStats[errorCode] || 0) + 1;
                results.statusCounts.hard_fail++;
                results.sourceSummary.push({
                    sourceId,
                    sourceName: scraper.name,
                    attemptedEndpoint: scraper.getAttemptedEndpoint(),
                    status: "hard_fail",
                    errorCode,
                    signalCount: 0,
                    durationMs: Date.now() - startedAt,
                });
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

        console.log("Runner status summary:", results.statusCounts);
        console.log("Runner failure stats:", results.failureStats);
        console.log("Runner finished:", results);
        return results;
    }
}
