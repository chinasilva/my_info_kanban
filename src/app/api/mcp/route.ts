import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAgentWithPermission,
  type Permission,
} from "@/lib/auth/agent";
import { mcpTools, getToolDefinitions } from "@/lib/agent/tools";

export const runtime = "nodejs";

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
 */
async function handleMCPRequest(
  request: MCPRequest,
  userId: string
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
        if (requiredPerms) {
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
 * POST - 处理 MCP JSON-RPC 请求
 */
export async function POST(request: NextRequest) {
  // 验证 Agent
  const authResult = await authenticateAgentWithPermission([
    "read:signals",
    "read:sources",
  ]);

  if (!authResult.success || !authResult.userId) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: authResult.error || "Unauthorized",
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const mcpRequest: MCPRequest = body;

    // 支持批量请求
    if (Array.isArray(mcpRequest)) {
      const results = await Promise.all(
        mcpRequest.map((req) => handleMCPRequest(req, authResult.userId!))
      );
      return NextResponse.json(results);
    }

    const response = await handleMCPRequest(mcpRequest, authResult.userId);
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
