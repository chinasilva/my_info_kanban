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
    const { prisma } = await import("../src/lib/prisma/db");
    console.log("Searching for problematic signal...");
    const signal = await prisma.signal.findFirst({
        where: {
            title: {
                contains: "Ask HN: Do you have any evidence that agentic coding works?"
            }
        }
    });

    if (signal) {
        console.log("Found signal:");
        console.log(JSON.stringify(signal, null, 2));
    } else {
        console.log("Signal not found searching by exact title. Trying 'agentic coding'...");
        const signals = await prisma.signal.findMany({
            where: {
                title: {
                    contains: "agentic coding",
                    mode: 'insensitive'
                }
            }
        });
        console.log(`Found ${signals.length} signals.`);
        console.log(JSON.stringify(signals, null, 2));
    }
}

main().catch(console.error);
