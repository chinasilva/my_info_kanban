import { prisma } from "@/lib/prisma/db";
import { Prisma } from "@prisma/client";
import type { Signal } from "@/schemas/signal";
import { getTranslations } from 'next-intl/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { DashboardShell } from "@/components/DashboardShell";

// export const revalidate = 60; // Revalidate every minute
export const revalidate = 300; // Revalidate every minute

// 数据源类型到分组的映射
const SOURCE_GROUPS: Record<string, string[]> = {
  build: ["github", "huggingface", "devto"],
  market: ["polymarket", "cryptopanic", "dune"],
  news: ["hackernews", "substack"],
  launch: ["producthunt"],
  demand: ["gov_procurement", "research_report", "recruitment", "app_rank", "social_demand", "overseas_trend"],
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

  async function safeDb<T>(action: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await action();
    } catch (error) {
      console.error("Dashboard DB fallback triggered:", error);
      return fallback;
    }
  }

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
    const userSources = await safeDb(
      () =>
        prisma.userSource.findMany({
          where: {
            userId: session.user.id,
            isEnabled: true
          },
          select: { sourceId: true }, // Optimization: Only select ID
          orderBy: { displayOrder: "asc" },
        }),
      [] as Array<{ sourceId: string }>
    );
    subscribedSourceIds = userSources.map((us) => us.sourceId);
  }

  // Fallback: For guests OR logged-in users with no subscriptions, show built-in sources
  if (subscribedSourceIds.length === 0) {
    const builtInSources = await safeDb(
      () =>
        prisma.source.findMany({
          where: { isBuiltIn: true },
          select: { id: true }
        }),
      [] as Array<{ id: string }>
    );
    subscribedSourceIds = builtInSources.map(s => s.id);
  }

  // ... Date logic ...
  let startDate: Date;
  let endDate: Date;
  // ... (keep date logic same as before)
  const activeDate = searchParams?.date;
  const activeTag = Array.isArray(searchParams?.tag) ? searchParams.tag[0] : searchParams?.tag;
  const activeSourceId = Array.isArray(searchParams?.sourceId)
    ? searchParams.sourceId[0]
    : searchParams?.sourceId;

  if (activeDate && typeof activeDate === 'string') {
    startDate = new Date(activeDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(activeDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    endDate = new Date();
  }

  const whereClause: Prisma.SignalWhereInput = {
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

  const viewerId = session?.user?.id ?? "";
  const signalSelect = Prisma.validator<Prisma.SignalSelect>()({
    id: true,
    sourceId: true,
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
    userStates: { where: { userId: viewerId }, select: { isRead: true, isFavorited: true } }
  });
  type SelectedSignal = Prisma.SignalGetPayload<{ select: typeof signalSelect }>;
  type InsightWithSignals = Prisma.InsightGetPayload<{
    include: { signals: { include: { source: true } } };
  }>;

  const fetchSignals = async (types: string[] | null, isCustom: boolean = false) => {
    // ... existing fetch logic ...
    const typeWhere: Prisma.SignalWhereInput = isCustom
      ? { source: { type: { notIn: Object.values(SOURCE_GROUPS).flat() } } }
      : { source: { type: { in: types || [] } } };

    return safeDb(
      () =>
        prisma.signal.findMany({
          where: {
            ...whereClause,
            ...typeWhere
          },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: signalSelect,
        }),
      [] as SelectedSignal[]
    );
  };

  // [NEW] Single Source Fetcher
  let singleSourceSignals: SelectedSignal[] = [];
  let activeSource: { id: string; name: string; icon: string | null; type: string } | null = null;

  if (activeSourceId && subscribedSourceIds.includes(activeSourceId)) {
    // Fetch Source Details
    activeSource = await safeDb(
      () =>
        prisma.source.findUnique({
          where: { id: activeSourceId },
          select: { id: true, name: true, icon: true, type: true }
        }),
      null as { id: string; name: string; icon: string | null; type: string } | null
    );

    singleSourceSignals = await safeDb(
      () =>
        prisma.signal.findMany({
          where: {
            sourceId: activeSourceId,
            createdAt: { gte: startDate, lte: endDate }
          },
          orderBy: { createdAt: "desc" },
          take: 50, // Fetch more for single source view
          select: signalSelect
        }),
      [] as SelectedSignal[]
    );
  }

  // Only fetch Groups if NO active source (optimization)
  let signalGroupsData: {
    build: SelectedSignal[];
    market: SelectedSignal[];
    news: SelectedSignal[];
    launch: SelectedSignal[];
    demand: SelectedSignal[];
    custom: SelectedSignal[];
  } = { build: [], market: [], news: [], launch: [], demand: [], custom: [] };

  if (!activeSourceId) {
    const [build, market, news, launch, demand, custom] = await Promise.all([
      fetchSignals(SOURCE_GROUPS.build),
      fetchSignals(SOURCE_GROUPS.market),
      fetchSignals(SOURCE_GROUPS.news),
      fetchSignals(SOURCE_GROUPS.launch),
      fetchSignals(SOURCE_GROUPS.demand),
      fetchSignals(null, true),
    ]);
    signalGroupsData = { build, market, news, launch, demand, custom };
  }

  const insights: InsightWithSignals[] = await safeDb(
    () =>
      prisma.insight.findMany({
        where: {},
        include: { signals: { include: { source: true } } },
        orderBy: { score: 'desc' },
        take: 3
      }),
    [] as InsightWithSignals[]
  );

  const processSignals = (signals: SelectedSignal[]): Signal[] => signals.map(s => ({
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
    demand: processSignals(signalGroupsData.demand),
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
    demandTitle: t('demandTitle'),
    demandSubtitle: t('demandSubtitle'),
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
