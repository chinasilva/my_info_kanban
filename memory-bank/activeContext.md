# Active Context

## 当前阶段: 规范化与收尾 (Standardization & Cleanup)

项目已完成核心功能开发（多用户、自定义源、LLM 增强），目前正处于引入**标准化 AI 开发流程**的阶段。

## 最近变更
- **Feature**: 实现免登录浏览 (Guest Mode)，允许访客查看系统内置源。
- **Feature**: 实现繁体中文内容自动转换 (OpenCC)，支持 `/tw` 环境下标题/摘要/标签的简繁转换。
- **Database**: 迁移至 Supabase (PostgreSQL)，修复 Prisma 连接问题。
- **Feature**: 完成了双语摘要和标签的 display。
- **Workflow**: 引入了 `web_build_standard` 和 `spec-driven-dev` 规范。

## 当前任务 (Active Tasks)
1.  [x] 创建 `skills/` 目录并注入核心技能文档。
2.  [x] 初始化 `memory-bank/` 结构 (当前步骤)。
3.  [x] 实现免登录浏览功能 (Public Browse)。
4.  [x] 实现繁体中文内容支持 (Traditional Chinese Content Support)。
5.  [ ] 建立 `src/schemas/` 目录并开始迁移现有类型定义 (Zod-ification)。
5.  [ ] 验证多用户数据隔离 (待测试)。

## 下一步计划
- 开始使用 `spec-driven-dev` 流程处理剩余的 "Future" 任务 (如 Apple 登录)。
