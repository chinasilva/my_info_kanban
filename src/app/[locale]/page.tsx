import { prisma } from "@/lib/prisma/db";
import { Signal } from "@/schemas/signal";
import { Settings } from "lucide-react";
import { getTranslations } from 'next-intl/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";

// export const revalidate = 60; // Revalidate every minute
export const revalidate = 300; // Revalidate every minute

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
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams
  ]);
  const locale = params.locale;

  // Parallelize initial fetches
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations("Dashboard")
  ]);

  // 未登录用户不重定向，允许浏览
  // if (!session?.user?.id) {
  //   redirect("/login");
  // }

  let subscribedSourceIds: string[] = [];

  // 1. Fetch Subscribed Sources (for validation and filtering)
  if (session?.user?.id) {
    const userSources = await prisma.userSource.findMany({
      where: {
        userId: session.user.id,
        isEnabled: true
      },
      select: { sourceId: true }, // Optimization: Only select ID
      orderBy: { displayOrder: "asc" },
    });
    subscribedSourceIds = userSources.map((us) => us.sourceId);

    // Empty state logic ... (keep existing)
    if (subscribedSourceIds.length === 0) {
      // ... (return Empty State UI)
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
    // Guest
    const builtInSources = await prisma.source.findMany({
      where: { isBuiltIn: true },
      select: { id: true }
    });
    subscribedSourceIds = builtInSources.map(s => s.id);
  }

  // ... Date logic ...
  let startDate: Date;
  let endDate: Date;
  // ... (keep date logic same as before)
  const activeDate = searchParams?.date;
  const activeTag = searchParams?.tag;
  const activeSourceId = searchParams?.sourceId as string | undefined; // [NEW]

  if (activeDate && typeof activeDate === 'string') {
    startDate = new Date(activeDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(activeDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    endDate = new Date();
  }

  const whereClause: any = {
    sourceId: { in: subscribedSourceIds },
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  // Only apply Tag filter if NO sourceId is active (per spec)
  if (activeTag && !activeSourceId) {
    whereClause.OR = [
      { tags: { has: activeTag } },
      { tagsZh: { has: activeTag } }
    ];
  }

  const fetchSignals = async (types: string[] | null, isCustom: boolean = false) => {
    // ... existing fetch logic ...
    const typeWhere: any = isCustom
      ? { type: { notIn: Object.values(SOURCE_GROUPS).flat() } }
      : { type: { in: types! } };

    return prisma.signal.findMany({
      where: {
        ...whereClause,
        source: {
          ...typeWhere
        }
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        title: true,
        titleTranslated: true,
        url: true,
        summary: true,
        aiSummary: true,
        aiSummaryZh: true,
        score: true,
        category: true,
        tags: true,
        tagsZh: true,
        createdAt: true,
        source: { select: { id: true, name: true, icon: true, type: true } },
        ...(session?.user?.id ? { userStates: { where: { userId: session.user.id }, select: { isRead: true, isFavorited: true } } } : {})
      },
    });
  };

  // [NEW] Single Source Fetcher
  let singleSourceSignals: any[] = [];
  let activeSource: { id: string; name: string; icon: string | null; type: string } | null = null;

  if (activeSourceId && subscribedSourceIds.includes(activeSourceId)) {
    // Fetch Source Details
    activeSource = await prisma.source.findUnique({
      where: { id: activeSourceId },
      select: { id: true, name: true, icon: true, type: true }
    });

    singleSourceSignals = await prisma.signal.findMany({
      where: {
        sourceId: activeSourceId,
        createdAt: { gte: startDate, lte: endDate }
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Fetch more for single source view
      select: {
        id: true,
        title: true,
        titleTranslated: true,
        url: true,
        summary: true,
        aiSummary: true,
        aiSummaryZh: true,
        score: true,
        category: true,
        tags: true,
        tagsZh: true,
        createdAt: true,
        source: { select: { id: true, name: true, icon: true, type: true } },
        ...(session?.user?.id ? { userStates: { where: { userId: session.user.id }, select: { isRead: true, isFavorited: true } } } : {})
      }
    });
  }

  // Only fetch Groups if NO active source (optimization)
  let signalGroupsData: any = { build: [], market: [], news: [], launch: [], custom: [] };

  if (!activeSourceId) {
    const [build, market, news, launch, custom] = await Promise.all([
      fetchSignals(SOURCE_GROUPS.build),
      fetchSignals(SOURCE_GROUPS.market),
      fetchSignals(SOURCE_GROUPS.news),
      fetchSignals(SOURCE_GROUPS.launch),
      fetchSignals(null, true),
    ]);
    signalGroupsData = { build, market, news, launch, custom };
  }

  const insights = await prisma.insight.findMany({
    where: {},
    include: { signals: { include: { source: true } } },
    orderBy: { score: 'desc' },
    take: 3
  });

  const processSignals = (signals: any[]) => signals.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    isRead: s.userStates?.[0]?.isRead ?? false,
    isFavorited: s.userStates?.[0]?.isFavorited ?? false,
  }));

  const signalGroups = {
    build: processSignals(signalGroupsData.build),
    market: processSignals(signalGroupsData.market),
    news: processSignals(signalGroupsData.news),
    launch: processSignals(signalGroupsData.launch),
    custom: processSignals(signalGroupsData.custom),
  };

  const processedSingleSignals = processSignals(singleSourceSignals);

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
      activeSource={activeSource}
      activeSourceId={activeSourceId}
      singleSourceSignals={processedSingleSignals}
    />
  );
}

