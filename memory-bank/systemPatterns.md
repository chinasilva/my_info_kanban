# System Patterns (Architecture)

## 技术栈 (Tech Stack)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS.
- **Backend**: Next.js Server Actions, NextAuth.js (v5).
- **Database**: PostgreSQL (Supabase), Prisma ORM.
- **AI/LLM**: 集成 LLM 接口进行数据处理 (Summary/Translation).

## 核心架构模式
1.  **Server Components 优先**:
    - 默认使用 RSC 进行数据获取和页面渲染。
    - Client Components (`'use client'`) 仅用于交互组件 (如 `SignalCard` 的 hover 效果, 表单)。

2.  **Schema-Driven Development (SDD)**:
    - **Zod First**: 所有数据交互（API 输入/输出、组件 Props）必须优先定义 Zod Schema。
    - 数据模型定义在 `prisma/schema.prisma`，应用层验证在 `src/schemas/`。

3.  **多用户数据隔离**:
    - 利用 `UserSource` 和 `UserSignal` 中间表实现数据源和状态的个性化。
    - 查询时必须带上 `userId` 过滤条件。

4.  **标准化工作流**:
    - 遵循 `skills/spec-driven-dev.md` (Spec -> Plan -> Task -> Implement)。
    - 遵循 `skills/react-best-practices.md` 进行代码编写。

## 目录结构规范
- `src/app`: 路由与页面。
- `src/components`: UI 组件 (优先复用，Shadcn 风格)。
- `src/lib`: 工具函数与核心逻辑 (e.g., `scraper`, `llm`).
- `src/schemas`: Zod Schema 定义目录。
- `prisma`: 数据库 Schema 与迁移文件。
- `skills`: AI Agent 行为准则。
