import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface ResearchConfig {
    sourceType: 'iresearch' | 'iyiou' | 'caict' | 'yblook' | 'eastmoney';
    category?: string;
    fallbackUrls?: string[];
}

const GOOGLE_NEWS_REPORT_QUERIES = [
    "行业 研究 报告 AI",
    "market research report AI SaaS",
];

export class ResearchReportScraper extends BaseScraper {
    name = '行业研报';
    source = 'research_report';
    private sourceConfig: Source;
    private config: ResearchConfig;

    constructor(source: Source) {
        super();
        this.sourceConfig = source;
        const sourceConfig = source.config as ResearchConfig | null;
        this.config = sourceConfig || { sourceType: 'iresearch' };
    }

    async fetch(): Promise<ScrapedSignal[]> {
        const baseUrl = this.sourceConfig.baseUrl;
        this.setAttemptedEndpoint(baseUrl);

        // SSRF protection
        const validation = validateUrl(baseUrl);
        if (!validation.valid) {
            await this.logError(new Error(`SSRF blocked: ${validation.error} - ${baseUrl}`));
            return [];
        }

        // 定义 fallback 顺序：当前配置的数据源优先，然后尝试其他数据源
        const sources: Array<'iresearch' | 'iyiou' | 'caict' | 'yblook' | 'eastmoney'> = [
            this.config.sourceType,
            'iresearch',
            'iyiou',
            'caict',
            'yblook',
            'eastmoney'
        ].filter((s, index, arr) => arr.indexOf(s) === index) as Array<'iresearch' | 'iyiou' | 'caict' | 'yblook' | 'eastmoney'>;

        const failures: string[] = [];

        // 依次尝试各个数据源，直到成功或全部失败
        for (const source of sources) {
            try {
                let signals: ScrapedSignal[] = [];
                switch (source) {
                    case 'iresearch':
                        signals = await this.fetchIResearch(this.sourceConfig.baseUrl);
                        break;
                    case 'iyiou':
                        signals = await this.fetchIyiou(this.sourceConfig.baseUrl);
                        break;
                    case 'caict':
                        signals = await this.fetchCAICT(this.sourceConfig.baseUrl);
                        break;
                    case 'yblook':
                        signals = await this.fetchYblook(this.sourceConfig.baseUrl);
                        break;
                    case 'eastmoney':
                        signals = await this.fetchEastMoney(this.sourceConfig.baseUrl);
                        break;
                }

                // 检查是否获取到有效数据
                if (signals.length > 0) {
                    console.log(`行业研报: 从 ${source} 获取到 ${signals.length} 条数据`);
                    return signals;
                }

                console.log(`行业研报: ${source} 无数据，继续尝试其他数据源`);
            } catch (error) {
                const message = error instanceof Error ? error.message : '未知错误';
                failures.push(`${source}: ${message}`);
                console.log(`行业研报: ${source} 抓取失败: ${message}，继续尝试其他数据源`);
            }
        }

        const fallbackSignals = await this.fetchFromConfiguredFallbacks();
        if (fallbackSignals.length > 0) {
            console.log(`行业研报: 从 fallback URL 获取到 ${fallbackSignals.length} 条数据`);
            return fallbackSignals;
        }

        const googleNewsSignals = await this.fetchFromGoogleNewsFallback();
        if (googleNewsSignals.length > 0) {
            console.log(`行业研报: 从 Google News fallback 获取到 ${googleNewsSignals.length} 条数据`);
            return googleNewsSignals;
        }

        // 所有数据源都失败
        await this.logError(new Error(`所有行业研报数据源都抓取失败: ${failures.join(" | ") || "无可用数据"}`));
        return [];
    }

    /**
     * 抓取艾瑞咨询 (iresearch.com.cn)
     */
    private async fetchIResearch(_baseUrl: string): Promise<ScrapedSignal[]> {
        // 艾瑞咨询 - 行业研究报告
        // 注意：艾瑞咨询网站可能不稳定，增加超时时间
        const listUrl = 'https://www.iresearch.com.cn/research/reportlist';
        this.setAttemptedEndpoint(listUrl);

        // 添加超时处理 (30秒)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(listUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch iResearch: ${response.statusText}`);
            }

            const html = await response.text();
            this.ensurePageLooksNormal(html, "iresearch");
            const $ = load(html);

            const signals: ScrapedSignal[] = [];

            // 艾瑞咨询常见结构
            $('.report_list li, .research-list li, .list-item').each((_, element) => {
                const $item = $(element);
                const $link = $item.find('a.title, .title a, h3 a');

                const title = $link.text().trim() || $item.find('a').first().text().trim();
                const href = $link.attr('href');
                const dateText = $item.find('.date, .time, .publish-time').text();
                const category = $item.find('.category, .type, .industry').text().trim();

                if (!title || !href) return;

                let url = href;
                if (!href.startsWith('http')) {
                    url = 'https://www.iresearch.com.cn' + (href.startsWith('/') ? '' : '/') + href;
                }

                signals.push({
                    title: this.cleanText(title),
                    url,
                    score: 50, // 默认分数
                    category: category || '行业研究',
                    platform: '艾瑞咨询',
                    metadata: {
                        publisher: '艾瑞咨询',
                        publishDate: this.extractDate(dateText || $item.text()),
                        industry: category,
                        sourceType: 'iresearch',
                    }
                });
            });

            const sliced = signals.slice(0, 30);
            if (sliced.length === 0) {
                throw new Error("iresearch parse signature mismatch");
            }
            return sliced;
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn('艾瑞咨询请求超时');
                throw new Error('艾瑞咨询请求超时');
            }
            const message = error instanceof Error ? error.message : String(error);
            console.warn('艾瑞咨询抓取失败:', message);
            throw error;
        }
    }

    /**
     * 抓取亿欧智库 (iyiou.com)
     */
    private async fetchIyiou(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://www.iyiou.com/research';
        this.setAttemptedEndpoint(listUrl);

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch iyiou: ${response.statusText}`);
        }

        const html = await response.text();
        this.ensurePageLooksNormal(html, "iyiou");
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        $('.report_item, .research-item, .article-item, .news-item').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a.title, h3 a, .title a');

            const title = $link.text().trim() || $item.text().trim();
            const href = $link.attr('href');
            const dateText = $item.find('.date, .time').text();

            if (!title || !href) return;

            let url = href;
            if (!href.startsWith('http')) {
                url = 'https://www.iyiou.com' + (href.startsWith('/') ? '' : '/') + href;
            }

            signals.push({
                title: this.cleanText(title),
                url,
                score: 50,
                category: '产业研究',
                platform: '亿欧智库',
                metadata: {
                    publisher: '亿欧智库',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'iyiou',
                }
            });
        });

        const sliced = signals.slice(0, 30);
        if (sliced.length === 0) {
            throw new Error("iyiou parse signature mismatch");
        }
        return sliced;
    }

    /**
     * 抓取中国信通院 (caict.ac.cn)
     */
    private async fetchCAICT(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://www.caict.ac.cn/zk/index.html';
        this.setAttemptedEndpoint(listUrl);

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (response.status === 412) {
            throw new Error("CAICT anti-bot precondition failed (412)");
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch CAICT: ${response.statusText}`);
        }

        const html = await response.text();
        this.ensurePageLooksNormal(html, "caict");
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 信通院常见结构
        $('.article-list li, .news-list li, .ul-list li, .list li').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a');

            const title = $link.text().trim() || $item.text().trim();
            const href = $link.attr('href');
            const dateText = $item.find('.date, .time').text();

            if (!title || !href) return;

            let url = href;
            if (!href.startsWith('http')) {
                url = 'https://www.caict.ac.cn' + (href.startsWith('/') ? '' : '/') + href;
            }

            signals.push({
                title: this.cleanText(title),
                url,
                score: 70, // 信通院权威性高
                category: '白皮书/研究报告',
                platform: '中国信息通信研究院',
                metadata: {
                    publisher: '中国信息通信研究院',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'caict',
                }
            });
        });

        const sliced = signals.slice(0, 30);
        if (sliced.length === 0) {
            throw new Error("caict parse signature mismatch");
        }
        return sliced;
    }

    /**
     * 抓取研报之家 (yblook.com)
     */
    private async fetchYblook(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://www.yblook.com/';
        this.setAttemptedEndpoint(listUrl);

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch yblook: ${response.statusText}`);
        }

        const html = await response.text();
        this.ensurePageLooksNormal(html, "yblook");
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        $('.report-list li, .article-list li, .list li').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a');

            const title = $link.text().trim() || $item.text().trim();
            const href = $link.attr('href');
            const dateText = $item.find('.date').text();

            if (!title || !href) return;

            let url = href;
            if (!href.startsWith('http')) {
                url = 'https://www.yblook.com' + (href.startsWith('/') ? '' : '/') + href;
            }

            signals.push({
                title: this.cleanText(title),
                url,
                score: 40,
                category: '行业研报',
                platform: '研报之家',
                metadata: {
                    publisher: '研报之家',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'yblook',
                }
            });
        });

        const sliced = signals.slice(0, 30);
        if (sliced.length === 0) {
            throw new Error("yblook parse signature mismatch");
        }
        return sliced;
    }

    /**
     * 抓取东方财富研报
     */
    private async fetchEastMoney(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://data.eastmoney.com/report/';
        this.setAttemptedEndpoint(listUrl);

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch EastMoney: ${response.statusText}`);
        }

        const html = await response.text();
        this.ensurePageLooksNormal(html, "eastmoney");
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        $('.report-list li, .article-list li, .list li').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a');

            const title = $link.text().trim() || $item.text().trim();
            const href = $link.attr('href');
            const dateText = $item.find('.date').text();

            if (!title || !href) return;

            let url = href;
            if (!href.startsWith('http')) {
                url = 'https://data.eastmoney.com' + (href.startsWith('/') ? '' : '/') + href;
            }

            signals.push({
                title: this.cleanText(title),
                url,
                score: 45,
                category: '券商研报',
                platform: '东方财富',
                metadata: {
                    publisher: '东方财富',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'eastmoney',
                }
            });
        });

        const sliced = signals.slice(0, 30);
        if (sliced.length === 0) {
            throw new Error("eastmoney parse signature mismatch");
        }
        return sliced;
    }

    private ensurePageLooksNormal(html: string, source: string) {
        const normalized = html.toLowerCase();
        if (
            normalized.includes("captcha")
            || normalized.includes("anti-bot")
            || normalized.includes("cloudflare")
            || normalized.includes("人机验证")
            || normalized.includes("访问受限")
            || normalized.includes("precondition failed")
        ) {
            throw new Error(`${source} anti-bot challenge detected`);
        }
    }

    private async fetchFromConfiguredFallbacks(): Promise<ScrapedSignal[]> {
        const urls = Array.isArray(this.config.fallbackUrls) ? this.config.fallbackUrls : [];
        for (const url of urls) {
            try {
                this.setAttemptedEndpoint(url);
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json,text/html,application/xml;q=0.9,*/*;q=0.8',
                    },
                    signal: AbortSignal.timeout(20000),
                });
                if (!response.ok) {
                    throw new Error(`fallback URL returned ${response.status}`);
                }

                const contentType = response.headers.get('content-type') || '';
                const body = await response.text();
                const parsed = this.parseFallbackPayload(body, contentType, url);
                if (parsed.length > 0) {
                    return parsed.slice(0, 30);
                }
            } catch (error) {
                console.warn(`行业研报 fallback URL 失败 (${url}):`, error);
            }
        }
        return [];
    }

    private parseFallbackPayload(body: string, contentType: string, fallbackUrl: string): ScrapedSignal[] {
        if (contentType.includes('application/json')) {
            const parsed = JSON.parse(body) as Array<{ title?: string; url?: string; summary?: string; score?: number }>;
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((item) => ({
                    title: this.cleanText(item.title || "Untitled"),
                    url: item.url || fallbackUrl,
                    summary: item.summary ? this.cleanText(item.summary) : undefined,
                    score: typeof item.score === "number" ? item.score : 50,
                    category: '行业研报',
                    platform: 'fallback',
                    metadata: { sourceType: 'fallback' },
                }))
                .filter((item) => Boolean(item.url));
        }

        const xmlMode = contentType.includes('xml') || body.trim().startsWith('<?xml');
        const $ = load(body, xmlMode ? { xmlMode: true } : undefined);
        const signals: ScrapedSignal[] = [];
        const items = xmlMode ? ($("item").length ? $("item") : $("entry")) : $('.report-list li, .article-list li, .list li');
        items.each((_, element) => {
            const $item = $(element);
            const title = xmlMode ? $item.find('title').text().trim() : $item.find('a').first().text().trim();
            if (!title) return;
            let url = xmlMode ? $item.find('link').text().trim() : ($item.find('a').attr('href') || '').trim();
            if (xmlMode && !url) url = ($item.find('link').attr('href') || '').trim();
            if (url && !url.startsWith('http')) {
                url = new URL(url, fallbackUrl).toString();
            }
            if (!url) return;

            const summary = xmlMode ? $item.find('description, summary').first().text().trim() : $item.text().trim();
            signals.push({
                title: this.cleanText(title),
                url,
                summary: summary ? this.cleanText(summary) : undefined,
                score: 50,
                category: '行业研报',
                platform: 'fallback',
                metadata: { sourceType: 'fallback' },
            });
        });
        return signals;
    }

    private async fetchFromGoogleNewsFallback(): Promise<ScrapedSignal[]> {
        const collected: ScrapedSignal[] = [];
        const seen = new Set<string>();

        for (const query of GOOGLE_NEWS_REPORT_QUERIES) {
            const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
            try {
                this.setAttemptedEndpoint(endpoint);
                const response = await fetch(endpoint, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
                    },
                    signal: AbortSignal.timeout(20000),
                });
                if (!response.ok) {
                    throw new Error(`Google News returned ${response.status}`);
                }

                const xml = await response.text();
                const $ = load(xml, { xmlMode: true });
                const items = $("item").length ? $("item") : $("entry");
                items.each((_, element) => {
                    if (collected.length >= 30) return false;
                    const $item = $(element);
                    const title = this.cleanText($item.find("title").text());
                    if (!title) return;

                    let url = $item.find("link").text().trim();
                    if (!url) url = ($item.find("link").attr("href") || "").trim();
                    if (!url || seen.has(url)) return;
                    seen.add(url);

                    const summary = this.cleanText($item.find("description").text() || $item.find("summary").text() || "");
                    collected.push({
                        title,
                        url,
                        summary,
                        score: 45,
                        category: "行业研报",
                        platform: "Google News",
                        metadata: {
                            sourceType: "google_news_report_fallback",
                            query,
                        },
                    });
                });

                if (collected.length >= 30) {
                    break;
                }
            } catch (error) {
                console.warn(`行业研报 Google News fallback 失败 (${query}):`, error);
            }
        }

        return collected.slice(0, 30);
    }

    /**
     * 从文本中提取日期
     */
    private extractDate(text: string): string | null {
        if (!text) return null;

        const patterns = [
            /(\d{4})-(\d{1,2})-(\d{1,2})/,
            /(\d{4})年(\d{1,2})月(\d{1,2})日/,
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0];
            }
        }

        return null;
    }
}
