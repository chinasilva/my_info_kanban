import { prisma } from "../prisma/db";
import { LLMFactory } from "./factory";

export class SignalProcessor {
    async processSignals(batchSize: number = 5) {
        const client = LLMFactory.createClient();
        if (!client) {
            console.log("LLM client not configured, skipping enrichment.");
            return;
        }

        // Find signals that need summary
        // We can prioritize by score or recentness
        const signals = await prisma.signal.findMany({
            where: {
                summary: null,
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

                // If summary is still empty after LLM, use a placeholder to prevent infinite retries
                // This saves tokens by ensuring we don't process the same 'unsummarizable' content forever.
                const finalSummary = result.summary || "No summary available.";

                await prisma.signal.update({
                    where: { id: signal.id },
                    data: {
                        summary: finalSummary,
                        aiSummary: result.summary, // Start saving to specialized field too
                        category: result.category,
                        tags: result.tags || [],
                        tagsZh: result.tagsZh || [],
                        aiSummaryZh: result.aiSummaryZh,
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
