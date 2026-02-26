import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';
import { validateUrl } from '@/lib/security/ssrf';
import { Source } from '@prisma/client';

interface RecruitmentConfig {
    sourceType: 'boss' | 'zhilian' | 'lagou';
    city?: string;
    keyword?: string;
}

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

        // SSRF protection
        const validation = validateUrl(baseUrl);
        if (!validation.valid) {
            await this.logError(new Error(`SSRF blocked: ${validation.error} - ${baseUrl}`));
            return [];
        }

        try {
            switch (this.config.sourceType) {
                case 'boss':
                    return await this.fetchBoss(baseUrl);
                case 'zhilian':
                    return await this.fetchZhilian(baseUrl);
                case 'lagou':
                    return await this.fetchLagou(baseUrl);
                default:
                    return await this.fetchBoss(baseUrl);
            }
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    /**
     * 抓取BOSS直聘
     * 注意：BOSS直聘有较强的反爬机制，网页结构经常变化
     */
    private async fetchBoss(_baseUrl: string): Promise<ScrapedSignal[]> {
        const searchUrl = this.buildSearchUrl('boss');

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cookie': '这里需要配置有效的Cookie',
            }
        });

        if (!response.ok) {
            // 如果无法抓取，返回模拟数据提示
            console.warn('BOSS直聘抓取失败，可能需要反爬处理');
            return this.getMockData('BOSS直聘');
        }

        const html = await response.text();
        const $ = load(html);

        const signals: ScrapedSignal[] = [];

        // 尝试多种选择器（BOSS结构经常变化）
        const selectors = [
            '.job-list li',
            '.job-card',
            '.job-item',
            '.search-result li',
            '.position-list li',
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

            const title = $item.find('.job-title, .title, .position-name').text().trim();
            const company = $item.find('.company-name, .company, .name').text().trim();
            const salary = $item.find('.salary, .job-salary').text().trim();
            const location = $item.find('.city, .location').text().trim();
            const href = $item.find('a').attr('href');

            if (!title) return;

            let url = href || '';
            if (href && !href.startsWith('http')) {
                url = 'https://www.zhipin.com' + (href.startsWith('/') ? '' : '/') + href;
            }

            const skills = this.extractSkills($item.text());

            signals.push({
                title: this.cleanText(title),
                url,
                score: this.parseSalary(salary),
                category: '招聘',
                metadata: {
                    salary,
                    skills,
                    company,
                    city: location || this.config.city || '未知',
                    companySize: this.extractCompanySize($item.text()),
                    fundingStage: this.extractFundingStage($item.text()),
                    platform: 'BOSS直聘',
                    sourceType: 'boss',
                }
            });
        });

        return signals.slice(0, 30);
    }

    /**
     * 抓取智联招聘
     */
    private async fetchZhilian(_baseUrl: string): Promise<ScrapedSignal[]> {
        const searchUrl = this.buildSearchUrl('zhilian');

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return this.getMockData('智联招聘');
        }

        const html = await response.text();
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

        return signals.slice(0, 30);
    }

    /**
     * 抓取拉勾
     */
    private async fetchLagou(_baseUrl: string): Promise<ScrapedSignal[]> {
        const searchUrl = this.buildSearchUrl('lagou');

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return this.getMockData('拉勾');
        }

        const html = await response.text();
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

        return signals.slice(0, 30);
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
    private extractSkills(text: string): string[] {
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
            if (text.includes(keyword)) {
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

    /**
     * 获取模拟数据（当实际抓取失败时）
     */
    private getMockData(platform: string): ScrapedSignal[] {
        return [{
            title: `${platform} - 技术岗位招聘（需配置Cookie/第三方API）`,
            url: this.sourceConfig.baseUrl,
            score: 0,
            category: '招聘',
            metadata: {
                platform,
                note: '请配置有效的Cookie或使用第三方API（如justoneapi）进行抓取',
                sourceType: this.config.sourceType,
            }
        }];
    }
}
