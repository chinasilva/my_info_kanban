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
    // 视频数据源（多语言字幕优先，0 成本外链模式）
    {
        name: "TED 视频",
        type: "youtube_video",
        baseUrl: "https://www.youtube.com/@TED",
        icon: "🎥",
        config: {
            channelId: "UCAuUUnT6oDeKwE6v1NGQxug",
            group: "news",
            regionHint: "ALL",
            subtitleLangs: ["en", "zh"],
            requiredSubtitleLangs: ["en", "zh"],
            requireSubtitles: true,
            maxItems: 10,
            category: "News/Insight"
        }
    },
    {
        name: "Google for Developers 视频",
        type: "youtube_video",
        baseUrl: "https://www.youtube.com/@GoogleDevelopers",
        icon: "🛠️",
        config: {
            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
            group: "build",
            regionHint: "GLOBAL",
            subtitleLangs: ["en"],
            requiredSubtitleLangs: ["en"],
            requireSubtitles: true,
            maxItems: 10,
            category: "Build"
        }
    },
    {
        name: "Microsoft Developer 视频",
        type: "youtube_video",
        baseUrl: "https://www.youtube.com/@MicrosoftDeveloper",
        icon: "💻",
        config: {
            channelId: "UCsMica-v34Irf9KVTh6xx-g",
            group: "build",
            regionHint: "GLOBAL",
            subtitleLangs: ["en"],
            requiredSubtitleLangs: ["en"],
            requireSubtitles: true,
            maxItems: 10,
            category: "Build"
        }
    },
    {
        name: "AWS 视频",
        type: "youtube_video",
        baseUrl: "https://www.youtube.com/channel/UCd6MoB9NC6uYN2grvUNT-Zg",
        icon: "☁️",
        config: {
            channelId: "UCd6MoB9NC6uYN2grvUNT-Zg",
            group: "build",
            regionHint: "GLOBAL",
            subtitleLangs: ["en"],
            requiredSubtitleLangs: ["en"],
            requireSubtitles: true,
            maxItems: 10,
            category: "Build"
        }
    },
    {
        name: "Y Combinator 视频",
        type: "youtube_video",
        baseUrl: "https://www.youtube.com/@YCombinator",
        icon: "🚀",
        config: {
            channelId: "UCcefcZRL2oaA_uBNeo5UOWg",
            group: "launch",
            regionHint: "GLOBAL",
            subtitleLangs: ["en"],
            requiredSubtitleLangs: ["en"],
            requireSubtitles: true,
            maxItems: 10,
            category: "Launch"
        }
    },
    {
        name: "a16z 视频",
        type: "youtube_video",
        baseUrl: "https://www.youtube.com/@a16z",
        icon: "📣",
        config: {
            channelId: "UC9cn0TuPq4dnbTY-CBsm8XA",
            group: "launch",
            regionHint: "GLOBAL",
            subtitleLangs: ["en"],
            requiredSubtitleLangs: ["en"],
            requireSubtitles: true,
            maxItems: 10,
            category: "Launch"
        }
    },
    {
        name: "Bilibili 视频（需自建 RSSHub）",
        type: "bilibili_video",
        baseUrl: "https://www.bilibili.com",
        icon: "📺",
        isActive: false,
        config: {
            // 建议替换成你的自建 RSSHub 路由，避免公共实例限流
            feedUrl: "https://rsshub.your-domain.com/bilibili/user/video/2",
            group: "build",
            regionHint: "CN",
            subtitleLangs: ["zh"],
            requiredSubtitleLangs: ["zh"],
            requireSubtitles: true,
            maxItems: 10,
            category: "CN Build"
        }
    },
    // 需求挖掘数据源
    {
        name: "政府采购",
        type: "gov_procurement",
        baseUrl: "https://www.ccgp.gov.cn",
        icon: "🏛️",
        config: { sourceType: "ccgp" }
    },
    {
        name: "行业研报",
        type: "research_report",
        baseUrl: "https://www.iresearch.com.cn",
        icon: "📑",
        config: { sourceType: "iresearch" }
    },
    {
        name: "招聘信号",
        type: "recruitment",
        baseUrl: "https://www.zhipin.com",
        icon: "💼",
        config: { sourceType: "boss", keyword: "AI" }
    },
    {
        name: "应用榜单",
        type: "app_rank",
        baseUrl: "https://www.qimai.cn",
        icon: "📱",
        config: { sourceType: "itunes", country: "cn" }
    },
    {
        name: "社区需求",
        type: "social_demand",
        baseUrl: "https://weibo.com",
        icon: "🔥",
        config: { sourceType: "weibo" }
    },
    {
        name: "海外趋势",
        type: "overseas_trend",
        baseUrl: "https://www.producthunt.com",
        icon: "🌍",
        config: { sourceType: "producthunt" }
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
                isActive: source.isActive ?? true,
                ...(source.config && { config: source.config }),
            },
            create: {
                name: source.name,
                type: source.type,
                baseUrl: source.baseUrl,
                icon: source.icon,
                isBuiltIn: true,
                isActive: source.isActive ?? true,
                ...(source.config && { config: source.config }),
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
