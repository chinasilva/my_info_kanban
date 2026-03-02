import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface RecruitmentConfig {
    sourceType: 'boss' | 'zhilian' | 'lagou';
    city?: string;
    keyword?: string;
    fallbackUrls?: string[];
}

const PUBLIC_JOB_FEEDS = [
    "https://remoteok.com/remote-ai-jobs.rss",
    "https://weworkremotely.com/remote-jobs.rss",
    "https://hnrss.org/jobs",
];

/**
 * 招聘信号抓取器
 *
 * 注意：由于BOSS直聘、智联招聘等有反爬机制，
 * 实际生产环境建议使用第三方API（如justoneapi）获取数据
 */
export class RecruitmentScraper extends BaseScraper {
    name = '招聘信号';
    source = 'recruitment';
    private sourceConfig: Source;
    private config: RecruitmentConfig;

    constructor(source: Source) {
        super();
        this.sourceConfig = source;
        const sourceConfig = source.config as RecruitmentConfig | null;
        this.config = sourceConfig || { sourceType: 'boss' };
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

        // 定义 fallback 顺序：当前配置的平台优先，然后尝试其他平台
        const platforms: Array<'boss' | 'zhilian' | 'lagou'> = [
            this.config.sourceType,
            'boss',
            'zhilian',
            'lagou'
        ].filter((p, index, arr) => arr.indexOf(p) === index) as Array<'boss' | 'zhilian' | 'lagou'>;

        const failures: string[] = [];

        // 依次尝试各个平台，直到成功或全部失败
        for (const platform of platforms) {
            try {
                let signals: ScrapedSignal[] = [];
                switch (platform) {
                    case 'boss':
                        signals = await this.fetchBoss(this.sourceConfig.baseUrl);
                        break;
                    case 'zhilian':
                        signals = await this.fetchZhilian(this.sourceConfig.baseUrl);
                        break;
                    case 'lagou':
                        signals = await this.fetchLagou(this.sourceConfig.baseUrl);
                        break;
                }

                // 检查是否获取到有效数据（不是空数组，且不是仅包含 mock 数据）
                if (signals.length > 0 && !this.isMockData(signals)) {
                    console.log(`招聘信号: 从 ${platform} 平台获取到 ${signals.length} 条数据`);
                    return signals;
                }

                console.log(`招聘信号: ${platform} 平台无有效数据，继续尝试其他平台`);
            } catch (error) {
                const message = error instanceof Error ? error.message : '未知错误';
                failures.push(`${platform}: ${message}`);
                console.log(`招聘信号: ${platform} 平台抓取失败: ${message}，继续尝试其他平台`);
            }
        }

        const fallbackSignals = await this.fetchFromConfiguredFallbacks();
        if (fallbackSignals.length > 0) {
            console.log(`招聘信号: 从 fallback URL 获取到 ${fallbackSignals.length} 条数据`);
            return fallbackSignals;
        }

        const publicFeedSignals = await this.fetchFromPublicJobFeeds();
        if (publicFeedSignals.length > 0) {
            console.log(`招聘信号: 从公开招聘 RSS fallback 获取到 ${publicFeedSignals.length} 条数据`);
            return publicFeedSignals;
        }

        // 所有平台都失败
        await this.logError(new Error(`所有招聘平台都抓取失败: ${failures.join(" | ") || "无可用数据"}`));
        return [];
    }

    /**
     * 检查数据是否为 mock 数据
     */
    private isMockData(signals: ScrapedSignal[]): boolean {
        if (signals.length === 0) return true;
        // 如果任何一个信号是 mock 数据，则整个数组视为 mock 数据
        return signals.some(signal =>
            (() => {
                const note =
                    signal.metadata && typeof signal.metadata === "object" && "note" in signal.metadata
                        ? (signal.metadata as { note?: unknown }).note
                        : undefined;
                return (
            signal.url === this.sourceConfig.baseUrl &&
            signal.score === 0 &&
            typeof note === "string" &&
            note.includes('需配置Cookie')
                );
            })()
        );
    }

    /**
     * 抓取BOSS直聘
     * 注意：BOSS直聘有较强的反爬机制，网页结构经常变化
     */
    private async fetchBoss(_baseUrl: string): Promise<ScrapedSignal[]> {
        this.setAttemptedEndpoint(this.buildSearchUrl("boss"));
        // BOSS直聘有强反爬机制，网页结构经常变化
        // 建议使用第三方API获取数据
        console.warn('BOSS直聘需要反爬处理，返回空数组以便尝试其他平台');
        return [];
    }

    /**
     * 抓取智联招聘
     */
    private async fetchZhilian(_baseUrl: string): Promise<ScrapedSignal[]> {
        const searchUrl = this.buildSearchUrl('zhilian');
        this.setAttemptedEndpoint(searchUrl);

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`智联招聘请求失败: ${response.status}`);
        }

        const html = await response.text();
        if (this.looksLikeAntiBotResponse(html)) {
            throw new Error('智联招聘触发反爬策略');
        }
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        $('.joblist-box li, .job-list li, .position-list li').each((_, element) => {
            const $item = $(element);

            const title = $item.find('.job-name, .title, .position-name').text().trim();
            const company = $item.find('.company-name, .company, .name').text().trim();
            const salary = $item.find('.salary, .job-salary, .position-salary').text().trim();
            const location = $item.find('.city, .location, .job-area').text().trim();
            const href = $item.find('a').attr('href');

            if (!title) return;

            let url = href || '';
            if (href && !href.startsWith('http')) {
                url = 'https://www.zhaopin.com' + (href.startsWith('/') ? '' : '/') + href;
            }

            const skills = this.extractSkills($item.text());

            signals.push({
                title: this.cleanText(title),
                url,
                score: this.parseSalary(salary),
                category: '招聘',
                platform: '智联招聘',
                metadata: {
                    salary,
                    skills,
                    company,
                    city: location || this.config.city || '未知',
                    companySize: this.extractCompanySize($item.text()),
                    platform: '智联招聘',
                    sourceType: 'zhilian',
                }
            });
        });

        const sliced = signals.slice(0, 30);
        if (sliced.length === 0) {
            throw new Error('智联招聘页面结构变化，未解析到职位条目');
        }
        return sliced;
    }

    /**
     * 抓取拉勾
     */
    private async fetchLagou(_baseUrl: string): Promise<ScrapedSignal[]> {
        const searchUrl = this.buildSearchUrl('lagou');
        this.setAttemptedEndpoint(searchUrl);

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`拉勾请求失败: ${response.status}`);
        }

        const html = await response.text();
        if (this.looksLikeAntiBotResponse(html)) {
            throw new Error('拉勾触发反爬策略');
        }
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        $('.job-list li, .position-list li, .job-item').each((_, element) => {
            const $item = $(element);

            const title = $item.find('.job-name, .title, .position-name').text().trim();
            const company = $item.find('.company-name, .company').text().trim();
            const salary = $item.find('.salary, .job-salary').text().trim();
            const location = $item.find('.city, .location').text().trim();
            const href = $item.find('a').attr('href');

            if (!title) return;

            let url = href || '';
            if (href && !href.startsWith('http')) {
                url = 'https://www.lagou.com' + (href.startsWith('/') ? '' : '/') + href;
            }

            const skills = this.extractSkills($item.text());

            signals.push({
                title: this.cleanText(title),
                url,
                score: this.parseSalary(salary),
                category: '招聘',
                platform: '拉勾',
                metadata: {
                    salary,
                    skills,
                    company,
                    city: location || this.config.city || '未知',
                    platform: '拉勾',
                    sourceType: 'lagou',
                }
            });
        });

        const sliced = signals.slice(0, 30);
        if (sliced.length === 0) {
            throw new Error('拉勾页面结构变化，未解析到职位条目');
        }
        return sliced;
    }

    private looksLikeAntiBotResponse(html: string): boolean {
        const normalized = html.toLowerCase();
        return (
            normalized.includes('captcha')
            || normalized.includes('verify')
            || normalized.includes('human verification')
            || normalized.includes('访问受限')
            || normalized.includes('行为验证')
            || normalized.includes('反爬')
            || normalized.includes('forbidden')
        );
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
                console.warn(`招聘信号 fallback URL 失败 (${url}):`, error);
            }
        }
        return [];
    }

    private parseFallbackPayload(body: string, contentType: string, fallbackUrl: string): ScrapedSignal[] {
        if (contentType.includes('application/json')) {
            const parsed = JSON.parse(body) as Array<{ title?: string; url?: string; summary?: string; salary?: string }>;
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((item) => ({
                    title: this.cleanText(item.title || 'Untitled'),
                    url: item.url || fallbackUrl,
                    summary: item.summary ? this.cleanText(item.summary) : undefined,
                    score: this.parseSalary(item.salary || ''),
                    category: '招聘',
                    platform: 'fallback',
                    metadata: { sourceType: 'fallback' },
                }))
                .filter((item) => Boolean(item.url));
        }

        const xmlMode = contentType.includes('xml') || body.trim().startsWith('<?xml');
        const $ = load(body, xmlMode ? { xmlMode: true } : undefined);
        const signals: ScrapedSignal[] = [];
        const items = xmlMode ? ($("item").length ? $("item") : $("entry")) : $('.joblist-box li, .job-list li, .position-list li');
        items.each((_, element) => {
            const $item = $(element);
            const title = xmlMode ? $item.find('title').text().trim() : $item.find('.job-name, .title, .position-name, a').first().text().trim();
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
                score: 0,
                category: '招聘',
                platform: 'fallback',
                metadata: { sourceType: 'fallback' },
            });
        });
        return signals;
    }

    private async fetchFromPublicJobFeeds(): Promise<ScrapedSignal[]> {
        const keyword = (this.config.keyword || "").trim().toLowerCase();
        const collected: ScrapedSignal[] = [];
        const seen = new Set<string>();

        for (const feedUrl of PUBLIC_JOB_FEEDS) {
            try {
                this.setAttemptedEndpoint(feedUrl);
                const response = await fetch(feedUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
                    },
                    signal: AbortSignal.timeout(20000),
                });

                if (!response.ok) {
                    throw new Error(`public feed returned ${response.status}`);
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
                    if (!url) return;
                    if (!url.startsWith("http")) {
                        url = new URL(url, feedUrl).toString();
                    }
                    if (seen.has(url)) return;

                    const summaryRaw = $item.find("description").text() || $item.find("summary").text() || "";
                    const summary = this.cleanText(summaryRaw);
                    const haystack = `${title} ${summary}`.toLowerCase();
                    if (keyword && !haystack.includes(keyword)) return;

                    seen.add(url);
                    collected.push({
                        title,
                        url,
                        summary,
                        score: this.parseSalary(summary),
                        category: "招聘",
                        platform: "公开招聘RSS",
                        metadata: {
                            sourceType: "public_job_feed_fallback",
                            feedUrl,
                        },
                    });
                });

                if (collected.length >= 30) {
                    break;
                }
            } catch (error) {
                console.warn(`招聘信号公开 RSS fallback 失败 (${feedUrl}):`, error);
            }
        }

        // 如果按关键词过滤后没有命中，则退回使用全部公开招聘数据，避免全量失败
        if (collected.length === 0 && keyword) {
            for (const feedUrl of PUBLIC_JOB_FEEDS) {
                try {
                    this.setAttemptedEndpoint(feedUrl);
                    const response = await fetch(feedUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
                        },
                        signal: AbortSignal.timeout(20000),
                    });
                    if (!response.ok) continue;

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
                        if (!url) return;
                        if (!url.startsWith("http")) {
                            url = new URL(url, feedUrl).toString();
                        }
                        if (seen.has(url)) return;
                        seen.add(url);

                        const summary = this.cleanText($item.find("description").text() || $item.find("summary").text() || "");
                        collected.push({
                            title,
                            url,
                            summary,
                            score: this.parseSalary(summary),
                            category: "招聘",
                            platform: "公开招聘RSS",
                            metadata: {
                                sourceType: "public_job_feed_fallback",
                                feedUrl,
                                keywordBypassed: true,
                            },
                        });
                    });

                    if (collected.length >= 30) {
                        break;
                    }
                } catch {
                    // ignore secondary fallback failures
                }
            }
        }

        return collected.slice(0, 30);
    }

    /**
     * 构建搜索URL
     */
    private buildSearchUrl(platform: string): string {
        const keyword = this.config.keyword || 'AI';
        const city = this.config.city || '';

        switch (platform) {
            case 'boss':
                return `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}`;
            case 'zhilian':
                return `https://www.zhaopin.com/sou/?jl=${encodeURIComponent(city)}&el=${encodeURIComponent(keyword)}`;
            case 'lagou':
                return `https://www.lagou.com/jobs/list_${encodeURIComponent(keyword)}?city=${encodeURIComponent(city)}`;
            default:
                return this.sourceConfig.baseUrl;
        }
    }

    /**
     * 从文本中提取技能
     */
    private extractSkills(text: unknown): string[] {
        // 确保 text 是字符串，处理编码问题
        const textStr = typeof text === 'string' ? text : String(text || '');

        const techKeywords = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'C#',
            'React', 'Vue', 'Angular', 'Node.js', 'Next.js', 'NestJS',
            'AI', 'Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'GPT',
            'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'K8s',
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
            'Git', 'CI/CD', 'DevOps', 'Linux',
            '数据分析', '数据工程', '机器学习', '算法', '后端', '前端', '全栈',
        ];

        const found: string[] = [];
        for (const keyword of techKeywords) {
            if (textStr.includes(keyword)) {
                found.push(keyword);
            }
        }

        return found.slice(0, 10); // 限制技能数量
    }

    /**
     * 解析薪资为数值分数
     */
    private parseSalary(salaryText: string): number {
        if (!salaryText) return 0;

        // 匹配薪资范围: 15K-30K, 15-30K, 15000-30000, 15k-30k
        const patterns = [
            /(\d+(?:\.\d+)?)\s*[kK]\s*[-–]\s*(\d+(?:\.\d+)?)\s*[kK]/,
            /(\d+)\s*[-–]\s*(\d+)\s*k/i,
            /(\d+)[千]\s*[-–]\s*(\d+)[千]/,
        ];

        for (const pattern of patterns) {
            const match = salaryText.match(pattern);
            if (match) {
                const low = parseFloat(match[1]);
                const high = parseFloat(match[2]);
                const avg = (low + high) / 2;

                // 如果是千单位，转换为K
                return salaryText.includes('千') ? avg : avg * 1000;
            }
        }

        return 0;
    }

    /**
     * 提取公司规模
     */
    private extractCompanySize(text: string): string | null {
        const patterns = [
            /(\d+-\d+人)/,
            /(\d+人以上)/,
            /(少于\d+人)/,
            /(20-99人)|(100-499人)|(500-999人)|(1000-9999人)|(10000人以上)/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0];
            }
        }

        return null;
    }

    /**
     * 提取融资阶段
     */
    private extractFundingStage(text: string): string | null {
        const stages = ['未融资', '天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以上', '上市公司', '不需要融资'];

        for (const stage of stages) {
            if (text.includes(stage)) {
                return stage;
            }
        }

        return null;
    }
}
