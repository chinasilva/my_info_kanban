"use client";

import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { SignalCard } from "./SignalCard";
import { Loader2 } from "lucide-react";

import { Signal } from "@/schemas/signal";

interface SignalColumnProps {
    title: string;
    subtitle: string;
    icon: ReactNode;
    signals: Signal[]; // Use Zod Type
    colorClass?: string;
    locale?: string;
    sourceType?: string; // For API calls: 'build', 'market', 'news', 'launch'
    enableInfiniteScroll?: boolean;
    isGuest?: boolean;
}

export function SignalColumn({
    title,
    subtitle,
    icon,
    signals: initialSignals,
    colorClass = "text-accent",
    locale = 'en',
    sourceType,
    enableInfiniteScroll = true,
    isGuest = false
}: SignalColumnProps) {
    const [signals, setSignals] = useState<Signal[]>(initialSignals);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Initialize cursor from initial signals
    useEffect(() => {
        setSignals(initialSignals);
        if (initialSignals.length > 0) {
            setCursor(initialSignals[initialSignals.length - 1].id);
        } else {
            setCursor(null);
        }
        setHasMore(true); // Reset hasMore when source changes
    }, [initialSignals]);

    // Load more signals
    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore || !sourceType || !cursor) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                limit: "30",
                cursor: cursor,
                sourceType: sourceType,
                days: "7"
            });

            const response = await fetch(`/api/signals?${params}`);
            if (!response.ok) throw new Error("Failed to load");

            const data = await response.json();

            if (data.signals && data.signals.length > 0) {
                setSignals(prev => {
                    const newSignals = data.signals as Signal[];
                    // Deduplicate against existing signals
                    const existingIds = new Set(prev.map(s => s.id));
                    const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));

                    if (uniqueNewSignals.length === 0) {
                        // If all fetched signals exist, we might be hitting a loop or end, but let's just not append
                        return prev;
                    }
                    return [...prev, ...uniqueNewSignals];
                });
                setCursor(data.nextCursor);
                setHasMore(data.hasMore);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more signals:", error);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, sourceType, cursor]);


    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!enableInfiniteScroll || !sourceType) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [enableInfiniteScroll, sourceType, hasMore, isLoading, loadMore]);

    return (
        <div className="kanban-column border-r border-[var(--color-border)]">
            <header className="column-header bg-[var(--color-card)] border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-[var(--color-background)]/50 ${colorClass}`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-wide uppercase text-[var(--color-foreground)]">{title}</h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">{subtitle}</p>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-background)]/50 px-2 py-1 rounded border border-[var(--color-border)]">
                    {signals.length}
                </div>
            </header>

            <div className="column-scroll-area">
                {signals.length > 0 ? (
                    <>
                        {signals.map((signal) => (
                            <SignalCard
                                key={signal.id}
                                signal={{
                                    ...signal,
                                    createdAt: new Date(signal.createdAt).toISOString(),
                                }}
                                variant="compact"
                                locale={locale}
                                isGuest={isGuest}
                            />
                        ))}

                        {/* Infinite scroll loader */}
                        {enableInfiniteScroll && sourceType && (
                            <div ref={loaderRef} className="py-4 flex justify-center">
                                {isLoading && (
                                    <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
                                )}
                                {!hasMore && signals.length > 0 && (
                                    <span className="text-[10px] text-neutral-600">
                                        {locale === 'zh' ? '已加载全部' : 'All loaded'}
                                    </span>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-20 text-center px-6">
                        <p className="text-xs text-neutral-500 italic">
                            {locale === 'zh' ? '暂无信号' : 'No signals in this stream yet.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
