
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

async function analyzeSignals() {
    let prisma;
    try {
        const dbModule = await import("../src/lib/prisma/db"); // Dynamic import
        prisma = dbModule.prisma;

        console.log("🔍 Analyzing Signals for Missing AI Summaries...");

        const totalSignals = await prisma.signal.count();
        const missingAiSummary = await prisma.signal.count({
            where: { aiSummary: null }
        });
        const missingAiSummaryZh = await prisma.signal.count({
            where: { aiSummaryZh: null }
        });

        console.log(`\n📊 Stats:`);
        console.log(`Total Signals: ${totalSignals}`);
        console.log(`Missing aiSummary: ${missingAiSummary}`);
        console.log(`Missing aiSummaryZh: ${missingAiSummaryZh}`);

        if (missingAiSummary > 0) {
            console.log(`\n📋 Details of signals missing AI Summary (top 20):`);
            const incompleteSignals = await prisma.signal.findMany({
                where: { aiSummary: null },
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: { source: true }
            });

            incompleteSignals.forEach(s => {
                console.log(`- [${s.source.type}] ${s.title} (ID: ${s.id}, CreatedAt: ${s.createdAt.toISOString()})`);
                console.log(`  Summary: ${s.summary || 'NULL'}`);
                console.log(`  Metadata: ${JSON.stringify(s.metadata)}`);
            });
        }

        // Check specifically for recent signals
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recentMissing = await prisma.signal.count({
            where: {
                createdAt: { gte: oneDayAgo },
                aiSummary: null
            }
        });
        console.log(`\n🕒 Recent (last 24h) Missing aiSummary: ${recentMissing}`);

    } catch (error) {
        console.error("Error running analysis:", error);
    } finally {
        if (prisma) await prisma.$disconnect();
    }
}

analyzeSignals();
