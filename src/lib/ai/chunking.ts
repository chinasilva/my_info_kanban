
/**
 * Simple heuristic token estimator (approx 4 chars per token for English, 1 char per token for CJK)
 */
export function estimateTokens(text: string): number {
    let tokenCount = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // Basic CJK check: 0x4E00 - 0x9FFF
        if (code >= 0x4E00 && code <= 0x9FFF) {
            tokenCount += 1; // Approx 1 token per Chinese character
        } else {
            tokenCount += 0.25; // Approx 4 chars per token for English
        }
    }
    return Math.ceil(tokenCount);
}

/**
 * Split text into chunks that fit within maxTokens context.
 * Prioritizes splitting by double newlines (paragraphs), then single newlines, then sentences.
 */
export function splitTextIntoChunks(text: string, maxTokens: number = 2000): string[] {
    const estimatedTotal = estimateTokens(text);
    if (estimatedTotal <= maxTokens) {
        return [text];
    }

    const chunks: string[] = [];
    let currentChunk = "";

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    for (const paragraph of paragraphs) {
        const paragraphTokens = estimateTokens(paragraph);
        const currentTokens = estimateTokens(currentChunk);

        if (currentTokens + paragraphTokens + 2 > maxTokens) {
            // Current chunk is full, push it
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }

            // If the single paragraph is too huge, split by sentences/newlines
            if (paragraphTokens > maxTokens) {
                const subChunks = splitParagraph(paragraph, maxTokens);
                chunks.push(...subChunks);
            } else {
                currentChunk = paragraph;
            }
        } else {
            // Add to current chunk
            currentChunk = currentChunk ? currentChunk + "\n\n" + paragraph : paragraph;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function splitParagraph(text: string, maxTokens: number): string[] {
    // Simple sentence splitter
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        const currentTokens = estimateTokens(currentChunk);

        if (currentTokens + sentenceTokens > maxTokens) {
            if (currentChunk) chunks.push(currentChunk.trim());

            // If a single sentence is still too big, just hard slice it (last resort)
            if (sentenceTokens > maxTokens) {
                let remaining = sentence;
                while (estimateTokens(remaining) > maxTokens) {
                    // Approximation: take maxTokens * 2 chars (safe lower bound)
                    const sliceLen = Math.floor(maxTokens * 2);
                    chunks.push(remaining.slice(0, sliceLen));
                    remaining = remaining.slice(sliceLen);
                }
                currentChunk = remaining;
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}
