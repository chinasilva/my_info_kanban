import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/db";
import { checkRateLimit, getRateLimitConfigFromEnv } from "@/lib/rate-limit";

export interface AgentAuthResult {
  success: boolean;
  userId?: string;
  permissions?: string[];
  error?: string;
}

// 可用的权限列表
export const AVAILABLE_PERMISSIONS = [
  "read:signals",
  "read:sources",
  "read:article",
  "write:signals", // 标记已读、收藏等操作
  "write:sources", // 订阅/取消订阅数据源
  "read:insights", // 获取洞察
] as const;

export type Permission = (typeof AVAILABLE_PERMISSIONS)[number];

/**
 * 从请求头中提取 API Key
 */
function extractApiKey(headersList: Headers): string | null {
  // 支持多种 header 格式
  const authHeader = headersList.get("authorization");
  if (authHeader) {
    // Bearer token 格式
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    // 直接作为 API Key
    return authHeader;
  }

  // 也支持 x-api-key header
  const apiKeyHeader = headersList.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * 验证 Agent API Key
 */
export async function authenticateAgent(): Promise<AgentAuthResult> {
  try {
    const headersList = await headers();
    const apiKey = extractApiKey(headersList);

    if (!apiKey) {
      return {
        success: false,
        error: "Missing API key. Provide it via Authorization header or x-api-key header.",
      };
    }

    // 方式一：检查环境变量中的固定 API Key
    const fixedApiKey = process.env.AGENT_API_KEY;
    if (fixedApiKey && apiKey === fixedApiKey) {
      // 检查速率限制
      const rateLimitConfig = getRateLimitConfigFromEnv();
      const rateLimitResult = checkRateLimit(apiKey, rateLimitConfig);

      if (!rateLimitResult.success) {
        return {
          success: false,
          error: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
        };
      }

      // 固定 API Key 使用默认用户或第一个管理员用户
      // 查找默认用户
      const defaultUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!defaultUser) {
        return {
          success: false,
          error: "No user found for fixed API key.",
        };
      }

      // 固定 API Key 拥有所有权限
      return {
        success: true,
        userId: defaultUser.id,
        permissions: [...AVAILABLE_PERMISSIONS] as Permission[],
      };
    }

    // 方式二：查找数据库中的 API Key
    const agentKey = await prisma.agentApiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });

    if (!agentKey) {
      return {
        success: false,
        error: "Invalid API key.",
      };
    }

    // 检查是否启用
    if (!agentKey.isActive) {
      return {
        success: false,
        error: "API key is disabled.",
      };
    }

    // 检查是否过期
    if (agentKey.expiresAt && agentKey.expiresAt < new Date()) {
      return {
        success: false,
        error: "API key has expired.",
      };
    }

    // 检查速率限制
    const rateLimitConfig = getRateLimitConfigFromEnv();
    const rateLimitResult = checkRateLimit(apiKey, rateLimitConfig);

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
      };
    }

    return {
      success: true,
      userId: agentKey.userId,
      permissions: agentKey.permissions as Permission[],
    };
  } catch (error) {
    console.error("Agent authentication error:", error);
    return {
      success: false,
      error: "Authentication failed.",
    };
  }
}

/**
 * 检查权限
 */
export function hasPermission(
  permissions: string[],
  required: Permission | Permission[]
): boolean {
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((perm) => permissions.includes(perm));
}

/**
 * 验证 Agent 并检查权限
 */
export async function authenticateAgentWithPermission(
  required: Permission | Permission[]
): Promise<AgentAuthResult> {
  const authResult = await authenticateAgent();

  if (!authResult.success) {
    return authResult;
  }

  if (!authResult.permissions || !hasPermission(authResult.permissions, required)) {
    return {
      success: false,
      error: `Insufficient permissions. Required: ${Array.isArray(required) ? required.join(", ") : required}`,
    };
  }

  return authResult;
}

/**
 * 生成随机的 API Key
 */
export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = "hqi_";
  const randomBytes = new Uint8Array(32);

  // 使用 crypto.getRandomValues 如果可用
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // 回退方案
    for (let i = 0; i < 32; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const key = Array.from(randomBytes)
    .map((b) => chars[b % chars.length])
    .join("");

  return prefix + key;
}
