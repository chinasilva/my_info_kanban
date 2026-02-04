"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Signal } from "@/schemas/signal";
import { SignalCard } from "./SignalCard";
import { Loader2, RefreshCw } from "lucide-react";

interface MobileSignalListProps {
    signals: Signal[];
    locale?: string;
    onRefresh?: () => Promise<void>;
    isGuest?: boolean;
    sourceType?: string; // Add source type for API fetching
    sourceId?: string | null;
    activeTag?: string; // For filtering API calls
    activeDate?: string; // For filtering API calls
    onCountChange?: (count: number) => void;
}

export function MobileSignalList({
    signals: initialSignals,
    locale = "en",
    onRefresh,
    isGuest = false,
    sourceType,
    sourceId,
    activeTag,
    activeDate,
    onCountChange
}: MobileSignalListProps) {
    // State for pull-to-refresh
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);
    const PULL_THRESHOLD = 80;

    // State for infinite scroll
    const [localSignals, setLocalSignals] = useState<Signal[]>(initialSignals);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const loaderRef = useRef<HTMLDivElement>(null);

    const isZh = locale === "zh";

    // Notify parent when signal count changes
    useEffect(() => {
        if (onCountChange) {
            onCountChange(localSignals.length);
        }
    }, [localSignals.length, onCountChange]);

    // Update local signals when props change (e.g. tab switch or refresh)
    useEffect(() => {
        setLocalSignals(initialSignals);
        if (initialSignals.length > 0) {
            setCursor(initialSignals[initialSignals.length - 1].id);
        } else {
            setCursor(null);
        }
        setHasMore(true);
    }, [initialSignals]);

    // Pull-to-refresh handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (listRef.current && listRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current || !listRef.current) return;
        const currentY = e.touches[0].clientY;
        const distance = currentY - startY.current;
        if (distance > 0 && listRef.current.scrollTop === 0) {
            setPullDistance(Math.min(distance * 0.5, 120));
        }
    }, []);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance > PULL_THRESHOLD && onRefresh) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullDistance(0);
        isPulling.current = false;
    }, [pullDistance, onRefresh]);

    // Infinite Scroll Logic
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || !sourceType || !cursor) return;

        setIsLoadingMore(true);
        try {
            const params = new URLSearchParams({
                limit: "15",
                cursor: cursor,
                sourceType: sourceType,
                // Note: No days limit for infinite scroll - load all historical data
                ...(sourceId ? { sourceId } : {})
            });

            if (activeTag) params.append("tag", activeTag);
            if (activeDate) params.append("date", activeDate);

            const response = await fetch(`/api/signals?${params}`);
            if (!response.ok) throw new Error("Failed to load");

            const data = await response.json();

            if (data.signals && data.signals.length > 0) {
                setLocalSignals(prev => {
                    const newSignals = data.signals as Signal[];
                    const existingIds = new Set(prev.map(s => s.id));
                    const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));

                    if (uniqueNewSignals.length === 0) return prev;
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
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, sourceType, cursor, activeTag, activeDate]);

    // Intersection Observer
    useEffect(() => {
        if (!sourceType) return; // Only enable if we know the source type

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [sourceType, hasMore, isLoadingMore, loadMore]);

    return (
        <div
            ref={listRef}
            className="mobile-signal-list"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull to refresh indicator */}
            {(pullDistance > 0 || isRefreshing) && (
                <div
                    className="pull-indicator"
                    style={{
                        height: isRefreshing ? 56 : pullDistance,
                        transition: isRefreshing ? 'height 0.2s ease' : 'none'
                    }}
                >
                    {isRefreshing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <RefreshCw
                            className="w-5 h-5"
                            style={{
                                transform: `rotate(${pullDistance * 2}deg)`,
                                opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
                            }}
                        />
                    )}
                </div>
            )}

            {/* Signal Cards */}
            {localSignals.length > 0 ? (
                <div className="space-y-0">
                    {localSignals.map((signal) => (
                        <SignalCard
                            key={signal.id}
                            signal={{
                                ...signal,
                                createdAt: typeof signal.createdAt === 'string' ? signal.createdAt : new Date(signal.createdAt).toISOString(),
                            }}
                            variant="compact"
                            locale={locale}
                            isGuest={isGuest}
                            columnPosition="single"
                        />
                    ))}

                    {/* Load More Trigger / Loader */}
                    <div ref={loaderRef} className="py-6 flex justify-center w-full">
                        {isLoadingMore && (
                            <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" />
                        )}
                        {!hasMore && localSignals.length > 5 && (
                            <span className="text-xs text-[var(--color-text-muted)] opacity-50">
                                {isZh ? '没有更多了' : 'No more signals'}
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <span className="text-4xl mb-4">📭</span>
                    <p className="text-[var(--color-text-muted)] text-sm">
                        {isZh ? "暂无信号" : "No signals in this category"}
                    </p>
                </div>
            )}
        </div>
    );
}
