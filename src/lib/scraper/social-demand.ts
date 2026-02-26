import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface SocialDemandConfig {
    sourceType: 'weibo' | 'xiaohongshu' | 'zhihu' | 'dianping' | 'douyin' | 'bilibili';
    keyword?: string;
    // 过滤配置
    filterMode?: 'blacklist' | 'whitelist' | 'none';
    blacklist?: string[];
    whitelist?: string[];
}

// 默认黑名单关键词（明星八卦、娱乐内容）
const DEFAULT_BLACKLIST = [
    '明星', '演员', '歌手', '艺人', '离婚', '出轨', '结婚', '恋情', '官宣',
    '综艺', '节目', '电视剧', '电影', '娱乐', '八卦', '粉丝', '爱豆',
    '演唱会', '颁奖典礼', '红毯', '怀孕', '生子', '小三',
    '网红', '直播', '打赏', '主播', '真人秀',
    '薛之谦', '林俊杰', '迪丽热巴', '刘亦菲', '郭富城', '周深', '杨幂',
    '杨洋', '王鹤棣', '周杰伦', '田馥甄', '小S', '王一博', '陈星旭',
    '李乃文', '王安宇', '冯琳', '方穆扬', '刘宇宁', '李晓庆', '王劲松',
    '逐玉', '镖人', '剧集', '综艺', '音乐', '演出'
];

// 默认白名单关键词（科技/商业相关内容）
const DEFAULT_WHITELIST = [
    'AI', '人工智能', '软件', '技术', '产品', '工具', '开发', '编程',
    '互联网', '科技', '数字化', '智能化', '创业', '投资', '商业', '市场',
    '电商', 'SaaS', 'B2B', '企业', '服务', '解决方案', '数字化转型',
    '大模型', 'LLM', 'GPT', 'Claude', 'ChatGPT', 'Gemini', 'DeepSeek',
    '开源', 'GitHub', '代码', '框架', '库', 'API', 'SDK', '前端', '后端',
    '云', '云计算', 'AWS', 'Azure', '阿里云', '腾讯云', '华为云',
    '数据', '大数据', '分析', 'BI', '数据库', '算法', '模型', '机器学习',
    '自动驾驶', '智能驾驶', '新能源汽车', '电动汽车', '特斯拉', '比亚迪',
    '芯片', '半导体', 'GPU', '英伟达', 'AMD', 'Intel', '处理器',
    '手机', '数码', '电脑', '笔记本', '评测', '测评',
    '游戏', '电竞', 'VR', 'AR', '元宇宙', '区块链', 'Web3', '比特币',
    '苹果', 'iPhone', 'iOS', 'Android', '鸿蒙', '微软', 'Google',
    '隐私', '安全', '漏洞', '攻击', '勒索', '钓鱼', '诈骗', '木马',
    '小米', '三星', '京东', '淘宝', '拼多多', '抖音', '微信'
];

/**
 * 社区需求信号抓取器
 *
 * 社交平台通常有反爬机制：
 * - 微博热搜：相对容易
 * - 小红书/知乎/抖音/B站：建议使用第三方API
 */
export class SocialDemandScraper extends BaseScraper {
    name = '社区需求';
    source = 'social_demand';
    private sourceConfig: Source;
    private config: SocialDemandConfig;

    constructor(source: Source) {
        super();
        this.sourceConfig = source;
        const sourceConfig = source.config as SocialDemandConfig | null;

        // 运行时验证配置
        if (sourceConfig && sourceConfig.sourceType) {
            this.config = sourceConfig;
        } else {
            this.config = { sourceType: 'weibo' };
        }
    }

    async fetch(): Promise<ScrapedSignal[]> {
        let signals: ScrapedSignal[] = [];

        try {
            switch (this.config.sourceType) {
                case 'weibo':
                    signals = await this.fetchWeiboHot();
                    break;
                case 'xiaohongshu':
                    signals = await this.fetchXiaohongshu();
                    break;
                case 'zhihu':
                    signals = await this.fetchZhihu();
                    break;
                case 'dianping':
                    signals = await this.fetchDianping();
                    break;
                case 'douyin':
                    signals = await this.fetchDouyin();
                    break;
                case 'bilibili':
                    signals = await this.fetchBilibili();
                    break;
                default:
                    signals = await this.fetchWeiboHot();
            }

            // 应用过滤
            return this.filterSignals(signals);
        } catch (error) {
            await this.logError(error);
            return this.getMockData();
        }
    }

    /**
     * 过滤信号内容
     * 根据黑名单/白名单过滤热搜词
     */
    private filterSignals(signals: ScrapedSignal[]): ScrapedSignal[] {
        const filterMode = this.config.filterMode || 'blacklist';
        const blacklist = this.config.blacklist || DEFAULT_BLACKLIST;
        const whitelist = this.config.whitelist || DEFAULT_WHITELIST;

        if (filterMode === 'none') {
            return signals;
        }

        return signals.filter(signal => {
            const title = signal.title.toLowerCase();

            if (filterMode === 'blacklist') {
                // 黑名单模式：排除包含黑名单关键词的内容
                return !blacklist.some(keyword =>
                    title.includes(keyword.toLowerCase())
                );
            } else if (filterMode === 'whitelist') {
                // 白名单模式：仅保留包含白名单关键词的内容
                return whitelist.some(keyword =>
                    title.includes(keyword.toLowerCase())
                );
            }

            return true;
        });
    }

    /**
     * 抓取微博热搜榜
     * 相对容易，有公开接口
     */
    private async fetchWeiboHot(): Promise<ScrapedSignal[]> {
        // 微博热搜榜API
        const apiUrl = 'https://weibo.com/ajax/side/hotSearch';

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://weibo.com',
            }
        });

        if (!response.ok) {
            // 备用方案：抓取网页版
            return await this.fetchBaiduHot();
        }

        const data = await response.json();
        const realtime = data.data?.realtime || [];

        const signals: ScrapedSignal[] = realtime.slice(0, 50).map((item: any) => {
            const word = item.word || item.note || '';
            const rawHot = item.raw_hot || item.num || 0;

            return {
                title: this.cleanText(word),
                url: `https://s.weibo.com/weibo?q=${encodeURIComponent(word)}&Refer=hot`,
                score: this.parseHot(rawHot),
                category: '微博热搜',
                metadata: {
                    platform: '微博',
                    likes: item.raw_hot || 0,
                    comments: item.comment || 0,
                    rank: item.rank || 0,
                    label: item.label_name || '',
                    sourceType: 'weibo',
                }
            };
        });

        return signals;
    }

    /**
     * 抓取百度热搜榜（备用方案）
     * 注意：这是备用方案，实际抓取的是百度热搜而非微博
     */
    private async fetchBaiduHot(): Promise<ScrapedSignal[]> {
        const response = await fetch('https://top.baidu.com/board?tab=realtime', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        $('.topic-list .item, .hot-list-item, .list-item').each((index, element) => {
            const $item = $(element);
            const title = $item.find('.title, .topic-name, .item-title').text().trim();
            const hot = $item.find('.hot-score, .hot, .num').text().trim();
            const href = $item.find('a').attr('href');

            if (!title) return;

            signals.push({
                title: this.cleanText(title),
                url: href || `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}&Refer=hot`,
                score: this.parseHot(hot),
                category: '微博热搜',
                metadata: {
                    platform: '微博',
                    likes: this.parseHot(hot),
                    rank: index + 1,
                    sourceType: 'weibo',
                }
            });
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取小红书（需要第三方API或Cookie）
     */
    private async fetchXiaohongshu(): Promise<ScrapedSignal[]> {
        // 小红书有强反爬，建议使用第三方API
        // 这里尝试抓取搜索结果页面

        const keyword = this.config.keyword || '好物推荐';
        const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 小红书结构复杂，可能需要登录
        $('.note-item, .result-item').each((index, element) => {
            const $item = $(element);
            const title = $item.find('.title, .desc').text().trim();
            const likes = $item.find('.likes, .count').text().trim();
            const href = $item.find('a').attr('href');

            if (!title) return;

            signals.push({
                title: this.cleanText(title),
                url: href ? `https://www.xiaohongshu.com${href}` : '',
                score: this.parseHot(likes),
                category: '小红书',
                metadata: {
                    platform: '小红书',
                    likes: this.parseHot(likes),
                    sourceType: 'xiaohongshu',
                    note: '建议使用第三方API获取完整数据',
                }
            });
        });

        return signals.slice(0, 20);
    }

    /**
     * 抓取知乎
     */
    private async fetchZhihu(): Promise<ScrapedSignal[]> {
        // 知乎热榜API
        const apiUrl = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50';

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const data = await response.json();
        const items = data.data || [];

        const signals: ScrapedSignal[] = items.map((item: any) => {
            const target = item.target || {};
            const detail = target.detail || {};

            return {
                title: this.cleanText(target.title || ''),
                url: target.url || `https://www.zhihu.com/question/${target.id}`,
                score: item.detail?.score || 0,
                category: '知乎热榜',
                metadata: {
                    platform: '知乎',
                    likes: target.voteup_count || 0,
                    comments: target.comment_count || 0,
                    answers: target.answer_count || 0,
                    tags: target.tags?.map((t: any) => t.name) || [],
                    sourceType: 'zhihu',
                }
            };
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取大众点评
     */
    private async fetchDianping(): Promise<ScrapedSignal[]> {
        const keyword = this.config.keyword || '美食';
        const url = `https://www.dianping.com/search/keyword/0/${encodeURIComponent(keyword)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 大众点评结构
        $('#shop-all-list li, .shop-list li').each((index, element) => {
            const $item = $(element);
            const title = $item.find('.shopname, .title, .shop-name').text().trim();
            const rating = $item.find('.rating, .score').text().trim();
            const reviews = $item.find('.review-num, .comment').text().trim();
            const href = $item.find('a').attr('href');

            if (!title) return;

            signals.push({
                title: this.cleanText(title),
                url: href ? `https://www.dianping.com${href}` : '',
                score: this.parseRating(rating) * 10,
                category: '大众点评',
                metadata: {
                    platform: '大众点评',
                    rating: this.parseRating(rating),
                    reviews: reviews.replace(/[^0-9]/g, '') || '0',
                    sourceType: 'dianping',
                }
            });
        });

        return signals.slice(0, 20);
    }

    /**
     * 抓取抖音
     */
    private async fetchDouyin(): Promise<ScrapedSignal[]> {
        // 抖音热点榜API
        const apiUrl = 'https://www.douyin.com/aweme/v1/web/hot/search/list/';

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const data = await response.json();
        const wordList = data.data?.word_list || [];

        const signals: ScrapedSignal[] = wordList.map((item: any, index: number) => {
            return {
                title: this.cleanText(item.word || ''),
                url: `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`,
                score: item.hot_value || 0,
                category: '抖音热点',
                metadata: {
                    platform: '抖音',
                    likes: item.hot_value || 0,
                    rank: index + 1,
                    eventTime: item.event_time || '',
                    sourceType: 'douyin',
                }
            };
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取B站
     */
    private async fetchBilibili(): Promise<ScrapedSignal[]> {
        // B站热门API
        const apiUrl = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all';

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return this.getMockData();
        }

        const data = await response.json();
        const list = data.data?.list || [];

        const signals: ScrapedSignal[] = list.map((item: any) => {
            return {
                title: this.cleanText(item.title || ''),
                url: `https://www.bilibili.com/video/${item.bvid}`,
                score: item.stat?.view || 0,
                category: 'B站热门',
                metadata: {
                    platform: 'B站',
                    likes: item.stat?.like || 0,
                    comments: item.stat?.reply || 0,
                    shares: item.stat?.share || 0,
                    author: item.owner?.name || '',
                    category: item.tname || '',
                    sourceType: 'bilibili',
                }
            };
        });

        return signals.slice(0, 30);
    }

    /**
     * 解析热度值
     */
    private parseHot(text: any): number {
        // 确保 text 是字符串，处理类型错误
        if (!text) return 0;

        const textStr = typeof text === 'string' ? text : String(text);
        const cleaned = textStr.replace(/[,，\s]/g, '');

        // 匹配模式: 10万, 100万, 1亿
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
     * 解析评分
     */
    private parseRating(text: string): number {
        if (!text) return 0;
        const match = text.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    /**
     * 获取模拟数据
     */
    private getMockData(): ScrapedSignal[] {
        const platformNames: Record<string, string> = {
            weibo: '微博热搜',
            xiaohongshu: '小红书',
            zhihu: '知乎',
            dianping: '大众点评',
            douyin: '抖音',
            bilibili: 'B站',
        };

        // 根据平台类型生成默认 URL
        const platformUrls: Record<string, string> = {
            weibo: 'https://weibo.com',
            xiaohongshu: 'https://www.xiaohongshu.com',
            zhihu: 'https://www.zhihu.com',
            dianping: 'https://www.dianping.com',
            douyin: 'https://www.douyin.com',
            bilibili: 'https://www.bilibili.com',
        };

        return [{
            title: `${platformNames[this.config.sourceType] || '社交平台'} - 需配置第三方API`,
            url: this.sourceConfig.baseUrl || platformUrls[this.config.sourceType] || 'https://weibo.com',
            score: 0,
            category: '社区需求',
            metadata: {
                platform: platformNames[this.config.sourceType] || '社交平台',
                note: '建议使用第三方API（如justoneapi）获取完整数据',
                sourceType: this.config.sourceType,
            }
        }];
    }
}
