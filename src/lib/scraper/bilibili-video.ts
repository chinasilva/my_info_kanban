import { Source } from "@prisma/client";
import * as cheerio from "cheerio";

import { BaseScraper, ScrapedSignal } from "./base";
import {
    detectBilibiliSubtitleLangs,
    extractBilibiliBvid,
    hasRequiredSubtitles,
    normalizeLangCode,
    resolveRegionHint,
    resolveRequiredSubtitleLangs,
} from "./video-utils";

interface BilibiliVideoConfig {
    feedUrl?: string;
    regionHint?: "GLOBAL" | "CN" | "ALL";
    requiredSubtitleLangs?: string[];
    subtitleLangs?: string[];
    requireSubtitles?: boolean;
    maxItems?: number;
    category?: string;
}

export class BilibiliVideoScraper extends BaseScraper {
    name: string;
    source: string;

    private config: BilibiliVideoConfig;

    constructor(sourceConfig: Source) {
        super();
        this.name = sourceConfig.name;
        this.source = sourceConfig.type;
        const raw = sourceConfig.config as BilibiliVideoConfig | null;
        this.config = raw || {};
    }

    async fetch(): Promise<ScrapedSignal[]> {
        const signals: ScrapedSignal[] = [];
        const feedUrl = this.config.feedUrl;
        if (!feedUrl) {
            console.warn(`Bilibili source ${this.name} missing feedUrl`);
            return [];
        }

        this.setAttemptedEndpoint(feedUrl);

        try {
            const response = await fetch(feedUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
                },
                signal: AbortSignal.timeout(20000),
            });
            if (!response.ok) {
                throw new Error(`Bilibili feed returned ${response.status}`);
            }

            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const rawItems = $("item").length > 0 ? $("item").toArray() : $("entry").toArray();
            const maxItems = Math.min(Math.max(this.config.maxItems ?? 12, 1), 30);
            const regionHint = resolveRegionHint(this.config.regionHint || "CN");
            const requiredSubtitleLangs = resolveRequiredSubtitleLangs({
                ...this.config,
                regionHint,
            });
            const requireSubtitles = this.config.requireSubtitles !== false;

            for (const item of rawItems.slice(0, maxItems)) {
                const $item = $(item);
                const title = $item.find("title").first().text().trim();
                let link = $item.find("link").first().text().trim();
                if (!link) link = $item.find("link").attr("href")?.trim() || "";
                if (!title || !link) continue;

                const bvid = extractBilibiliBvid(link) || "";
                const subtitleLangs = await this.resolveSubtitleLangs(bvid);

                if (requireSubtitles && !hasRequiredSubtitles(subtitleLangs, requiredSubtitleLangs)) {
                    continue;
                }

                const summary = this.cleanText(
                    $item.find("description").first().text()
                    || $item.find("summary").first().text()
                    || ""
                );
                const publishedAt = $item.find("pubDate").first().text().trim()
                    || $item.find("updated").first().text().trim();

                signals.push({
                    title,
                    url: link,
                    summary,
                    score: 0,
                    category: this.config.category || "Video",
                    externalId: bvid || link,
                    platform: "Bilibili",
                    metadata: {
                        contentType: "video",
                        videoPlatform: "bilibili",
                        videoId: bvid || null,
                        embedUrl: bvid
                            ? `https://player.bilibili.com/player.html?bvid=${bvid}&page=1`
                            : null,
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

    private async resolveSubtitleLangs(bvid: string): Promise<string[]> {
        if (!bvid) return this.getFallbackSubtitleLangs();
        const detected = await detectBilibiliSubtitleLangs(bvid);
        if (detected.length > 0) return detected;
        return this.getFallbackSubtitleLangs();
    }

    private getFallbackSubtitleLangs(): string[] {
        const subtitleLangs = this.config.subtitleLangs || [];
        return Array.from(new Set(subtitleLangs.map(normalizeLangCode)));
    }
}
