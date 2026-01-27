"use client";

import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, Star, Sparkles, Languages, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSnapshot } from "@/hooks/useSnapshot";
import { useSignal } from "@/context/SignalContext";
import { Signal, SignalSchema } from "@/schemas/signal"; // Import Zod Types
import { convertToTraditional } from "@/lib/utils/converter";
import { useReading } from "@/context/ReadingContext";
import { BookOpen } from "lucide-react";

export function SignalCard({
    signal,
    className,
    variant = "default",
    locale,
    isGuest = false
}: {
    signal: Signal; // Use inferred type
    className?: string;
    variant?: "default" | "compact";
    locale?: string;
    isGuest?: boolean;
}) {
    const [mounted, setMounted] = useState(false);
    const [isRead, setIsRead] = useState(signal.isRead ?? false);
    const [isSummaryHovered, setIsSummaryHovered] = useState(false); // State for hover effect
    const closeClickedRef = useRef(false); // 标记关闭按钮是否被点击
    const { capture, isLoading } = useSnapshot();

    const isZh = locale === 'zh';
    const isTw = locale === 'tw';

    // State for converted text
    const [convertedTitle, setConvertedTitle] = useState<string | null>(null);
    const [convertedSummary, setConvertedSummary] = useState<string | null>(null);
    const [convertedTags, setConvertedTags] = useState<string[]>([]);

    // Determine content to display
    const displayTitle = isTw && convertedTitle ? convertedTitle : (isZh && signal.titleTranslated ? signal.titleTranslated : signal.title);

    const rawSummary = (isZh || isTw) && signal.aiSummaryZh ? signal.aiSummaryZh : (signal.aiSummary || signal.summary);
    const displaySummary = isTw && convertedSummary ? convertedSummary : rawSummary;

    const searchParams = useSearchParams();
    const activeTag = searchParams.get('tag');

    const rawTags = (isZh || isTw) && signal.tagsZh && signal.tagsZh.length > 0 ? signal.tagsZh : signal.tags;
    let displayTags = isTw && convertedTags.length > 0 ? convertedTags : rawTags;

    // Ensure activeTag is displayed if it matched (addressing the "ghost match" issue)
    if (activeTag && displayTags && !displayTags.includes(activeTag)) {
        // Check if it exists in the OTHER tag list (e.g. matched tagsZh while viewing in EN)
        const hiddenTags = (isZh || isTw) ? signal.tags : signal.tagsZh;
        if (hiddenTags?.includes(activeTag) || signal.tags?.includes(activeTag) || signal.tagsZh?.includes(activeTag)) {
            displayTags = [activeTag, ...displayTags];
        }
    }

    const [isFavorited, setIsFavorited] = useState(signal.isFavorited ?? false);
    const { startReading } = useReading();
    const { setSelectedSignal } = useSignal();

    // 兼容新旧数据格式
    const sourceName = typeof signal.source === 'string'
        ? signal.source
        : signal.source?.name || 'Unknown';
    const sourceIcon = typeof signal.source === 'string'
        ? null
        : signal.source?.icon;

    useEffect(() => {
        setMounted(true);
        // 如果没有从服务器获取状态，从 localStorage 读取
        if (signal.isRead === undefined) {
            const readSignals = JSON.parse(localStorage.getItem("read_signals") || "[]");
            if (readSignals.includes(signal.id)) {
                setIsRead(true);
            }
        }
    }, [signal.id, signal.isRead]);

    // Handle Traditional Chinese Conversion
    useEffect(() => {
        if (isTw) {
            const convertContent = async () => {
                // Determine source for title: use translated if available, otherwise original
                const titleSrc = signal.titleTranslated || signal.title;
                if (titleSrc) {
                    const twTitle = await convertToTraditional(titleSrc);
                    setConvertedTitle(twTitle);
                }

                // Determine source for summary
                const summarySrc = signal.aiSummaryZh || signal.aiSummary || signal.summary;
                if (summarySrc) {
                    const twSummary = await convertToTraditional(summarySrc);
                    setConvertedSummary(twSummary);
                }

                // Determine source for tags
                const tagsSrc = (signal.tagsZh && signal.tagsZh.length > 0) ? signal.tagsZh : signal.tags;
                if (tagsSrc && tagsSrc.length > 0) {
                    const twTags = await Promise.all(tagsSrc.map(tag => convertToTraditional(tag)));
                    setConvertedTags(twTags);
                }
            };
            convertContent();
        }
    }, [isTw, signal]);

    const handleRead = async () => {
        // Guest mode: do nothing
        if (isGuest) return;

        // 本地更新
        const readSignals = JSON.parse(localStorage.getItem("read_signals") || "[]");
        if (!readSignals.includes(signal.id)) {
            readSignals.push(signal.id);
            localStorage.setItem("read_signals", JSON.stringify(readSignals));
            setIsRead(true);
        }

        // 服务端更新 (fire and forget)
        try {
            fetch(`/api/signals/${signal.id}/read`, { method: "POST" });
        } catch (e) {
            // Ignore errors
        }
    };

    const handleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsFavorited(!isFavorited);

        try {
            await fetch(`/api/signals/${signal.id}/favorite`, { method: "POST" });
        } catch (e) {
            // Revert on error
            setIsFavorited(isFavorited);
        }
    };

    const handleOpenDetail = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleRead();
        setSelectedSignal(signal);
    };

    if (variant === "compact") {
        // 移动端点击处理：第一次点击显示弹窗，第二次点击进入详情
        const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // 检查是否是关闭按钮触发的点击，如果是则忽略
            if (closeClickedRef.current) {
                closeClickedRef.current = false;
                return;
            }

            // 如果弹窗已显示，点击进入详情
            if (isSummaryHovered) {
                handleRead();
                setSelectedSignal(signal);
            } else {
                // 第一次点击显示弹窗
                setIsSummaryHovered(true);
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                    "kanban-card group transition-all duration-300 relative",
                    "bg-[var(--color-card)] border border-[var(--color-border)]",
                    isRead ? "opacity-60 bg-[var(--color-background)]/5 grayscale" : "",
                    className
                )}
                onClick={handleCardClick}
                onMouseEnter={() => setIsSummaryHovered(true)}
                onMouseLeave={() => setIsSummaryHovered(false)}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        {sourceIcon && (
                            <span className="text-xs">{sourceIcon}</span>
                        )}
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            isRead ? "text-[var(--color-text-muted)]" : "text-[var(--color-accent)]"
                        )}>
                            {signal.score}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">•</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                            {mounted ? new Date(signal.createdAt).toLocaleString() : ""}
                        </span>
                        {(signal.metadata as any)?.comments !== undefined && (
                            <>
                                <span className="text-[10px] text-[var(--color-text-muted)]">•</span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">
                                    {isZh || isTw ? (isTw ? '評論' : '评论') : 'Comments'}: {(signal.metadata as any).comments}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {!isGuest && (
                            <button
                                onClick={handleFavorite}
                                className={cn(
                                    "p-1 rounded transition-colors",
                                    isFavorited
                                        ? "text-yellow-400"
                                        : "text-neutral-600 hover:text-yellow-400"
                                )}
                            >
                                <Star className={cn("w-3 h-3", isFavorited && "fill-current")} />
                            </button>
                        )}
                        <a
                            href={signal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRead();
                            }}
                        >
                            <ExternalLink className="w-3 h-3 text-neutral-600 hover:text-white transition-colors" />
                        </a>
                    </div>
                </div>

                {/* 主标题 */}
                <h3 className={cn(
                    "text-sm font-medium leading-snug transition-colors mb-1 group-hover:underline decoration-[var(--color-border)] underline-offset-2",
                    isRead ? "text-[var(--color-text-muted)]" : "group-hover:text-[var(--color-accent)] text-[var(--color-foreground)]"
                )}>
                    {displayTitle}
                </h3>

                {/* 副标题：中文模式显示原文（小字灰色） */}
                {(isZh || isTw) && signal.titleTranslated && (
                    <p className="text-[11px] text-[var(--color-text-muted)] mb-2 line-clamp-1 opacity-80">
                        {signal.title}
                    </p>
                )}

                {displaySummary && (
                    <p className="text-[12px] text-[var(--color-text-muted)] line-clamp-2 leading-normal">
                        {displaySummary}
                    </p>
                )}

                {displayTags && displayTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {displayTags.slice(0, 3).map((tag, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('tag', tag);
                                    window.location.href = url.toString();
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-background)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer"
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Hover/Click Full View - Triggered on card hover (desktop) or click (mobile) */}
                {isSummaryHovered && signal.summary && (
                    <div
                        className="absolute -top-2 -left-2 -right-2 bg-[var(--color-card)] border border-[var(--color-accent)]/50 rounded-lg p-4 shadow-2xl z-50 h-auto min-h-[calc(100%+16px)] flex flex-col"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRead();
                            setSelectedSignal(signal);
                        }}
                    >
                        <div className="text-[13px] text-[var(--color-foreground)] leading-relaxed space-y-2 mb-4">
                            {/* 主标题 */}
                            <h4 className="font-semibold text-[var(--color-accent)] text-sm line-clamp-2">
                                {displayTitle}
                            </h4>
                            {/* 副标题 */}
                            {(isZh || isTw) && signal.titleTranslated && (
                                <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1 opacity-80">
                                    {signal.title}
                                </p>
                            )}
                            {/* 摘要 */}
                            <p className="text-[var(--color-text-muted)]">
                                {displaySummary}
                            </p>
                        </div>

                        {/* Tags in Overlay */}
                        {displayTags && displayTags.length > 0 && (
                            <div className="mt-auto flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]/50 mb-3">
                                {displayTags.map((tag, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('tag', tag);
                                            window.location.href = url.toString();
                                        }}
                                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-background)]/50 text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Mobile: Tap hint and close button */}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
                            <span className="text-[10px] text-[var(--color-accent)] opacity-80">
                                {isZh ? '点击查看详情' : (isTw ? '點擊查看詳情' : 'Tap to view details')}
                            </span>
                            <button
                                type="button"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    closeClickedRef.current = true; // 标记关闭按钮被点击
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    e.nativeEvent.stopImmediatePropagation();
                                    closeClickedRef.current = true; // 确保标记设置
                                    setIsSummaryHovered(false);
                                }}
                                className="text-[10px] text-[var(--color-text-muted)] px-3 py-2 rounded bg-[var(--color-background)] hover:bg-[var(--color-card-hover)] active:bg-[var(--color-card-hover)] border border-[var(--color-border)] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                            >
                                {isZh || isTw ? (isTw ? '關閉' : '关闭') : 'Close'}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }

    // Fallback for default variant
    // Heatmap Logic
    const getHeatmapClass = (score: number) => {
        if (score >= 80) return "shadow-[0_0_15px_-3px_rgba(249,115,22,0.6)] border-orange-500/50 dark:shadow-[0_0_20px_-5px_rgba(249,115,22,0.5)]"; // High heat (Orange/Red)
        if (score >= 60) return "shadow-[0_0_10px_-3px_rgba(234,179,8,0.4)] border-yellow-500/30 dark:shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]"; // Medium heat (Yellow)
        return "hover:shadow-md"; // Low heat (Default)
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "bento-card group relative hover:z-30 transition-all duration-300",
                "bg-[var(--color-card)] border border-[var(--color-border)]",
                getHeatmapClass(signal.score),
                isRead ? "opacity-60 grayscale shadow-none" : "",
                className
            )}
            onClick={handleOpenDetail}
            id={`signal-card-${signal.id}`}
        >
            <div className="flex justify-between items-start mb-4">
                <span className="glass-pill text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1 bg-[var(--color-background)]/50 border border-[var(--color-border)]">
                    {sourceIcon && <span>{sourceIcon}</span>}
                    {sourceName}
                </span>
                <div className="flex items-center gap-2">
                    <TrendingUp className={cn("w-3 h-3", isRead ? "text-[var(--color-text-muted)]" : "text-[var(--color-accent)]")} />
                    <span className="signal-score text-sm text-[var(--color-foreground)]">{signal.score}</span>
                </div>
            </div>

            {/* 主标题 */}
            <h3 className={cn(
                "text-lg font-semibold mb-1 leading-snug transition-colors group-hover:underline decoration-[var(--color-border)] underline-offset-2",
                isRead ? "text-[var(--color-text-muted)]" : "group-hover:text-[var(--color-accent)] text-[var(--color-foreground)]"
            )}>
                {displayTitle}
            </h3>

            {/* 副标题 */}
            {(isZh || isTw) && signal.titleTranslated && (
                <div className="mb-3 flex gap-2 items-start opacity-70">
                    <Languages className="w-3.5 h-3.5 mt-0.5 text-[var(--color-text-muted)] shrink-0" />
                    <p className="text-xs text-[var(--color-text-muted)] leading-snug">
                        {signal.title}
                    </p>
                </div>
            )}

            {/* Bilingual Summary with Hover Interaction */}
            {signal.summary && (
                <div
                    className="relative mb-4 flex-grow"
                    onMouseEnter={() => setIsSummaryHovered(true)}
                    onMouseLeave={() => setIsSummaryHovered(false)}
                >
                    {/* Default View (Truncated) */}
                    <div className="text-sm text-[var(--color-text-muted)] line-clamp-3 leading-relaxed">
                        {signal.aiSummary ? (
                            <div className="flex flex-col gap-1.5">
                                <span className="flex gap-2">
                                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-purple-400 shrink-0" />
                                    {/* Chinese locale: prefer zh/tw summary | English: show en summary */}
                                    <span className="text-[var(--color-text-muted)] opacity-90">
                                        {displaySummary}
                                    </span>
                                </span>
                            </div>
                        ) : (
                            signal.summary
                        )}
                    </div>

                    {/* Hover Full View (Absolute Overlay) */}
                    {/* Hover Full View (Absolute Overlay) */}
                    {isSummaryHovered && (
                        <div className="absolute -top-2 -left-2 -right-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 shadow-2xl z-50 h-auto min-h-[calc(100%+16px)] flex flex-col">
                            <div className="text-sm text-[var(--color-foreground)] leading-relaxed space-y-2 mb-4">
                                {signal.aiSummary ? (
                                    <span className="flex gap-2">
                                        <Sparkles className="w-3.5 h-3.5 mt-0.5 text-purple-400 shrink-0" />
                                        {/* Hover: Chinese locale prioritizes zh/tw summary | English shows en summary */}
                                        <span className="text-[var(--color-text-muted)]">
                                            {displaySummary}
                                        </span>
                                    </span>
                                ) : (
                                    signal.summary
                                )}
                            </div>

                            {/* Tags in Overlay */}
                            {displayTags && displayTags.length > 0 && (
                                <div className="mt-auto flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]/50">
                                    {displayTags.map((tag, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const url = new URL(window.location.href);
                                                url.searchParams.set('tag', tag);
                                                window.location.href = url.toString();
                                            }}
                                            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-background)]/50 text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {displayTags && displayTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {displayTags.map((tag, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Use window.location to preserve search params if needed, or just router.push
                                // But since we want to toggle/set tag, simplistic approach:
                                const url = new URL(window.location.href);
                                url.searchParams.set('tag', tag);
                                window.location.href = url.toString();
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-background)]/50 text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer"
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-auto pt-4 flex justify-between items-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <span>{mounted ? new Date(signal.createdAt).toLocaleString() : ""}</span>
                    {(signal.metadata as any)?.comments !== undefined && (
                        <span className="flex items-center gap-1 opacity-80">
                            <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)]" />
                            {isZh || isTw ? (isTw ? '評論' : '评论') : 'Comments'}: {(signal.metadata as any).comments}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 mr-1 group/read relative">
                        <button
                            className="p-2 hover:bg-[var(--color-card-hover)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                            title={isZh ? "AI 深度阅读" : "AI Deep Read"}
                        >
                            <BookOpen className="w-4 h-4" />
                        </button>
                        {/* Dropdown for Reading Modes */}
                        <div className="absolute bottom-full right-0 mb-2 w-32 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-xl opacity-0 invisible group-hover/read:opacity-100 group-hover/read:visible transition-all z-[60] overflow-hidden flex flex-col">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startReading(signal.url, 'short');
                                }}
                                className="px-3 py-2 text-xs text-left text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] transition-colors border-b border-[var(--color-border)]/50"
                            >
                                {isZh ? "⚡️ 短总结" : "Short Summary"}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startReading(signal.url, 'long');
                                }}
                                className="px-3 py-2 text-xs text-left text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] transition-colors border-b border-[var(--color-border)]/50"
                            >
                                {isZh ? "📝 长总结" : "Long Summary"}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startReading(signal.url, 'translate');
                                }}
                                className="px-3 py-2 text-xs text-left text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] transition-colors"
                            >
                                {isZh ? "🌐 逐字翻译" : "Translate"}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            capture(`signal-card-${signal.id}`, {
                                fileName: `signal-${signal.id}.png`,
                                addBranding: true
                            }).catch(() => { });
                        }}
                        className="p-2 hover:bg-[var(--color-card-hover)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
                        title={isZh ? "分享卡片" : "Share Card"}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    {!isGuest && (
                        <button
                            onClick={handleFavorite}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isFavorited
                                    ? "text-yellow-400 bg-yellow-400/10"
                                    : "hover:bg-[var(--color-card-hover)]"
                            )}
                        >
                            <Star className={cn("w-4 h-4", isFavorited && "fill-current")} />
                        </button>
                    )}
                    <a
                        href={signal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-[var(--color-card-hover)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRead();
                        }}
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </motion.div>
    );
}
