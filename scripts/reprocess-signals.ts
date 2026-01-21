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
    const { SignalProcessor } = await import("../src/lib/llm/processor");

    console.log("🛠️ Starting Option B Data Migration & Reprocessing...\n");

    // Phase 1: Data Migration (summary -> metadata)
    const hnSignals = await prisma.signal.findMany({
        where: {
            source: { type: 'hackernews' },
            summary: { startsWith: 'Comments:' }
        }
    });

    console.log(`📦 Found ${hnSignals.length} Hacker News signals to migrate.`);

    for (const signal of hnSignals) {
        const match = signal.summary?.match(/Comments: (\d+)/);
        if (match) {
            const comments = parseInt(match[1]);
            await prisma.signal.update({
                where: { id: signal.id },
                data: {
                    metadata: { comments },
                    summary: null,
                    aiSummary: null // Reset to trigger processor
                }
            });
        }
    }
    console.log("✅ Data migration complete.\n");

    // Phase 2: AI Reprocessing
    const processor = new SignalProcessor();
    console.log("🤖 Starting AI Reprocessing (batch size 20)...");

    let totalProcessed = 0;
    while (true) {
        // We use the processor's own logic which now checks aiSummary: null
        const signalsToProcess = await prisma.signal.count({
            where: { aiSummary: null }
        });

        if (signalsToProcess === 0) break;

        console.log(`⏳ Remaining: ${signalsToProcess} signals...`);
        await processor.processSignals(20);
        totalProcessed += 20;

        // Safety break if needed, but we'll let it run
        if (totalProcessed > 1000) {
            console.log("⚠️ Limit reached for this run.");
            break;
        }
    }

    console.log(`\n🎉 All done! Processed ~${totalProcessed} signals.`);
    await prisma.$disconnect();
}

main().catch(console.error);
