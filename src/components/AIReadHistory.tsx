"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Clock, ExternalLink, Sparkles, Globe, Loader2 } from "lucide-react";

interface HistoryItem {
    id: string;
    url: string;
    title: string;
    updatedAt: string;
    hasShort: boolean;
    hasLong: boolean;
    hasTranslation: boolean;
    modes: string[];
}

interface AIReadHistoryProps {
    refreshTrigger?: number; // Prop to trigger refresh from parent
}

export function AIReadHistory({ refreshTrigger }: AIReadHistoryProps) {
    const locale = useLocale();
    const t = useTranslations("AIReader"); // Assume strings exists
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/ai/history");
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [refreshTrigger]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-8 text-[var(--color-text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Wait...
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--color-text-muted)] bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] border-dashed">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>暂无阅读记录 (No reading history)</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                最近阅读 (Recent Readings)
            </h3>

            <div className="space-y-3">
                {history.map((item) => (
                    <div
                        key={item.id}
                        className="bg-[var(--color-card)] hover:bg-[var(--color-card-hover)] border border-[var(--color-border)] rounded-lg p-4 transition-all group"
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-[var(--color-foreground)] truncate pr-2" title={item.title}>
                                    {item.title}
                                </h4>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] truncate block mt-1 flex items-center gap-1 w-fit"
                                >
                                    {new URL(item.url).hostname}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                                {formatDistanceToNow(new Date(item.updatedAt), {
                                    addSuffix: true,
                                    locale: locale === 'zh' ? zhCN : enUS
                                })}
                            </span>
                        </div>

                        <div className="flex gap-2 mt-3">
                            {/* Badges for available modes */}
                            {item.hasShort && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <Sparkles className="w-3 h-3" /> Short
                                </span>
                            )}
                            {item.hasLong && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                    <FileText className="w-3 h-3" /> Long
                                </span>
                            )}
                            {item.hasTranslation && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                    <Globe className="w-3 h-3" /> Trans
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
