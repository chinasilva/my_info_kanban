import { BaseScraper, ScrapedSignal } from "./base";

interface HackerNewsHit {
    title?: string;
    url?: string;
    objectID?: string;
    points?: number;
    num_comments?: number;
}

export class HackerNewsScraper extends BaseScraper {
    name = "Hacker News";
    source = "hackernews";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            // Fetch from Algolia API for front page or high points
            // Points > 100 OR Comments > 50
            const response = await fetch(
                "https://hn.algolia.com/api/v1/search?tags=front_page&numericFilters=points>100,num_comments>50"
            );

            if (!response.ok) {
                throw new Error(`HN API returned ${response.status}`);
            }

            const data = (await response.json()) as { hits?: HackerNewsHit[] };

            return (data.hits || []).map((hit) => ({
                title: hit.title || "Untitled",
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                score: hit.points || 0,
                externalId: hit.objectID,
                summary: null, // Clear summary to trigger AI processing
                metadata: {
                    comments: hit.num_comments || 0
                },
                category: "Tech",
            }));
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }
}
