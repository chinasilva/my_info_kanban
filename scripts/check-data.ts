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

// import { prisma } from "../src/lib/prisma/db";

async function main() {
    const { prisma } = await import("../src/lib/prisma/db");

    const signals = await prisma.signal.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            titleTranslated: true,
            aiSummary: true,
            aiSummaryZh: true
        }
    });

    console.log("Checking last 10 signals:");
    signals.forEach(s => {
        console.log(`[${s.id}] ${s.title.substring(0, 20)}...`);
        console.log(`   Translated: ${s.titleTranslated ? 'YES' : 'NO'}`);
        console.log(`   AI Summary: ${s.aiSummary ? 'YES' : 'NO'}`);
        console.log(`   AI Summary Zh: ${s.aiSummaryZh ? 'YES' : 'NO'}`);
        console.log('---');
    });
}

main();
