
import * as OpenCC from 'opencc-js';

// Define the converter type
type Converter = (text: string) => string;

let converter: Converter | null = null;
let initPromise: Promise<Converter> | null = null;

/**
 * Initializes the OpenCC converter.
 * This loads the dictionary data, so it's async.
 */
export async function initConverter(): Promise<Converter> {
    if (converter) return converter;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        // Create a converter from Simplified (CN) to Traditional (TW)
        // We use the 'cn' -> 'tw' preset
        const convert = await OpenCC.Converter({ from: 'cn', to: 'tw' });
        converter = convert;
        return convert;
    })();

    return initPromise;
}

/**
 * Converts Simplified Chinese text to Traditional Chinese.
 * Returns the original text if conversion fails or isn't ready.
 * Use this in useEffect or async contexts.
 */
export async function convertToTraditional(text: string): Promise<string> {
    if (!text) return text;
    try {
        const convert = await initConverter();
        return convert(text);
    } catch (error) {
        console.error("OpenCC conversion failed:", error);
        return text;
    }
}
