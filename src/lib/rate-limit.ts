/**
 * 简单的内存速率限制器
 * 注意：在 Vercel Serverless 环境中，每个请求可能是不同的实例
 * 生产环境建议使用 Redis 或专门的速率限制服务
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 内存存储（仅适用于单实例部署）
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
}

/**
 * 速率限制结果
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * 默认配置：60 请求/分钟
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 60,
};

/**
 * 检查速率限制
 * @param key 标识符（通常是 API Key 或 IP）
 * @param config 速率限制配置
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = defaultRateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // 如果不存在记录或已过期，创建新记录
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // 检查是否超过限制
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // 增加计数
  entry.count++;

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 从环境变量获取速率限制配置
 */
export function getRateLimitConfigFromEnv(): RateLimitConfig {
  const maxRequests = parseInt(process.env.AGENT_RATE_LIMIT || "60", 10);

  return {
    windowMs: 60 * 1000, // 1 分钟窗口
    maxRequests: isNaN(maxRequests) ? 60 : maxRequests,
  };
}

/**
 * 清理过期的速率限制记录
 * 应该定期调用此函数以防止内存泄漏
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// 定期清理（每 5 分钟）
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
