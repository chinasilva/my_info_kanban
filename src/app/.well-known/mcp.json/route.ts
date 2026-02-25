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
 */
export async function GET() {
  // 返回 MCP 服务发现信息
  const discovery = {
    // MCP 规范要求的基本信息
    name: "high-quality-info",
    version: "1.0.0",
    description: "AI News Aggregator - 高质量信息聚合器",

    // MCP 服务器地址
    url: "https://signal.binaryworks.app/api/mcp",

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
    manifest: "https://signal.binaryworks.app/api/mcp.json",

    // 文档地址
    documentation: "https://signal.binaryworks.app/agent-setup",
  };

  return NextResponse.json(discovery, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      // 明确告知这是 JSON 格式
      "Content-Type": "application/json",
    },
  });
}
