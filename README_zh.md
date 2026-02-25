# High-Signal Aggregator

<p align="center">
  <img src="https://img.shields.io/github/stars/yourusername/high_quality_info" alt="stars">
  <img src="https://img.shields.io/github/license/yourusername/high_quality_info" alt="license">
  <img src="https://img.shields.io/github/issues/yourusername/high_quality_info" alt="issues">
</p>

一个由 AI 驱动的精选新闻与内容聚合平台。High-Signal Aggregator 从各类科技和新闻来源收集信息，使用 AI 进行内容丰富化，为用户提供个性化的高质量信息流。

[English](./README.md) | [中文](./README_zh.md)

## 功能特性

- **多源聚合**：从 HackerNews、GitHub Trending、RSS 订阅源等收集内容
- **AI 驱动丰富化**：使用 LLM 对文章进行摘要、分类和关键信息提取
- **个性化筛选**：自定义源分组（build、market、news、launch、custom）
- **多语言支持**：英文、简体中文、繁体中文
- **播客生成**：使用 AI 将文章转换为播客脚本
- **用户认证**：支持邮箱、Google 和 GitHub OAuth 登录
- **现代 UI**：基于 React 19、Tailwind CSS 4 和 Radix UI 构建

## 技术栈

- **框架**：Next.js 16 (App Router)
- **语言**：TypeScript
- **数据库**：PostgreSQL + Prisma 7
- **认证**：NextAuth.js v4
- **样式**：Tailwind CSS 4 + Radix UI + Framer Motion
- **LLM 提供商**：OpenAI、Gemini、DeepSeek、OpenRouter、智谱、MiniMax
- **缓存**：Redis (ioredis)
- **国际化**：next-intl

## Agent / MCP 集成

支持 **MCP (Model Context Protocol)** 协议，允许外部 AI Agent 直接调用部署网站的功能。

### MCP 端点

| 端点 | 说明 |
|------|------|
| `/.well-known/mcp.json` | Agent 自动发现（MCP Well-Known） |
| `/api/mcp.json` | 工具清单（Manifest） |
| `/api/mcp` | JSON-RPC 入口（实际调用） |
| `/api/agent/keys` | API Key 管理 |
| `/agent-setup` | Agent 设置页面 |

### 可用工具（9个）

| 工具名称 | 说明 |
|---------|------|
| `get_signals` | 获取信号列表，支持按来源类型、时间范围、标签筛选 |
| `get_signal_detail` | 获取单个信号的详细内容 |
| `get_sources` | 获取可用的数据源列表及其订阅状态 |
| `read_article` | AI 读取文章内容，返回摘要或翻译 |
| `mark_as_read` | 标记信号为已读 |
| `favorite_signal` | 收藏或取消收藏信号 |
| `subscribe_source` | 订阅或取消订阅数据源 |
| `search_signals` | 搜索信号（标题、摘要、标签） |
| `get_insights` | 获取每日洞察（趋势分析、因果分析等） |

### 认证方式

通过 `Authorization` Header 传递 Bearer Token：

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-domain.com/api/mcp
```

### Claude Desktop 配置示例

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "high-quality-info": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

详细配置请访问 [/agent-setup](/agent-setup) 页面。

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 数据库
- Redis（可选，用于缓存）
- 至少一个 LLM API 密钥（OpenAI、Gemini 等）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/high_quality_info.git
cd high_quality_info

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件填入你的配置

# 初始化数据库
npx prisma db push
npm run db:seed

# 启动开发服务器
npm run dev
```

### 环境变量

创建 `.env` 文件，包含以下变量：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/high_quality_info"

# 认证 (NextAuth)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth（可选）
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET="

# LLM 提供商
LLM_PROVIDER="openai"
OPENAI_API_KEY=""

# Redis（可选）
REDIS_URL="redis://localhost:6379"
```

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API 路由
│   └── [locale]/       # 国际化页面
├── components/         # React 组件
├── lib/
│   ├── scraper/        # 数据源爬虫
│   ├── llm/            # LLM 集成
│   └── auth/           # 认证模块
└── schemas/            # Zod 验证模式
```

## 可用脚本

```bash
npm run dev             # 启动开发服务器
npm run build           # 构建生产版本
npm run start           # 启动生产服务器
npm run lint            # 运行 ESLint
npx prisma studio       # 打开 Prisma 数据库管理界面
```

## 部署

### Vercel（推荐）

1. Fork 此仓库
2. 导入到 Vercel
3. 配置环境变量
4. 部署

### Docker

```bash
docker build -t high-signal-aggregator .
docker run -p 3000:3000 high-signal-aggregator
```

## 贡献

欢迎提交贡献！请随时提交 Pull Request。

1. Fork 此仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [NextAuth.js](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)
