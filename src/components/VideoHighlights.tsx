"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { Signal } from "@/schemas/signal";

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

export function VideoHighlights({ signals, locale }: VideoHighlightsProps) {
    const [activeSignal, setActiveSignal] = useState<Signal | null>(null);
    if (!signals || signals.length === 0) return null;

    const isZh = locale === "zh" || locale === "tw";
    const title = isZh ? "视频速览" : "Video Highlights";
    const subtitle = isZh ? "点击即可在当前页面播放" : "Tap to play inline";

    return (
        <>
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-background)] overflow-hidden">
                <header className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-red-500" />
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>
                        </div>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{signals.length}</span>
                </header>

                <div className="px-3 pt-3 pb-2">
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
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
                                    onClick={() => setActiveSignal(signal)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setActiveSignal(signal);
                                        }
                                    }}
                                    className="group shrink-0 w-[82vw] sm:w-[320px] lg:w-[340px] snap-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                                >
                                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-hover)] transition-colors overflow-hidden">
                                        <div className="relative aspect-video bg-gradient-to-br from-neutral-800 to-neutral-900">
                                            {thumbnail ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={thumbnail}
                                                    alt={signal.title}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-200 text-sm">
                                                    {platformLabel}
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                                            <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/75 text-white">
                                                {platformLabel}
                                            </span>
                                            {duration ? (
                                                <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/75 text-white font-medium">
                                                    {duration}
                                                </span>
                                            ) : null}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-14 h-14 rounded-full bg-black/70 border border-white/30 flex items-center justify-center shadow-lg">
                                                    <PlayCircle className="w-8 h-8 text-white" />
                                                </div>
                                            </div>
                                            <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/75 text-white">
                                                {isZh ? "点击播放" : "Tap to play"}
                                            </span>
                                        </div>

                                        <div className="p-3 flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center text-sm shrink-0">
                                                {sourceIcon}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-medium text-[var(--color-foreground)] line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                                                    {signal.title}
                                                </h3>
                                                <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1">{sourceName}</p>
                                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{relativeTime}</p>
                                            </div>
                                            <a
                                                href={watchUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(event) => event.stopPropagation()}
                                                className="w-7 h-7 rounded border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] mt-0.5 shrink-0"
                                                aria-label={isZh ? "打开原视频" : "Open original video"}
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
