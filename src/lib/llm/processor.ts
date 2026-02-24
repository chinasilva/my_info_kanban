import { prisma } from "../prisma/db";
import { LLMFactory } from "./factory";

export class SignalProcessor {
    async processSignals(batchSize: number = 20) {
        const client = LLMFactory.createClient();
        if (!client) {
            console.log("LLM client not configured, skipping enrichment.");
            return;
        }

        // Find signals that need AI summary (aiSummary is null)
        // Even if summary exists (e.g., "Comments: 62"), we still need AI processing
        const signals = await prisma.signal.findMany({
            where: {
                aiSummary: null,
            },
            take: batchSize,
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`Found ${signals.length} signals to process.`);

        if (signals.length === 0) {
            return;
        }

        // 准备批量数据
        const signalsData = signals.map(s => ({
            id: s.id,
            title: s.title,
            content: s.summary || ''
        }));

        try {
            // 一次性调用批量处理
            const results = await client.generateSummaryAndCategories(signalsData);
            console.log(`Batch processing completed, got ${results.length} results.`);

            if (results.length === 0) {
                console.warn('Batch processing returned no results.');
                return;
            }

            // 逐个更新数据库
            let successCount = 0;
            for (const result of results) {
                if (!result.summary || result.summary === 'Summary generation failed.') {
                    console.warn(`Skipping update for signal ${result.signalId} due to failed generation.`);
                    continue;
                }

                try {
                    await prisma.signal.update({
                        where: { id: result.signalId },
                        data: {
                            summary: result.summary,
                            aiSummary: result.summary,
                            aiSummaryZh: result.aiSummaryZh,
                            category: result.category,
                            tags: result.tags || [],
                            tagsZh: result.tagsZh || [],
                            titleTranslated: result.titleTranslated
                        }
                    });
                    successCount++;
                } catch (updateError) {
                    console.error(`Failed to update signal ${result.signalId}:`, updateError);
                }
            }
            console.log(`Enriched ${successCount}/${results.length} signals.`);
        } catch (error) {
            console.error('Batch processing failed:', error);
        }
    }
}
