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
console.log("Environment loaded.");

async function main() {
    // Dynamic import to ensure env is loaded first
    const { SignalProcessor } = await import("../src/lib/llm/processor");
    const { prisma } = await import("../src/lib/prisma/db");

    console.log("Starting LLM Test...");

    // Create a dummy signal if none exist just for testing, or pick last one
    const signal = await prisma.signal.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!signal) {
        console.log("No signals found to process.");
        return;
    }

    console.log(`Testing with signal: ${signal.title}`);

    // Reset summary to null to force processing if needed, or just run processor
    // The processor looks for summary: null. 
    // Let's force one signal to have null summary for testing.
    await prisma.signal.update({
        where: { id: signal.id },
        data: { summary: null, aiSummary: null, tags: [], titleTranslated: null }
    });

    const processor = new SignalProcessor();
    await processor.processSignals(1);

    // Check result
    const updated = await prisma.signal.findUnique({
        where: { id: signal.id }
    });

    console.log("Result:", {
        tags: updated?.tags,
        aiSummary: updated?.aiSummary,
        aiSummaryZh: updated?.aiSummaryZh,
        titleTranslated: updated?.titleTranslated
    });

    await prisma.$disconnect();
}

main().catch(console.error);
