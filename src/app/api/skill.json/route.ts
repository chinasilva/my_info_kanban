import { NextResponse } from "next/server";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signal.binaryworks.app";

/**
 * Skill 配置端点
 * 返回 Skill 配置 JSON，让 Agent 能自动获取安装指南
 *
 * 访问方式: GET /api/skill.json
 */
export async function GET() {
  const skillConfig = {
    // Skill 元数据
    name: "signal",
    description: "获取高质量科技/金融信号聚合（来自 HackerNews、GitHub、RSS 等）",
    argumentHint: "<操作>",
    allowedTools: ["WebFetch", "Bash(curl *)"],

    // 安装指南
    installation: {
      description:
        "请将此 Skill 安装到您的 Agent 的 skill 目录中（路径因 Agent 而异，Agent 应自行决定合适的安装位置）",
      // 完整的 SKILL.md 内容
      skillMarkdown: `# Signal Aggregator Skill

通过 curl 调用 MCP JSON-RPC API 获取信号。

## 前提条件

- API Key（访问 ${baseUrl}/agent-setup 生成）
- curl 命令

## 使用方式

### 获取信号列表

\`\`\`bash
curl -s -X POST ${baseUrl}/api/mcp \\
  -H "Authorization: Bearer $SIGNAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_signals","arguments":{}},"id":1}'
\`\`\`

### 搜索信号

\`\`\`bash
curl -s -X POST ${baseUrl}/api/mcp \\
  -H "Authorization: Bearer $SIGNAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_signals","arguments":{"query":"关键词"}},"id":1}'
\`\`\`

### 获取信号详情

\`\`\`bash
curl -s -X POST ${baseUrl}/api/mcp \\
  -H "Authorization: Bearer $SIGNAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_signal_detail","arguments":{"signalId":"信号ID"}},"id":1}'
\`\`\`

### 获取洞察

\`\`\`bash
curl -s -X POST ${baseUrl}/api/mcp \\
  -H "Authorization: Bearer $SIGNAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_insights","arguments":{}},"id":1}'
\`\`\`

### 获取来源列表

\`\`\`bash
curl -s -X POST ${baseUrl}/api/mcp \\
  -H "Authorization: Bearer $SIGNAL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_sources","arguments":{}},"id":1}'
\`\`\`

## 环境变量

| 变量名 | 说明 |
|--------|------|
| \`SIGNAL_API_KEY\` | 访问 ${baseUrl}/agent-setup 生成 |

## 可用工具列表

- \`get_signals\` - 获取信号列表
- \`get_signal_detail\` - 获取信号详情
- \`search_signals\` - 搜索信号
- \`get_sources\` - 获取来源列表
- \`read_article\` - 读取文章内容
- \`get_insights\` - 获取 AI 生成的洞察

## 安装说明

请将此 Skill 安装到您的 Agent 的 skill 目录中（路径因 Agent 而异，Agent 应自行决定合适的安装位置）。
`,
    },

    // API 信息
    api: {
      baseUrl,
      mcpEndpoint: `${baseUrl}/api/mcp`,
      auth: {
        type: "bearer",
        header: "Authorization",
        prefix: "Bearer",
        envVar: "SIGNAL_API_KEY",
      },
    },
  };

  return NextResponse.json(skillConfig, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
