import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY not found in .env");
        return;
    }

    // Try a direct REST call if SDK fails, but SDK has listModels too?
    // The SDK typically exposes it via the manager, but simpler to just fetch via curl or similar?
    // Let's rely on a simple fetch to the list models endpoint to be strictly clear of SDK version issues.
    // Spec: https://ai.google.dev/api/rest/v1beta/models/list

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Error listing models:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("Available Models:");
            type Model = { name?: string; displayName?: string };
            const models: Model[] = Array.isArray(data.models) ? data.models : [];
            models.forEach((m) => {
                if (typeof m.name === "string" && m.name.includes('gemini')) {
                    console.log(`- ${m.name} (${m.displayName || "unknown"})`);
                }
            });
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

main();
