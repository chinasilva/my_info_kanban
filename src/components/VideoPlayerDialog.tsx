"use client";

import { ArrowLeft, ExternalLink, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Signal } from "@/schemas/signal";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

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
    "www.youtube-nocookie.com",
    "youtube-nocookie.com",
    "player.bilibili.com",
]);

const YOUTUBE_INLINE_FALLBACK_KEY = "youtube-inline-fallback-preferred";

function buildYouTubeEmbedUrl(videoId: string): string {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("enablejsapi", "1");
    return url.toString();
}

function isYouTubeHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return host === "www.youtube.com"
        || host === "youtube.com"
        || host === "www.youtube-nocookie.com"
        || host === "youtube-nocookie.com"
        || host.endsWith(".youtube.com")
        || host.endsWith(".youtube-nocookie.com")
        || host === "youtu.be";
}

function isYouTubeEmbedUrl(url: string): boolean {
    try {
        return isYouTubeHost(new URL(url).hostname);
    } catch {
        return false;
    }
}

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
        if (parsed.pathname.includes("/embed/")) {
            const parts = parsed.pathname.split("/").filter(Boolean);
            const embedIndex = parts.indexOf("embed");
            return embedIndex >= 0 && parts[embedIndex + 1] ? parts[embedIndex + 1] : null;
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
            try {
                const parsed = new URL(rawEmbedUrl);
                if (isYouTubeHost(parsed.hostname)) {
                    const videoId = metadata.videoId || extractYouTubeVideoId(rawEmbedUrl);
                    if (videoId) {
                        return buildYouTubeEmbedUrl(videoId);
                    }
                }
            } catch {
                return rawEmbedUrl;
            }
            return rawEmbedUrl;
        }
    }

    const watchUrl = (typeof metadata.watchUrl === "string" && metadata.watchUrl.trim())
        ? metadata.watchUrl.trim()
        : signal.url;
    const platform = metadata.videoPlatform || "";

    if (platform === "youtube") {
        const videoId = metadata.videoId || extractYouTubeVideoId(watchUrl);
        if (videoId) return buildYouTubeEmbedUrl(videoId);
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

function getDisplayTitle(signal: Signal | null, locale: string): string {
    if (!signal) return "";
    const isZhLike = locale === "zh" || locale === "tw";
    if (isZhLike && signal.titleTranslated && signal.titleTranslated.trim()) {
        return signal.titleTranslated.trim();
    }
    return signal.title;
}

export function VideoPlayerDialog({ open, signal, locale, onOpenChange }: VideoPlayerDialogProps) {
    const isZhLike = locale === "zh" || locale === "tw";
    const isMobile = useIsMobile();
    const metadata = getVideoMetadata(signal);
    const watchUrl = signal
        ? ((typeof metadata.watchUrl === "string" && metadata.watchUrl.trim()) ? metadata.watchUrl : signal.url)
        : "";
    const embedUrl = resolveEmbedUrl(signal, metadata);
    const isYouTubeVideo = metadata.videoPlatform === "youtube" || (embedUrl ? isYouTubeEmbedUrl(embedUrl) : false);
    const [preferExternalPlayback, setPreferExternalPlayback] = useState(false);
    const platformLabel =
        metadata.videoPlatform === "youtube"
            ? "YouTube"
            : metadata.videoPlatform === "bilibili"
                ? "Bilibili"
                : "Video";

    const labels = isZhLike
        ? {
            playerTitle: "视频播放",
            back: "返回",
            inlineRestricted: "当前网络环境下可能无法稳定内嵌播放，可点击下方继续观看。",
            inlineUnavailable: "当前视频暂不支持内嵌播放，请点击下方继续观看。",
            continueWatching: "继续观看",
            continueOnYoutube: "继续观看（YouTube）",
            externalHint: "若内嵌播放受限，可一键继续观看。",
            tryInline: "仍尝试内嵌播放",
        }
        : {
            playerTitle: "Video Player",
            back: "Back",
            inlineRestricted: "Inline playback may be restricted in this network. Use Continue Watching below.",
            inlineUnavailable: "Inline playback is unavailable for this video. Use Continue Watching below.",
            continueWatching: "Continue Watching",
            continueOnYoutube: "Continue on YouTube",
            externalHint: "If inline playback is restricted, continue with one click.",
            tryInline: "Try inline playback",
        };

    const continueLabel = isYouTubeVideo ? labels.continueOnYoutube : labels.continueWatching;

    useEffect(() => {
        if (!open) {
            setPreferExternalPlayback(false);
            return;
        }

        if (!isYouTubeVideo) {
            setPreferExternalPlayback(false);
            return;
        }

        try {
            const preferred = window.sessionStorage.getItem(YOUTUBE_INLINE_FALLBACK_KEY) === "true";
            setPreferExternalPlayback(preferred);
        } catch {
            setPreferExternalPlayback(false);
        }
    }, [open, isYouTubeVideo]);

    const markPreferExternalPlayback = useCallback(() => {
        setPreferExternalPlayback(true);
        try {
            window.sessionStorage.setItem(YOUTUBE_INLINE_FALLBACK_KEY, "true");
        } catch {
            return;
        }
    }, []);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                showCloseButton={!isMobile}
                className="w-full sm:max-w-5xl p-0 bg-[var(--color-background)] text-[var(--color-foreground)] border-l border-[var(--color-border)]"
            >
                <div className="h-full flex flex-col">
                    <SheetHeader className="relative px-4 py-3 border-b border-[var(--color-border)]">
                        {isMobile ? (
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="absolute left-3 top-2.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] transition-colors"
                                aria-label={labels.back}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>{labels.back}</span>
                            </button>
                        ) : null}

                        <SheetTitle className={`text-base sm:text-lg font-semibold text-[var(--color-foreground)] ${isMobile ? "pl-16 pr-2" : "pr-8"}`}>
                            {getDisplayTitle(signal, locale) || labels.playerTitle}
                        </SheetTitle>
                        <SheetDescription className={`text-xs text-[var(--color-text-muted)] ${isMobile ? "pl-16" : ""}`}>
                            {getSourceName(signal)} {platformLabel ? `• ${platformLabel}` : ""}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-black">
                            <div className="relative aspect-video">
                                {embedUrl && !(isYouTubeVideo && preferExternalPlayback) ? (
                                    <iframe
                                        src={embedUrl}
                                        title={getDisplayTitle(signal, locale) || "Video"}
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
                                            {isYouTubeVideo ? labels.inlineRestricted : labels.inlineUnavailable}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {watchUrl ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <a
                                    href={watchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={isYouTubeVideo ? markPreferExternalPlayback : undefined}
                                    className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {continueLabel}
                                </a>

                                {isYouTubeVideo && preferExternalPlayback && embedUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => setPreferExternalPlayback(false)}
                                        className="inline-flex items-center text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)] transition-colors"
                                    >
                                        {labels.tryInline}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}

                        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                            {labels.externalHint}
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
