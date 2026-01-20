import Redis from "ioredis";

// Use environment variable or default to localhost
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redis: Redis | null = null;

try {
    if (process.env.REDIS_URL) {
        console.log("Initializing Redis client...");
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redis.on("error", (err) => {
            console.warn("Redis connection error:", err);
            // Don't crash execution, just warn. 
            // In a real app we might want to handle this more robustly.
        });
    } else {
        console.warn("REDIS_URL not set. Redis caching disabled.");
    }
} catch (error) {
    console.warn("Failed to initialize Redis:", error);
}

export default redis;

export async function getCache<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Redis get error for key ${key}:`, error);
        return null;
    }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
        console.error(`Redis set error for key ${key}:`, error);
    }
}
