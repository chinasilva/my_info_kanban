import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Agent Info Endpoint - 专门给 AI Agent 访问的静态端点
 *
 * 当 AI Agent 访问网站时，应该查询此端点来了解如何集成 MCP 服务
 * 这个端点返回纯静态 HTML，无需 JavaScript 渲染
 *
 * 访问方式: GET /api/agent-info
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>High-Signal Aggregator - MCP Server for AI Agents</title>
  <meta name="description" content="MCP Server for AI Agents - Aggregate high-quality tech and finance signals from HackerNews, GitHub, RSS, and more.">

  <!-- MCP Discovery -->
  <link rel="alternate" type="application/json" href="/api/mcp.json">
  <meta name="mcp-server" content="/api/mcp">
  <meta name="mcp-discovery" content="/.well-known/mcp.json">
  <meta name="mcp-name" content="High Quality Info Aggregator">
  <meta name="mcp-version" content="1.0.0">
  <meta name="mcp-purpose" content="AI Agent integration for tech/news signal aggregation">

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
    h1 { color: #60a5fa; }
    h2 { color: #a78bfa; margin-top: 30px; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; padding: 15px; border-radius: 8px; overflow-x: auto; }
    .endpoint { background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .badge { display: inline-block; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 8px; }
    .warning { background: #fef3c7; color: #92400e; padding: 10px; border-radius: 4px; margin: 10px 0; }
    a { color: #60a5fa; }
  </style>
</head>
<body>
  <span class="badge">MCP Server</span>
  <span class="badge">AI Agent Ready</span>

  <h1>High-Signal Aggregator</h1>
  <p><strong>这是一个 MCP 服务器，不是 Signal 消息应用。</strong></p>

  <div class="warning">
    <strong>注意：</strong>此网站是 MCP (Model Context Protocol) 服务器，用于 AI Agent 集成。<br>
    如果你是 AI Agent，请访问下方的 MCP 端点来获取服务信息。
  </div>

  <h2>快速开始</h2>
  <pre><code># 1. 获取 MCP 服务器信息
curl https://signal.binaryworks.app/.well-known/mcp.json

# 2. 获取可用工具列表
curl https://signal.binaryworks.app/api/mcp.json

# 3. 使用 MCP 协议调用工具
# 参考文档: https://signal.binaryworks.app/agent-setup</code></pre>

  <h2>MCP 端点</h2>
  <div class="endpoint">
    <strong>.well-known/mcp.json</strong> - MCP 自动发现端点<br>
    <a href="/.well-known/mcp.json">/.well-known/mcp.json</a>
  </div>
  <div class="endpoint">
    <strong>api/mcp.json</strong> - 工具清单 Manifest<br>
    <a href="/api/mcp.json">/api/mcp.json</a>
  </div>
  <div class="endpoint">
    <strong>api/mcp</strong> - MCP 协议端点 (JSON-RPC)<br>
    <code>POST /api/mcp</code> with Authorization header
  </div>

  <h2>可用工具</h2>
  <ul>
    <li><code>get_signals</code> - 获取信号列表（支持按来源、时间、标签筛选）</li>
    <li><code>get_signal_detail</code> - 获取单个信号的详细内容</li>
    <li><code>get_sources</code> - 获取可用数据源列表</li>
    <li><code>read_article</code> - AI 读取文章，返回摘要或翻译</li>
    <li><code>search_signals</code> - 搜索信号</li>
    <li><code>get_insights</code> - 获取每日洞察</li>
    <li><code>mark_as_read</code> - 标记信号为已读</li>
    <li><code>favorite_signal</code> - 收藏信号</li>
    <li><code>subscribe_source</code> - 订阅数据源</li>
  </ul>

  <h2>认证方式</h2>
  <pre><code>Authorization: Bearer YOUR_API_KEY</code></pre>
  <p>获取 API Key: <a href="https://signal.binaryworks.app/agent-setup">https://signal.binaryworks.app/agent-setup</a></p>

  <h2>数据来源</h2>
  <ul>
    <li>HackerNews - 技术新闻</li>
    <li>GitHub Trending - 开源项目</li>
    <li>Product Hunt - 产品发布</li>
    <li>RSS Feeds - 自定义订阅</li>
    <li>Polymarket - 市场预测</li>
    <li>以及更多...</li>
  </ul>

  <hr>
  <p><small>这是静态 HTML 页面，专为 AI Agent 设计。无需 JavaScript 渲染。</small></p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
