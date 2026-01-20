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

    // Find signals that are missing bilingual data
    const signalsToUpdate = await prisma.signal.findMany({
        where: {
            OR: [
                { aiSummaryZh: null },
                { titleTranslated: null }
            ]
        },
        take: 20, // Process 20 at a time to avoid rate limits
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${signalsToUpdate.length} signals needing update.`);

    const processor = new SignalProcessor();
    const { LLMFactory } = await import("../src/lib/llm/factory");
    const client = LLMFactory.createClient();

    if (!client) {
        console.error("No LLM client available.");
        return;
    }

    for (const signal of signalsToUpdate) {
        console.log(`Reprocessing: ${signal.title}`);
        try {
            // Use existing summary or title as input
            const inputContent = signal.summary || signal.title;
            const result = await client.generateSummaryAndCategory(signal.title, inputContent);

            await prisma.signal.update({
                where: { id: signal.id },
                data: {
                    // Update ONLY the new fields to avoid overwriting good data if LLM helps, 
                    // but actually we want to sync everything.
                    // Important: generateSummaryAndCategory returns inputs for tags/summary too.
                    aiSummaryZh: result.aiSummaryZh,
                    titleTranslated: result.titleTranslated,
                    // Optionally update text and aiSummary if they were missing too
                    aiSummary: signal.aiSummary || result.summary,
                    tags: result.tags && result.tags.length > 0 ? result.tags : undefined,
                    tagsZh: result.tagsZh && result.tagsZh.length > 0 ? result.tagsZh : undefined
                }
            });
            console.log(`Updated signal ${signal.id}`);
            // Sleep slightly (1s) as DeepSeek usually has higher rate limits than Gemini Free
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`Failed to update ${signal.id}:`, e);
        }
    }
}

main().catch(console.error);
