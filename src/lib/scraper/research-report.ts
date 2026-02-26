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

        try {
            switch (this.config.sourceType) {
                case 'iresearch':
                    return await this.fetchIResearch(baseUrl);
                case 'iyiou':
                    return await this.fetchIyiou(baseUrl);
                case 'caict':
                    return await this.fetchCAICT(baseUrl);
                case 'yblook':
                    return await this.fetchYblook(baseUrl);
                case 'eastmoney':
                    return await this.fetchEastMoney(baseUrl);
                default:
                    return await this.fetchIResearch(baseUrl);
            }
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    /**
     * 抓取艾瑞咨询 (iresearch.com.cn)
     */
    private async fetchIResearch(_baseUrl: string): Promise<ScrapedSignal[]> {
        // 艾瑞咨询 - 行业研究报告
        const listUrl = 'https://www.iresearch.com.cn/research/reportlist';

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            }
        });

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
