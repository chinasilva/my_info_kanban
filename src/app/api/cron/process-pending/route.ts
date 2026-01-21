import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { SignalProcessor } from "@/lib/llm/processor";

/**
 * 专门用于处理未被 LLM 总结的信号
 * 可以通过 cron 定时调用，作为补救机制
 * 
 * 调用方式：GET /api/cron/process-pending
 * 参数：
 *   - batchSize: 每批处理数量，默认 50
 *   - maxBatches: 最大批次数，默认 5（即最多处理 250 条）
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batchSize") || "50");
    const maxBatches = parseInt(searchParams.get("maxBatches") || "5");

    try {
        const processor = new SignalProcessor();

        // 统计待处理数量
        const pendingCount = await prisma.signal.count({
            where: { aiSummary: null }
        });

        if (pendingCount === 0) {
            return NextResponse.json({
                success: true,
                message: "No pending signals to process",
                stats: { pending: 0, processed: 0 }
            });
        }

        console.log(`📋 Found ${pendingCount} signals pending LLM processing`);

        let totalProcessed = 0;
        let batchCount = 0;

        // 循环处理直到完成或达到限制
        while (batchCount < maxBatches) {
            const remaining = await prisma.signal.count({
                where: { aiSummary: null }
            });

            if (remaining === 0) {
                console.log("✅ All pending signals processed!");
                break;
            }

            console.log(`⏳ Batch ${batchCount + 1}: Processing ${Math.min(batchSize, remaining)} signals...`);

            await processor.processSignals(batchSize);
            totalProcessed += Math.min(batchSize, remaining);
            batchCount++;
        }

        // 获取最终状态
        const stillPending = await prisma.signal.count({
            where: { aiSummary: null }
        });

        return NextResponse.json({
            success: true,
            message: `Processed ${totalProcessed} signals in ${batchCount} batches`,
            stats: {
                initialPending: pendingCount,
                processed: totalProcessed,
                stillPending: stillPending,
                batches: batchCount
            }
        });

    } catch (error: any) {
        console.error("❌ Error processing pending signals:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
