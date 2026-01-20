import "dotenv/config";

// 直接使用项目中的 prisma 实例
import { prisma } from "../src/lib/prisma/db";

const builtInSources = [
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
