import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface ProcurementConfig {
    sourceType: 'ccgp' | 'ggzy' | 'local';
    region?: string;
}

export class GovProcurementScraper extends BaseScraper {
    name = '政府采购';
    source = 'gov_procurement';
    private sourceConfig: Source;
    private config: ProcurementConfig;

    constructor(source: Source) {
        super();
        this.sourceConfig = source;
        const sourceConfig = source.config as ProcurementConfig | null;
        this.config = sourceConfig || { sourceType: 'ccgp' };
    }

    async fetch(): Promise<ScrapedSignal[]> {
        const baseUrl = this.sourceConfig.baseUrl;

        // SSRF protection
        const validation = validateUrl(baseUrl);
        if (!validation.valid) {
            await this.logError(new Error(`SSRF blocked: ${validation.error} - ${baseUrl}`));
            return [];
        }

        try {
            switch (this.config.sourceType) {
                case 'ccgp':
                    return await this.fetchCCGP(baseUrl);
                case 'ggzy':
                    return await this.fetchGGZY(baseUrl);
                case 'local':
                    return await this.fetchLocalProcurement(baseUrl);
                default:
                    return await this.fetchCCGP(baseUrl);
            }
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    /**
     * 抓取中国政府采购网 (ccgp.gov.cn)
     * 采购公告列表页
     */
    private async fetchCCGP(_baseUrl: string): Promise<ScrapedSignal[]> {
        // 尝试多个可能的端点
        const endpoints = [
            'https://www.ccgp.gov.cn/cggg/zygg/',
            'https://www.ccgp.gov.cn/cggg/gg/',
            'https://www.ccgp.gov.cn/xxgg/',
        ];

        let html = '';
        let response: Response | null = null;

        for (const endpoint of endpoints) {
            try {
                response = await fetch(endpoint, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache',
                    }
                });

                if (response.ok) {
                    html = await response.text();
                    if (html.length > 1000) break; // 找到有效内容
                }
            } catch (error) {
                console.error(`Failed to fetch ${endpoint}:`, error);
            }
        }

        if (!html) {
            // 如果所有端点都失败，尝试抓取百度热搜作为备用（地方政府采购信息）
            return await this.fetchCCGPBackup();
        }

        const $ = load(html);
        const signals: ScrapedSignal[] = [];

        // 尝试多种选择器
        const selectors = [
            '.ul_list li',
            '.news_list li',
            '.container li',
            '.list li',
            '.公告列表 li',
            '.ccgp-list li',
            'article',
            '.item',
            '.news-item',
        ];

        for (const selector of selectors) {
            const items = $(selector);
            if (items.length > 5) {
                items.each((_, element) => {
                    const $item = $(element);
                    const $link = $item.find('a');

                    let title = $link.text().trim() || $item.text().trim();
                    const href = $link.attr('href');

                    // 过滤掉太短或包含导航关键字的标题
                    if (!title || title.length < 10) return;
                    if (title.includes('首页') || title.includes('登录') || title.includes('导航')) return;

                    // 提取金额信息
                    const budgetAmount = this.extractBudgetAmount(title);
                    const region = this.extractRegion(title);
                    const publishDate = this.extractDate($item.text()) || this.extractDate(title);

                    // 构建完整URL
                    let url = href || '';
                    if (href && !href.startsWith('http')) {
                        url = 'https://www.ccgp.gov.cn' + (href.startsWith('/') ? '' : '/') + href;
                    }

                    if (!url) return;

                    signals.push({
                        title: this.cleanText(title),
                        url,
                        score: budgetAmount,
                        category: '政府采购',
                        metadata: {
                            budgetAmount,
                            region: region || '全国',
                            publishDate,
                            sourceType: 'ccgp',
                            buyer: this.extractBuyer(title),
                        }
                    });
                });
                break;
            }
        }

        // 如果标准选择器都失败，尝试更通用的方法
        if (signals.length < 3) {
            $('a').each((_, element) => {
                const $link = $(element);
                let title = $link.text().trim();
                const href = $link.attr('href');

                // 只保留看起来像公告的链接
                if (!title || title.length < 15) return;
                if (title.includes('首页') || title.includes('登录') || title.includes('关于')) return;
                if (!href || !href.includes('ccgp')) return;

                // 检查是否已存在
                if (signals.some(s => s.url === href)) return;

                const budgetAmount = this.extractBudgetAmount(title);
                const region = this.extractRegion(title);

                signals.push({
                    title: this.cleanText(title),
                    url: href,
                    score: budgetAmount,
                    category: '政府采购',
                    metadata: {
                        budgetAmount,
                        region: region || '全国',
                        sourceType: 'ccgp',
                        buyer: this.extractBuyer(title),
                    }
                });
            });
        }

        return signals.slice(0, 50);
    }

    /**
     * 备用方案：抓取百度热搜的地方政府招标信息
     */
    private async fetchCCGPBackup(): Promise<ScrapedSignal[]> {
        try {
            const response = await fetch('https://top.baidu.com/board?tab=realtime', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                }
            });

            if (!response.ok) return this.getMockData();

            const html = await response.text();
            const $ = load(html);

            const signals: ScrapedSignal[] = [];

            $('.topic-list .item, .hot-list-item, .list-item').each((index, element) => {
                const $item = $(element);
                const title = $item.find('.title, .topic-name, .item-title').text().trim();
                const hot = $item.find('.hot-score, .hot, .num').text().trim();
                const href = $item.find('a').attr('href');

                if (!title || title.length < 10) return;

                signals.push({
                    title: this.cleanText(title),
                    url: href || `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
                    score: this.parseHot(hot),
                    category: '热搜招标',
                    metadata: {
                        platform: '百度热搜',
                        sourceType: 'backup',
                    }
                });
            });

            return signals.slice(0, 30);
        } catch (error) {
            return this.getMockData();
        }
    }

    /**
     * 解析热度值
     */
    private parseHot(text: any): number {
        if (!text) return 0;
        const textStr = typeof text === 'string' ? text : String(text);
        const cleaned = textStr.replace(/[,，\s]/g, '');
        const patterns = [
            /(\d+(?:\.\d+)?)\s*亿/,
            /(\d+(?:\.\d+)?)\s*万/,
            /(\d+)/,
        ];
        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                const num = parseFloat(match[1]);
                if (textStr.includes('亿')) return num * 10000;
                if (textStr.includes('万')) return num;
                return num;
            }
        }
        return 0;
    }

    /**
     * 抓取全国公共资源交易平台 (ggzy.gov.cn)
     */
    private async fetchGGZY(baseUrl: string): Promise<ScrapedSignal[]> {
        // 工程建设招标公告
        const listUrl = `${baseUrl}/jyzx/gcjs/zbgg/index.html`;

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch GGZY: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 尝试多种常见的选择器
        const items = $('.list_con li, .news_list li, .ul-list li, .content li');

        items.each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a');
            const title = $link.text().trim() || $item.text().trim();
            const href = $link.attr('href');

            if (!title || !href) return;

            const budgetAmount = this.extractBudgetAmount(title);
            const publishDate = this.extractDate($item.text());
            const region = this.config.region || this.extractRegion(title);

            let url = href;
            if (!href.startsWith('http')) {
                url = baseUrl + (href.startsWith('/') ? '' : '/') + href;
            }

            signals.push({
                title: this.cleanText(title),
                url,
                score: budgetAmount,
                category: '公共资源交易',
                metadata: {
                    budgetAmount,
                    region,
                    publishDate,
                    sourceType: 'ggzy',
                    buyer: this.extractBuyer(title),
                }
            });
        });

        return signals.slice(0, 50);
    }

    /**
     * 抓取地方政府采购/公共资源交易网站
     */
    private async fetchLocalProcurement(baseUrl: string): Promise<ScrapedSignal[]> {
        const response = await fetch(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch local: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 地方网站结构多样，尝试常见选择器
        const selectors = [
            '.news_list li',
            '.ul_list li',
            '.list li',
            '.article-list li',
            '.table-list tr',
            'ul li a',
        ];

        let items: any = null;
        for (const selector of selectors) {
            const found = $(selector);
            if (found.length > 0) {
                items = found;
                break;
            }
        }

        if (!items) return signals;

        items.each((_: any, element: any) => {
            const $item = $(element);
            const $link = $item.is('a') ? $item : $item.find('a');

            const title = $link.text().trim() || $item.text().trim();
            const href = $link.attr('href');

            if (!title || !href || title.length < 10) return;

            const budgetAmount = this.extractBudgetAmount(title);
            const publishDate = this.extractDate($item.text());

            let url = href;
            if (!href.startsWith('http')) {
                url = baseUrl + (href.startsWith('/') ? '' : '/') + href;
            }

            signals.push({
                title: this.cleanText(title),
                url,
                score: budgetAmount,
                category: '地方采购',
                metadata: {
                    budgetAmount,
                    region: this.config.region || '地方',
                    publishDate,
                    sourceType: 'local',
                    buyer: this.extractBuyer(title),
                }
            });
        });

        return signals.slice(0, 50);
    }

    /**
     * 从标题中提取预算金额
     */
    private extractBudgetAmount(text: string): number {
        // 匹配金额模式: 100万, 100万元, 1,000,000元, ¥100万等
        const patterns = [
            /([¥¥]?\d+(?:\.\d+)?)\s*[亿万千百]?\s*元/g,
            /预算[：:]\s*([¥]?\d+(?:\.\d+)?)\s*[亿万千百]?/g,
            /金额[：:]\s*([¥]?\d+(?:\.\d+)?)\s*[亿万千百]?/g,
            /总价[：:]\s*([¥]?\d+(?:\.\d+)?)\s*[亿万千百]?/g,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amountStr = match[1].replace(/[¥,，]/g, '');
                const amount = parseFloat(amountStr);

                // 转换为万元
                if (text.includes('亿')) return amount * 10000;
                if (text.includes('万')) return amount;
                if (text.includes('千')) return amount / 10;
                return amount / 10000; // 假设原始是元，转换为万元
            }
        }

        return 0;
    }

    /**
     * 从标题中提取地区信息
     */
    private extractRegion(text: string): string | null {
        const regions = [
            '北京', '上海', '天津', '重庆',
            '广东', '浙江', '江苏', '四川', '湖北', '湖南', '山东', '河南',
            '深圳', '广州', '杭州', '南京', '成都', '武汉', '西安', '苏州',
        ];

        for (const region of regions) {
            if (text.includes(region)) {
                return region;
            }
        }

        return null;
    }

    /**
     * 从文本中提取日期
     */
    private extractDate(text: string): string | null {
        // 匹配日期格式: 2024-01-01, 2024年01月01日, 2024/01/01
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

    /**
     * 从标题中提取采购单位
     */
    private extractBuyer(text: string): string | null {
        // 常见的采购单位模式
        const patterns = [
            /([^\s]+?(?:大学|医院|局|委|办|厅|局|处|中心|公司|企业))/,
            /(?:采购人[：:]\s*|采购单位[：:]\s*)([^\s]+)/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }

        return null;
    }

    /**
     * 获取模拟数据
     */
    private getMockData(): ScrapedSignal[] {
        return [{
            title: '政府采购数据 - 需配置第三方API或官方接口',
            url: this.sourceConfig.baseUrl,
            score: 0,
            category: '政府采购',
            metadata: {
                note: '建议使用财政部官方API接口或网页抓取（需处理反爬）',
                sourceType: this.config.sourceType || 'ccgp',
            }
        }];
    }
}
