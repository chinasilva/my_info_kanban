# Schemas Directory

本目录用于存放项目中所有的 **Zod Schemas**。

## 规范 (Rules)

1.  **Schema First**: 在编写组件或 API 之前，必须先在此定义数据结构。
2.  **Naming**: 文件名使用 kebab-case (e.g., `user-profile.ts`)。
3.  **Inference**: 使用 `z.infer` 导出 TypeScript 类型，禁止手动重复定义 Interface。

## 示例

```typescript
// src/schemas/user.ts
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

export type User = z.infer<typeof UserSchema>;
```
