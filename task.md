# 多用户扩展改造任务

## 阶段一：基础设施 (Core)

- [x] 数据库迁移 SQLite → PostgreSQL (Supabase)
  - [x] 修改 `schema.prisma` 使用 PostgreSQL
  - [x] 修复 Prisma 7 连接 Supabase 问题
    - [x] 配置 `prisma.config.ts`
    - [x] 解决端口 6543 的连接及 prepared statement 冲突
    - [x] 成功运行 `db push` 和 `db seed`
- [x] 初始化内置数据源
- [x] 排查登录后看板内容为空的问题
    - [x] 确认数据库中存在信号和订阅记录
    - [x] 添加调试日志到 `DashboardPage`
    - [x] 分析日志定位查询或分组逻辑问题 (已确认数据存在，修复序列化问题)
- [ ] 验证多用户数据隔离
- [x] 数据模型扩展
  - [x] User 模型 (NextAuth 需要)
  - [x] Account 模型 (OAuth)
  - [x] Session 模型
  - [x] UserSource 模型 (用户订阅)
  - [x] UserSignal 模型 (用户状态)
  - [x] 改造 Source 模型
  - [x] 改造 Signal 模型 (关联 sourceId)

- [x] NextAuth 集成
  - [x] 安装 next-auth 依赖
  - [x] 配置 Credentials Provider (邮箱密码)
  - [x] 配置 Google Provider
  - [x] 配置 GitHub Provider
  - [x] 创建登录/注册页面

- [x] 用户订阅逻辑
  - [x] API: 获取数据源列表
  - [x] API: 订阅/取消订阅数据源
  - [x] 数据源管理 UI

- [x] 看板改造
  - [x] 按用户订阅过滤
  - [x] 用户状态隔离 (已读/收藏)
  - [x] API: 标记已读
  - [x] API: 收藏

## 阶段二：自定义数据源 (Extensibility)

- [x] RSS 解析器改造
  - [x] 通用 RSS Scraper 支持动态 URL
  - [x] 验证 RSS 有效性

- [x] 数据源管理 UI
  - [x] 添加 RSS 源表单
  - [x] 源列表展示

- [x] 抓取任务改造
  - [x] ScraperRunner 从数据库读取活跃源
  - [x] 支持动态数据源列表
  - [x] 源共享机制 (用户添加的源对全团队可见)

## 阶段二-扩充：LLM 增强 (AI Enhancement)

- [x] 数据库扩展 (Dual Language)
  - [x] Schema: 添加 `tags`, `aiSummary`, `titleTranslated`
  - [x] Schema: 添加 `tagsZh`
  - [x] Schema: 添加 `aiSummaryZh`
  - [x] Migration: `db push`
- [x] LLM 服务改造 (Bilingual)
  - [x] 类型定义更新 (`ProcessingResult`)
  - [x] Prompt & Processor: 标签 (Tags/TagsZh)
  - [x] Prompt & Processor: 摘要 (AI Summary/AI Summary ZH)
- [x] UI 展示 (Interactive & Bilingual)
  - [x] SignalCard: 基础 Locale 传递
  - [x] SignalCard: 双语标题展示 (Original + Translated)
  - [x] SignalCard: 双语摘要展示 (Original + Translated)
  - [x] SignalCard: Hover 交互显示完整摘要
  - [x] SignalCard: 显示标签 (Tags)
- [x] 功能验证
  - [x] 运行 `analyze` 任务
  - [x] 验证 Dashboard 展示

## 阶段三 (未来)

- [ ] Apple 登录
- [ ] 微信扫码登录

---

## 阶段四：移动端响应式设计 (Mobile Responsive)

> 参考规格: `.gemini/antigravity/brain/917070b4-821f-436b-b442-9b05cf86c07c/SPEC.md`

### 核心改造

- [x] 创建 `useMediaQuery` Hook (屏幕宽度检测)
- [x] 添加移动端 CSS 响应式样式 (`globals.css`)
- [x] 创建 `MobileTabBar` 组件 (底部 Tab 导航)
- [x] 创建 `MobileHeader` 组件 (简化版 Header)
- [x] 创建 `MobileSignalList` 组件 (下拉刷新单列列表)
- [x] 改造 `page.tsx` 条件渲染 (`DashboardShell` 组件)
- [x] 优化 `SignalCard.tsx` 触摸体验 (CSS touch 优化)

### 验证

- [/] Chrome DevTools 移动端模拟测试
- [ ] 桌面端回归测试 (确保布局不受影响)
- [ ] 真机测试 (可选)

---

## 剩余步骤 (需要用户操作)

1. 安装依赖: `npm install`
2. 创建 Supabase 项目并配置 `.env`
3. 推送数据库: `npm run db:push`
4. 运行种子脚本: `npm run db:seed`
5. 启动开发服务器: `npm run dev`
