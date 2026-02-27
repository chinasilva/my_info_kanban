# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Preference

**Always respond in Chinese (Simplified Chinese - 简体中文) unless the user explicitly requests otherwise.**

## Common Commands

```bash
# Development
npm run dev                    # Start dev server on 0.0.0.0:3000

# Build & Production
npm run build                  # Generate Prisma client and build Next.js app
npm run start                 # Start production server

# Database
npx prisma db push            # Push schema changes to database
npx prisma migrate dev        # Create and apply migrations
npm run db:seed               # Seed the database

# Linting
npm run lint                  # Run ESLint
```

## Project Overview

This is a **Next.js 16** application - a curated news/content aggregation platform called "High-Signal Aggregator". It collects signals from various tech/news sources and uses AI for content enrichment.

## Architecture

### Tech Stack
- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma 7
- **Auth:** NextAuth.js v4 (Credentials, Google, GitHub OAuth)
- **i18n:** next-intl (locales: en, zh, tw)
- **LLM Providers:** OpenAI, Gemini, DeepSeek, OpenRouter, Zhipu, MiniMax
- **Caching:** Redis (ioredis)
- **UI:** React 19, Tailwind CSS 4, Radix UI, Framer Motion

### Source Code Structure

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js App Router - pages, layouts, API routes |
| `src/components/` | React components |
| `src/lib/` | Core libraries (scrapers, LLM, auth, cache) |
| `src/lib/scraper/` | Data source scrapers (HackerNews, GitHub, RSS, etc.) |
| `src/lib/llm/` | LLM factory and providers |
| `src/schemas/` | Zod validation schemas |

### API Routes

Key endpoints in `src/app/api/`:
- `/api/auth/[...nextauth]` - Authentication handler
- `/api/signals` - Get signals with filtering
- `/api/sources` - Source management
- `/api/ai/read` - AI content reading (streaming)
- `/api/cron/fetch` - Trigger data fetching
- `/api/podcast/` - Podcast script generation

### LLM Integration

The LLM system uses a factory pattern in `src/lib/llm/factory.ts`. Configure via environment variables:
- `LLM_PROVIDER` - Choose provider (openai, gemini, deepseek, openrouter, zhipu, minimax)
- Provider-specific API keys in `.env`

### Scrapers

Located in `src/lib/scraper/`. Each scraper extends a base class and handles a specific source (HackerNews, GitHub Trending, RSS feeds, etc.). The runner (`src/lib/scraper/runner.ts`) orchestrates fetching from all active sources.

### Database Models (Prisma)

Key models: `User`, `Source`, `Signal`, `UserSignal`, `Insight`, `AICache`

## Conventions

- **API Validation:** Use Zod schemas in `src/schemas/`
- **Authentication:** Session-based for users, API Key for terminal/testing
- **Pagination:** Cursor-based for signals
- **Source Grouping:** build, market, news, launch, custom
- **i18n:** Translation files in `messages/` directory

## Code Submission Workflow

所有代码更改必须遵循以下流程：**创建分支 → 提交代码 → 创建 PR → Merge**

### 提交流程

```bash
# 1. 创建新分支（从 main 分支）
git checkout -b feat/功能名称
# 或 fix/修复名称

# 2. 提交代码
git add 文件路径
git commit -m "feat: 添加新功能" 或 "fix: 修复问题"

# 3. 推送分支到远程
git push -u origin feat/功能名称

# 4. 创建 Pull Request（使用 gh CLI）
gh pr create --title "feat: 功能名称" --body "描述..."
# 或访问 GitHub 创建：https://github.com/chinasilva/my_info_kanban/pull/new/分支名

# 5. Code Review 通过后 Merge PR
# 在 GitHub UI 上点击 "Merge pull request"
```

### 分支命名规范

- `feat/` - 新功能（如 `feat/demand-signal-validation`）
- `fix/` - Bug 修复（如 `fix/scraper-errors`）
- `chore/` - 日常维护（如 `chore/update-deps`）

### 提交信息规范

```
feat: 添加新功能
fix: 修复问题
chore: 更新依赖
refactor: 重构代码
docs: 更新文档
```

### 注意事项

- **禁止直接在 main 分支提交代码**
- **所有更改必须通过 PR 合并**
- **PR 需要 Code Review 通过后才能 Merge**
- **提交前确保 ESLint 和 TypeScript 检查通过**
