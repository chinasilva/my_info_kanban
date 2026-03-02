"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useId } from "react";
import { ExternalLink, PlayCircle, ChevronDown } from "lucide-react";
import { Signal } from "@/schemas/signal";
import { motion, AnimatePresence } from "framer-motion";

interface VideoHighlightsProps {
    signals: Signal[];
    locale: string;
}

type VideoMetadata = {
    videoPlatform?: string;
    videoId?: string;
    watchUrl?: string;
    embedUrl?: string;
    durationSec?: number;
    durationText?: string;
};

function getVideoMetadata(signal: Signal): VideoMetadata {
    if (!signal.metadata || typeof signal.metadata !== "object") return {};
    return signal.metadata as VideoMetadata;
}

function formatDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function getDurationBadge(metadata: VideoMetadata): string | null {
    if (typeof metadata.durationText === "string" && metadata.durationText.trim()) {
        return metadata.durationText.trim();
    }
    if (typeof metadata.durationSec === "number" && Number.isFinite(metadata.durationSec) && metadata.durationSec > 0) {
        return formatDuration(metadata.durationSec);
    }
    return null;
}

function getRelativeTime(createdAt: string | Date, locale: string): string {
    const timestamp = new Date(createdAt).getTime();
    if (Number.isNaN(timestamp)) return "";

    const diffMs = Date.now() - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const isZh = locale === "zh" || locale === "tw";

    if (diffMs < hour) {
        const value = Math.max(1, Math.floor(diffMs / minute));
        return isZh ? `${value} 分钟前` : `${value} min ago`;
    }

    if (diffMs < day) {
        const value = Math.floor(diffMs / hour);
        return isZh ? `${value} 小时前` : `${value} hr ago`;
    }

    const value = Math.floor(diffMs / day);
    return isZh ? `${value} 天前` : `${value} day${value > 1 ? "s" : ""} ago`;
}

function getSourceName(signal: Signal): string {
    if (typeof signal.source === "string") return signal.source;
    return signal.source?.name || "Video";
}

function getSourceIcon(signal: Signal): string {
    if (typeof signal.source === "string") return "▶";
    return signal.source?.icon || "▶";
}

const VideoPlayerDialog = dynamic(
    () => import("./VideoPlayerDialog").then((mod) => mod.VideoPlayerDialog),
    { ssr: false }
);

const COLLAPSE_STORAGE_KEY = "video-highlights-collapsed";

export function VideoHighlights({ signals, locale }: VideoHighlightsProps) {
    const [activeSignal, setActiveSignal] = useState<Signal | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
    const contentId = useId();

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
            if (stored !== null) {
                setIsCollapsed(stored === "true");
            }
        } catch {
            return;
        }
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            try {
                window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
            } catch {
                return next;
            }
            return next;
        });
    };

    if (!signals || signals.length === 0) return null;

    const isZh = locale === "zh" || locale === "tw";
    const title = isZh ? "视频速览" : "Video Highlights";
    const subtitle = isZh ? "点击即可在当前页面播放" : "Tap to play inline";

    return (
        <>
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-background)] overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md mb-4">
                <header>
                    <button
                        type="button"
                        onClick={toggleCollapse}
                        className="w-full px-5 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-[var(--color-card-hover)] transition-colors group text-left"
                        aria-expanded={!isCollapsed}
                        aria-controls={contentId}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform shadow-inner">
                                <PlayCircle className="w-5 h-5 fill-current/10" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-[var(--color-foreground)] tracking-tight">{title}</h2>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--color-border)] text-[var(--color-text-muted)] rounded-full border border-white/5">
                                        {signals.length}
                                    </span>
                                </div>
                                {!isCollapsed && (
                                    <p className="text-[11px] text-[var(--color-text-muted)] leading-tight mt-0.5 opacity-80">{subtitle}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-foreground)] transition-colors">
                            <span className="text-[11px] hidden sm:inline font-semibold tracking-wide uppercase">
                                {isCollapsed ? (isZh ? "展开" : "Expand") : (isZh ? "收起" : "Collapse")}
                            </span>
                            <div className={`transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>
                </header>

                <div id={contentId}>
                    <AnimatePresence initial={false}>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pt-1 pb-5 border-t border-[var(--color-border)] bg-gradient-to-b from-[var(--color-card-hover)]/20 to-transparent">
                                    <div className="flex gap-5 overflow-x-auto pb-3 px-1 snap-x snap-mandatory custom-scrollbar">
                                        {signals.map((signal) => {
                                            const metadata = getVideoMetadata(signal);
                                            const platform = metadata.videoPlatform || "video";
                                            const videoId = metadata.videoId;
                                            const watchUrl = metadata.watchUrl || signal.url;
                                            const thumbnail =
                                                platform === "youtube" && videoId
                                                    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                                                    : null;
                                            const sourceName = getSourceName(signal);
                                            const sourceIcon = getSourceIcon(signal);
                                            const relativeTime = getRelativeTime(signal.createdAt, locale);
                                            const platformLabel = platform === "youtube" ? "YouTube" : platform === "bilibili" ? "Bilibili" : "Video";
                                            const duration = getDurationBadge(metadata);

                                            return (
                                                <div
                                                    key={signal.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveSignal(signal);
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                            setActiveSignal(signal);
                                                        }
                                                    }}
                                                    className="group shrink-0 w-[85vw] sm:w-[320px] lg:w-[360px] snap-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] my-2"
                                                >
                                                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]/50 transition-all duration-300 overflow-hidden h-full flex flex-col shadow-sm hover:shadow-2xl hover:-translate-y-1.5 relative z-0">
                                                        <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                                                            {thumbnail ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={thumbnail}
                                                                    alt={signal.title}
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-400 text-sm">
                                                                    {platformLabel}
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-300" />

                                                            <div className="absolute top-3 left-3 flex gap-1.5">
                                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white font-bold uppercase tracking-widest border border-white/10">
                                                                    {platformLabel}
                                                                </span>
                                                            </div>

                                                            {duration ? (
                                                                <span className="absolute bottom-3 right-3 text-[10px] px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white font-bold tabular-nums border border-white/10">
                                                                    {duration}
                                                                </span>
                                                            ) : null}

                                                            {/* Play Button Overlay (PC) */}
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-75 group-hover:scale-100">
                                                                <div className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                                                                    <PlayCircle className="w-9 h-9 fill-current" />
                                                                </div>
                                                            </div>

                                                            {/* Play Button (Mobile) */}
                                                            <div className="absolute inset-0 flex items-center justify-center sm:hidden">
                                                                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                                                                    <PlayCircle className="w-7 h-7 text-white fill-current/20" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-4 flex flex-col flex-1 gap-3 bg-gradient-to-b from-[var(--color-card)] to-[var(--color-card-hover)]/30">
                                                            <h3 className="text-[14px] font-bold text-[var(--color-foreground)] line-clamp-2 leading-[1.4] group-hover:text-[var(--color-accent)] transition-colors duration-300">
                                                                {signal.title}
                                                            </h3>

                                                            <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-7 h-7 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center text-[12px] shrink-0 overflow-hidden shadow-sm">
                                                                        {sourceIcon}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-[11px] font-bold text-[var(--color-text-muted)] line-clamp-1 group-hover:text-[var(--color-foreground)] transition-colors">{sourceName}</span>
                                                                        <span className="text-[10px] text-[var(--color-text-muted)]/60 font-medium">{relativeTime}</span>
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={watchUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    className="w-8 h-8 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] transition-all duration-300 shrink-0 shadow-sm"
                                                                    aria-label={isZh ? "打开原视频" : "Open original video"}
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            <VideoPlayerDialog
                open={Boolean(activeSignal)}
                signal={activeSignal}
                locale={locale}
                onOpenChange={(open) => {
                    if (!open) setActiveSignal(null);
                }}
            />
        </>
    );
}
