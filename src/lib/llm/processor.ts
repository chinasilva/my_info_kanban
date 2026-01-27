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

        for (const signal of signals) {
            try {
                console.log(`Processing signal: ${signal.title}`);
                const result = await client.generateSummaryAndCategory(signal.title, signal.summary || "");

                if (!result.summary || result.summary === 'Summary generation failed.') {
                    console.warn(`Skipping update for signal ${signal.id} due to failed generation.`);
                    continue;
                }

                await prisma.signal.update({
                    where: { id: signal.id },
                    data: {
                        summary: result.summary, // Displayable summary
                        aiSummary: result.summary, // Target field to track completion
                        aiSummaryZh: result.aiSummaryZh,
                        category: result.category,
                        tags: result.tags || [],
                        tagsZh: result.tagsZh || [],
                        titleTranslated: result.titleTranslated
                    }
                });
                console.log(`Enriched signal ${signal.id}`);
            } catch (error) {
                console.error(`Failed to process signal ${signal.id}:`, error);
            }
        }
    }
}
