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
    const runner = new ScraperRunner();

    console.log("🚀 Starting Manual Scraper Run...");
    const results = await runner.runAll();
    console.log("✅ Scraper Run Finished:", results);
}

main().catch(console.error);
