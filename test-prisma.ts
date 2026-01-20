import { prisma } from "./src/lib/prisma/db";

async function test() {
    try {
        console.log("Testing Prisma create...");
        const signal = await prisma.signal.create({
            data: {
                title: "Test Signal",
                url: "https://example.com/test-" + Date.now(),
                source: "test",
                score: 100,
            },
        });
        console.log("Created successfully:", signal);

        console.log("Testing Prisma upsert...");
        const upserted = await prisma.signal.upsert({
            where: { url: signal.url },
            update: { score: 200 },
            create: {
                title: "Test Signal",
                url: signal.url,
                source: "test",
                score: 200,
            },
        });
        console.log("Upserted successfully:", upserted);
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        process.exit();
    }
}

test();
