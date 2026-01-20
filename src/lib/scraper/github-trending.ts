import { BaseScraper, ScrapedSignal } from "./base";
import * as cheerio from "cheerio";

export class GitHubTrendingScraper extends BaseScraper {
    name = "GitHub Trending";
    source = "github";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            // Weekly trending for all languages or specific ones
            // We'll target the main trending page (weekly)
            const response = await fetch("https://github.com/trending?since=weekly");

            if (!response.ok) {
                throw new Error(`GitHub returned ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const signals: ScrapedSignal[] = [];

            $(".Box-row").each((_, element) => {
                const $row = $(element);
                const titleLine = $row.find("h2 a").text().trim().replace(/\s+/g, "");
                const [owner, repo] = titleLine.split("/");
                const url = `https://github.com/${owner}/${repo}`;
                const description = $row.find("p").text().trim();

                // Stars increasing this week
                const starsText = $row.find("div.f6.color-fg-muted.mt-2").text();
                const starsAddedMatch = starsText.match(/(\d+,?\d*)\s+stars\s+this\s+week/);
                const starsAdded = starsAddedMatch ? parseInt(starsAddedMatch[1].replace(/,/g, ""), 10) : 0;

                const language = $row.find('[itemprop="programmingLanguage"]').text().trim();

                signals.push({
                    title: `${owner}/${repo}`,
                    url,
                    summary: description || "No description provided.",
                    score: starsAdded,
                    category: language || "Code",
                    externalId: `${owner}/${repo}`,
                });
            });

            return signals;
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }
}
