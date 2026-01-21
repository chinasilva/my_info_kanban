import { prisma } from "@/lib/prisma/db";
import { SignalColumn } from "@/components/SignalColumn";
import { Signal } from "@/schemas/signal";
import { Code2, BarChart3, Newspaper, Rocket, Settings } from "lucide-react";
import { getTranslations } from 'next-intl/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const revalidate = 60; // Revalidate every minute

// 数据源类型到分组的映射
const SOURCE_GROUPS: Record<string, string[]> = {
  build: ["github", "huggingface", "devto"],
  market: ["polymarket", "cryptopanic", "dune"],
  news: ["hackernews", "substack"],
  launch: ["producthunt"],
};

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("Dashboard");

  // 未登录用户重定向到登录页
  if (!session?.user?.id) {
    redirect("/login");
  }

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

  const subscribedSourceIds = userSources.map((us) => us.sourceId);

  // console.log(`[Dashboard] Locale: ${DashboardPage.name}`); // Just a placeholder to see if it runs

  // 如果用户没有订阅任何数据源，显示引导页面
  if (subscribedSourceIds.length === 0) {
    return (
      <main className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">📡</div>
          <h1 className="text-2xl font-bold text-white mb-3">
            欢迎使用 High-Signal
          </h1>
          <p className="text-gray-400 mb-6">
            你还没有订阅任何数据源。前往数据源管理页面，选择你感兴趣的信息来源。
          </p>
          <Link
            href="/sources"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition font-medium"
          >
            <Settings className="w-5 h-5" />
            管理数据源
          </Link>
        </div>
      </main>
    );
  }

  // 获取用户订阅的数据源的信号（最近7天）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const allSignals = await prisma.signal.findMany({
    where: {
      sourceId: { in: subscribedSourceIds },
      createdAt: { gte: sevenDaysAgo }
    },
    orderBy: { createdAt: "desc" },
    include: {
      source: true,
      userStates: {
        where: { userId: session.user.id },
        select: { isRead: true, isFavorited: true },
      },
    },
  });

  // 合并用户状态到信号，并确保 Date 对象转换为字符串以便序列化传递给客户端组件
  // 合并用户状态到信号，并确保 Date 对象转换为字符串以便序列化传递给客户端组件
  const signalsWithState: Signal[] = allSignals.map((s: any) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    isRead: s.userStates[0]?.isRead ?? false,
    isFavorited: s.userStates[0]?.isFavorited ?? false,
  }));

  // Helper to safely access source type
  const getSourceType = (s: Signal) => {
    if (typeof s.source === 'object' && s.source !== null && 'type' in s.source) {
      return s.source.type;
    }
    return '';
  };

  // 按数据源类型分组
  const buildSignals = signalsWithState.filter((s) =>
    SOURCE_GROUPS.build.includes(getSourceType(s))
  );

  const marketSignals = signalsWithState.filter((s) =>
    SOURCE_GROUPS.market.includes(getSourceType(s))
  );

  const newsSignals = signalsWithState.filter((s) =>
    SOURCE_GROUPS.news.includes(getSourceType(s))
  );

  const launchSignals = signalsWithState.filter((s) =>
    SOURCE_GROUPS.launch.includes(getSourceType(s))
  );

  // RSS 和其他自定义源放到单独的列
  const customSignals = signalsWithState.filter((s) => {
    const type = getSourceType(s);
    return type === "rss" || (type !== '' && !Object.values(SOURCE_GROUPS).flat().includes(type));
  });

  return (
    <main className="min-h-screen bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">📡</span>
          <h1 className="text-lg font-semibold text-white">High-Signal</h1>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/sources"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 
                       hover:text-white hover:bg-[#21262d] rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
            管理数据源
          </Link>
          <UserMenu user={session.user} />
        </div>
      </header>

      {/* Kanban Board */}
      <div className="kanban-container h-[calc(100vh-56px)] flex">
        {buildSignals.length > 0 && (
          <SignalColumn
            title={t('buildTitle')}
            subtitle={t('buildSubtitle')}
            icon={<Code2 className="w-5 h-5" />}
            signals={buildSignals}
            colorClass="text-blue-400"
            locale={locale}
            sourceType="build"
          />
        )}
        {marketSignals.length > 0 && (
          <SignalColumn
            title={t('marketTitle')}
            subtitle={t('marketSubtitle')}
            icon={<BarChart3 className="w-5 h-5" />}
            signals={marketSignals}
            colorClass="text-purple-400"
            locale={locale}
            sourceType="market"
          />
        )}
        {newsSignals.length > 0 && (
          <SignalColumn
            title={t('newsTitle')}
            subtitle={t('newsSubtitle')}
            icon={<Newspaper className="w-5 h-5" />}
            signals={newsSignals}
            colorClass="text-orange-400"
            locale={locale}
            sourceType="news"
          />
        )}
        {launchSignals.length > 0 && (
          <SignalColumn
            title={t('launchTitle')}
            subtitle={t('launchSubtitle')}
            icon={<Rocket className="w-5 h-5" />}
            signals={launchSignals}
            colorClass="text-pink-400"
            locale={locale}
            sourceType="launch"
          />
        )}
        {customSignals.length > 0 && (
          <SignalColumn
            title="自定义源"
            subtitle="RSS & 其他"
            icon={<Settings className="w-5 h-5" />}
            signals={customSignals}
            colorClass="text-green-400"
            locale={locale}
            sourceType="custom"
          />
        )}
      </div>
    </main>
  );
}
