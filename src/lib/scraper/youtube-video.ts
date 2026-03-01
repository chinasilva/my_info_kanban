import { Source } from "@prisma/client";
import * as cheerio from "cheerio";

import { BaseScraper, ScrapedSignal } from "./base";
import {
    detectYouTubeSubtitleLangs,
    extractYouTubeVideoId,
    hasRequiredSubtitles,
    normalizeLangCode,
    resolveRegionHint,
    resolveRequiredSubtitleLangs,
} from "./video-utils";

interface YouTubeVideoConfig {
    channelId?: string;
    feedUrl?: string;
    regionHint?: "GLOBAL" | "CN" | "ALL";
    requiredSubtitleLangs?: string[];
    subtitleLangs?: string[];
    requireSubtitles?: boolean;
    maxItems?: number;
    category?: string;
}

export class YouTubeVideoScraper extends BaseScraper {
    name: string;
    source: string;

    private config: YouTubeVideoConfig;

    constructor(sourceConfig: Source) {
        super();
        this.name = sourceConfig.name;
        this.source = sourceConfig.type;
        const raw = sourceConfig.config as YouTubeVideoConfig | null;
        this.config = raw || {};
    }

    async fetch(): Promise<ScrapedSignal[]> {
        const signals: ScrapedSignal[] = [];
        const feedUrl = this.resolveFeedUrl();
        if (!feedUrl) {
            console.warn(`YouTube source ${this.name} missing channelId/feedUrl`);
            return [];
        }

        try {
            const candidates = this.resolveFeedCandidates(feedUrl);
            const xml = await this.fetchFeedWithFailover(candidates);
            const $ = cheerio.load(xml, { xmlMode: true });
            const entries = $("entry").toArray();
            const maxItems = Math.min(Math.max(this.config.maxItems ?? 12, 1), 30);
            const regionHint = resolveRegionHint(this.config.regionHint);
            const requiredSubtitleLangs = resolveRequiredSubtitleLangs(this.config);
            const requireSubtitles = this.config.requireSubtitles !== false;

            for (const entry of entries.slice(0, maxItems)) {
                const $entry = $(entry);
                const title = $entry.find("title").first().text().trim();
                const link = $entry.find("link").attr("href")?.trim() || "";
                if (!title || !link) continue;

                const videoId =
                    $entry.find("yt\\:videoId").first().text().trim()
                    || extractYouTubeVideoId(link)
                    || "";

                const summary = this.cleanText(
                    $entry.find("media\\:description").first().text()
                    || $entry.find("content").first().text()
                    || ""
                );

                const publishedAt = $entry.find("published").first().text().trim();
                const subtitleLangs = await this.resolveSubtitleLangs(videoId);

                if (requireSubtitles && !hasRequiredSubtitles(subtitleLangs, requiredSubtitleLangs)) {
                    continue;
                }

                signals.push({
                    title,
                    url: link,
                    summary,
                    score: 0,
                    category: this.config.category || "Video",
                    externalId: videoId || link,
                    platform: "YouTube",
                    metadata: {
                        contentType: "video",
                        videoPlatform: "youtube",
                        videoId: videoId || null,
                        embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
                        watchUrl: link,
                        subtitleLangs,
                        subtitleGateRequired: requiredSubtitleLangs,
                        regionHint,
                        publishedAt,
                    },
                });
            }

            return signals;
        } catch (error) {
            await this.logError(error, { endpoint: feedUrl });
            return [];
        }
    }

    private resolveFeedCandidates(primaryFeedUrl: string): string[] {
        const candidates = [primaryFeedUrl];
        const channelId = this.extractChannelIdFromFeedUrl(primaryFeedUrl);
        if (channelId) {
            candidates.push(`https://inv.nadeko.net/feed/channel/${channelId}`);
        }
        return Array.from(new Set(candidates));
    }

    private extractChannelIdFromFeedUrl(feedUrl: string): string | null {
        try {
            if (this.config.channelId) return this.config.channelId;
            const parsed = new URL(feedUrl);
            const idFromQuery = parsed.searchParams.get("channel_id");
            if (idFromQuery) return idFromQuery;
            const match = parsed.pathname.match(/\/channel\/([^/]+)/);
            return match?.[1] || null;
        } catch {
            return this.config.channelId || null;
        }
    }

    private async fetchFeedWithFailover(feedUrls: string[]): Promise<string> {
        let lastError: unknown = null;
        for (const endpoint of feedUrls) {
            this.setAttemptedEndpoint(endpoint);
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const response = await fetch(endpoint, {
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            Accept: "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
                        },
                        signal: AbortSignal.timeout(30000),
                    });
                    if (!response.ok) {
                        throw new Error(`YouTube feed returned ${response.status}`);
                    }
                    return await response.text();
                } catch (error) {
                    lastError = error;
                    if (attempt === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 1200));
                    }
                }
            }
        }

        throw lastError || new Error("YouTube feed failover exhausted");
    }

    private resolveFeedUrl(): string {
        if (this.config.feedUrl) return this.config.feedUrl;
        if (this.config.channelId) {
            return `https://www.youtube.com/feeds/videos.xml?channel_id=${this.config.channelId}`;
        }
        return "";
    }

    private async resolveSubtitleLangs(videoId: string): Promise<string[]> {
        if (!videoId) return this.getFallbackSubtitleLangs();
        const detected = await detectYouTubeSubtitleLangs(videoId);
        if (detected.length > 0) return detected;
        return this.getFallbackSubtitleLangs();
    }

    private getFallbackSubtitleLangs(): string[] {
        const subtitleLangs = this.config.subtitleLangs || [];
        return Array.from(new Set(subtitleLangs.map(normalizeLangCode)));
    }
}
