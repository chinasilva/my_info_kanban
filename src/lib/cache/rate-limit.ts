import redis from "./redis";

interface RateLimitConfig {
    limit: number;      // Max requests
    window: number;     // Window size in seconds
}

// Simple in-memory fallback
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export class RateLimiter {
    static async check(identifier: string, config: RateLimitConfig = { limit: 10, window: 60 }): Promise<{ allowed: boolean; remaining: number }> {
        const key = `ratelimit:${identifier}`;

        if (redis) {
            try {
                const multi = redis.multi();
                multi.incr(key);
                multi.expire(key, config.window);
                const results = await multi.exec();

                if (results) {
                    const count = results[0][1] as number;
                    return {
                        allowed: count <= config.limit,
                        remaining: Math.max(0, config.limit - count),
                    };
                }
            } catch (error) {
                console.error("RateLimiter Redis error:", error);
                // Fallback to memory on redis error
            }
        }

        // Fallback: In-Memory
        const now = Date.now();
        const record = memoryStore.get(key);

        if (record && record.expiresAt > now) {
            record.count++;
            return {
                allowed: record.count <= config.limit,
                remaining: Math.max(0, config.limit - record.count),
            };
        } else {
            memoryStore.set(key, {
                count: 1,
                expiresAt: now + config.window * 1000,
            });
            return {
                allowed: true,
                remaining: config.limit - 1,
            };
        }
    }
}
