---
description: "创建任务计划——为 pi-malf-riskbench-v0.02 开发任务创建唯一 .plan/ 计划文件"
argument-hint: "<task-id> [简短描述]"
---

# /plan — 创建任务计划

为 pi-malf-riskbench-v0.02 开发任务创建唯一 `.plan/` 计划文件。

## 使用方式

```
/plan T-M0-001                       # 为 T-M0-001 创建计划
/plan T-M0-001 Electron 五件骨架     # 带简短描述
```

## 前置门禁检查（三项必须同时满足，AGENTS.md §4.4）

创建计划前必须确认：

1. [ ] 上一项任务已完成并在 04-Todo 记录（或这是第一个任务）
2. [ ] 用户已明确选择该任务并批准开工
3. [ ] 该任务即将进入实施

**任一未满足 → 拒绝创建计划，告知用户原因**

同时确认：
- [ ] `.plan/` 无其他执行中任务（单一执行任务门禁，AGENTS.md §4.4）
- [ ] master 分支干净（`git status` 无 unstaged 改动）
- [ ] task-id 在 docs/04-任务清单-Todo-List.md 中已登记

## 计划文件模板

创建 `.plan/T-M<里程碑>-<三位序号>-<scope>.md`，使用以下模板：

```markdown
# 任务计划：<task-id> <标题>

**任务 ID**：<task-id>
**日期**：YYYY-MM-DD
**状态**：📝 待审查
**关联文档**：<依据的设计文档章节>
**里程碑**：<M0/M1/M2/M3/M4>

---

## 1. 任务目标

### 做什么
<一句话描述任务目标>

### 为什么
<任务的业务价值 / 技术价值>

### 依据
<引用的设计文档章节，如 03-Arch §6.1 + 06-API §3.1>

## 2. 范围与非目标

### 范围
- <明确列出本次任务覆盖的内容>

### 非目标（不做什么）
- <明确列出本次任务不覆盖的内容>
- <避免范围蔓延>

## 3. 文件清单

### 将创建的文件
| 文件路径 | 用途 |
|---|---|
| `src/xxx.ts` | <描述> |
| `tests/xxx.test.mjs` | <描述> |

### 将修改的文件
| 文件路径 | 修改内容 |
|---|---|
| `docs/04-任务清单-Todo-List.md` | 任务状态更新 |
| `docs/06-API契约-API-Contracts.md` | 新增 RPC 方法（如涉及） |

## 4. 接口设计

### RPC 方法（如涉及，路由组前缀 malf/risk/ai/bench/viewer/system）
```typescript
// contract/api.ts
interface Api {
  "namespace.action": {
    params: { ... },
    result: { ... }
  }
}
```

### registerTool 工具（如涉及，03-Arch §3.2）
```typescript
pi.registerTool({
  name: "query_snapshot",  // 路由组前缀
  label: "查询快照",
  description: "...",
  parameters: { ... },
  execute: async (params, ctx) => { ... }
});
```

### MALF Adapter 方法（如涉及，03-Arch §4.1）
```python
# JSON Lines 协议
# 请求：{"id": "<uuid>", "method": "query_snapshot", "params": {...}}
# 响应：{"id": "<uuid>", "result": {...}}
```

### 数据表（如涉及，05-ERD）
```sql
-- DuckDB schema（v0.02 只读 Viewer 不修改 snapshots/signals 表，D28）
CREATE TABLE xxx (...);
```

## 5. 测试策略

### 单件测试（阶段 2，试炼场）
- [ ] <测试用例 1>：断言 <什么>
- [ ] <测试用例 2>：断言 <什么>

### 集成测试（阶段 3）
- [ ] <测试用例>：断言 <什么>

### 系统冒烟（阶段 5a，scripts/smoke.mjs）
- [ ] <冒烟用例>：断言 <什么>

### E2E（阶段 5b）
- [ ] <E2E-XX>：断言 <什么>

### 安全不变量六条（如涉及，scripts/check-desktop-security.mjs）
- [ ] <INV-XX 断言>：断言 <什么>

### v0.01 继承测试复验（如触及 v0.01 组件）
- [ ] 290 passed 不回退

## 6. 五阶段治理定位（AGENTS.md §4.1 + docs/11-组件装配）

| 阶段 | 当前任务处于 |
|---|---|
| 1. 下载储存 | <如涉及> |
| 2. 单件测试 | <如涉及> |
| 3. 集成测试 | <如涉及> |
| 4. 系统组装 | <如涉及> |
| 5. 冒烟 + E2E | <如涉及> |

## 7. 依赖关系

### 前置任务
- [ ] <task-id>：<标题>（必须先完成）

### 组件依赖
- [ ] <组件名>：<用途>（必须先装配）

### v0.01 组件依赖（如涉及）
- [ ] malf-engine / malf-data / riskbench-shared / malf-signal / malf-backtest
- [ ] 通过 MALF Adapter 子进程桥接（不 import 源码）

## 8. 预期产物

### 代码
- `src/xxx.ts`
- `tests/xxx.test.mjs`

### 文档更新
- `docs/04-任务清单-Todo-List.md`（任务状态）
- `docs/06-API契约-API-Contracts.md`（如 RPC 变化）

### 实施记录
- `.record/T-M*-NNN-实施记录.md`（收尾时创建，8 章节）

## 9. 16 步执行跟踪（docs/10-开发规范）

- [ ] 步骤 1：读文档、定边界
- [ ] 步骤 2：检查文档门禁
- [ ] 步骤 3：编写 .plan/ 计划（本文件）
- [ ] 步骤 4：独立审查计划
- [ ] 步骤 5：用户批准计划（★ 用户授权）
- [ ] 步骤 6：拆分任务、逐项实现
- [ ] 步骤 7：编写或更新测试（TDD）
- [ ] 步骤 8：type-check
- [ ] 步骤 9：build
- [ ] 步骤 10：test
- [ ] 步骤 11：smoke / E2E
- [ ] 步骤 12：独立审查并修复
- [ ] 步骤 13：更新 04-Todo + 文档
- [ ] 步骤 14：文档治理检查
- [ ] 步骤 15：diff 检查
- [ ] 步骤 16：提交交付（★ 用户授权）

## 10. 证据登记（收尾时填写）

- 测试日志路径：
- 提交哈希：
- 推送状态：
- 实施记录路径：

---

## 审查记录

（步骤 4 独立审查时填写）

## 完成记录

（步骤 5 收尾时填写）
- 完成日期：
- 实施记录：.record/<record-file>.md
- 状态：✅ 已完成
```

## 创建后操作

1. 创建 `.plan/00-当前任务.md` 指向该计划：
   ```markdown
   # 当前任务

   **任务 ID**：<task-id>
   **计划文件**：.plan/<plan-file>.md
   **状态**：📝 待审查
   **日期**：YYYY-MM-DD
   **里程碑**：<M0/M1/M2/M3/M4>
   **标题**：<任务标题>
   ```

2. 更新 `docs/04-任务清单-Todo-List.md` 任务行状态为 `in_progress`

3. 向用户汇报计划摘要，请求审查与批准（步骤 4-5）

## 运行数据隔离（AGENTS.md §5.3）

任务运行数据写入 `Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\`：
- 输入文件：`runs/<task-id>/input/`
- 输出文件：`runs/<task-id>/output/`
- 任务清单：`runs/<task-id>/manifest.json`

**绝不污染生产数据库根**（`Z:\ai-malf-riskbench-data\`）。

## 参考

- AGENTS.md §4.4（单一执行任务门禁）+ §4.2（task-id 全局唯一）
- AGENTS.md §5.3（测试运行数据隔离）
- AGENTS.md §1.4（三层权威：AI 不可改 MALF/RISK 确定性计算）
- docs/10-开发规范 步骤 3（编写 .plan/ 计划）
- docs/04-任务清单（task-id 注册表，T-M*-NNN）
- ai-malf-riskbench `.plan/` 计划规范（v0.01 范式来源）
- pi-studybuddy `.pi/prompts/plan.md`（13 文档治理范式）
