import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    // 使用环境变量中的数据库 URL
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    // 创建 PostgreSQL 连接池
    const pool = new Pool({
        connectionString,
        max: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE) : (process.env.NODE_ENV === 'production' ? 1 : 10), // Vercel/Serverless: Use 1 to force queuing and reuse, avoid "MaxClients"
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000, // Fail fast if execution takes too long
    });

    // 使用 Prisma PostgreSQL adapter
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
