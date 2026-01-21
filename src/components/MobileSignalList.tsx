"use client";

import { useState, useRef, useCallback } from "react";
import { Signal } from "@/schemas/signal";
import { SignalCard } from "./SignalCard";
import { Loader2, RefreshCw } from "lucide-react";

interface MobileSignalListProps {
    signals: Signal[];
    locale?: string;
    onRefresh?: () => Promise<void>;
}

export function MobileSignalList({
    signals,
    locale = "en",
    onRefresh
}: MobileSignalListProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const PULL_THRESHOLD = 80;

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
            // Dampen the pull distance
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

    const isZh = locale === "zh";

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
            {signals.length > 0 ? (
                <div className="space-y-0">
                    {signals.map((signal) => (
                        <SignalCard
                            key={signal.id}
                            signal={{
                                ...signal,
                                createdAt: signal.createdAt,
                            }}
                            variant="compact"
                            locale={locale}
                        />
                    ))}
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
