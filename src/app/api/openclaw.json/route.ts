import { NextResponse } from "next/server";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signal.binaryworks.app";

/**
 * OpenClaw 配置端点
 * 返回 OpenClaw 专用配置，告诉 OpenClaw 如何通过 exec+curl 调用 API
 *
 * 访问方式: GET /api/openclaw.json
 */
export async function GET() {
  const openclawConfig = {
    // Agent 元数据
    name: "openclaw-signal",
    description: "获取高质量科技/金融信号聚合（来自 HackerNews、GitHub、RSS 等）",
    agentType: "openclaw",

    // OpenClaw 专用配置 - 通过 exec 执行 bash 命令
    execConfig: {
      shell: "/bin/bash",
      allowedCommands: ["curl", "echo"],
      envVars: ["SIGNAL_API_KEY"],
    },

    // 安装指南 - 告诉 OpenClaw 如何调用
    installation: {
      description:
        "此配置告诉 OpenClaw 如何通过 exec 指令执行 curl 命令来调用 Signal Aggregator API",
      setup: `# OpenClaw Signal Aggregator 配置

## 前提条件

1. 访问 ${baseUrl}/agent-setup 生成 API Key
2. 将生成的 API Key 设置为环境变量 \`SIGNAL_API_KEY\`

## API 调用方式

OpenClaw 使用 \`exec\` 指令执行 bash 命令来调用 API。

### 获取信号列表

\`\`\`bash
curl -s -X GET "${baseUrl}/api/signals?limit=10" \
  -H "Authorization: Bearer $SIGNAL_API_KEY" \
  -H "Content-Type: application/json"
\`\`\`

### 搜索信号

\`\`\`bash
curl -s -X GET "${baseUrl}/api/signals?tag=AI" \
  -H "Authorization: Bearer $SIGNAL_API_KEY" \
  -H "Content-Type: application/json"
\`\`\`

### 获取数据源列表

\`\`\`bash
curl -s -X GET "${baseUrl}/api/sources" \
  -H "Authorization: Bearer $SIGNAL_API_KEY" \
  -H "Content-Type: application/json"
\`\`\`

### 触发数据抓取

\`\`\`bash
curl -s -X GET "${baseUrl}/api/cron/fetch" \
  -H "Authorization: Bearer $SIGNAL_API_KEY"
\`\`\`

### 获取单个信号详情

信号ID格式为数据库中的 UUID，可在获取信号列表时从返回结果中获取：

\`\`\`bash
curl -s -X GET "${baseUrl}/api/signals?limit=1" \
  -H "Authorization: Bearer $SIGNAL_API_KEY" \
  -H "Content-Type: application/json"
\`\`\`

### 标记信号为已读

\`\`\`bash
curl -s -X POST "${baseUrl}/api/signals/SIGNAL_ID/read" \
  -H "Authorization: Bearer $SIGNAL_API_KEY" \
  -H "Content-Type: application/json"
\`\`\`

## 环境变量

| 变量名 | 说明 |
|--------|------|
| \`SIGNAL_API_KEY\` | 访问 ${baseUrl}/agent-setup 生成 |

## API 参数说明

### /api/signals 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| \`limit\` | number | 50 | 返回数量 (1-100) |
| \`cursor\` | string | - | 分页游标 |
| \`sourceType\` | string | - | 来源类型: build, market, news, launch, custom |
| \`tag\` | string | - | 标签筛选 |
| \`sourceId\` | string | - | 指定数据源ID |
| \`date\` | string | - | 特定日期 (YYYY-MM-DD) |
| \`days\` | number | 7 | 最近N天 (1-365) |

## 示例调用流程

1. **获取最新信号**: 使用 /api/signals?days=1&limit=10
2. **按类型筛选**: 使用 /api/signals?sourceType=build&days=7
3. **搜索关键词**: 使用 /api/signals?tag=AI

## 注意事项

- 所有需要认证的API调用都需要在 Header 中添加 \`Authorization: Bearer $SIGNAL_API_KEY\`
- 建议先调用 /api/sources 获取可用数据源列表
- 使用 days 参数限制时间范围可减少返回数据量
`,
    },

    // API 信息
    api: {
      baseUrl,
      endpoints: {
        signals: `${baseUrl}/api/signals`,
        sources: `${baseUrl}/api/sources`,
        cronFetch: `${baseUrl}/api/cron/fetch`,
      },
      auth: {
        type: "bearer",
        header: "Authorization",
        prefix: "Bearer",
        envVar: "SIGNAL_API_KEY",
      },
    },
  };

  return NextResponse.json(openclawConfig, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
