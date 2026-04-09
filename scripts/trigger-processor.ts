
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

async function triggerProcessor() {
    let prisma;
    try {
        const { prisma: db } = await import("../src/lib/prisma/db");
        prisma = db;
        const { SignalProcessor } = await import("../src/lib/llm/processor");

        const processor = new SignalProcessor();
        console.log("🤖 Starting Manual Signal Processing...");

        const batchSize = Math.max(parseInt(process.env.BACKFILL_BATCH_SIZE || "10", 10), 1);
        const maxBatches = Math.max(parseInt(process.env.BACKFILL_MAX_BATCHES || "6", 10), 1);
        const maxMinutes = Math.max(parseInt(process.env.BACKFILL_MAX_MINUTES || "35", 10), 1);
        const chunkSize = Math.max(parseInt(process.env.BACKFILL_CHUNK_SIZE || "3", 10), 1);
        const cooldownBaseSeconds = Math.max(parseInt(process.env.BACKFILL_COOLDOWN_BASE_SECONDS || "900", 10), 30);
        const startAt = Date.now();

        let batchCount = 0;
        let totalUpdated = 0;

        console.log(
            `⚙️ Config: batchSize=${batchSize}, maxBatches=${maxBatches}, maxMinutes=${maxMinutes}, chunkSize=${chunkSize}, cooldownBaseSeconds=${cooldownBaseSeconds}`
        );

        while (true) {
            if (batchCount >= maxBatches) {
                console.log(`⚠️ Reached maxBatches (${maxBatches}). Stopping.`);
                break;
            }

            const elapsedMinutes = (Date.now() - startAt) / 1000 / 60;
            if (elapsedMinutes >= maxMinutes) {
                console.log(`⚠️ Reached maxMinutes (${maxMinutes}). Stopping.`);
                break;
            }

            const remaining = await prisma.signal.count({
                where: { aiSummary: null }
            });

            if (remaining === 0) {
                console.log("✅ All signals processed!");
                break;
            }

            console.log(`\n📦 Batch ${batchCount + 1}: Found ${remaining} pending signals.`);

            // Process a batch
            const result = await processor.processSignals(batchSize, {
                chunkSize,
                enablePerItemFallback: true,
                enableFailureCooldown: true,
                failureCooldownBaseSeconds: cooldownBaseSeconds,
                candidateMultiplier: 8,
            });
            totalUpdated += result.updated;
            console.log(
                `✅ Batch ${batchCount + 1} done. fetched=${result.fetched}, updated=${result.updated}`
            );
            batchCount++;
        }

        const finalRemaining = await prisma.signal.count({
            where: { aiSummary: null }
        });
        console.log(
            `📊 Backfill summary: batches=${batchCount}, totalUpdated=${totalUpdated}, stillPending=${finalRemaining}`
        );

    } catch (error) {
        console.error("❌ Error processing signals:", error);
    } finally {
        if (prisma) await prisma.$disconnect();
    }
}

triggerProcessor();
