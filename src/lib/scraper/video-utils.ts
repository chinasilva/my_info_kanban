export type RegionHint = "GLOBAL" | "CN" | "ALL";

interface SubtitlePolicyConfig {
    regionHint?: string;
    requiredSubtitleLangs?: string[];
}

export function resolveRegionHint(regionHint?: string): RegionHint {
    if (regionHint === "CN" || regionHint === "ALL" || regionHint === "GLOBAL") {
        return regionHint;
    }
    return "GLOBAL";
}

export function normalizeLangCode(code: string): string {
    const normalized = code.trim().toLowerCase().replace(/_/g, "-");
    if (normalized.startsWith("zh-hans") || normalized === "zh-cn") return "zh-hans";
    if (normalized.startsWith("zh-hant") || normalized === "zh-tw" || normalized === "zh-hk") return "zh-hant";
    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("en")) return "en";
    return normalized;
}

export function resolveRequiredSubtitleLangs(config: SubtitlePolicyConfig): string[] {
    if (config.requiredSubtitleLangs && config.requiredSubtitleLangs.length > 0) {
        return Array.from(new Set(config.requiredSubtitleLangs.map(normalizeLangCode)));
    }

    const regionHint = resolveRegionHint(config.regionHint);
    if (regionHint === "CN") return ["zh"];
    if (regionHint === "ALL") return ["en", "zh"];
    return ["en"];
}

export function hasRequiredSubtitles(availableLangs: string[], requiredLangs: string[]): boolean {
    if (requiredLangs.length === 0) return true;
    if (availableLangs.length === 0) return false;

    const available = new Set(availableLangs.map(normalizeLangCode));
    return requiredLangs.some((required) => {
        const target = normalizeLangCode(required);
        if (available.has(target)) return true;
        for (const lang of available) {
            if (lang.startsWith(`${target}-`)) return true;
        }
        return false;
    });
}

export function extractYouTubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtu.be")) {
            return parsed.pathname.replace("/", "").trim() || null;
        }
        const v = parsed.searchParams.get("v");
        if (v) return v;
        const parts = parsed.pathname.split("/").filter(Boolean);
        const embedIndex = parts.indexOf("embed");
        if (embedIndex >= 0 && parts[embedIndex + 1]) {
            return parts[embedIndex + 1];
        }
        return null;
    } catch {
        return null;
    }
}

export async function detectYouTubeSubtitleLangs(videoId: string): Promise<string[]> {
    try {
        const response = await fetch(
            `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
            {
                signal: AbortSignal.timeout(10000),
            }
        );
        if (!response.ok) return [];

        const xml = await response.text();
        const matches = [...xml.matchAll(/lang_code="([^"]+)"/g)];
        const langs = matches.map((m) => normalizeLangCode(m[1]));
        return Array.from(new Set(langs));
    } catch {
        return [];
    }
}

export function extractBilibiliBvid(url: string): string | null {
    const match = url.match(/\/video\/(BV[0-9A-Za-z]+)/i);
    return match ? match[1] : null;
}

export async function detectBilibiliSubtitleLangs(bvid: string): Promise<string[]> {
    try {
        const viewResp = await fetch(
            `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                },
                signal: AbortSignal.timeout(10000),
            }
        );
        if (!viewResp.ok) return [];

        const viewData = (await viewResp.json()) as {
            code?: number;
            data?: {
                cid?: number;
                pages?: Array<{ cid?: number }>;
            };
        };
        if (viewData.code !== 0) return [];

        const cid = viewData.data?.cid || viewData.data?.pages?.[0]?.cid;
        if (!cid) return [];

        const playerResp = await fetch(
            `https://api.bilibili.com/x/player/v2?bvid=${encodeURIComponent(bvid)}&cid=${cid}`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    Referer: `https://www.bilibili.com/video/${bvid}`,
                },
                signal: AbortSignal.timeout(10000),
            }
        );
        if (!playerResp.ok) return [];

        const playerData = (await playerResp.json()) as {
            code?: number;
            data?: {
                subtitle?: {
                    subtitles?: Array<{ lan?: string }>;
                };
            };
        };
        if (playerData.code !== 0) return [];

        const langs = (playerData.data?.subtitle?.subtitles || [])
            .map((item) => item.lan)
            .filter((lan): lan is string => Boolean(lan))
            .map(normalizeLangCode);

        return Array.from(new Set(langs));
    } catch {
        return [];
    }
}
