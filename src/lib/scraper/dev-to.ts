import { RssScraper } from "./rss";

export class DevToScraper extends RssScraper {
    name = "Dev.to";
    source = "devto";
    rssUrl = "https://dev.to/feed"; // Top posts

    protected getCategory(item: unknown): string {
        if (!item || typeof item !== "object" || !("find" in item)) {
            return "Tech";
        }
        const $item = item as { find: (selector: string) => { first: () => { text: () => string } } };
        // Dev.to RSS has <category> tags
        const category = $item.find("category").first().text();
        return category || "Tech";
    }
}
