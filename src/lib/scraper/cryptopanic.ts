import { RssScraper } from "./rss";

export class CryptoPanicScraper extends RssScraper {
    name = "CryptoPanic";
    source = "cryptopanic";
    // Using filtered RSS for important news to reduce noise
    rssUrl = "https://cryptopanic.com/news/rss/?filter=rising";

    protected getCategory(): string {
        return "Crypto";
    }
}
