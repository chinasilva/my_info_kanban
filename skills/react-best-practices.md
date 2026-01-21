---
name: react-best-practices
description: 适用于 React 和 Next.js 项目的核心开发规范与性能优化准则。
version: 1.0.0
---

# React & Next.js Best Practices

当编写 React 或 Next.js 代码时，必须严格遵守以下规范，以防止架构漂移（Architecture Drift）并确保应用性能。

## 1. 核心架构原则 (Core Architecture)

### [强制] 默认使用 Server Components
- **规则**: 在 `app/` 目录下，组件默认应为 Server Component。
- **反模式**: 不要在文件顶部随意添加 `'use client'`，除非组件确实需要使用 `useState`, `useEffect` 或浏览器事件。
- **理由**: Server Components 减少客户端 Bundle 体积，提升首屏加载速度 (FCP)。

### [强制] 消除数据获取瀑布流 (Eliminate Waterfalls)
- **规则**: 避免在父子组件中串行 await 数据。使用 `Promise.all` 并行获取，或在尽可能高的层级预加载数据。
- **代码示例**:
  ```tsx
  // ✅ Correct
  const [userData, posts] = await Promise.all([
    getUser(userId),
    getPosts(userId)
  ]);
  
  // ❌ Incorrect
  const userData = await getUser(userId);
  const posts = await getPosts(userId); // Waits for user data
  ```

### [建议] 使用 Suspense 实现流式渲染
- **规则**: 将耗时的数据获取组件包裹在 `<Suspense>` 中，避免阻塞整个页面渲染。

## 2. 状态管理 (State Management)

### [强制] 优先使用 URL 作为状态源
- **规则**: 对于筛选、分页、搜索等状态，必须同步到 URL Search Params，而不是仅保存在 `useState` 中。
- **理由**: 确保页面可分享、可刷新（Deep Linking）。

### [强制] 二次封装 Server Actions
- **规则**: 不要在 Client Component 中直接调用 Server Actions。应在 `actions.ts` 中定义，并确保包含 `try/catch` 错误处理和输入验证（Zod）。

## 3. 性能优化 (Performance)

### [强制] 图像优化
- **规则**: 必须使用 `next/image` 替代原生 `<img>` 标签。
- **规则**: 必须为图片设置明确的 `width` 和 `height`，或使用 `fill` 配合父容器。

### [强制] 依赖抖动 (Prop Drilling)
- **规则**: 超过 3 层传递 Props 时，考虑使用 Composition（组合模式）或 Context。但不要滥用 Context，优先考虑组合。

## 4. 代码风格 (Code Style)

### [强制] 组件命名
- **规则**: 文件名使用 kebab-case (e.g., `user-profile.tsx`)，组件名使用 PascalCase (e.g., `UserProfile`)。
- **理由**: 统一文件系统结构，避免大小写敏感的 OS 问题。

### [强制] 导包顺序
1. React/Next.js 内置库
2. 第三方库 (lucide-react, zod)
3. 内部组件 (@/components/...)
4. 内部工具/Types (@/lib/..., @/types/...)
5. 样式/CSS
