
import { load } from 'cheerio';
import { BaseScraper, ScrapedSignal } from './base';

export class GenericWebScraper extends BaseScraper {
    name = 'GenericWebScraper';
    source = 'web';
    private targetUrl: string;

    constructor(url: string) {
        super();
        this.targetUrl = url;
    }

    async fetch(): Promise<ScrapedSignal[]> {
        let url: URL;
        try {
            url = new URL(this.targetUrl);
        } catch {
            await this.logError(new Error(`Invalid URL: ${this.targetUrl}`));
            return [];
        }

        // SSRF protection: verify hostname before fetching
        const hostname = url.hostname.toLowerCase();

        // Block localhost variants
        if (hostname === 'localhost' || hostname === '127.0.0.1' ||
            hostname === '::1' || hostname === '0.0.0.0') {
            await this.logError(new Error(`Blocked localhost URL: ${this.targetUrl}`));
            return [];
        }

        // Block private IP ranges
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipRegex.test(hostname)) {
            const parts = hostname.split('.').map(Number);
            // 10.x.x.x
            if (parts[0] === 10) {
                await this.logError(new Error(`Blocked private IP: ${this.targetUrl}`));
                return [];
            }
            // 172.16-31.x.x
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
                await this.logError(new Error(`Blocked private IP: ${this.targetUrl}`));
                return [];
            }
            // 192.168.x.x
            if (parts[0] === 192 && parts[1] === 168) {
                await this.logError(new Error(`Blocked private IP: ${this.targetUrl}`));
                return [];
            }
            // 127.x.x.x
            if (parts[0] === 127) {
                await this.logError(new Error(`Blocked private IP: ${this.targetUrl}`));
                return [];
            }
            // 169.254.x.x (link-local)
            if (parts[0] === 169 && parts[1] === 254) {
                await this.logError(new Error(`Blocked link-local IP: ${this.targetUrl}`));
                return [];
            }
        }

        // Block internal hostnames
        if (hostname.endsWith('.local') || hostname.endsWith('.internal') ||
            hostname.endsWith('.corp') || hostname.endsWith('.intranet')) {
            await this.logError(new Error(`Blocked internal hostname: ${this.targetUrl}`));
            return [];
        }

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; HighQualityInfoBot/1.0; +http://localhost)'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ${this.targetUrl}: ${response.statusText}`);
            }

            const html = await response.text();
            const $ = load(html);

            // Remove script, style, and other non-content elements
            $('script, style, nav, footer, header, aside, iframe, noscript').remove();

            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No Title';

            // Try to find the main content
            let content = '';
            const article = $('article, main, .content, .post-content, #content, #main').first();

            if (article.length > 0) {
                content = article.text();
            } else {
                content = $('body').text();
            }

            content = this.cleanText(content);

            return [{
                title,
                url: this.targetUrl,
                summary: content.substring(0, 500) + '...', // Initial summary is just a snippet
                score: 0,
                category: 'General',
                metadata: {
                    fullContent: content // Store full content in metadata for AI processing
                }
            }];
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }
}
