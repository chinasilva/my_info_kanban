import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, Star, Sparkles, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useSignal } from "@/context/SignalContext";
import { Signal, SignalSchema } from "@/schemas/signal"; // Import Zod Types

export function SignalCard({
    signal,
    className,
    variant = "default",
    locale
}: {
    signal: Signal; // Use inferred type
    className?: string;
    variant?: "default" | "compact";
    locale?: string;
}) {
    const [mounted, setMounted] = useState(false);
    const [isRead, setIsRead] = useState(signal.isRead ?? false);
    const [isSummaryHovered, setIsSummaryHovered] = useState(false); // State for hover effect
    const closeClickedRef = useRef(false); // 标记关闭按钮是否被点击

    const isZh = locale === 'zh';
    const displayTitle = signal.title;
    const displayTags = (isZh && signal.tagsZh && signal.tagsZh.length > 0) ? signal.tagsZh : signal.tags;
    const [isFavorited, setIsFavorited] = useState(signal.isFavorited ?? false);
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

    const handleRead = async () => {
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
                    isRead ? "opacity-60 bg-white/5 grayscale" : "",
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
                            isRead ? "text-neutral-500" : "text-accent"
                        )}>
                            {signal.score}
                        </span>
                        <span className="text-[10px] text-neutral-500">•</span>
                        <span className="text-[10px] text-neutral-500">
                            {mounted ? new Date(signal.createdAt).toLocaleString() : ""}
                        </span>
                        {(signal.metadata as any)?.comments !== undefined && (
                            <>
                                <span className="text-[10px] text-neutral-500">•</span>
                                <span className="text-[10px] text-neutral-500">
                                    {isZh ? '评论' : 'Comments'}: {(signal.metadata as any).comments}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
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

                <h3 className={cn(
                    "text-sm font-medium leading-snug transition-colors mb-2 group-hover:underline decoration-white/20 underline-offset-2",
                    isRead ? "text-neutral-500" : "group-hover:text-accent"
                )}>
                    {signal.title}
                </h3>

                {(signal.summary || signal.aiSummary) && (
                    <p className="text-[12px] text-neutral-400 line-clamp-2 leading-normal">
                        {/* Only show translated title in Chinese locale */}
                        {isZh && signal.titleTranslated && (
                            <span className="block text-accent/80 mb-0.5">{signal.titleTranslated}</span>
                        )}
                        {/* Chinese: prioritize zh summary | English: use en summary */}
                        {(isZh && signal.aiSummaryZh) ? signal.aiSummaryZh : (signal.aiSummary || signal.summary)}
                    </p>
                )}

                {signal.tags && signal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {signal.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/5">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Hover/Click Full View - Triggered on card hover (desktop) or click (mobile) */}
                {isSummaryHovered && signal.summary && (
                    <div
                        className="absolute inset-0 bg-[#0f1419] border border-emerald-500/30 rounded-lg p-4 shadow-2xl z-50 overflow-hidden flex flex-col"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRead();
                            setSelectedSignal(signal);
                        }}
                    >
                        <div className="text-[13px] text-white leading-relaxed space-y-2 flex-1 overflow-y-auto">
                            {/* Title: Chinese if zh and available, else original */}
                            <h4 className="font-semibold text-emerald-400 text-sm line-clamp-2">
                                {isZh && signal.titleTranslated ? signal.titleTranslated : signal.title}
                            </h4>
                            {/* Summary: Chinese if zh and available, else original */}
                            <p className="text-gray-200 line-clamp-6">
                                {isZh && signal.aiSummaryZh ? signal.aiSummaryZh : (signal.aiSummary || signal.summary)}
                            </p>
                        </div>
                        {/* Mobile: Tap hint and close button */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
                            <span className="text-[10px] text-emerald-400/80">
                                {isZh ? '点击查看详情' : 'Tap to view details'}
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
                                className="text-[10px] text-neutral-400 px-3 py-2 rounded bg-white/10 hover:bg-white/20 active:bg-white/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                {isZh ? '关闭' : 'Close'}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }

    // Fallback for default variant
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("bento-card group", isRead ? "opacity-60 grayscale" : "", className)}
            onClick={handleOpenDetail}
        >
            <div className="flex justify-between items-start mb-4">
                <span className="glass-pill text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    {sourceIcon && <span>{sourceIcon}</span>}
                    {sourceName}
                </span>
                <div className="flex items-center gap-2">
                    <TrendingUp className={cn("w-3 h-3", isRead ? "text-neutral-500" : "text-accent")} />
                    <span className="signal-score text-sm">{signal.score}</span>
                </div>
            </div>

            {/* Bilingual Title Logic: Always show original. If Zh, show translated as secondary. */
                /* User request: "Retain original language and see translation" */
            }
            <h3 className={cn(
                "text-lg font-semibold mb-1 leading-snug transition-colors group-hover:underline decoration-white/20 underline-offset-2",
                isRead ? "text-neutral-500" : "group-hover:text-accent"
            )}>
                {signal.title}
            </h3>

            {/* Only show translated title in Chinese locale */}
            {isZh && signal.titleTranslated && (
                <div className="mb-3 flex gap-2 items-start opacity-90">
                    <Languages className="w-3.5 h-3.5 mt-1 text-accent shrink-0" />
                    <h4 className="text-sm text-neutral-300 leading-snug font-medium">
                        {signal.titleTranslated}
                    </h4>
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
                    <div className="text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                        {signal.aiSummary ? (
                            <div className="flex flex-col gap-1.5">
                                <span className="flex gap-2">
                                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-purple-400 shrink-0" />
                                    {/* Chinese locale: prefer zh summary | English: show en summary */}
                                    <span className="text-neutral-300">
                                        {isZh && signal.aiSummaryZh ? signal.aiSummaryZh : signal.aiSummary}
                                    </span>
                                </span>
                            </div>
                        ) : (
                            signal.summary
                        )}
                    </div>

                    {/* Hover Full View (Absolute Overlay) */}
                    {isSummaryHovered && (
                        <div className="absolute -top-2 -left-2 -right-2 bg-[#1b2128] border border-white/20 rounded-lg p-4 shadow-2xl z-50 min-h-[calc(100%+16px)]">
                            <div className="text-sm text-neutral-300 leading-relaxed space-y-2">
                                {signal.aiSummary ? (
                                    <span className="flex gap-2">
                                        <Sparkles className="w-3.5 h-3.5 mt-0.5 text-purple-400 shrink-0" />
                                        {/* Hover: Chinese locale prioritizes zh summary | English shows en summary */}
                                        <span>
                                            {isZh && signal.aiSummaryZh ? signal.aiSummaryZh : signal.aiSummary}
                                        </span>
                                    </span>
                                ) : (
                                    signal.summary
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {displayTags && displayTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {displayTags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10 transition-colors">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-auto pt-4 flex justify-between items-center text-xs text-neutral-500 border-t border-white/5">
                <div className="flex items-center gap-3">
                    <span>{mounted ? new Date(signal.createdAt).toLocaleString() : ""}</span>
                    {(signal.metadata as any)?.comments !== undefined && (
                        <span className="flex items-center gap-1 opacity-80">
                            <span className="w-1 h-1 rounded-full bg-neutral-600" />
                            {isZh ? '评论' : 'Comments'}: {(signal.metadata as any).comments}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleFavorite}
                        className={cn(
                            "p-2 rounded-full transition-colors",
                            isFavorited
                                ? "text-yellow-400 bg-yellow-400/10"
                                : "hover:bg-white/5"
                        )}
                    >
                        <Star className={cn("w-4 h-4", isFavorited && "fill-current")} />
                    </button>
                    <a
                        href={signal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
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
