import { NextResponse } from "next/server";
import { getToolDefinitions } from "@/lib/agent/tools";

export const runtime = "nodejs";

/**
 * MCP Manifest 端点
 * 返回符合 MCP 规范的 Manifest，让 Agent 能自动发现可用工具
 *
 * 访问方式: GET /api/mcp.json
 */
export async function GET() {
  const tools = getToolDefinitions();

  // 构建 MCP Manifest
  const manifest = {
    schemaVersion: "v1",
    name: "high-quality-info",
    version: "1.0.0",
    description: "AI News Aggregator - 高质量信息聚合器",
    attribution: "https://signal.binaryworks.app",
    capabilities: {
      tools: {
        listChanged: true,
      },
    },
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
    // 额外的元数据
    _metadata: {
      mcpServerUrl: "/api/mcp",
      authentication: {
        type: "api-key",
        header: "Authorization",
        prefix: "Bearer",
      },
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
