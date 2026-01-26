import { prisma } from "@/lib/prisma/db";
import { Signal } from "@/schemas/signal";
import { Settings } from "lucide-react";
import { getTranslations } from 'next-intl/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";

export const revalidate = 60; // Revalidate every minute

// 数据源类型到分组的映射
const SOURCE_GROUPS: Record<string, string[]> = {
  build: ["github", "huggingface", "devto"],
  market: ["polymarket", "cryptopanic", "dune"],
  news: ["hackernews", "substack"],
  launch: ["producthunt"],
};

export default async function DashboardPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("Dashboard");
  const searchParams = await props.searchParams;

  // 未登录用户不重定向，允许浏览
  // if (!session?.user?.id) {
  //   redirect("/login");
  // }

  let subscribedSourceIds: string[] = [];

  if (session?.user?.id) {
    // 获取用户订阅的数据源
    const userSources = await prisma.userSource.findMany({
      where: {
        userId: session.user.id,
        isEnabled: true
      },
      include: {
        source: true
      },
      orderBy: { displayOrder: "asc" },
    });
    subscribedSourceIds = userSources.map((us) => us.sourceId);

    // 如果用户登录了但没有订阅任何数据源，显示引导页面
    if (subscribedSourceIds.length === 0) {
      return (
        <main className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">📡</div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {locale === "zh" ? "欢迎使用 High-Signal" : "Welcome to High-Signal"}
            </h1>
            <p className="text-gray-400 mb-6">
              {locale === "zh"
                ? "你还没有订阅任何数据源。前往数据源管理页面，选择你感兴趣的信息来源。"
                : "You haven't subscribed to any sources. Go to Sources to select your interests."}
            </p>
            <Link
              href="/sources"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg 
                           hover:bg-blue-700 transition font-medium"
            >
              <Settings className="w-5 h-5" />
              {locale === "zh" ? "管理数据源" : "Manage Sources"}
            </Link>
          </div>
        </main>
      );
    }
  } else {
    // 访客模式：获取系统内置数据源
    const builtInSources = await prisma.source.findMany({
      where: { isBuiltIn: true }
    });
    subscribedSourceIds = builtInSources.map(s => s.id);
  }

  // 获取用户订阅的数据源的信号
  // 默认显示过去 24 小时 (或 7 天，视需求而定)，如果有 activeDate 则显示当天

  let startDate: Date;
  let endDate: Date;

  const activeDate = searchParams?.date;
  const activeTag = searchParams?.tag;

  if (activeDate && typeof activeDate === 'string') {
    // Time Machine Logic: Specific Date (00:00 - 23:59)
    startDate = new Date(activeDate);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(activeDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default: Past 7 days
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    endDate = new Date(); // now
  }

  const whereClause: any = {
    sourceId: { in: subscribedSourceIds },
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  if (activeTag) {
    whereClause.OR = [
      { tags: { has: activeTag } },
      { tagsZh: { has: activeTag } }
    ];
  }

  const allSignals = await prisma.signal.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      source: true,
      userStates: session?.user?.id ? {
        where: { userId: session.user.id },
        select: { isRead: true, isFavorited: true },
      } : false, // Guest has no user states
    },
  });

  // 合并用户状态到信号
  const signalsWithState: Signal[] = allSignals.map((s: any) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    isRead: s.userStates?.[0]?.isRead ?? false,
    isFavorited: s.userStates?.[0]?.isFavorited ?? false,
  }));

  // Fetch AI Insights for today (or latest if no date selected)
  // If activeDate is present, fetch insights for that day?
  // consistently with signals logic:

  const insightDateStart = activeDate ? startDate : new Date(new Date().setDate(new Date().getDate() - 1)); // Default to last 24h/today logic

  const insights = await prisma.insight.findMany({
    where: {
      createdAt: {
        gte: insightDateStart
      }
    },
    include: {
      signals: {
        include: {
          source: true
        }
      }
    },
    orderBy: { score: 'desc' },
    take: 3
  });

  // Helper to safely access source type
  const getSourceType = (s: Signal) => {
    if (typeof s.source === 'object' && s.source !== null && 'type' in s.source) {
      return s.source.type;
    }
    return '';
  };

  // 按数据源类型分组
  const signalGroups = {
    build: signalsWithState.filter((s) => SOURCE_GROUPS.build.includes(getSourceType(s))),
    market: signalsWithState.filter((s) => SOURCE_GROUPS.market.includes(getSourceType(s))),
    news: signalsWithState.filter((s) => SOURCE_GROUPS.news.includes(getSourceType(s))),
    launch: signalsWithState.filter((s) => SOURCE_GROUPS.launch.includes(getSourceType(s))),
    custom: signalsWithState.filter((s) => {
      const type = getSourceType(s);
      return type === "rss" || (type !== '' && !Object.values(SOURCE_GROUPS).flat().includes(type));
    }),
  };

  const translations = {
    buildTitle: t('buildTitle'),
    buildSubtitle: t('buildSubtitle'),
    marketTitle: t('marketTitle'),
    marketSubtitle: t('marketSubtitle'),
    newsTitle: t('newsTitle'),
    newsSubtitle: t('newsSubtitle'),
    launchTitle: t('launchTitle'),
    launchSubtitle: t('launchSubtitle'),
  };

  return (
    <DashboardShell
      signalGroups={signalGroups}
      locale={locale}
      user={session?.user || null}
      translations={translations}
      activeTag={Array.isArray(activeTag) ? activeTag[0] : activeTag}
      activeDate={Array.isArray(activeDate) ? activeDate[0] : activeDate}
      insights={insights}
    />
  );
}

