"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

export interface TabSource {
    id: string;
    name: string;
    icon?: string | null;
}

interface SubscriptionTabsProps {
    sources: TabSource[];
    activeSourceId?: string | null;
    locale: string;
    className?: string;
}

export function SubscriptionTabs({ sources, activeSourceId, locale, className }: SubscriptionTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleTabClick = (sourceId: string | null) => {
        const params = new URLSearchParams(searchParams);

        // Preserve activeDate if exists
        const currentDate = params.get('date');

        // Reset params
        const newParams = new URLSearchParams();
        if (currentDate) newParams.set('date', currentDate);

        if (sourceId) {
            newParams.set('sourceId', sourceId);
        } else {
            // "All" tab -> Clear sourceId
        }

        router.push(`${pathname}?${newParams.toString()}`);
    };

    // Auto-scroll to active tab
    useEffect(() => {
        if (activeSourceId && scrollContainerRef.current) {
            const activeTab = scrollContainerRef.current.querySelector('[data-active="true"]');
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeSourceId]);

    if (sources.length === 0) return null;

    return (
        <div className={cn("w-full border-b border-[var(--color-border)] bg-[var(--color-background)]", className)}>
            <div
                ref={scrollContainerRef}
                className="flex items-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar mask-gradient"
                style={{ scrollbarWidth: 'none' }}
            >
                {/* "All" Tab */}
                <button
                    onClick={() => handleTabClick(null)}
                    data-active={!activeSourceId}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 whitespace-nowrap",
                        !activeSourceId
                            ? "bg-[var(--color-primary)] text-white shadow-sm"
                            : "bg-[var(--color-card)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-foreground)] border border-[var(--color-border)]"
                    )}
                >
                    🌍 {locale === 'zh' ? '全部' : 'All'}
                </button>

                {/* Source Tabs */}
                {sources.map((source) => (
                    <button
                        key={source.id}
                        onClick={() => handleTabClick(source.id)}
                        data-active={activeSourceId === source.id}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 whitespace-nowrap",
                            activeSourceId === source.id
                                ? "bg-[var(--color-primary)] text-white shadow-sm ring-1 ring-inset ring-white/10"
                                : "bg-[var(--color-card)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-foreground)] border border-[var(--color-border)]"
                        )}
                    >
                        {source.icon && <span>{source.icon}</span>}
                        {source.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
