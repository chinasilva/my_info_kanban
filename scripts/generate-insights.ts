
import * as dotenv from 'dotenv';
dotenv.config();
console.log("DEBUG: DATABASE_URL is", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("DEBUG: CWD is", process.cwd());

import { prisma } from "../src/lib/prisma/db";
import { LLMFactory } from "../src/lib/llm/factory";
import { InsightType } from "@prisma/client";

async function generateInsights() {
    console.log("🔍 Fetching high-quality signals from the last 24 hours...");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch all signals with decent score, regardless of source
    const signals = await prisma.signal.findMany({
        where: {
            createdAt: { gte: twentyFourHoursAgo },
            score: { gte: 60 } // Lower threshold slightly to get more context
        },
        include: {
            source: true
        },
        take: 50 // Avoid context window overflow
    });

    if (signals.length < 5) {
        console.log("⚠️ Not enough signals to generate insights.");
        return;
    }

    console.log(`✅ Found ${signals.length} signals. Analyzing...`);

    // Prepare prompt
    const signalContext = signals.map(s => {
        const summary = s.summary || s.aiSummary || "No summary";
        const truncatedSummary = summary.length > 500 ? summary.substring(0, 500) + "..." : summary;
        return `
ID: ${s.id}
Title: ${s.title}
Source: ${s.source.name} (${s.source.type})
Summary: ${truncatedSummary}
Tags: ${s.tags.join(", ")}
`;
    }).join("\n---\n");

    const prompt = `
You are an expert bilingual Tech Intelligence Analyst.
Analyze the following list of latest tech signals (GitHub repos, HackerNews discussions, ProductHunt launches, Blog posts, etc.).

Your goal is to find **CROSS-SOURCE INSIGHTS**. 
Look for connections between different items, such as:
1. **Trend Resonance**: A concept appearing across multiple sources (e.g. a new AI agent framework on GitHub + a detailed discussion on HN + a launch on PH).
2. **Causality**: Events in the market effecting code/dev tools (e.g. Crypto price surge -> more trading bots).
3. **Contrast**: Difference in reception between audiences (e.g. VCs love it on twitter, Devs hate it on HN).

Generate exactly 3 insights.
For each insight, you MUST cite at least 2 specific Signal IDs that support it.

Output strictly in this JSON format:
[
  {
    "title": "English Title (Short & Punchy)",
    "titleZh": "中文标题 (简短有力)",
    "content": "Deep analysis in English (2-3 sentences). Explain the connection.",
    "contentZh": "中文深度分析 (2-3 句话). 解释其中的关联。",
    "type": "TREND" | "CAUSALITY" | "CONTRAST",
    "score": 85,
    "relatedSignalIds": ["id_1", "id_2"]
  }
]

Signals:
${signalContext}
`;

    try {
        const client = LLMFactory.createClient();
        if (!client) {
            throw new Error("No LLM client configured.");
        }

        const responseText = await client.generate(prompt);
        // Clean up markdown block if present
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
        const insights = JSON.parse(jsonStr);

        console.log(`🎉 Generated ${insights.length} insights. Saving to DB...`);

        for (const item of insights) {
            // Validate mapping to InsightType enum
            let type: InsightType = "TREND";
            if (["TREND", "CAUSALITY", "CONTRAST"].includes(item.type)) {
                type = item.type as InsightType;
            }

            // Filter valid signal IDs
            const validSignalIds = item.relatedSignalIds.filter((id: string) =>
                signals.some(s => s.id === id)
            );

            if (validSignalIds.length < 2) {
                console.log(`Skipping insight "${item.title}" due to insufficient valid signals.`);
                continue;
            }

            await prisma.insight.create({
                data: {
                    title: item.title,
                    titleZh: item.titleZh,
                    content: item.content,
                    contentZh: item.contentZh,
                    type: type,
                    score: item.score || 80,
                    date: new Date(),
                    signals: {
                        connect: validSignalIds.map((id: string) => ({ id }))
                    }
                }
            });
            console.log(`  -> Saved: ${item.titleZh}`);
        }

    } catch (error) {
        console.error("❌ Error generating insights:", error);
    }
}

// Run (if called directly)
if (require.main === module) {
    generateInsights()
        .then(() => prisma.$disconnect())
        .catch(async (e) => {
            console.error(e);
            await prisma.$disconnect();
            process.exit(1);
        });
}
