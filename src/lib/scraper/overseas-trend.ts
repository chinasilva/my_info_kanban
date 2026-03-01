import { BaseScraper, ScrapedSignal } from './base';
import { Source } from '@prisma/client';

interface OverseasTrendConfig {
    sourceType: 'producthunt' | 'hackernews' | 'github_issues';
    topic?: string;
}

interface ProductHuntNode {
    name?: string;
    tagline?: string;
    url?: string;
    votesCount?: number;
    commentsCount?: number;
    featuredAt?: string;
    topics?: { edges?: Array<{ node?: { name?: string } }> };
}

interface HackerNewsStory {
    id?: number;
    title?: string;
    url?: string;
    score?: number;
    descendants?: number;
    by?: string;
    time?: number;
}

interface GitHubIssue {
    title?: string;
    html_url?: string;
    comments?: number;
    repository_url?: string;
    labels?: Array<{ name?: string }>;
    state?: string;
    user?: { login?: string };
    created_at?: string;
}

/**
 * 海外趋势抓取器
 *
 * 用于海外 → 国内空白对比分析
 * - Product Hunt: 新产品发布热度
 * - Hacker News: 技术讨论趋势
 * - GitHub Issues: 工程缺口识别
 */
export class OverseasTrendScraper extends BaseScraper {
    name = '海外趋势';
    source = 'overseas_trend';
    private sourceConfig: Source;
    private config: OverseasTrendConfig;

    constructor(source: Source) {
        super();
        this.sourceConfig = source;
        const sourceConfig = source.config as OverseasTrendConfig | null;
        this.config = sourceConfig || { sourceType: 'producthunt' };
    }

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            switch (this.config.sourceType) {
                case 'producthunt':
                    return await this.fetchProductHunt();
                case 'hackernews':
                    return await this.fetchHackerNews();
                case 'github_issues':
                    return await this.fetchGitHubIssues();
                default:
                    return await this.fetchProductHunt();
            }
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }

    /**
     * 抓取 Product Hunt
     */
    private async fetchProductHunt(): Promise<ScrapedSignal[]> {
        const apiUrl = 'https://www.producthunt.com/frontend/graphql';

        // GraphQL query for trending products
        const query = {
            query: `
                query {
                    posts(first: 30, order: VOTES) {
                        edges {
                            node {
                                id
                                name
                                tagline
                                url
                                votesCount
                                commentsCount
                                topics {
                                    edges {
                                        node {
                                            name
                                        }
                                    }
                                }
                                featuredAt
                            }
                        }
                    }
                }
            `
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                body: JSON.stringify(query)
            });

            if (!response.ok) {
                // 备用：抓取网页版
                return await this.fetchProductHuntWeb();
            }

            const data = (await response.json()) as {
                data?: { posts?: { edges?: Array<{ node?: ProductHuntNode }> } };
            };
            const edges = data.data?.posts?.edges || [];

            const signals: ScrapedSignal[] = edges.map(({ node }) => {
                const item = node || {};
                const topics =
                    item.topics?.edges
                        ?.map((e) => e.node?.name)
                        .filter((name): name is string => typeof name === "string") || [];

                return {
                    title: item.name || 'Untitled',
                    url: item.url || 'https://www.producthunt.com',
                    summary: item.tagline,
                    score: item.votesCount || 0,
                    category: 'Product Hunt',
                    metadata: {
                        platform: 'Product Hunt',
                        votes: item.votesCount,
                        comments: item.commentsCount,
                        topics,
                        featuredAt: item.featuredAt,
                        sourceType: 'producthunt',
                    }
                };
            });

            return signals;
        } catch (error) {
            await this.logError(error);
            return await this.fetchProductHuntWeb();
        }
    }

    /**
     * 抓取 Product Hunt 网页版（备用方案）
     */
    private async fetchProductHuntWeb(): Promise<ScrapedSignal[]> {
        const response = await fetch('https://www.producthunt.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });

        if (!response.ok) {
            return [];
        }

        await response.text();
        // Product Hunt 是 React 应用，简单解析
        // 实际应该使用 API

        // 返回空数组，让用户知道需要 API
        return [{
            title: 'Product Hunt - 需要API访问',
            url: 'https://www.producthunt.com',
            score: 0,
            category: 'Product Hunt',
            metadata: {
                platform: 'Product Hunt',
                note: '建议使用 Product Hunt API 获取数据',
                sourceType: 'producthunt',
            }
        }];
    }

    /**
     * 抓取 Hacker News
     */
    private async fetchHackerNews(): Promise<ScrapedSignal[]> {
        // 获取前 30 名热门故事
        const topStoriesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
        const baseUrl = 'https://hacker-news.firebaseio.com/v0/item';

        const response = await fetch(topStoriesUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch HN top stories: ${response.statusText}`);
        }

        const storyIds: number[] = await response.json();
        const top30 = storyIds.slice(0, 30);

        // 并行获取每个故事的详情
        const stories = await Promise.all(
            top30.map(async (id) => {
                try {
                    const res = await fetch(`${baseUrl}/${id}.json`);
                    return await res.json();
                } catch {
                    return null;
                }
            })
        );

        const signals: ScrapedSignal[] = stories
            .filter((story): story is HackerNewsStory => story !== null)
            .map((story) => {
                return {
                    title: story.title || 'Untitled',
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    score: story.score || 0,
                    category: 'Hacker News',
                    metadata: {
                        platform: 'Hacker News',
                        comments: story.descendants || 0,
                        author: story.by,
                        timestamp: story.time,
                        sourceType: 'hackernews',
                    }
                };
            });

        return signals;
    }

    /**
     * 抓取 GitHub Issues
     * 用于识别工程缺口
     */
    private async fetchGitHubIssues(): Promise<ScrapedSignal[]> {
        const topic = this.config.topic || 'help-wanted';
        const apiUrl = `https://api.github.com/search/issues?q=${encodeURIComponent('label:' + topic)}+is:issue+sort:updated&per_page=30`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/vnd.github.v3+json',
            }
        });

        if (!response.ok) {
            // 如果 rate limited，返回空
            if (response.status === 403) {
                return [{
                    title: 'GitHub Issues - API Rate Limited',
                    url: 'https://github.com/issues',
                    score: 0,
                    category: 'GitHub Issues',
                    metadata: {
                        platform: 'GitHub',
                        note: 'GitHub API rate limit exceeded, please add token',
                        sourceType: 'github_issues',
                    }
                }];
            }
            throw new Error(`Failed to fetch GitHub Issues: ${response.statusText}`);
        }

        const data = (await response.json()) as { items?: GitHubIssue[] };
        const items = data.items || [];

        const signals: ScrapedSignal[] = items.map((issue) => {
            // 提取 repo 名称
            const repoUrl = issue.repository_url;
            const repoName = repoUrl ? repoUrl.replace('https://api.github.com/repos/', '') : '';

            return {
                title: issue.title || 'Untitled',
                url: issue.html_url || 'https://github.com/issues',
                score: issue.comments || 0,
                category: 'GitHub Issues',
                metadata: {
                    platform: 'GitHub',
                    comments: issue.comments,
                    labels: issue.labels?.map((l) => l.name).filter(Boolean) || [],
                    state: issue.state,
                    author: issue.user?.login,
                    repo: repoName,
                    createdAt: issue.created_at,
                    sourceType: 'github_issues',
                }
            };
        });

        return signals;
    }
}
