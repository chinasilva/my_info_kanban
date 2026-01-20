import { PrismaClient } from "./client/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = global as unknown as { prisma: any };

// Use absolute path for Prisma 7 adapter consistency
const adapter = new PrismaBetterSqlite3({
    url: "file:/Users/chinasilva/ai_code/high_quality_info/prisma/dev.db",
});

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ["query", "error", "warn"],
    } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
