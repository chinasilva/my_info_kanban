import { RssScraper } from "./rss";
import * as cheerio from "cheerio";

export class DevToScraper extends RssScraper {
    name = "Dev.to";
    source = "devto";
    rssUrl = "https://dev.to/feed"; // Top posts

    protected getCategory($item: any): string {
        // Dev.to RSS has <category> tags
        const category = $item.find("category").first().text();
        return category || "Tech";
    }
}
