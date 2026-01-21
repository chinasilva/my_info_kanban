
import { Pool } from 'pg';
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

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        console.log("🔍 Analyzing Signals (Direct SQL)...");

        const resTotal = await pool.query('SELECT COUNT(*) FROM "Signal"');
        const resMissing = await pool.query('SELECT COUNT(*) FROM "Signal" WHERE "aiSummary" IS NULL');

        console.log(`Total Signals: ${resTotal.rows[0].count}`);
        console.log(`Missing AI Summary: ${resMissing.rows[0].count}`);

        if (parseInt(resMissing.rows[0].count) > 0) {
            console.log("\n📋 Top 20 Missing AI Summary:");
            const resLists = await pool.query(`
                SELECT s.id, s.title, s."createdAt", src.type as "sourceType"
                FROM "Signal" s
                LEFT JOIN "Source" src ON s."sourceId" = src.id
                WHERE s."aiSummary" IS NULL
                ORDER BY s."createdAt" DESC
                LIMIT 20
            `);

            resLists.rows.forEach(r => {
                console.log(`- [${r.sourceType}] ${r.title} (${r.createdAt})`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
