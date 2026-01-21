
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

        let totalProcessed = 0;
        let batchCount = 0;

        while (true) {
            const remaining = await prisma.signal.count({
                where: { aiSummary: null }
            });

            if (remaining === 0) {
                console.log("✅ All signals processed!");
                break;
            }

            console.log(`\n📦 Batch ${batchCount + 1}: Found ${remaining} pending signals.`);

            // Process a batch
            await processor.processSignals(10); // Smaller batch to see progress
            totalProcessed += 10;
            batchCount++;

            // Optional: Safety break
            if (batchCount > 20) {
                console.log("⚠️ Safety limit reached (20 batches). Stopping.");
                break;
            }
        }

    } catch (error) {
        console.error("❌ Error processing signals:", error);
    } finally {
        if (prisma) await prisma.$disconnect();
    }
}

triggerProcessor();
