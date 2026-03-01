import { ScraperRunner } from "../lib/scraper/runner";
import { DemandValidator } from "../lib/llm/demand-validator";
import { writeFile } from "node:fs/promises";

async function writeSummaryFile(summary: unknown) {
    const path = process.env.SCRAPE_SUMMARY_PATH;
    if (!path) return;
    await writeFile(path, JSON.stringify(summary, null, 2), "utf-8");
    console.log(`Scrape summary written to ${path}`);
}

async function main() {
    console.log("Starting manual scraper trigger...");

    // 1. 运行爬虫
    const runner = new ScraperRunner();
    const runResults = await runner.runAll();
    console.log("Scraper finished.");
    console.log("Scraper status counts:", runResults.statusCounts);
    console.log("Scraper failure stats:", runResults.failureStats);

    // 2. 运行 LLM 需求信号验证
    console.log("Starting demand signal validation...");
    const validator = new DemandValidator();
    const validatedCount = await validator.validateAndUpdate();
    console.log(`Demand validation finished. Validated ${validatedCount} signals.`);

    await writeSummaryFile({
        generatedAt: new Date().toISOString(),
        runResults,
        demandValidation: {
            validatedCount,
        },
    });

    console.log("Manual trigger finished.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
