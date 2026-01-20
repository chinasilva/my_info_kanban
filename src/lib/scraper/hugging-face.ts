import { BaseScraper, ScrapedSignal } from "./base";

interface HFPaper {
    paper: {
        id: string;
        title: string;
        summary: string;
        publishedAt: string;
        upvotes: number;
        numComments: number;
    };
}

export class HuggingFaceScraper extends BaseScraper {
    name = "Hugging Face Daily Papers";
    source = "huggingface";

    async fetch(): Promise<ScrapedSignal[]> {
        try {
            const response = await fetch("https://huggingface.co/api/daily_papers");

            if (!response.ok) {
                throw new Error(`Hugging Face API returned ${response.status}`);
            }

            const data: HFPaper[] = await response.json();

            return data.map(item => ({
                title: item.paper.title,
                url: `https://huggingface.co/papers/${item.paper.id}`,
                summary: item.paper.summary,
                score: item.paper.upvotes,
                category: "AI Research",
                externalId: item.paper.id,
            }));
        } catch (error) {
            await this.logError(error);
            return [];
        }
    }
}
