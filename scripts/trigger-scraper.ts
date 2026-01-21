import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

async function main() {
    const { ScraperRunner } = await import("../src/lib/scraper/runner");

    console.log("🚀 Starting Manual Hourly Scraper Run...");
    const runner = new ScraperRunner();
    const results = await runner.runAll();

    console.log("✅ Scraper Finished:", results);
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Scraper Failed:", err);
    process.exit(1);
});
