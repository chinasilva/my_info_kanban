
import { ScraperRunner } from "../lib/scraper/runner";
import { DemandValidator } from "../lib/llm/demand-validator";

async function main() {
    console.log("Starting manual scraper trigger...");

    // 1. 运行爬虫
    const runner = new ScraperRunner();
    await runner.runAll();
    console.log("Scraper finished.");

    // 2. 运行 LLM 需求信号验证
    console.log("Starting demand signal validation...");
    const validator = new DemandValidator();
    const validatedCount = await validator.validateAndUpdate();
    console.log(`Demand validation finished. Validated ${validatedCount} signals.`);

    console.log("Manual trigger finished.");
}

main().catch(console.error);
