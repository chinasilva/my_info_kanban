---
name: debugging-guide
description: Bug 排查与修复的标准化流程
version: 1.1.0
---

# Debugging Guide

当遇到 Bug 时，遵循以下结构化流程进行排查。

## 1. 定位阶段 (Locate)

### [强制] 优先收集信息
- **浏览器控制台**: 检查 Client-Side 错误。
- **终端日志**: 检查 Server-Side / Build 错误。
- **网络请求**: 在 DevTools Network 面板中检查 API 响应。

### [强制] 复现条件
```text
1. 触发路径: 点击按钮 X → 导航到页面 Y
2. 用户状态: 已登录 / 未登录
3. 数据状态: 有数据 / 无数据
```

## 2. 诊断阶段 (Diagnose)

### 常见错误类型速查

| 错误描述 | 排查方向 |
| :--- | :--- |
| `Type '...' is not assignable to type '...'` | Zod Schema 与实际数据不匹配。检查 `src/schemas`。 |
| `Cannot read property 'xxx' of undefined` | 数据结构中缺失字段或异步加载时机问题。 |
| `Hydration mismatch` | Server/Client 渲染内容不一致。 |
| `API returned 400` | Zod 验证失败。检查 `src/schemas/api.ts`。 |

### 代码示例：模式与反模式

#### Type Error 修复示例
```tsx
// ❌ 反模式: 直接访问可能为 undefined 的属性
const userName = user.profile.name; // Error if profile is undefined

// ✅ 正确模式: Optional chaining + 默认值
const userName = user?.profile?.name ?? 'Anonymous';
```

#### Hydration Error 修复示例
```tsx
// ❌ 反模式: 在 Server/Client 产生不同结果
const time = new Date().toLocaleString(); // Server 和 Client 时区可能不同

// ✅ 正确模式: 使用 useEffect 仅在客户端渲染
const [time, setTime] = useState('');
useEffect(() => { setTime(new Date().toLocaleString()); }, []);
```

#### Zod Validation 护栏示例
```ts
// ❌ 反模式: 直接使用未验证的 API 参数
const limit = parseInt(searchParams.get("limit") || "50");

// ✅ 正确模式: 使用 Zod safeParse
const result = PaginationSchema.safeParse(searchParams);
if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
const { limit } = result.data;
```

## 3. 修复阶段 (Fix)

### [强制] 最小变更原则
- 只修改必要代码，不要大规模重构。
- 如需重构，应先走 `spec-driven-dev` 流程。

### [强制] 验证闭环
运行以下脚本进行验证：
```bash
# 方法 1: 手动执行
npx tsc --noEmit && npm run build

# 方法 2: 使用标准化脚本 (推荐)
bash skills/scripts/verify.sh
```

## 4. 善后阶段 (Post-Fix)

### [建议] 更新 Memory Bank
修复后，在 `memory-bank/activeContext.md` 中记录：
- 问题根因
- 解决方案
- 是否需要后续关注
