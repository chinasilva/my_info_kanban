"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import type { Insight as PrismaInsight, Signal as PrismaSignal, Source as PrismaSource } from "@prisma/client";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { SignalColumn } from "./SignalColumn";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar, SourceType } from "./MobileTabBar";
import { MobileSignalList } from "./MobileSignalList";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { Signal } from "@/schemas/signal";
import { Code2, BarChart3, Newspaper, Rocket, Settings, Loader2, Bot, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { DatePicker } from "./DatePicker";
import { DailyInsights } from "./DailyInsights";
import { ShareButton } from "./ShareButton";
import { PodcastButton } from "./PodcastButton";

// Type definition for signal groups
type SignalGroups = {
    build: Signal[];
    market: Signal[];
    news: Signal[];
    launch: Signal[];
    demand: Signal[];
    custom: Signal[];
};

interface ColumnConfig {
    key: string;
    length: number;
    props: {
        title: string;
        subtitle: string;
        icon: React.ReactNode;
        signals: Signal[];
        colorClass: string;
        sourceType: string;
        sourceId?: string | null;
    };
}

interface DashboardShellProps {
    signalGroups: SignalGroups;
    locale: string;
    user: {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
    translations: {
        buildTitle: string;
        buildSubtitle: string;
        marketTitle: string;
        marketSubtitle: string;
        newsTitle: string;
        newsSubtitle: string;
        launchTitle: string;
        launchSubtitle: string;
        demandTitle: string;
        demandSubtitle: string;
    };
    activeTag?: string;
    activeDate?: string;
    insights?: (PrismaInsight & { signals: (PrismaSignal & { source: PrismaSource })[] })[];
    activeSourceId?: string | null;
    activeSource?: { id: string; name: string; icon: string | null; type: string } | null;
    singleSourceSignals?: Signal[];
}

export function DashboardShell({
    signalGroups,
    locale,
    user,
    translations: t,
    activeTag,
    activeDate,
    insights = [],
    activeSourceId,
    activeSource,
    singleSourceSignals
}: DashboardShellProps) {
    const [mounted, setMounted] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const kanbanRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();
    const router = useRouter();

    // Prevent Hydration mismatch by waiting for client mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if kanban container is scrollable
    useEffect(() => {
        const checkScrollable = () => {
            if (kanbanRef.current) {
                const { scrollWidth, clientWidth } = kanbanRef.current;
                setIsScrollable(scrollWidth > clientWidth);
            }
        };

        checkScrollable();

        // Re-check on resize
        window.addEventListener('resize', checkScrollable);
        return () => window.removeEventListener('resize', checkScrollable);
    }, [signalGroups]);

    // Determine initial active tab based on available signals
    const getInitialTab = (): SourceType => {
        if (signalGroups.build.length > 0) return "build";
        if (signalGroups.market.length > 0) return "market";
        if (signalGroups.news.length > 0) return "news";
        if (signalGroups.launch.length > 0) return "launch";
        if (signalGroups.demand.length > 0) return "demand";
        if (signalGroups.custom.length > 0) return "custom";
        return "build";
    };

    const [activeTab, setActiveTab] = useState<SourceType>(getInitialTab);
    const [guestSubscribedIds, setGuestSubscribedIds] = useState<string[] | null>(null);

    // Load guest source preferences
    useEffect(() => {
        if (!user) {
            const stored = localStorage.getItem('guest_subscribed_sources');
            if (stored) {
                try {
                    setGuestSubscribedIds(JSON.parse(stored));
                } catch {
                    setGuestSubscribedIds([]);
                }
            } else {
                // Default to all shown if never set
                setGuestSubscribedIds(null);
            }
        }
    }, [user]);

    // Helper to filter signal groups for guests
    const filteredSignalGroups = !user && guestSubscribedIds !== null ? {
        build: signalGroups.build.filter(s => s.source && typeof s.source !== 'string' && guestSubscribedIds.includes(s.source.id)),
        market: signalGroups.market.filter(s => s.source && typeof s.source !== 'string' && guestSubscribedIds.includes(s.source.id)),
        news: signalGroups.news.filter(s => s.source && typeof s.source !== 'string' && guestSubscribedIds.includes(s.source.id)),
        launch: signalGroups.launch.filter(s => s.source && typeof s.source !== 'string' && guestSubscribedIds.includes(s.source.id)),
        demand: signalGroups.demand.filter(s => s.source && typeof s.source !== 'string' && guestSubscribedIds.includes(s.source.id)),
        custom: [] // Guest can't have custom sources
    } : signalGroups;

    // Sync state if signalGroups update (e.g. date filter change from server)
    useEffect(() => {
        // Optional: Update logic if needed
    }, [signalGroups]);

    const handleCountChange = useCallback((_count: number) => {
        // Only update for standard tabs
    }, [activeTab]);

    const handleRefresh = useCallback(async () => {
        router.refresh();
    }, [router]);

    const [isPending, startTransition] = useTransition();

    const handleClearTag = () => {
        startTransition(() => {
            router.push(`/${locale}`);
        });
    };

    // Show loading state during hydration to prevent layout mismatch
    if (!mounted) {
        return (
            <main className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </main>
        );
    }

    // Desktop Layout
    if (!isMobile) {
        return (
            <main className="h-screen overflow-hidden bg-[var(--color-background)] desktop-only text-[var(--color-foreground)] flex flex-col">
                {/* Desktop Header */}
                <header className="h-14 border-b border-[var(--color-border)] shrink-0 flex items-center justify-between px-4 bg-[var(--color-background)] z-20">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📡</span>
                        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">High-Signal</h1>
                        {activeTag && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 text-sm">
                                <span>#{activeTag}</span>
                                <button
                                    onClick={handleClearTag}
                                    disabled={isPending}
                                    className="hover:text-white transition-colors cursor-pointer relative z-10 px-1 disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '×'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <DatePicker currentDate={activeDate} locale={locale} />
                        <PodcastButton locale={locale} />
                        <ThemeSwitcher locale={locale} />
                        <ShareButton targetId="dashboard-content" locale={locale} />
                        <LanguageSwitcher />
                        <Link
                            href={`/${locale}/agent-setup`}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-muted)]
                                    hover:text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] rounded-lg transition"
                        >
                            <Bot className="w-4 h-4" />
                            {locale === "zh" ? "Agent接入" : "Agent Setup"}
                        </Link>
                        <Link
                            href={`/${locale}/sources`}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-muted)]
                                    hover:text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] rounded-lg transition"
                        >
                            <Settings className="w-4 h-4" />
                            {locale === "zh" ? "管理数据源" : "Manage Sources"}
                        </Link>
                        {user ? (
                            <UserMenu user={user} />
                        ) : (
                            <Link
                                href={`/${locale}/login`}
                                className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/80 transition"
                            >
                                {locale === "zh" ? "登录" : "Login"}
                            </Link>
                        )}
                    </div>
                </header>

                {/* Content Container */}
                <div id="dashboard-content" className="flex-1 flex flex-col bg-[var(--color-background)] relative min-h-0 overflow-hidden">

                    {/* Insights Banner */}
                    <div className="px-4 pt-4 shrink-0">
                        <DailyInsights insights={insights} locale={locale} />
                    </div>

                    {/* MAIN CONTENT SWITCHER */}
                    {activeSourceId && activeSource ? (
                        /* Single Source Mode (Feed View) */
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <SignalColumn
                                title={activeSource.name}
                                subtitle="Source Timeline"
                                icon={<span className="text-xl">{activeSource.icon || "📡"}</span>}
                                signals={singleSourceSignals || []}
                                colorClass="text-blue-400"
                                locale={locale}
                                sourceType="custom"
                                sourceId={activeSourceId}
                                isGuest={!user}
                            />
                            {(!singleSourceSignals || singleSourceSignals.length === 0) && (
                                <div className="text-center py-20 text-gray-500">
                                    No signals found for this source in the selected timeframe.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Kanban Board Mode (Default) */
                        <div
                            ref={kanbanRef}
                            className={`kanban-container flex-1 px-4 pb-4 min-w-0 ${isScrollable ? 'scrollable' : ''}`}
                        >
                            {(() => {
                                const columns: ColumnConfig[] = [
                                    { key: 'build', length: filteredSignalGroups.build.length, props: { title: t.buildTitle, subtitle: t.buildSubtitle, icon: <Code2 className="w-5 h-5" />, signals: filteredSignalGroups.build, colorClass: "text-blue-400", sourceType: "build" } },
                                    { key: 'market', length: filteredSignalGroups.market.length, props: { title: t.marketTitle, subtitle: t.marketSubtitle, icon: <BarChart3 className="w-5 h-5" />, signals: filteredSignalGroups.market, colorClass: "text-purple-400", sourceType: "market" } },
                                    { key: 'news', length: filteredSignalGroups.news.length, props: { title: t.newsTitle, subtitle: t.newsSubtitle, icon: <Newspaper className="w-5 h-5" />, signals: filteredSignalGroups.news, colorClass: "text-orange-400", sourceType: "news" } },
                                    { key: 'launch', length: filteredSignalGroups.launch.length, props: { title: t.launchTitle, subtitle: t.launchSubtitle, icon: <Rocket className="w-5 h-5" />, signals: filteredSignalGroups.launch, colorClass: "text-pink-400", sourceType: "launch" } },
                                    { key: 'demand', length: filteredSignalGroups.demand.length, props: { title: t.demandTitle, subtitle: t.demandSubtitle, icon: <Search className="w-5 h-5" />, signals: filteredSignalGroups.demand, colorClass: "text-cyan-400", sourceType: "demand" } },
                                    { key: 'custom', length: filteredSignalGroups.custom.length, props: { title: locale === "zh" ? "自定义源" : "Custom", subtitle: "RSS & Others", icon: <Settings className="w-5 h-5" />, signals: filteredSignalGroups.custom, colorClass: "text-green-400", sourceType: "custom", sourceId: activeSourceId } }
                                ].filter(col => col.length > 0);

                                return columns.map((col, index) => {
                                    let position: 'first' | 'middle' | 'last' | 'single' = 'middle';
                                    if (columns.length === 1) position = 'single';
                                    else if (index === 0) position = 'first';
                                    else if (index === columns.length - 1) position = 'last';

                                    return (
                                        <SignalColumn
                                            key={col.key}
                                            {...col.props}
                                            locale={locale}
                                            isGuest={!user}
                                            columnPosition={position}
                                        />
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </main>
        );
    }

    // Mobile Layout
    return (
        <main className="mobile-container bg-[var(--color-background)] text-[var(--color-foreground)] flex flex-col min-h-screen">
            <MobileHeader
                user={user}
                activeTag={activeTag}
                onClearTag={handleClearTag}
                activeDate={activeDate}
                locale={locale}
                isClearing={isPending}
            />

            {/* Content */}
            {/* <div className="flex-1"> */}
            <div className="flex-1 flex flex-col min-h-0">
                {insights.length > 0 && !activeTag && !activeSourceId && (
                    <div className="px-4 py-2">
                        <DailyInsights insights={insights} locale={locale} />
                    </div>
                )}

                {activeSourceId && activeSource ? (
                    /* Mobile Single Source View */
                    <MobileSignalList
                        signals={singleSourceSignals || []}
                        locale={locale}
                        onRefresh={handleRefresh}
                        isGuest={!user}
                        sourceType="custom"
                        sourceId={activeSourceId}
                        activeTag={activeTag}
                        activeDate={activeDate}
                        onCountChange={() => { }}
                    />
                ) : (
                    /* Mobile Default View */
                    <>
                        <MobileSignalList
                            signals={filteredSignalGroups[activeTab] || []}
                            locale={locale}
                            onRefresh={handleRefresh}
                            isGuest={!user}
                            sourceType={activeTab}
                            sourceId={activeSourceId}
                            activeTag={activeTag}
                            activeDate={activeDate}
                            onCountChange={handleCountChange}
                        />
                        <MobileTabBar
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            counts={{
                                build: filteredSignalGroups.build.length,
                                market: filteredSignalGroups.market.length,
                                news: filteredSignalGroups.news.length,
                                launch: filteredSignalGroups.launch.length,
                                demand: filteredSignalGroups.demand.length,
                                custom: filteredSignalGroups.custom.length,
                            }}
                            locale={locale}
                        />
                    </>
                )}
            </div>
        </main>
    );
}
