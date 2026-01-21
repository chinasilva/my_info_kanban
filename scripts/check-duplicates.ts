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
    const title = "Ask HN: Do you have any evidence that agentic coding works?";
    console.log(`Searching for all signals with title: "${title}"`);
    const signals = await prisma.signal.findMany({
        where: { title }
    });

    console.log(`Found ${signals.length} signals.`);
    signals.forEach(s => {
        console.log(JSON.stringify(s, null, 2));
    });
}

main().catch(console.error);
