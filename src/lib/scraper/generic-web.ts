
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
        try {
            const response = await fetch(this.targetUrl, {
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
