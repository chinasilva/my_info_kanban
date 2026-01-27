
import { prisma } from "../src/lib/prisma/db";

async function main() {
    console.log('Starting cleanup of failed summaries...');

    const result = await prisma.signal.updateMany({
        where: {
            OR: [
                { summary: 'Summary generation failed.' },
                { aiSummary: 'Summary generation failed.' }
            ]
        },
        data: {
            summary: null,
            aiSummary: null
        }
    });

    console.log(`Updated ${result.count} signals.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
