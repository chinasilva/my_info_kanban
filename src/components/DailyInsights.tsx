
"use client";

import { useState } from "react";
import { Insight, Signal, Source } from "@prisma/client";
import { ChevronDown, ChevronUp, Lightbulb, ExternalLink } from "lucide-react";
import { SignalCard } from "./SignalCard";

interface DailyInsightsProps {
    insights: (Insight & { signals: (Signal & { source: Source })[] })[];
    locale: string;
}

export function DailyInsights({ insights, locale }: DailyInsightsProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

    // Filter insights for "today" or just show the passed list (assuming generic "latest")
    // For now, we display all passed insights.

    if (!insights || insights.length === 0) {
        return null;
    }

    const toggleExpand = () => setIsExpanded(!isExpanded);
    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        const isSelected = selectedInsightId === id;
        setSelectedInsightId(isSelected ? null : id);

        // Scroll to the clicked element if we are selecting (expanding) it
        if (!isSelected && e) {
            const element = e.currentTarget;
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    return (
        <div className="mb-6 bg-[var(--color-card-background)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm transition-all">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer bg-gradient-to-r from-amber-500/10 to-transparent hover:bg-amber-500/20 transition-colors"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2 text-amber-500">
                    <Lightbulb className="w-5 h-5 fill-current" />
                    <h2 className="font-semibold text-base">
                        {locale === "zh" ? "今日 AI 跨源洞察" : "Daily AI Insights"}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-medium">
                        Beta
                    </span>
                </div>
                <button className="text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
            </div>

            {/* Content Body */}
            {isExpanded && (
                <div className="p-4 space-y-4 relative max-h-[50vh] overflow-y-auto overscroll-contain">
                    <div className="grid gap-4 grid-cols-1">
                        {insights.map((insight) => (
                            <div key={insight.id} className="flex flex-col gap-2">
                                <div
                                    className={`
                                        relative p-4 rounded-lg border cursor-pointer transition-all duration-200
                                        ${selectedInsightId === insight.id
                                            ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20"
                                            : "border-[var(--color-border)] hover:border-amber-500/50 hover:bg-[var(--color-card-hover)]"
                                        }
                                    `}
                                    onClick={(e) => toggleSelection(insight.id, e)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`
                                            text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
                                            ${insight.type === 'TREND' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                insight.type === 'CAUSALITY' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'}
                                        `}>
                                            {insight.type}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            Score: {insight.score}
                                        </span>
                                    </div>

                                    <h3 className="font-semibold text-[var(--color-foreground)] mb-2 leading-tight">
                                        {locale === "zh" ? insight.titleZh : insight.title}
                                    </h3>

                                    <p className="text-sm text-[var(--color-text-muted)] line-clamp-3">
                                        {locale === "zh" ? insight.contentZh : insight.content}
                                    </p>

                                    {/* Active Indicator Arrow - Mobile compatible */}
                                    {selectedInsightId === insight.id && (
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-[var(--color-card-background)] border-b border-r border-amber-500 z-10 hidden md:block"></div>
                                    )}
                                </div>

                                {/* Accordion Content: Evidence Section */}
                                {selectedInsightId === insight.id && (
                                    <div className="mt-2 pl-2 border-l-2 border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center gap-2 pl-2">
                                            <span>🔍 {locale === "zh" ? "证据链 (相关信号)" : "Evidence Chain (Related Signals)"}</span>
                                        </h4>
                                        <div className="grid gap-3 grid-cols-1">
                                            {insight.signals.map(signal => (
                                                <SignalCard
                                                    key={signal.id}
                                                    signal={signal as any}
                                                    locale={locale}
                                                    isGuest={true} // Insights are public for now
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
