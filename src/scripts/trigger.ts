
import { ScraperRunner } from "../lib/scraper/runner";

async function main() {
    console.log("Starting manual scraper trigger...");
    const runner = new ScraperRunner();
    await runner.runAll();
    console.log("Manual trigger finished.");
}

main().catch(console.error);
