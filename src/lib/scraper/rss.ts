import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

interface SubstackArchiveItem {
    id?: number | string;
    title?: string;
    social_title?: string;
    canonical_url?: string;
    subtitle?: string;
    description?: string;
    slug?: string;
}

export abstract class RssScraper extends BaseScraper {
    abstract rssUrl: string;

    private async fetchWithRetry(url: string, retries = 2): Promise<Response> {
        this.setAttemptedEndpoint(url);
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        };

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    headers,
                    signal: AbortSignal.timeout(20000), // Increase timeout to 20s
                });
                if (response.ok) {
                    return response;
                }
                // 4xx 错误不重试
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`${this.name} RSS returned ${response.status}`);
                }
                // 5xx 错误继续重试
                if (attempt < retries) {
                    console.log(`Retry ${attempt + 1}/${retries} for ${this.name}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                if (attempt >= retries) throw error;
                console.log(`Retry ${attempt + 1}/${retries} for ${this.name} due to: ${message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        throw new Error(`${this.name} RSS fetch failed after ${retries} retries`);
    }

    private isSubstackFeed(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.hostname.endsWith(".substack.com") && parsed.pathname.includes("/feed");
        } catch {
            return false;
        }
    }

    private shouldUseSubstackFallback(url: string, error: unknown): boolean {
        if (!this.isSubstackFeed(url)) return false;
        const message = error instanceof Error ? error.message : String(error);
        return message.includes("403") || message.includes("429");
    }

    private async fetchSubstackArchive(feedUrl: string): Promise<ScrapedSignal[]> {
        const host = new URL(feedUrl).hostname;
        const apiUrl = `https://${host}/api/v1/archive?sort=new&search=&offset=0&limit=20`;
        this.setAttemptedEndpoint(apiUrl);

        const response = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json,text/plain,*/*",
            },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            throw new Error(`Substack archive API returned ${response.status} for ${host}`);
        }

        const items = (await response.json()) as SubstackArchiveItem[];
        if (!Array.isArray(items)) {
            throw new Error(`Substack archive API returned invalid payload for ${host}`);
        }

        const signals: ScrapedSignal[] = [];
        for (const item of items) {
            const title = item.title || item.social_title || "Untitled";
            const url = item.canonical_url || (item.slug ? `https://${host}/p/${item.slug}` : "");
            if (!url) continue;

            const summaryRaw = item.description || item.subtitle || "";
            signals.push({
                title: this.cleanText(title),
                url,
                summary: this.cleanText(summaryRaw),
                score: 0,
                category: "General",
                externalId: item.id ? String(item.id) : url,
                metadata: {
                    sourceType: "substack_archive",
                },
            });
        }
        return signals.slice(0, 20);
    }

    private shouldUseGoogleNewsFallback(error: unknown): boolean {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        return (
            message.includes("403")
            || message.includes("429")
            || message.includes("fetch failed")
            || message.includes("timeout")
            || message.includes("timed out")
            || message.includes("und_err_connect_timeout")
        );
    }

    private buildGoogleNewsQuery(feedUrl: string): string {
        const parsed = new URL(feedUrl);
        const host = parsed.hostname.replace(/^www\./, "");
        const path = parsed.pathname.replace(/\/+$/, "");
        const isAtlanticHost = host === "theatlantic.com" || host.endsWith(".theatlantic.com");

        const atlanticAuthorMatch = path.match(/\/feed\/author\/([^/]+)/);
        if (isAtlanticHost && atlanticAuthorMatch?.[1]) {
            return `site:theatlantic.com/author/${atlanticAuthorMatch[1]}`;
        }

        return `site:${host}`;
    }

    private async fetchGoogleNewsFallback(feedUrl: string): Promise<ScrapedSignal[]> {
        const query = this.buildGoogleNewsQuery(feedUrl);
        const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        this.setAttemptedEndpoint(endpoint);

        const response = await fetch(endpoint, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            throw new Error(`Google News fallback returned ${response.status}`);
        }

        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        const signals: ScrapedSignal[] = [];
        const seen = new Set<string>();

        $("item").each((_, element) => {
            if (signals.length >= 20) return false;
            const $item = $(element);
            const title = this.cleanText($item.find("title").text());
            let url = $item.find("link").text().trim();
            if (!url) url = ($item.find("link").attr("href") || "").trim();
            if (!title || !url || seen.has(url)) return;

            seen.add(url);
            const summary = this.cleanText($item.find("description").text() || $item.find("summary").text() || "");
            signals.push({
                title,
                url,
                summary,
                score: 0,
                category: "General",
                externalId: url,
                metadata: {
                    sourceType: "google_news_fallback",
                    query,
                },
            });
        });

        if (signals.length === 0) {
            throw new Error("Google News fallback returned no items");
        }

        return signals;
    }

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            const response = await this.fetchWithRetry(this.rssUrl);
            if (!response.ok) {
                throw new Error(`${this.name} RSS returned ${response.status}`);
            }

            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const signals: ScrapedSignal[] = [];

            const items = $("item").length ? $("item") : $("entry");

            items.each((_, element) => {
                const $item = $(element);
                const title = $item.find("title").text();
                // RSS uses link, Atom uses link[href]
                let url = $item.find("link").text();
                if (!url) {
                    url = $item.find("link").attr("href") || "";
                }

                const description = $item.find("description").text() || $item.find("content").text() || $item.find("summary").text();
                // Simple dedup logic or validation could go here
                if (title && url) {
                    signals.push({
                        title: title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
                        url: url.trim(),
                        summary: this.cleanText(description),
                        score: 0,
                        category: this.getCategory($item),
                        externalId: url.trim(), // URL as ID for RSS usually
                    });
                }
            });

            return signals.slice(0, 20);
        } catch (error) {
            let finalError: unknown = error;
            if (this.shouldUseSubstackFallback(this.rssUrl, error)) {
                try {
                    console.warn(`RSS blocked for ${this.name}, fallback to Substack archive API`);
                    return await this.fetchSubstackArchive(this.rssUrl);
                } catch (fallbackError) {
                    finalError = fallbackError;
                }
            }

            if (this.shouldUseGoogleNewsFallback(finalError)) {
                try {
                    console.warn(`RSS unavailable for ${this.name}, fallback to Google News site search`);
                    return await this.fetchGoogleNewsFallback(this.rssUrl);
                } catch (googleFallbackError) {
                    finalError = googleFallbackError;
                }
            }

            await this.logError(finalError, { endpoint: this.getAttemptedEndpoint() || undefined });
            return [];
        }
    }

    protected getCategory(_item: unknown): string {
        return "General";
    }

    protected cleanText(text: string): string {
        if (!text) return '';

        // Remove CDATA if present
        text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

        // Use cheerio to safely remove HTML tags
        const $ = cheerio.load(text, null, false);
        const plainText = $.text();

        // Truncate
        return plainText.trim().substring(0, 300) + (plainText.length > 300 ? "..." : "");
    }
}
