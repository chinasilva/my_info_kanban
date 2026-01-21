---
name: spec-driven-dev
description: 规格驱动开发 (SDD) 流程标准。
version: 1.0.0
---

# Spec-Driven Development (SDD)

SDD 是一种旨在控制复杂度的开发流程。通过将“思考”与“执行”分离，我们能显著降低 AI 在长任务中的发散度。

## 流程循环 (The SDD Loop)

### Phase 1: Specify (定义规格)
- **输入**: 用户模糊需求 (e.g., "做一个用户仪表盘")。
- **动作**: 结合 `memory-bank/systemPatterns.md`，编写 `SPEC.md`。
- **产出**: `SPEC.md` 必须包含：
  - 用户故事 (User Stories)
  - 页面结构树 (Page Tree)
  - 数据模型变更 (Prisma / SQL)
  - API 契约 (Input/Output Schemas)

### Phase 2: Plan (规划路径)
- **输入**: `SPEC.md`
- **动作**: 将规格拆解为文件级的变更步骤。
- **产出**: `PLAN.md` (或 `implementation_plan.md`)。
- **格式**:
  ```markdown
  1. [Core] Database Migration: Add UserSettings table.
  2. [Backend] Create Server Actions for settings update.
  3. [Frontend] Create SettingsForm component (Zod schema first).
  ```

### Phase 3: Task (任务拆解)
- **输入**: `PLAN.md` 的某一个步骤。
- **动作**: 将一个大步骤转化为一次具体的 AI Tool 调用序列。
- **原则**: 单次上下文不应超过 3 个文件的变更。

### Phase 4: Implement (执行与验证)
- **输入**: 原子任务。
- **动作**: 编写代码 -> 运行测试 -> 验证 Schema。
- **闭环**: 任务完成后，更新 `memory-bank/activeContext.md`，标记进度。

## 关键规则

1. **单一真理来源**: `SPEC.md` 是最高准则。如果代码实现发现 `SPEC` 有误，必须先更新 `SPEC`，再修改代码。
2. **禁止跳步**: 严禁在没有 PLAN 的情况下直接开始写代码（除非是单纯的 Bugfix）。
