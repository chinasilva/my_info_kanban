import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface AppRankConfig {
    sourceType: 'qimai' | 'itunes';
    category?: string;
    country?: string;
}

/**
 * 应用榜单抓取器
 *
 * 七麦数据 (qimai.cn) 有反爬机制，使用JS参数加密
 * 实际生产环境建议：
 * 1. 使用七麦官方API
 * 2. 使用无头浏览器绕过
 * 3. 使用第三方数据服务
 */
export class AppRankScraper extends BaseScraper {
    name = '应用榜单';
    source = 'app_rank';
    private sourceConfig: Source;
    private config: AppRankConfig;

    constructor(source: Source) {
        super();
        this.sourceConfig = source;
        const sourceConfig = source.config as AppRankConfig | null;
        this.config = sourceConfig || { sourceType: 'qimai', category: '免费榜' };
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
            // 优先使用 iTunes RSS API（更稳定可靠）
            return await this.fetchAppStore();
        } catch (error) {
            await this.logError(error);
            return this.getMockData();
        }
    }

    /**
     * 抓取七麦数据
     * 注意：七麦有较强的反爬机制，需要JS逆向或无头浏览器
     */
    private async fetchQimai(baseUrl: string): Promise<ScrapedSignal[]> {
        // 尝试抓取七麦的榜单页面
        const listUrl = baseUrl + '/rank';

        const response = await fetch(listUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Referer': 'https://www.qimai.cn/',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 七麦页面结构
        const selectors = [
            '.rank-list .item',
            '.app-item',
            '.list-item',
            'table tr',
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

        items.each((index: any, element: any) => {
            if (index === 0) return; // 跳过表头

            const $item = $(element);

            // 尝试多种选择器
            const title = $item.find('.app-name, .name, .title, .title-name').text().trim()
                || $item.find('td').eq(1).text().trim();
            const subTitle = $item.find('.sub-title, .subname, .company').text().trim()
                || $item.find('td').eq(2).text().trim();
            const downloads = $item.find('.downloads, .download, .count').text().trim()
                || $item.find('td').eq(3).text().trim();
            const rating = $item.find('.rating, .star, .score').text().trim()
                || $item.find('td').eq(4).text().trim();

            if (!title) return;

            const rank = index;
            const rankChange = this.parseRankChange($item.find('.change, .rank-change').text().trim());

            signals.push({
                title: this.cleanText(title),
                url: $item.find('a').attr('href') || `https://www.qimai.cn/search/result/search/${encodeURIComponent(title)}`,
                score: this.parseDownloads(downloads),
                category: '应用榜单',
                metadata: {
                    downloads,
                    rating: this.parseRating(rating),
                    rank,
                    rankChange,
                    category: this.config.category || '免费榜',
                    country: this.config.country || '中国',
                    publisher: subTitle,
                    sourceType: 'qimai',
                }
            });
        });

        return signals.slice(0, 50);
    }

    /**
     * 抓取 App Store 榜单（通过 iTunes API）
     * 这是一个更可靠的替代方案
     */
    private async fetchAppStore(): Promise<ScrapedSignal[]> {
        const country = this.config.country || 'cn';

        // iTunes RSS API - 免费应用榜单
        const url = `https://itunes.apple.com/${country}/rss/topfreeapplications/limit=50/json`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch App Store: ${response.statusText}`);
            }

            const data = await response.json();
            const signals: ScrapedSignal[] = [];

            const entries = data.feed?.entry || [];
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const nameObj = entry['im:name'] || {};
                const name = nameObj.label || 'Unknown';

                const idObj = entry.id || {};
                const idAttrs = idObj.attributes || {};
                const appId = idAttrs['im:id'] || '';

                const artist = entry['im:artist']?.label || 'Unknown';

                const imRating = entry['im:rating'] || {};
                const rating = imRating.attributes?.content || 'N/A';

                signals.push({
                    title: name,
                    url: `https://apps.apple.com/${country}/app/id${appId}`,
                    score: 50 - i, // 排名越高分数越高
                    category: 'iOS免费榜',
                    metadata: {
                        bundleId: idAttrs['im:bundleId'] || '',
                        appId: appId,
                        downloads: 'N/A',
                        rating: rating,
                        rank: i + 1,
                        rankChange: 0,
                        category: this.config.category || '免费榜',
                        country: country.toUpperCase(),
                        publisher: artist,
                        sourceType: 'itunes',
                    }
                });
            }

            return signals;
        } catch (error) {
            await this.logError(error);
            return this.getMockData();
        }
    }

    /**
     * 解析下载量
     */
    private parseDownloads(text: string): number {
        if (!text) return 0;

        // 移除逗号和空格
        const cleaned = text.replace(/[,，\s]/g, '');

        // 匹配模式: 10万+, 100万+, 1000万+
        const patterns = [
            /(\d+(?:\.\d+)?)\s*万/,
            /(\d+(?:\.\d+)?)\s*亿/,
            /(\d+)\+/,
        ];

        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                const num = parseFloat(match[1]);
                if (text.includes('亿')) return num * 10000;
                if (text.includes('万')) return num;
                return num;
            }
        }

        return 0;
    }

    /**
     * 解析评分
     */
    private parseRating(text: string): number {
        if (!text) return 0;

        const match = text.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    /**
     * 解析排名变化
     */
    private parseRankChange(text: string): number {
        if (!text || text === '-' || text === '0') return 0;

        if (text.includes('↑')) {
            return parseInt(text.replace(/[^0-9]/g, '')) || 0;
        }
        if (text.includes('↓')) {
            return -parseInt(text.replace(/[^0-9]/g, '')) || 0;
        }

        return 0;
    }

    /**
     * 获取类别ID（用于iTunes API）
     */
    private getGenreId(category?: string): string {
        const genres: Record<string, string> = {
            '免费榜': '6017',
            '付费榜': '6018',
            '畅销榜': '6019',
            '商务': '6000',
            '教育': '6013',
            '娱乐': '6015',
            '游戏': '6014',
            '健康': '6013',
            '音乐': '6011',
            '新闻': '6009',
            '效率': '6007',
            '社交': '6005',
        };

        return genres[category || '免费榜'] || '6017';
    }

    /**
     * 获取模拟数据
     */
    private getMockData(): ScrapedSignal[] {
        return [
            {
                title: '七麦数据 - 应用榜单（需API/JS逆向）',
                url: this.sourceConfig.baseUrl,
                score: 0,
                category: '应用榜单',
                metadata: {
                    note: '建议使用iTunes RSS API或七麦官方API',
                    alternative: 'https://itunes.apple.com/cn/rss/topfreeapplications/limit=50/json',
                    sourceType: 'qimai',
                }
            }
        ];
    }
}
