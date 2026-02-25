import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * MCP Well-Known 端点
 * 符合 MCP 规范的自动发现端点
 *
 * 当 Agent 访问网站时，会自动查询 /.well-known/mcp.json
 * 来发现网站是否支持 MCP 服务
 *
 * 访问方式: GET /.well-known/mcp.json
 *
 * 注意: 这是 MCP 服务器，不是 Signal 消息应用
 */
export async function GET() {
  // 返回 MCP 服务发现信息
  const discovery = {
    // 明确标识这是 MCP 服务器
    mcp: "server",

    // MCP 规范要求的基本信息
    name: "High Quality Info Aggregator",
    version: "1.0.0",
    description:
      "MCP Server for high-quality tech/news signal aggregation - 使用 AI 从多个来源聚合高质量技术新闻和信号",

    // MCP 服务器地址
    url: "/api/mcp",

    // 支持的协议版本
    protocolVersion: "2024-11-05",

    // 认证方式
    auth: {
      type: "bearer",
      header: "Authorization",
      alternativeHeader: "x-api-key",
    },

    // 能力说明
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },

    // 工具列表的 Manifest 地址
    manifest: "/api/mcp.json",

    // 使用说明
    usage: {
      authentication:
        "需要通过 Authorization header 传递 API Key，例如: Authorization: Bearer YOUR_API_KEY",
      getTools:
        "访问 /api/mcp.json 获取可用工具列表",
      callTool: "通过 POST /api/mcp 调用工具",
    },

    // 文档地址
    documentation: "https://signal.binaryworks.app/agent-setup",
  };

  return NextResponse.json(discovery, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      // 明确标识这是 MCP 服务器
      "X-MCP-Server": "high-quality-info",
      "X-MCP-Version": "2024-11-05",
    },
  });
}
