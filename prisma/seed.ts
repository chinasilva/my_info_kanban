import "dotenv/config";

// 直接使用项目中的 prisma 实例
import { prisma } from "../src/lib/prisma/db";

const builtInSources = [
    // 原有数据源
    {
        name: "Hacker News",
        type: "hackernews",
        baseUrl: "https://news.ycombinator.com",
        icon: "🔶"
    },
    {
        name: "GitHub Trending",
        type: "github",
        baseUrl: "https://github.com",
        icon: "🐙"
    },
    {
        name: "Hugging Face",
        type: "huggingface",
        baseUrl: "https://huggingface.co",
        icon: "🤗"
    },
    {
        name: "Product Hunt",
        type: "producthunt",
        baseUrl: "https://www.producthunt.com",
        icon: "🚀"
    },
    {
        name: "Dev.to",
        type: "devto",
        baseUrl: "https://dev.to",
        icon: "👩‍💻"
    },
    {
        name: "CryptoPanic",
        type: "cryptopanic",
        baseUrl: "https://cryptopanic.com",
        icon: "₿"
    },
    {
        name: "Polymarket",
        type: "polymarket",
        baseUrl: "https://polymarket.com",
        icon: "📊"
    },
    {
        name: "Dune",
        type: "dune",
        baseUrl: "https://dune.com",
        icon: "📈"
    },
    {
        name: "Substack",
        type: "substack",
        baseUrl: "https://substack.com",
        icon: "📰"
    },
    // 需求挖掘数据源
    {
        name: "政府采购",
        type: "gov_procurement",
        baseUrl: "https://www.ccgp.gov.cn",
        icon: "🏛️"
    },
    {
        name: "行业研报",
        type: "research_report",
        baseUrl: "https://www.iresearch.com.cn",
        icon: "📑"
    },
    {
        name: "招聘信号",
        type: "recruitment",
        baseUrl: "https://www.zhipin.com",
        icon: "💼"
    },
    {
        name: "应用榜单",
        type: "app_rank",
        baseUrl: "https://www.qimai.cn",
        icon: "📱"
    },
    {
        name: "社区需求",
        type: "social_demand",
        baseUrl: "https://weibo.com",
        icon: "🔥"
    },
    {
        name: "海外趋势",
        type: "overseas_trend",
        baseUrl: "https://www.producthunt.com",
        icon: "🌍"
    },
];

async function main() {
    console.log("🌱 Seeding built-in sources...\n");

    for (const source of builtInSources) {
        const result = await prisma.source.upsert({
            where: { name: source.name },
            update: {
                type: source.type,
                baseUrl: source.baseUrl,
                icon: source.icon,
                isBuiltIn: true,
                isActive: true,
            },
            create: {
                name: source.name,
                type: source.type,
                baseUrl: source.baseUrl,
                icon: source.icon,
                isBuiltIn: true,
                isActive: true,
            },
        });
        console.log(`  ✅ ${source.icon} ${source.name} (${result.id})`);
    }

    console.log("\n🎉 Seeding complete!");
    console.log(`   Created/Updated ${builtInSources.length} built-in sources.`);
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
