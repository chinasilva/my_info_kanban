---
name: schema-driven-dev
description: 结构化与 Schemas 优先的开发模式指南 (基于 json-render 理念)。
version: 1.0.0
---

# Schema-Driven Development (Guardrails)

本指南确立了“Schema First”的开发模式。为了减少 AI 幻觉和确保代码健壮性，我们**拒绝**直接编写弱类型的 UI 代码。

## 1. 核心理念：Schema 即真理

### [强制] Zod Schema 先行
- **规则**: 在实现任何包含数据交互的 UI 组件之前，**必须**先在 `src/schemas/` 目录下定义其数据结构的 Zod Schema。
- **流程**: 
  1. 定义 `user-schema.ts` (Zod)
  2. 导出 Type: `type User = z.infer<typeof userSchema>`
  3. 编写组件: `const UserCard = ({ user }: { user: User }) => ...`

### [强制] 严格的类型推断
- **规则**: 禁止手动定义与 Zod Schema 重复的 TypeScript Interface。必须使用 `z.infer<>` 自动推断。
- **理由**: 确保 Runtime Validation (Zod) 与 Static Typing (TS) 永远保持同步。

## 2. 组件目录 (Component Catalog)

### [建议] 受限组件集
- **规则**: AI 生成 UI 时，应优先复用设计系统中已存在的组件（如 Shadcn UI 组件），而非生成新的内联样式。
- **防幻觉策略**: 当需要构建复杂页面时，先列出所需组件的“清单 (Catalog)”，确认每个组件的 Props 定义后再由于 AI 组装。

## 3. 错误处理与护栏

### [强制] 数据边界防御
- **规则**: 在 API 响应处理和 Form 提交处，必须使用 `schema.parse()` 或 `schema.safeParse()` 进行运行时校验。
- **示例**:
  ```ts
  // ✅ Correct
  const result = UserSchema.safeParse(apiResponse);
  if (!result.success) {
    console.error("Data Guardrail Triggered:", result.error);
    return fallbackUI;
  }
  ```

## 4. AI 交互护栏 (Prompting Strategy)

当要求 AI 编写代码时，请明确附加以下约束：
> "请基于 `src/schemas` 中定义的 Schema 生成代码。确保所有 Props 严格匹配 Schema 定义。不要臆造不存在的属性。"
