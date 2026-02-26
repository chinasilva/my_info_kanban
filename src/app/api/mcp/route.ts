import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAgentWithPermission,
  type Permission,
} from "@/lib/auth/agent";
import { mcpTools, getToolDefinitions } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * MCP JSON-RPC 消息类型
 */
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP 错误码
 */
const MCP_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * 处理 MCP 请求
 * @param request MCP请求
 * @param userId 用户ID，"anonymous"表示未认证
 * @param isPreAuthenticated 是否已在POST层验证过认证
 */
async function handleMCPRequest(
  request: MCPRequest,
  userId: string,
  isPreAuthenticated: boolean = false
): Promise<MCPResponse> {
  const { method, params, id } = request;

  try {
    // 处理 methods
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "high-quality-info",
              version: "1.0.0",
            },
          },
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: getToolDefinitions(),
          },
        };

      case "tools/call": {
        const { name, arguments: args } = params || {};

        if (!name) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: MCP_ERRORS.INVALID_PARAMS,
              message: "Missing tool name",
            },
          };
        }

        const tool = mcpTools.find((t) => t.name === name);
        if (!tool) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: MCP_ERRORS.METHOD_NOT_FOUND,
              message: `Tool '${name}' not found`,
            },
          };
        }

        // 检查权限
        const permissionMap: Record<string, Permission[]> = {
          get_signals: ["read:signals"],
          get_signal_detail: ["read:signals"],
          get_sources: ["read:sources"],
          read_article: ["read:article"],
          mark_as_read: ["write:signals"],
          favorite_signal: ["write:signals"],
          subscribe_source: ["write:sources"],
          search_signals: ["read:signals"],
          get_insights: ["read:insights"],
        };

        const requiredPerms = permissionMap[name];
        // 只有在未预认证时才检查权限（已认证的用户在POST层已验证）
        if (requiredPerms && !isPreAuthenticated) {
          const authResult = await authenticateAgentWithPermission(requiredPerms);
          if (!authResult.success) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32000,
                message: authResult.error || "Permission denied",
              },
            };
          }
        }

        try {
          const result = await tool.handler(args || {}, userId);
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            },
          };
        } catch (toolError: any) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: MCP_ERRORS.INTERNAL_ERROR,
              message: toolError.message || "Tool execution failed",
            },
          };
        }
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: MCP_ERRORS.METHOD_NOT_FOUND,
            message: `Method '${method}' not found`,
          },
        };
    }
  } catch (error: any) {
    return {
      jsonrpc: "2.0",
      id: id || "unknown",
      error: {
        code: MCP_ERRORS.INTERNAL_ERROR,
        message: error.message || "Internal error",
      },
    };
  }
}

/**
 * 允许无认证的MCP方法
 * Agent需要先调用initialize和tools/list来发现可用工具
 */
const PUBLIC_METHODS = ["initialize", "tools/list"];

/**
 * POST - 处理 MCP JSON-RPC 请求
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    const body = await request.json();
    const mcpRequest: MCPRequest = body;
    const method = mcpRequest.method;

    // 只有公共方法（initialize, tools/list）允许无认证调用
    // 其他方法需要认证
    if (!PUBLIC_METHODS.includes(method)) {
      const authResult = await authenticateAgentWithPermission([
        "read:signals",
        "read:sources",
      ]);

      if (!authResult.success || !authResult.userId) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: mcpRequest.id,
            error: {
              code: -32001,
              message: authResult.error || "Unauthorized",
            },
          },
          { status: 401 }
        );
      }
      userId = authResult.userId;
    }

    // 支持批量请求
    if (Array.isArray(mcpRequest)) {
      // 批量请求时，逐个处理认证
      const results = await Promise.all(
        mcpRequest.map(async (req) => {
          const reqMethod = req.method;
          let reqUserId = userId;

          if (!PUBLIC_METHODS.includes(reqMethod) && !reqUserId) {
            const authResult = await authenticateAgentWithPermission([
              "read:signals",
              "read:sources",
            ]);
            if (!authResult.success || !authResult.userId) {
              return {
                jsonrpc: "2.0",
                id: req.id,
                error: {
                  code: -32001,
                  message: authResult.error || "Unauthorized",
                },
              };
            }
            reqUserId = authResult.userId;
          }

          // 标记是否已认证
          const isPreAuth = !PUBLIC_METHODS.includes(reqMethod) && !!reqUserId;
          return handleMCPRequest(req, reqUserId || "anonymous", isPreAuth);
        })
      );
      return NextResponse.json(results);
    }

    // 标记是否已认证
    const isPreAuthenticated = !PUBLIC_METHODS.includes(method) && !!userId;
    const response = await handleMCPRequest(mcpRequest, userId || "anonymous", isPreAuthenticated);
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: MCP_ERRORS.PARSE_ERROR,
          message: error.message || "Invalid JSON",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * GET - 返回 MCP 服务信息 (用于健康检查)
 */
export async function GET() {
  // 尝试认证但不强制要求（用于检查服务是否可用）
  const authResult = await authenticateAgentWithPermission(["read:signals"]);

  return NextResponse.json({
    name: "high-quality-info MCP Server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    authenticated: authResult.success,
    tools: getToolDefinitions().map((t) => t.name),
  });
}
