import { NextResponse } from "next/server";
import { getToolDefinitions } from "@/lib/agent/tools";

export const runtime = "nodejs";

/**
 * MCP Manifest 端点
 * 返回符合 MCP 规范的 Manifest，让 Agent 能自动发现可用工具
 *
 * 访问方式: GET /api/mcp.json
 *
 * 注意: 这是 MCP 服务器的工具定义，用于 AI Agent 集成
 */
export async function GET() {
  const tools = getToolDefinitions();

  // 构建 MCP Manifest
  const manifest = {
    schemaVersion: "v1",
    name: "High Quality Info Aggregator",
    version: "1.0.0",
    description:
      "MCP Server - 使用 AI 从 HackerNews、GitHub、RSS 等多个来源聚合高质量技术新闻和信号",
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
      setup: "访问 https://signal.binaryworks.app/agent-setup 获取 API Key",
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      // MCP 元数据响应头
      "X-MCP-Server": "high-quality-info",
      "X-MCP-Version": "2024-11-05",
    },
  });
}
