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
    console.log("Searching for signals with 'Comments' in summary...");
    const signals = await prisma.signal.findMany({
        where: {
            summary: {
                contains: "omments", // Partial to avoid C vs c issues
                mode: 'insensitive'
            }
        }
    });

    console.log(`Found ${signals.length} signals.`);
    signals.forEach(s => {
        console.log(`ID: ${s.id}, Title: ${s.title}, Summary: "${s.summary}"`);
    });
}

main().catch(console.error);
