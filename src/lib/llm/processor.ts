import { prisma } from "../prisma/db";
import { LLMFactory } from "./factory";
import redis from "../cache/redis";

const DEFAULT_CANDIDATE_MULTIPLIER = 5;
const DEFAULT_MAX_COOLDOWN_SECONDS = 6 * 60 * 60; // 6h

type ProcessSignalsOptions = {
    chunkSize?: number;
    enablePerItemFallback?: boolean;
    enableFailureCooldown?: boolean;
    failureCooldownBaseSeconds?: number;
    candidateMultiplier?: number;
};

export class SignalProcessor {
    private getFailKey(signalId: string): string {
        return `llm:signal:fail:${signalId}`;
    }

    private getCooldownKey(signalId: string): string {
        return `llm:signal:cooldown:${signalId}`;
    }

    private async isCoolingDown(signalId: string): Promise<boolean> {
        if (!redis) return false;
        try {
            const value = await redis.get(this.getCooldownKey(signalId));
            return Boolean(value);
        } catch (error) {
            console.warn(`Failed to read cooldown for signal ${signalId}:`, error);
            return false;
        }
    }

    private async markFailed(signalId: string, baseSeconds: number): Promise<void> {
        if (!redis) return;
        try {
            const failKey = this.getFailKey(signalId);
            const failCount = await redis.incr(failKey);
            // Keep historical fail count for one week.
            await redis.expire(failKey, 7 * 24 * 60 * 60);

            const exp = Math.min(Math.max(failCount - 1, 0), 8);
            const cooldownSeconds = Math.min(baseSeconds * Math.pow(2, exp), DEFAULT_MAX_COOLDOWN_SECONDS);

            const cooldownKey = this.getCooldownKey(signalId);
            await redis.set(cooldownKey, String(Date.now()), "EX", Math.floor(cooldownSeconds));
        } catch (error) {
            console.warn(`Failed to mark signal ${signalId} as failed:`, error);
        }
    }

    private async clearFailureState(signalId: string): Promise<void> {
        if (!redis) return;
        try {
            await redis.del(this.getFailKey(signalId), this.getCooldownKey(signalId));
        } catch (error) {
            console.warn(`Failed to clear failure state for signal ${signalId}:`, error);
        }
    }

    private toChunks<T>(items: T[], chunkSize: number): T[][] {
        const size = Math.max(1, chunkSize);
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }

    async processSignals(
        batchSize: number = 20,
        options: ProcessSignalsOptions = {}
    ): Promise<{ requested: number; updated: number; fetched: number }> {
        const client = LLMFactory.createClient();
        if (!client) {
            console.log("LLM client not configured, skipping enrichment.");
            return { requested: batchSize, updated: 0, fetched: 0 };
        }

        const chunkSize = Math.max(1, options.chunkSize ?? batchSize);
        const enablePerItemFallback = options.enablePerItemFallback ?? false;
        const enableFailureCooldown = options.enableFailureCooldown ?? false;
        const failureCooldownBaseSeconds = Math.max(30, options.failureCooldownBaseSeconds ?? 15 * 60);
        const candidateMultiplier = Math.max(1, options.candidateMultiplier ?? DEFAULT_CANDIDATE_MULTIPLIER);
        const candidateTake = Math.max(batchSize, batchSize * candidateMultiplier);

        // Find signals that need AI summary (aiSummary is null)
        // Even if summary exists (e.g., "Comments: 62"), we still need AI processing
        const candidates = await prisma.signal.findMany({
            where: {
                aiSummary: null,
            },
            take: candidateTake,
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (candidates.length === 0) {
            console.log("Found 0 signals to process.");
            return { requested: batchSize, updated: 0, fetched: 0 };
        }

        let signals = candidates;
        if (enableFailureCooldown) {
            const filtered: typeof candidates = [];
            for (const item of candidates) {
                const coolingDown = await this.isCoolingDown(item.id);
                if (!coolingDown) {
                    filtered.push(item);
                }
                if (filtered.length >= batchSize) {
                    break;
                }
            }
            signals = filtered;
            console.log(`Found ${signals.length} signals to process after cooldown filter (candidates=${candidates.length}).`);
        } else {
            signals = candidates.slice(0, batchSize);
            console.log(`Found ${signals.length} signals to process.`);
        }

        if (signals.length === 0) {
            return { requested: batchSize, updated: 0, fetched: 0 };
        }

        try {
            let successCount = 0;
            const chunks = this.toChunks(signals, chunkSize);

            for (const chunk of chunks) {
                const signalsData = chunk.map(s => ({
                    id: s.id,
                    title: s.title,
                    content: s.summary || ''
                }));

                const results = await client.generateSummaryAndCategories(signalsData);
                console.log(`Chunk processing completed, got ${results.length} results (chunkSize=${chunk.length}).`);

                const resultMap = new Map(results.map((r) => [r.signalId, r]));

                for (const signal of chunk) {
                    let result = resultMap.get(signal.id);

                    // 批量失败时，降级到单条处理，避免整批吞掉。
                    if ((!result || !result.summary || result.summary === "Summary generation failed.") && enablePerItemFallback) {
                        try {
                            const single = await client.generateSummaryAndCategory(signal.title, signal.summary || "");
                            result = { signalId: signal.id, ...single };
                        } catch (fallbackError) {
                            console.warn(`Fallback processing failed for signal ${signal.id}:`, fallbackError);
                            result = undefined;
                        }
                    }

                    if (!result || !result.summary || result.summary === 'Summary generation failed.') {
                        console.warn(`Skipping update for signal ${signal.id} due to failed generation.`);
                        if (enableFailureCooldown) {
                            await this.markFailed(signal.id, failureCooldownBaseSeconds);
                        }
                        continue;
                    }

                    try {
                        await prisma.signal.update({
                            where: { id: signal.id },
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
                        if (enableFailureCooldown) {
                            await this.clearFailureState(signal.id);
                        }
                    } catch (updateError) {
                        console.error(`Failed to update signal ${signal.id}:`, updateError);
                        if (enableFailureCooldown) {
                            await this.markFailed(signal.id, failureCooldownBaseSeconds);
                        }
                    }
                }
            }

            console.log(`Enriched ${successCount}/${signals.length} signals.`);
            return { requested: batchSize, updated: successCount, fetched: signals.length };
        } catch (error) {
            console.error('Batch processing failed:', error);
            if (enableFailureCooldown) {
                for (const signal of signals) {
                    await this.markFailed(signal.id, failureCooldownBaseSeconds);
                }
            }
            return { requested: batchSize, updated: 0, fetched: signals.length };
        }
    }
}
