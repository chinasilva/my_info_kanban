"use client";

import { useState, useCallback, useEffect } from "react";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { SignalColumn } from "./SignalColumn";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar, SourceType } from "./MobileTabBar";
import { MobileSignalList } from "./MobileSignalList";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { Signal } from "@/schemas/signal";
import { Code2, BarChart3, Newspaper, Rocket, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface SignalGroups {
    build: Signal[];
    market: Signal[];
    news: Signal[];
    launch: Signal[];
    custom: Signal[];
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
    };
}

export function DashboardShell({
    signalGroups,
    locale,
    user,
    translations: t
}: DashboardShellProps) {
    const [mounted, setMounted] = useState(false);
    const isMobile = useIsMobile();
    const router = useRouter();

    // Prevent Hydration mismatch by waiting for client mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Determine initial active tab based on available signals
    const getInitialTab = (): SourceType => {
        if (signalGroups.build.length > 0) return "build";
        if (signalGroups.market.length > 0) return "market";
        if (signalGroups.news.length > 0) return "news";
        if (signalGroups.launch.length > 0) return "launch";
        if (signalGroups.custom.length > 0) return "custom";
        return "build";
    };

    const [activeTab, setActiveTab] = useState<SourceType>(getInitialTab);

    const counts = {
        build: signalGroups.build.length,
        market: signalGroups.market.length,
        news: signalGroups.news.length,
        launch: signalGroups.launch.length,
        custom: signalGroups.custom.length,
    };

    const getActiveSignals = (): Signal[] => {
        return signalGroups[activeTab] || [];
    };

    const handleRefresh = useCallback(async () => {
        // Force page refresh to get latest data
        router.refresh();
    }, [router]);

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
            <main className="min-h-screen bg-[var(--color-background)] overflow-hidden desktop-only text-[var(--color-foreground)]">
                {/* Desktop Header */}
                <header className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📡</span>
                        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">High-Signal</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeSwitcher locale={locale} />
                        <LanguageSwitcher />
                        {user ? (
                            <>
                                <Link
                                    href="/sources"
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-muted)]
                                            hover:text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] rounded-lg transition"
                                >
                                    <Settings className="w-4 h-4" />
                                    {locale === "zh" ? "管理数据源" : "Manage Sources"}
                                </Link>
                                <UserMenu user={user} />
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/80 transition"
                            >
                                {locale === "zh" ? "登录" : "Login"}
                            </Link>
                        )}
                    </div>
                </header>

                {/* Kanban Board */}
                <div className="kanban-container h-[calc(100vh-56px)] flex">
                    {signalGroups.build.length > 0 && (
                        <SignalColumn
                            title={t.buildTitle}
                            subtitle={t.buildSubtitle}
                            icon={<Code2 className="w-5 h-5" />}
                            signals={signalGroups.build}
                            colorClass="text-blue-400"
                            locale={locale}
                            sourceType="build"
                            isGuest={!user}
                        />
                    )}
                    {signalGroups.market.length > 0 && (
                        <SignalColumn
                            title={t.marketTitle}
                            subtitle={t.marketSubtitle}
                            icon={<BarChart3 className="w-5 h-5" />}
                            signals={signalGroups.market}
                            colorClass="text-purple-400"
                            locale={locale}
                            sourceType="market"
                            isGuest={!user}
                        />
                    )}
                    {signalGroups.news.length > 0 && (
                        <SignalColumn
                            title={t.newsTitle}
                            subtitle={t.newsSubtitle}
                            icon={<Newspaper className="w-5 h-5" />}
                            signals={signalGroups.news}
                            colorClass="text-orange-400"
                            locale={locale}
                            sourceType="news"
                            isGuest={!user}
                        />
                    )}
                    {signalGroups.launch.length > 0 && (
                        <SignalColumn
                            title={t.launchTitle}
                            subtitle={t.launchSubtitle}
                            icon={<Rocket className="w-5 h-5" />}
                            signals={signalGroups.launch}
                            colorClass="text-pink-400"
                            locale={locale}
                            sourceType="launch"
                            isGuest={!user}
                        />
                    )}
                    {signalGroups.custom.length > 0 && (
                        <SignalColumn
                            title={locale === "zh" ? "自定义源" : "Custom"}
                            subtitle="RSS & Others"
                            icon={<Settings className="w-5 h-5" />}
                            signals={signalGroups.custom}
                            colorClass="text-green-400"
                            locale={locale}
                            sourceType="custom"
                            isGuest={!user}
                        />
                    )}
                </div>
            </main>
        );
    }

    // Mobile Layout
    return (
        <main className="mobile-container bg-[var(--color-background)] text-[var(--color-foreground)]">
            <MobileHeader user={user} />

            <MobileSignalList
                signals={getActiveSignals()}
                locale={locale}
                onRefresh={handleRefresh}
                isGuest={!user}
            />

            <MobileTabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={counts}
                locale={locale}
            />
        </main>
    );
}
