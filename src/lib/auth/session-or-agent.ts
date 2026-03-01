import { getSessionOrTestAuth } from "@/lib/auth/test-auth";
import {
  authenticateAgent,
  authenticateAgentWithPermission,
} from "@/lib/auth/agent";
import type { Permission } from "@/lib/auth/permissions";

export interface RequestAuthResult {
  success: boolean;
  userId?: string;
  source?: "agent" | "session" | "guest";
  error?: string;
  status?: number;
}

interface RequestAuthOptions {
  requiredPermissions?: Permission[];
  allowGuest?: boolean;
}

function hasTestCredentials(request: Request): boolean {
  const testApiKeyHeader = request.headers.get("x-test-api-key");
  const apiKeyHeader = request.headers.get("x-api-key");
  const testApiKey = process.env.TEST_API_KEY;

  if (testApiKeyHeader) {
    return true;
  }

  // Backward compatible test mode using x-api-key + TEST_API_KEY
  return Boolean(testApiKey && apiKeyHeader && apiKeyHeader === testApiKey);
}

function hasAgentCredentials(request: Request): boolean {
  return Boolean(
    request.headers.get("authorization") || request.headers.get("x-api-key")
  );
}

export async function getSessionOrAgentAuth(
  request: Request,
  options: RequestAuthOptions = {}
): Promise<RequestAuthResult> {
  const { requiredPermissions = [], allowGuest = false } = options;

  if (hasTestCredentials(request)) {
    const session = await getSessionOrTestAuth(request);
    if (session?.user?.id) {
      return {
        success: true,
        userId: session.user.id,
        source: "session",
      };
    }
  }

  const hasCredentials = hasAgentCredentials(request);

  if (hasCredentials) {
    const authResult =
      requiredPermissions.length > 0
        ? await authenticateAgentWithPermission(requiredPermissions)
        : await authenticateAgent();

    if (!authResult.success || !authResult.userId) {
      return {
        success: false,
        error: authResult.error || "Unauthorized",
        status: 401,
      };
    }

    return {
      success: true,
      userId: authResult.userId,
      source: "agent",
    };
  }

  const session = await getSessionOrTestAuth(request);
  if (session?.user?.id) {
    return {
      success: true,
      userId: session.user.id,
      source: "session",
    };
  }

  if (allowGuest) {
    return {
      success: true,
      source: "guest",
    };
  }

  return {
    success: false,
    error: "Unauthorized",
    status: 401,
  };
}
