import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface ResearchConfig {
    sourceType: 'iresearch' | 'iyiou' | 'caict' | 'yblook' | 'eastmoney';
    category?: string;
}

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
                console.log(`行业研报: ${source} 抓取失败: ${error instanceof Error ? error.message : '未知错误'}，继续尝试其他数据源`);
            }
        }

        // 所有数据源都失败
        await this.logError(new Error('所有行业研报数据源都抓取失败'));
        return [];
    }

    /**
     * 抓取艾瑞咨询 (iresearch.com.cn)
     */
    private async fetchIResearch(_baseUrl: string): Promise<ScrapedSignal[]> {
        // 艾瑞咨询 - 行业研究报告
        // 注意：艾瑞咨询网站可能不稳定，增加超时时间
        const listUrl = 'https://www.iresearch.com.cn/research/reportlist';

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
                metadata: {
                    publisher: '艾瑞咨询',
                    publishDate: this.extractDate(dateText || $item.text()),
                    industry: category,
                    sourceType: 'iresearch',
                }
            });
        });

        return signals.slice(0, 30);
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('艾瑞咨询请求超时');
                throw new Error('艾瑞咨询请求超时');
            }
            console.warn('艾瑞咨询抓取失败:', error.message);
            throw error;
        }
    }

    /**
     * 抓取亿欧智库 (iyiou.com)
     */
    private async fetchIyiou(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://www.iyiou.com/research';

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch iyiou: ${response.statusText}`);
        }

        const html = await response.text();
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
                metadata: {
                    publisher: '亿欧智库',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'iyiou',
                }
            });
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取中国信通院 (caict.ac.cn)
     */
    private async fetchCAICT(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://www.caict.ac.cn/zk/index.html';

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch CAICT: ${response.statusText}`);
        }

        const html = await response.text();
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
                metadata: {
                    publisher: '中国信息通信研究院',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'caict',
                }
            });
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取研报之家 (yblook.com)
     */
    private async fetchYblook(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://www.yblook.com/';

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch yblook: ${response.statusText}`);
        }

        const html = await response.text();
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
                metadata: {
                    publisher: '研报之家',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'yblook',
                }
            });
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取东方财富研报
     */
    private async fetchEastMoney(_baseUrl: string): Promise<ScrapedSignal[]> {
        const listUrl = 'https://data.eastmoney.com/report/';

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch EastMoney: ${response.statusText}`);
        }

        const html = await response.text();
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
                metadata: {
                    publisher: '东方财富',
                    publishDate: this.extractDate(dateText || $item.text()),
                    sourceType: 'eastmoney',
                }
            });
        });

        return signals.slice(0, 30);
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
