"use client";

import { ExternalLink, PlayCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Signal } from "@/schemas/signal";

interface VideoPlayerDialogProps {
    open: boolean;
    signal: Signal | null;
    locale: string;
    onOpenChange: (open: boolean) => void;
}

type VideoMetadata = {
    videoPlatform?: string;
    videoId?: string;
    watchUrl?: string;
    embedUrl?: string;
};

const ALLOWED_EMBED_HOSTS = new Set([
    "www.youtube.com",
    "youtube.com",
    "player.bilibili.com",
]);

function getVideoMetadata(signal: Signal | null): VideoMetadata {
    if (!signal || !signal.metadata || typeof signal.metadata !== "object") return {};
    return signal.metadata as VideoMetadata;
}

function isAllowedEmbedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ALLOWED_EMBED_HOSTS.has(parsed.hostname.toLowerCase());
    } catch {
        return false;
    }
}

function extractYouTubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtu.be")) {
            return parsed.pathname.replace("/", "").trim() || null;
        }
        const v = parsed.searchParams.get("v");
        if (v) return v;
        if (parsed.pathname.includes("/shorts/")) {
            const parts = parsed.pathname.split("/").filter(Boolean);
            const shortsIndex = parts.indexOf("shorts");
            return shortsIndex >= 0 && parts[shortsIndex + 1] ? parts[shortsIndex + 1] : null;
        }
        return null;
    } catch {
        return null;
    }
}

function extractBilibiliBvid(url: string): string | null {
    const match = url.match(/\/video\/(BV[0-9A-Za-z]+)/i);
    return match?.[1] || null;
}

function resolveEmbedUrl(signal: Signal | null, metadata: VideoMetadata): string | null {
    if (!signal) return null;

    if (typeof metadata.embedUrl === "string" && metadata.embedUrl.trim()) {
        const rawEmbedUrl = metadata.embedUrl.trim();
        if (isAllowedEmbedUrl(rawEmbedUrl)) {
            return rawEmbedUrl;
        }
    }

    const watchUrl = (typeof metadata.watchUrl === "string" && metadata.watchUrl.trim())
        ? metadata.watchUrl.trim()
        : signal.url;
    const platform = metadata.videoPlatform || "";

    if (platform === "youtube") {
        const videoId = metadata.videoId || extractYouTubeVideoId(watchUrl);
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (platform === "bilibili") {
        const bvid = metadata.videoId || extractBilibiliBvid(watchUrl);
        if (bvid) return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1`;
    }

    return null;
}

function getSourceName(signal: Signal | null): string {
    if (!signal) return "";
    if (typeof signal.source === "string") return signal.source;
    return signal.source?.name || "";
}

export function VideoPlayerDialog({ open, signal, locale, onOpenChange }: VideoPlayerDialogProps) {
    const isZh = locale === "zh" || locale === "tw";
    const metadata = getVideoMetadata(signal);
    const watchUrl = signal
        ? ((typeof metadata.watchUrl === "string" && metadata.watchUrl.trim()) ? metadata.watchUrl : signal.url)
        : "";
    const embedUrl = resolveEmbedUrl(signal, metadata);
    const platformLabel =
        metadata.videoPlatform === "youtube"
            ? "YouTube"
            : metadata.videoPlatform === "bilibili"
                ? "Bilibili"
                : "Video";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-5xl p-0 bg-[var(--color-background)] text-[var(--color-foreground)] border-l border-[var(--color-border)]"
            >
                <div className="h-full flex flex-col">
                    <SheetHeader className="px-4 py-3 border-b border-[var(--color-border)]">
                        <SheetTitle className="text-base sm:text-lg font-semibold text-[var(--color-foreground)] pr-8">
                            {signal?.title || (isZh ? "视频播放" : "Video Player")}
                        </SheetTitle>
                        <SheetDescription className="text-xs text-[var(--color-text-muted)]">
                            {getSourceName(signal)} {platformLabel ? `• ${platformLabel}` : ""}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-black">
                            <div className="relative aspect-video">
                                {embedUrl ? (
                                    <iframe
                                        src={embedUrl}
                                        title={signal?.title || "Video"}
                                        className="absolute inset-0 w-full h-full"
                                        loading="lazy"
                                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-200 px-4 text-center">
                                        <PlayCircle className="w-10 h-10 text-white/85" />
                                        <p className="text-sm">
                                            {isZh ? "当前视频暂不支持内嵌播放，请打开原视频。" : "Inline playback unavailable for this video. Open original instead."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {watchUrl ? (
                            <a
                                href={watchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {isZh ? "打开原视频" : "Open original video"}
                            </a>
                        ) : null}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
