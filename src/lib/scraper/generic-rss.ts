import { RssScraper } from "./rss";
import { Source } from "@prisma/client";

/**
 * 通用 RSS 抓取器，支持动态配置的 RSS 源
 */
export class GenericRssScraper extends RssScraper {
    name: string;
    source: string;
    rssUrl: string;
    private sourceId: string;

    constructor(sourceConfig: Source) {
        super();
        this.name = sourceConfig.name;
        this.source = sourceConfig.type;
        this.sourceId = sourceConfig.id;

        // 从 config JSON 中获取 feedUrl
        const config = sourceConfig.config as { feedUrl?: string } | null;
        this.rssUrl = config?.feedUrl || "";
    }

    /**
     * 获取源 ID，用于关联 Signal
     */
    getSourceId(): string {
        return this.sourceId;
    }
}
