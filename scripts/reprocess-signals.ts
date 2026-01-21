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

    console.log("🛠️ Starting Deep Clean & Reprocessing...\n");

    // 1. 强制清理所有含有 "Comments:" 的摘要
    const badSignals = await prisma.signal.findMany({
        where: {
            OR: [
                { summary: { contains: 'Comments', mode: 'insensitive' } },
                { summary: { contains: '评论', mode: 'insensitive' } }
            ]
        }
    });

    console.log(`🧹 Found ${badSignals.length} signals with comment data in summary field. Cleaning...`);

    for (const signal of badSignals) {
        const match = signal.summary?.match(/(?:Comments|评论): (\d+)/);
        const comments = match ? parseInt(match[1]) : null;

        await prisma.signal.update({
            where: { id: signal.id },
            data: {
                summary: null, // 彻底清除
                aiSummary: null, // 强制重新处理
                aiSummaryZh: null,
                metadata: comments ? { comments } : (signal.metadata || {})
            }
        });
    }
    console.log("✅ Cleanup complete.\n");

    // 2. 运行处理器处理所有 aiSummary 为 null 的信号
    const processor = new SignalProcessor();
    console.log("🤖 Running LLM enrichment for all empty signals...");

    let totalProcessed = 0;
    while (true) {
        const count = await prisma.signal.count({ where: { aiSummary: null } });
        if (count === 0) break;

        console.log(`⏳ Remaining: ${count} signals. Processing batch...`);
        await processor.processSignals(20);
        totalProcessed += 20;

        if (totalProcessed > 500) {
            console.log("⚠️ Limit reached to avoid long wait.");
            break;
        }
    }

    console.log(`\n🎉 Processed ~${totalProcessed} signals.`);
    await prisma.$disconnect();
}

main().catch(console.error);
