# 04-任务清单-Todo-List

**版本**：v0.1.3
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：[01-TRD](./01-TRD-技术需求-Technical-Requirements.md)、[02-PRD](./02-PRD-产品需求-Product-Requirements.md)、[03-架构设计](./03-架构设计-Architecture-Design.md)、[05-ERD](./05-数据模型-ERD-Data-Model.md)、[06-API](./06-API契约-API-Contracts.md)、[07-工作流](./07-工作流-Workflow.md)、[08-测试验收](./08-测试验收-Test-Plan.md)、[09-UI](./09-使用者介面-UI-Design.md)
**下游**：[10-开发规范](./10-开发规范-Dev-Rules.md)、[11-组件装配](./11-组件装配-Component-Assembly.md)
**用途**：v0.02 设计→代码执行桥梁，里程碑 M0-M4 + task-id 大纲 + 组件治理看板 + 退出门槛

---

## §1 概述

### §1.1 文档定位

本文档是 v0.02 设计→代码执行的唯一执行桥梁（Single Source of Truth for Execution），承担以下职责：

1. **任务大纲**：以 task-id（`T-M<里程碑>-<三位序号>`）形式登记 v0.02 全部待执行任务，作为开发工作的唯一入口。
2. **治理看板**：以五阶段组件治理（下载储存 / 单件 / 集成 / 组装 / 冒烟E2E）为坐标，跟踪每个组件的当前阶段。
3. **退出门槛**：为每个里程碑定义可量化、可复验的完成判据，作为合并 master 的硬性前置。
4. **执行顺序**：通过全局执行顺序表显式声明任务间依赖，避免循环依赖与并行冲突。

本文档不替代 01-TRD（技术需求）与 02-PRD（产品需求）的"为什么做"，只回答"做什么 / 谁先做 / 何时算完"。

### §1.2 与其他文档关系

| 关系 | 文档 | 交互方式 |
|---|---|---|
| 上游 | 01-TRD | TRD 定义技术约束（安全不变量六条、DuckDB 只读、Electron 五件骨架），04-Todo 将约束分解为可执行任务 |
| 上游 | 02-PRD | PRD 定义产品需求（市场事实/风险声明/AI 解读/回测报告），04-Todo 将需求映射为业务模块任务 |
| 上游 | 03-架构设计 | 架构设计定义组件边界与依赖图，04-Todo 据此编排执行顺序 |
| 上游 | 05-ERD | ERD 定义数据模型（snapshots / signals / risk_declarations），04-Todo 据此派生数据层任务 |
| 上游 | 06-API | API 契约定义工具签名，04-Todo 据此派生工具实现任务 |
| 上游 | 07-工作流 | 工作流定义五阶段治理流程，04-Todo 看板与之同构 |
| 上游 | 08-测试验收 | 测试计划定义验收用例，04-Todo 退出门槛引用其断言 |
| 上游 | 09-UI | UI 设计定义界面骨架，04-Todo 据此派生 Viewer/Tab 任务 |
| 下游 | 10-开发规范 | 开发规范约束代码风格，04-Todo 任务执行时遵守 |
| 下游 | 11-组件装配 | 组件装配文档引用 04-Todo 看板状态作为装配前置 |

### §1.3 任务铁律六条

| 编号 | 铁律 | 说明 | 违反后果 |
|---|---|---|---|
| 1 | 五阶段组件治理不可跳越 | 每个组件必须依次经过 下载储存 → 单件 → 集成 → 组装 → 冒烟E2E 五阶段，不得跳过任一阶段 | 治理看板标记违规，任务状态回退至上一阶段 |
| 2 | task-id 全局唯一 | task-id 格式 `T-<里程碑>-<三位序号>`（如 T-M0-001、T-M1-042），全文档不重复 | 任务登记被拒，需重新分配序号 |
| 3 | 壳层先于业务 | 壳层任务（Electron main / preload / renderer / agent-host / contract）必须先于业务模块任务完成 | 业务任务状态强制回退至 pending |
| 4 | 单一执行任务门禁 | `.plan/` 目录下同一时刻只允许存在一个"执行中"计划文件，新计划必须等待当前计划完成或归档 | 新计划创建被拒 |
| 5 | 任务状态不得只存在于聊天 | 所有任务状态变更必须落盘到本文档（04-Todo 是 SoT），聊天中的进度承诺不构成完成判据 | 状态变更无效，需重新落盘 |
| 6 | 完成判据三者齐全 | 任务完成需同时满足：① 04-Todo 证据列填写 ② master 分支复验通过 ③ 推送至 origin/master | 任务状态不得标记为 done |

### §1.4 治理体系就绪状态

| 治理要素 | 状态 | 备注 |
|---|---|---|
| task-id 命名规范 | ✅ 就绪 | `T-M<里程碑>-<三位序号>` |
| 五阶段看板模板 | ✅ 就绪 | 见 §4 |
| 退出门槛模板 | ✅ 就绪 | 见 §5 |
| 全局执行顺序表 | ✅ 就绪 | 见 §7.6 |
| v0.01 继承基线 | ✅ 就绪 | 290 passed（见 §6.0） |
| `.plan/` 单一执行门禁 | ⏳ 待启用 | M0 启动时启用 |
| `verify.mjs` 质量门 | ✅ 已创建 | design 阶段 graceful skip 版本，M0 后启用完整校验（与 AGENTS.md §3.4 对齐） |
| `check-desktop-security.mjs` 安全断言 | ✅ 已创建 | design 阶段 graceful skip，M0 后启用 INV-01~06 完整校验（与 AGENTS.md §3.4 / §9.6 对齐） |
| `check-contract-coverage.mjs` 契约 AST 校验 | ✅ 已创建 | design 阶段 graceful skip，M0 骨架 src/contract/api.ts 就绪后启用完整校验（与 AGENTS.md §3.4 对齐） |
| `check-docs-governance.mjs` 文档治理 | ✅ 已创建 | design 阶段即可用 |
| `smoke.mjs` 系统冒烟 | ✅ 已创建 | M0 后启用完整校验 |

---

## §2 任务登记规范

### §2.1 task-id 命名规则

**格式**：`T-M<里程碑>-<三位序号>`

| 组成 | 取值范围 | 示例 |
|---|---|---|
| `T-` | 固定前缀 | `T-` |
| `M<里程碑>` | M0 / M1 / M2 / M3 / M4 | `M0` |
| `<三位序号>` | 001-999，里程碑内独立计数 | `001` |

**示例**：

- `T-M0-001`：M0 里程碑第 1 个任务
- `T-M1-042`：M1 里程碑第 42 个任务
- `T-M4-010`：M4 里程碑第 10 个任务

**规则**：

1. task-id 一经分配不可重用，即使任务被废弃也保留原 id 占位（状态标记为 `cancelled`）。
2. 跨里程碑任务不得复用 id，新里程碑从 `001` 重新计数。
3. 修复记录使用 `FR-<四位序号>` 前缀（见 §8），不占用 task-id 序号空间。
4. 同一任务的子拆分可使用字母后缀：`T-M<里程碑>-<三位序号>[a-z]`（如 `T-M4-008a` / `T-M4-008b` / `T-M4-008c`），子项各计 1 个任务（与 08-Test §10.2 测试 ID 子项后缀规则一致）。

### §2.2 任务字段 11 列

任务登记表使用以下 11 列字段：

| 列序 | 字段名 | 说明 | 取值示例 |
|---|---|---|---|
| 1 | task-id | 任务唯一标识 | `T-M0-001` |
| 2 | 标题 | 任务简明描述 | `Electron main 进程骨架` |
| 3 | 分类 | 任务分类（见 §3） | `壳层` / `公用零件` / `业务模块` / `数据层` / `验证` / `治理` / `部署` / `打磨` |
| 4 | 子系统 | 所属子系统 | `MALF` / `RISK` / `AI` / `BENCH` / `Viewer` / `壳层` / `通用` |
| 5 | 优先级 | P0（必须）/ P1（应当）/ P2（可选） | `P0` |
| 6 | 状态 | 任务状态机取值 | `pending` / `in_progress` / `testing` / `done` / `blocked` |
| 7 | 治理阶段 | 五阶段当前所在阶段 | `下载储存` / `单件` / `集成` / `组装` / `冒烟E2E` |
| 8 | 关联文档 | 上游设计文档链接 | `[01-TRD §3.2](./01-...md)` |
| 9 | 产物 | 任务交付物路径 | `apps/desktop/src/main/index.ts` |
| 10 | 证据 | 完成证据（日志/截图/测试报告 hash） | `master@a1b2c3d, 290 passed` |
| 11 | 备注 | 补充说明 | `依赖 T-M0-001` |

### §2.3 任务状态机

```
                  ┌─────────── blocked ───────────┐
                  │                                │
                  ▼                                │
  pending ───► in_progress ───► testing ───► done
                  │                                │
                  └────────────────────────────────┘
                       （任一阶段可回退至 blocked）
```

| 状态 | 含义 | 进入条件 | 退出条件 |
|---|---|---|---|
| `pending` | 待执行 | 任务登记完成 | 前置依赖全部 done，分配执行者 |
| `in_progress` | 执行中 | 前置依赖 done，开始编码 | 编码完成，进入测试 |
| `testing` | 测试中 | 编码完成，提交测试 | 测试通过，证据齐全 |
| `done` | 已完成 | 三者齐全（04-Todo 证据 + master 复验 + origin/master 推送） | — |
| `blocked` | 阻塞 | 任一阶段遭遇阻塞（依赖未就绪/测试失败/外部依赖缺失） | 阻塞解除，回退至上一活跃状态 |

**状态变更约束**：

1. `done` 是终态，不可回退；如发现缺陷，新建 `FR-<序号>` 修复记录（见 §8）。
2. `blocked` 必须在备注列注明阻塞原因与解阻条件。
3. 状态变更必须同步更新本文档，不得仅存在于聊天（铁律 5）。

---

## §3 任务分类体系

### §3.1 按架构层

| 架构层 | 说明 | 典型任务 |
|---|---|---|
| 壳层 | Electron main / preload / renderer / agent-host / contract 五件骨架 | T-M0-001 ~ T-M0-005 |
| 公用零件 | 跨业务复用的基础组件（DuckDB 访问层、pi 扩展框架、安全沙箱） | T-M0-006 ~ T-M1-002 |
| 业务模块 | MALF 查询 / RISK 风险声明 / AI 解读 / 回测报告 / 设置页 | T-M1-003 ~ T-M4-004 |
| 数据层 | DuckDB schema 与表结构 | T-M2-001 |
| 验证 | 继承测试复验、系统冒烟、E2E | T-M1-009 ~ T-M4-010 |
| 治理 | 质量门脚本、契约校验、安全断言、文档治理 | T-M3-007、T-M4-005 ~ T-M4-007 |
| 部署 | 打包配置、打包冒烟 | T-M4-008 ~ T-M4-009 |
| 打磨 | 技能系统、prompt 模板、多模型切换、性能优化 | T-M3-001 ~ T-M3-006 |

### §3.2 按子系统

| 子系统 | 覆盖范围 | 对应架构层 |
|---|---|---|
| MALF | 市场事实查询（query_snapshot / query_signals / query_symbol_list / query_timeframes） | 业务模块 |
| RISK | 风险声明 CRUD + 矛盾检测 | 业务模块 + 数据层 |
| AI | AI 解读（snapshot / backtest）+ 解读标注机制 | 业务模块 |
| BENCH | 回测报告生成与读取 | 业务模块 |
| Viewer | 市场事实 Tab / AI 对话 Tab / 风险声明 Tab / 回测报告 Tab / 设置 Tab | 业务模块 |
| 壳层 | Electron 五件骨架 + 安全沙箱 + credential-vault | 壳层 |
| 通用 | DuckDB 访问层、pi 扩展框架、文档治理脚本 | 公用零件 + 治理 |

### §3.3 按装配阶段

| 装配阶段 | 对应治理阶段 | 典型任务 |
|---|---|---|
| 下载储存 | 阶段1 下载储存 | T-M0-001 ~ T-M0-005（壳层骨架下载与初始化） |
| 单件 | 阶段2 单件 | T-M0-006 ~ T-M0-008、T-M1-001 ~ T-M1-002、T-M2-001/013、T-M3-007、T-M4-005 ~ T-M4-007 |
| 集成 | 阶段3 集成 | T-M1-003 ~ T-M1-005、T-M2-002 ~ T-M2-004、T-M3-004 |
| 组装 | 阶段4 组装 | T-M1-006 ~ T-M1-008、T-M2-005 ~ T-M2-011、T-M3-001~003/005/006/009~012、T-M4-008a/b/c |
| 冒烟E2E | 阶段5 冒烟E2E | T-M0-009、T-M1-009/010、T-M2-012、T-M3-008、T-M4-009/010 |

---

## §4 组件治理状态看板

### §4.1 看板格式

| 组件 | 阶段1 下载 | 阶段2 单件 | 阶段3 集成 | 阶段4 组装 | 阶段5 冒烟E2E | 状态 |
|---|---|---|---|---|---|---|
| <组件名> | ⏳ / ✅ / ❌ / — | ⏳ / ✅ / ❌ / — | ⏳ / ✅ / ❌ / — | ⏳ / ✅ / ❌ / — | ⏳ / ✅ / ❌ / — | pending / in_progress / testing / done / blocked |

**符号约定**：

- `⏳` 当前或待进入
- `✅` 已通过
- `❌` 失败/阻塞
- `—` 未启用（前置阶段未完成）

### §4.2 组件清单（v0.01 继承 + v0.02 自建）

| 组件 | 阶段1 下载 | 阶段2 单件 | 阶段3 集成 | 阶段4 组装 | 阶段5 冒烟E2E | 状态 |
|---|---|---|---|---|---|---|
| Electron 桌面壳 | ⏳ | — | — | — | — | pending |
| MALF Adapter | ⏳ | — | — | — | — | pending |
| DuckDB 只读访问层 | ⏳ | — | — | — | — | pending |
| pi 扩展层 | ⏳ | — | — | — | — | pending |
| MALF 查询工具 | ⏳ | — | — | — | — | pending |
| RISK 风险声明 | ⏳ | — | — | — | — | pending |
| AI 解读层 | ⏳ | — | — | — | — | pending |
| 回测报告 Viewer | ⏳ | — | — | — | — | pending |
| 只读 Viewer | ⏳ | — | — | — | — | pending |
| v0.01 malf-engine | ✅ | ✅ | ✅ | ✅ | ✅ | done（继承） |
| v0.01 malf-data | ✅ | ✅ | ✅ | ✅ | ✅ | done（继承） |
| v0.01 riskbench-shared | ✅ | ✅ | ✅ | ✅ | ✅ | done（继承） |
| v0.01 malf-signal | ✅ | ✅ | ✅ | ✅ | ✅ | done（继承） |
| v0.01 malf-backtest | ✅ | ✅ | ✅ | ✅ | ✅ | done（继承） |
| v0.01 主仓编排 | ✅ | ✅ | ✅ | ✅ | ✅ | done（继承，run_pipeline + 备份恢复 + 验收门禁，51 passed） |

---

## §5 完成门槛

### §5.1 五阶段进入/退出条件

| 阶段 | 进入条件 | 退出条件 |
|---|---|---|
| 阶段1 下载储存 | task-id 已分配；前置依赖 done | 组件代码已下载至本地，可被 import/require |
| 阶段2 单件 | 阶段1 退出 | 组件可独立运行，单件测试通过 |
| 阶段3 集成 | 阶段2 退出；集成对象组件就绪 | 组件间协同测试通过，无契约违例 |
| 阶段4 组装 | 阶段3 退出 | 端到端功能闭环可演示 |
| 阶段5 冒烟E2E | 阶段4 退出 | 系统级冒烟与 E2E 测试全通过 |

### §5.2 合并 master 门槛

合并至 master 须同时满足以下四类门槛：

**门槛 A：五阶段全绿**

- 涉及组件在 §4.2 看板中当前阶段标记为 `✅`。

**门槛 B：安全不变量六条（INV-01 ~ INV-06）**

- 引用 01-TRD §5.5 + 03-Arch §7 + AGENTS.md §9.6 权威定义，由 `scripts/check-desktop-security.mjs`（design 阶段 graceful skip，M0 后启用完整校验）硬断言：
  1. **INV-01** renderer 沙箱 `sandbox:true`（BrowserWindow webPreferences）
  2. **INV-02** 严格 CSP（`default-src 'self'` + `script-src 'self'`）
  3. **INV-03** preload 受控桥接（仅 `exposeInMainWorld('piBridge')`，不暴露 Node API）
  4. **INV-04** credential-vault safeStorage（Windows DPAPI 加密）
  5. **INV-05** Host RPC 契约化（所有跨进程通信走 contract，22 RPC 方法登记）
  6. **INV-06** HTML 预览独立 CSP（`form-action 'none'`）

> 实现位置映射（对齐 04-Todo §7.1 task-id）：INV-01/02 → T-M0-006（安全沙箱）；INV-03 → T-M0-002（preload 受控桥接）；INV-04 → T-M0-007（credential-vault）；INV-05 → T-M0-005（contract RPC）；INV-06 → T-M2-009（回测报告 Tab + HTML 预览独立 CSP）。

**门槛 C：确定性验证**

- 继承测试（v0.01 290 passed）复验通过
- 当前里程碑系统冒烟 + E2E 全通过
- `scripts/verify.mjs`（design 阶段已创建，M0 后启用完整校验）质量门通过

**门槛 D：文档治理检查**

- `scripts/check-docs-governance.mjs`（design 阶段已创建）通过
- `scripts/check-contract-coverage.mjs`（design 阶段已创建，M0 骨架 src/contract/api.ts 就绪后启用完整校验）契约 AST 校验通过
- 04-Todo 证据列已填写

### §5.3 退回机制

| 触发条件 | 退回动作 |
|---|---|
| 单件测试失败 | 组件回退至阶段1 下载储存，重新进入阶段2 |
| 集成测试失败（契约违例） | 组件回退至阶段2 单件，重新进入阶段3 |
| 组装阶段功能不闭环 | 组件回退至阶段3 集成，重新进入阶段4 |
| 冒烟E2E 失败 | 组件回退至阶段4 组装，重新进入阶段5 |
| 安全不变量六条任一失败 | 组件回退至阶段1，修复后重新走完五阶段 |
| **v0.01 继承复验失败（T-M1-009）** | T-M1-009 状态置 blocked，退回 T-M0-008 检查 Adapter 桥接是否破坏继承契约，**不修改继承测试代码**（AGENTS.md §5.5） |
| 合并 master 后发现缺陷 | 不回退，新建 `FR-<序号>` 修复记录（见 §8） |

---

## §6 里程碑规划

### §6.0 v0.01 继承基线（已完成）

| 项目 | 路径 | 测试数 | 状态 | 说明 |
|---|---|:--:|---|---|
| malf-engine | `Z:\ai-malf-riskbench-components\malf-engine` | 115 | ✅ done | MALF 引擎核心（五层领域模块） |
| malf-data | `Z:\ai-malf-riskbench-components\malf-data` | 46 | ✅ done | MALF 数据层（TDX 接入 + DuckDB 持久化） |
| riskbench-shared | `Z:\ai-malf-riskbench-components\riskbench-shared` | 10 | ✅ done | 共享类型与工具（配置 + 路径推导） |
| malf-signal | `Z:\ai-malf-riskbench-components\malf-signal` | 37 | ✅ done | 信号计算（方向 C 四事件码） |
| malf-backtest | `Z:\ai-malf-riskbench-components\malf-backtest` | 31 | ✅ done | 回测引擎（T4 确定性规则验证） |
| 主仓编排 | `Z:\ai-malf-riskbench\scripts` | 51 | ✅ done | run_pipeline + 备份恢复 |
| **合计** | — | **290** | ✅ | v0.02 须复验通过，不得回退（AGENTS.md §5.5） |

> 说明：v0.01 自身测试在 v0.01 环境通过的状态记录于此；v0.02 环境下的复验由 T-M1-009 承担（见 §7.2）。

### §6.1 总览（M0-M4 五里程碑）

| 里程碑 | 名称 | 目标 | 任务数（预估） |
|---|---|---|---|
| M0 | 骨架 | Electron 五件骨架 + 安全沙箱 + MALF Adapter 试炼 + v0.02 环境冒烟 | ~9 |
| M1 | 核心闭环 | MALF 查询工具 + explain_snapshot + 只读 Viewer + DuckDB 只读访问 + v0.01 继承复验 | ~11 |
| M2 | 完整闭环 | RISK 风险声明 + RISK 量化器 + AI 解读 + ai_discover_rules + 回测报告 Viewer + 配置层基础 + 运行时可写 DB | ~16 |
| M3 | 打磨 | 技能系统 + prompt 模板 + 多模型切换 + 性能优化 + 设置页业务接线 + Streams 边界 | ~13 |
| M4 | 治理补全 + 打包部署 | 治理脚本断言补全 + Electron + Python 子进程打包 | ~8 |
| **合计** | — | — | **~57（pending，不含 cancelled 4；总计 61，见 §9.1）** |

> 说明：M4 任务数由原 ~10 调整为 ~8（pending），因 T-M4-001~004（设置页业务接线）按 11-组件装配 §10 批次 3 归入 M3（cancelled 占位不计）；M4 新增 Python MALF 子进程打包（T-M4-008b）与 v0.01 组件资源打包（T-M4-008c）。M0 新增 T-M0-009 系统冒烟（对齐 scripts/smoke.mjs 引用）。M1 新增 T-M1-011 explain_snapshot 工具（06-API §3.1 缺 task-id 补齐）；M2 新增 T-M2-013 配置层基础 + T-M2-014 ai_discover_rules 工具（06-API §3.3 缺 task-id 补齐）+ T-M2-015 RISK 量化器（PRD RISK-01~04 补齐）+ T-M2-016 运行时可写 DuckDB（P1-2 修复）；M3 新增 T-M3-013 Streams 边界落地（P2-1 修复）。

### §6.2 M0 骨架

**目标**：交付 Electron 五件骨架（main / preload / renderer / agent-host / contract）+ 安全沙箱 + credential-vault + MALF Adapter 试炼场，为 M1 核心闭环奠基。

**核心交付**：

1. Electron main 进程可启动，加载 preload 与 renderer
2. preload 受控桥接 + IPC 白名单
3. renderer React 三栏布局骨架
4. agent-host pi 嵌入 + createAgentSession 可调用
5. contract RPC + MessagePort + 统一信封
6. 安全沙箱（sandbox:true + 严格 CSP）
7. credential-vault safeStorage 加密
8. MALF Adapter 试炼场（Python ↔ TS JSON Lines 通信调通）
9. M0 系统冒烟（由 `scripts/smoke.mjs` 驱动，对应 T-M0-009）

**退出门槛**：

- [ ] Electron 五件骨架可启动
- [ ] 安全不变量五条全通过 + INV-06 占位（INV-01~05 由 `scripts/check-desktop-security.mjs` 断言；INV-06 HTML 预览 CSP 实现在 T-M2-009，M0 阶段仅 constants 占位，全量断言移至 M2 退出门槛）
- [ ] MALF Adapter 试炼场调通（Python ↔ TS JSON Lines）
- [ ] M0 系统冒烟通过（T-M0-009，`scripts/smoke.mjs` 运行数据落 `Z:\pi-malf-riskbench-v0.02-runtime\runs\T-M0-009\`）
- [ ] v0.01 继承基线状态确认（§6.0 已完成，v0.01 环境下 290 passed）——v0.02 环境复验由 T-M1-009 承担，属 M1 退出门槛

### §6.3 M1 核心闭环

**目标**：交付 MALF 查询工具（query_snapshot / query_signals / query_symbol_list / query_timeframes）+ 只读 Viewer（📊 市场事实 Tab + 💬 AI 对话 Tab）+ DuckDB 只读访问层。

**核心交付**：

1. DuckDB 只读访问层 + 连接池
2. pi 扩展空壳 + registerTool 框架
3. query_snapshot / query_signals / query_symbol_list / query_timeframes 工具
4. 📊 市场事实 Tab（44 字段展示 + honest degradation）
5. 💬 AI 对话 Tab（pi 原生 AI 承载，流式回复）
6. 左侧栏标的导航 + 周期选择
7. v0.01 继承测试复验（290 passed）

**退出门槛**：

- [ ] DuckDB 只读访问层可查询 snapshots/signals
- [ ] MALF 查询工具可调用（query_snapshot/query_signals）
- [ ] 📊 市场事实 Tab 展示 44 字段 + honest degradation
- [ ] 💬 AI 对话 Tab 可流式回复
- [ ] M1 系统冒烟 + E2E 全通过

### §6.4 M2 完整闭环

**目标**：交付 RISK 风险声明 CRUD + AI 解读（snapshot / backtest）+ 回测报告 Viewer + 三层权威可视化。

**核心交付**：

1. risk_declarations 表 + DuckDB schema
2. declare_risk / list_risk_declarations / update_risk_declaration / delete_risk_declaration 工具
3. check_risk_contradiction 工具（矛盾检测）
4. ⚠️ 风险声明 Tab
5. ai_interpret_snapshot / ai_interpret_backtest 工具（标注"AI 解读"）
6. run_backtest_report / read_backtest_report 工具
7. 📋 回测报告 Tab + HTML 预览（独立 CSP）
8. AI 解读标注机制（每条 AI 回复标"AI 解读"）
9. 三层权威可视化（市场事实 / 用户声明 / AI 解读分层）

**退出门槛**：

- [ ] 风险声明 CRUD 全通
- [ ] AI 解读标注机制全通（每条 AI 回复标"AI 解读"）
- [ ] 回测报告 Tab + HTML 预览（独立 CSP）
- [ ] 三层权威可视化全通
- [ ] M2 系统冒烟 + E2E 全通过

### §6.5 M3 打磨

**目标**：交付技能系统 + prompt 模板 + 多模型切换 + 性能优化 + 文档治理检查脚本 + 设置页业务接线（从 M4 上移，对齐 11-组件装配 §10 批次 3）。

**核心交付**：

1. 技能系统（malf-snapshot-explain / risk-declare / backtest-report-read）
2. prompt 模板（/declare-risk / /explain-snapshot / /compare-backtest）
3. 多模型切换 UI（pi provider 体系）
4. model_select 钩子 + 业务数据根 config/models.json 持久化
5. export_csv 工具 + CSV 导出 UI
6. 性能优化（Electron 启动 < 3s / 查询 < 500ms）
7. 文档治理检查脚本（check-docs-governance.mjs）
8. ⚙️ 设置 Tab 骨架 + 模型/凭据/路径配置 UI（业务接线收尾，从 M4 上移）

**退出门槛**：

- [ ] 技能系统 3 个技能可加载
- [ ] prompt 模板 3 个可调用
- [ ] 多模型切换 UI 全通
- [ ] 性能基准达标（启动 < 3s / 查询 < 500ms）
- [ ] 设置 Tab 全功能（模型/凭据/路径）
- [ ] M3 系统冒烟 + E2E 全通过

### §6.6 M4 业务接线+打包部署

**目标**：交付治理脚本断言用例补全 + Electron + Python 子进程打包部署。

> 设置页业务接线（模型/凭据/路径配置）已上移至 M3（T-M3-009~012，对齐 11-组件装配 §10 批次 3），M4 仅保留治理脚本断言补全 + 打包部署。

**核心交付**：

1. verify.mjs 统一质量门——补全 m0/full 阶段断言用例（design 阶段已创建骨架）
2. check-contract-coverage.mjs——补全 22 RPC 方法 AST 校验用例（design 阶段已创建骨架）
3. check-desktop-security.mjs——补全 INV-01~06 硬断言用例（design 阶段已创建骨架）
4. Electron 主进程打包（electron-builder，NSIS .exe）
5. Python MALF 子进程打包（PyInstaller / embedded Python，含 v0.01 五组件 + riskbench-shared）
6. v0.01 组件 + 资源打包（DuckDB 生产库首次启动配置引导）
7. Windows 安装包冒烟 + 首次启动冒烟 + 子进程握手冒烟

**退出门槛**（可量化标准）：

- [ ] verify.mjs + check-contract-coverage.mjs + check-desktop-security.mjs 全通过
- [ ] Electron 安装包可生成（NSIS .exe，体积 ≤ 250 MB 含 Python 运行时）
- [ ] Python MALF 子进程打包可执行（PyInstaller 单文件或 embedded Python 目录）
- [ ] 冷启动 ≤ 3 秒（从双击到主窗口可交互）
- [ ] 子进程握手 ≤ 500ms（Electron 主进程 ↔ Python MALF 子进程 JSON Lines 握手）
- [ ] 首次启动生产库未找到时引导用户配置 DATA_ROOT
- [ ] M4 系统冒烟 + E2E + 打包验证全通过

---

## §7 任务登记表

### §7.1 M0 任务大纲（壳层骨架）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M0-001 | Electron main 进程骨架 | 壳层 | 壳层 | P0 | pending | 下载储存 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/main/index.ts` | — | 无前置 |
| T-M0-002 | preload 受控桥接 + 白名单 | 壳层 | 壳层 | P0 | pending | 下载储存 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/preload/index.ts` | — | 依赖 T-M0-001（实现 INV-03） |
| T-M0-003 | renderer React 骨架 + 三栏布局 | 壳层 | Viewer | P0 | pending | 下载储存 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/` | — | 依赖 T-M0-001、T-M0-005（RPC 通道） |
| T-M0-004 | agent-host pi 嵌入 + createAgentSession | 壳层 | 壳层 | P0 | pending | 下载储存 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/agent-host/` | — | 依赖 T-M0-001 |
| T-M0-005 | contract RPC + MessagePort + 统一信封 | 壳层 | 通用 | P0 | pending | 下载储存 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/contract/` | — | 依赖 T-M0-001（与 T-M0-002/003/004 并行；实现 INV-05） |
| T-M0-006 | 安全沙箱（sandbox:true + 严格 CSP） | 壳层 | 壳层 | P0 | pending | 单件 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | `apps/desktop/src/main/security.ts` | — | 依赖 T-M0-001（实现 INV-01/02） |
| T-M0-007 | credential-vault safeStorage | 壳层 | 壳层 | P0 | pending | 单件 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | `apps/desktop/src/main/credential-vault.ts` | — | 依赖 T-M0-006（实现 INV-04） |
| T-M0-008 | MALF Adapter 试炼场单件（Python ↔ TS JSON Lines） | 公用零件 | MALF | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) §4.1 / [11-组件装配](./11-组件装配-Component-Assembly.md) §3.1/§5.3 | `Z:\pi-malf-riskbench-v0.02-composer\malf-adapter\` + `COMPONENT-CARD.md` | — | 依赖 T-M0-005；试炼场隔离（R1/R2/A5），产物落 composer/ 不落主仓 src/ |
| T-M0-009 | M0 系统冒烟 | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) §2.1 | `scripts/smoke.mjs`（运行数据落 `Z:\pi-malf-riskbench-v0.02-runtime\runs\T-M0-009\`） | — | 依赖 T-M0-001~008；对齐 scripts/smoke.mjs 引用 |

### §7.2 M1 任务大纲（核心闭环）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M1-001 | DuckDB 只读访问层 + 连接池 | 公用零件 | 通用 | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/db/duckdb-readonly.ts` | — | 依赖 T-M0-008 |
| T-M1-002 | pi 扩展空壳 + registerTool 框架 | 公用零件 | 通用 | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/pi-extension/` | — | 依赖 T-M0-004 |
| T-M1-003 | query_snapshot 工具 | 业务模块 | MALF | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/query-snapshot.ts` | — | 依赖 T-M1-001/002 |
| T-M1-004 | query_signals 工具 | 业务模块 | MALF | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/query-signals.ts` | — | 依赖 T-M1-001/002 |
| T-M1-005 | query_symbol_list / query_timeframes 工具 | 业务模块 | MALF | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/query-meta.ts` | — | 依赖 T-M1-001/002 |
| T-M1-006 | 📊 市场事实 Tab（44 字段展示 + honest degradation） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/market-facts.tsx` | — | 依赖 T-M1-003/004/005 |
| T-M1-007 | 💬 AI 对话 Tab（pi 原生 AI 承载） | 业务模块 | AI | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/ai-chat.tsx` | — | 依赖 T-M0-004（agent-host）、T-M0-005（contract RPC）、T-M1-002（pi 扩展空壳）；AI 失败降级（AI-06，T-E2E-025） |
| T-M1-008 | 左侧栏标的导航 + 周期选择 | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/sidebar/` | — | 依赖 T-M1-005 |
| T-M1-009 | v0.01 继承测试复验（290 passed，含主仓编排 51） | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) §3.5 | `tests/inherited/` | — | 依赖 T-M0-008（Adapter 桥接就绪后复验契约）；不得回退，复验失败退回 T-M0-008 检查 Adapter，不修改继承测试代码（AGENTS.md §5.5） |
| T-M1-010 | M1 系统冒烟 + E2E | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m1.spec.ts` | — | 依赖 T-M1-001~008 |
| T-M1-011 | explain_snapshot 工具（TS 原生静态查询，引用 MALF v2.1 字段权威解释） | 业务模块 | MALF | P1 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) §3.1 | `apps/desktop/src/tools/explain-snapshot.ts` | — | 依赖 T-M1-002（pi 扩展空壳）；不经 Adapter，TS 原生静态查询引用 MALF v2.1 字段文档 |

### §7.3 M2 任务大纲（完整闭环）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M2-001 | risk_declarations 表 + DuckDB schema | 数据层 | RISK | P0 | pending | 单件 | [05-ERD](./05-数据模型-ERD-Data-Model.md) | `apps/desktop/src/db/schema/risk-declarations.sql` | — | 依赖 T-M2-016（运行时可写 DB，P1-2 修复：建表需可写连接层，非只读访问层 T-M1-001） |
| T-M2-002 | declare_risk / list_risk_declarations 工具 | 业务模块 | RISK | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/risk-declare.ts` | — | 依赖 T-M2-001 |
| T-M2-003 | update_risk_declaration / delete_risk_declaration 工具 | 业务模块 | RISK | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/risk-mutate.ts` | — | 依赖 T-M2-001 |
| T-M2-004 | check_risk_contradiction 工具 | 业务模块 | RISK | P1 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/risk-contradiction.ts` | — | 依赖 T-M2-002/003 |
| T-M2-005 | ⚠️ 风险声明 Tab | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/risk-declarations.tsx` | — | 依赖 T-M2-002/003 |
| T-M2-006 | ai_interpret_snapshot 工具（标注"AI 解读"） | 业务模块 | AI | P2 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/ai-interpret-snapshot.ts` | — | 依赖 T-M1-003；AI 失败降级（AI-06，T-UT-410/T-SM-024） |
| T-M2-007 | ai_interpret_backtest 工具 | 业务模块 | AI | P2 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/ai-interpret-backtest.ts` | — | 依赖 T-M2-008（回测报告工具就绪后解读）；AI 失败降级（AI-06）；对应 PRD AI-03（LLM 驱动回测报告解读） |
| T-M2-008 | run_backtest_report / read_backtest_report 工具 | 业务模块 | BENCH | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/backtest-report.ts` | — | 依赖 T-M0-008（MALF Adapter，runBacktestVerification 经子进程调用 v0.01 run_full_verification）、T-M1-001（DuckDB 只读访问层）；回测运行超时 60s + 崩溃恢复（P1-1 修复，06-API §6.5）；对应 PRD BENC-07（T4 确定性规则验证，v0.01 已实现）+ BENC-08（v0.02 只读 Viewer 展示回测报告） |
| T-M2-009 | 📋 回测报告 Tab + HTML 预览（独立 CSP） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/backtest-report.tsx` | — | 依赖 T-M2-008（实现 INV-06）；对应 PRD BENC-08（只读 Viewer 展示回测报告） |
| T-M2-010 | AI 解读标注机制（每条 AI 回复标"AI 解读"） | 业务模块 | AI | P0 | pending | 组装 | [02-PRD](./02-PRD-产品需求-Product-Requirements.md) | `apps/desktop/src/renderer/ai-badge.tsx` | — | 依赖 T-M2-006/007；AI 失败降级（AI-06） |
| T-M2-011 | 三层权威可视化（市场事实/用户声明/AI 解读分层） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/three-layer-view.tsx` | — | 依赖 T-M2-005/010 |
| T-M2-012 | M2 系统冒烟 + E2E | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m2.spec.ts` | — | 依赖 T-M2-001~016 |
| T-M2-013 | 配置层基础（paths.py 接入 + config 加载 + models.json 持久化骨架） | 公用零件 | 通用 | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) §4.3 / [11-组件装配](./11-组件装配-Component-Assembly.md) §10 批次 2 | `apps/desktop/src/config/` | — | 依赖 T-M0-005；批次 2 公用零件，为 T-M2-002/006/010 业务工具提供 AI 模型选择配置 |
| T-M2-014 | ai_discover_rules 工具（AI 辅助信号规则发现） | 业务模块 | AI | P2 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) §3.3 | `apps/desktop/src/tools/ai-discover-rules.ts` | — | 依赖 T-M2-006（AI 解读机制）；结果仅供参考，不写入确定性规则；AI 失败降级（AI-06）；对应 PRD AI-02（AI 辅助信号规则发现） |
| T-M2-015 | RISK 量化器（P1/P2/P3 视图提取：极端度/动量/方向优势 + 联合风险提示，补 PRD RISK-01~04） | 业务模块 | RISK | P1 | pending | 集成 | [02-PRD](./02-PRD-产品需求-Product-Requirements.md) §2.2 RISK-01~04 / [06-API](./06-API契约-API-Contracts.md) §3.2 quantify_risk + §6.7 RiskQuantifierDTO / [03-Arch](./03-架构设计-Architecture-Design.md) §4.2.1 | `apps/desktop/src/risk/quantifier.ts` | — | 依赖 T-M1-003（query_snapshot 提供快照输入）；补 RISK 量化断头线（审查洞 P0-B 修复）；只读不修改引擎（D29/S35），不评分不决策（D19）；T-UT-331~345 |
| T-M2-016 | v0.02 运行时可写 DuckDB（risk_declarations/ai_interpretations 落盘，独立文件不污染生产库） | 数据层 | 通用 | P0 | pending | 单件 | [05-ERD](./05-数据模型-ERD-Data-Model.md) §5.1/§5.2 / [03-Arch](./03-架构设计-Architecture-Design.md) §4.2.2 | `apps/desktop/src/db/writable-connection.ts` | — | 依赖 T-M0-005（contract RPC）；解决 T-M2-001 依赖只读层矛盾（P1-2 修复）；WAL 模式 + 单连接串行写 + 崩溃恢复（03-Arch §4.2.2） |

### §7.4 M3 任务大纲（打磨）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M3-001 | 技能系统（malf-snapshot-explain / risk-declare / backtest-report-read） | 打磨 | 通用 | P1 | pending | 组装 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/skills/` | — | 依赖 M2 完成 |
| T-M3-002 | prompt 模板（/declare-risk / /explain-snapshot / /compare-backtest） | 打磨 | AI | P1 | pending | 组装 | [07-工作流](./07-工作流-Workflow.md) | `apps/desktop/src/prompts/` | — | 依赖 T-M3-001 |
| T-M3-003 | 多模型切换 UI（pi provider 体系） | 打磨 | AI | P1 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/model-switcher.tsx` | — | 依赖 T-M3-004（model_select 钩子就绪后才有模型可切换）；对应 PRD AI-01（OpenAI-compatible 多 provider，走 pi provider 体系） |
| T-M3-004 | model_select 钩子 + 业务数据根 config/models.json 持久化 | 打磨 | AI | P1 | pending | 集成 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/main/model-config.ts` | — | 依赖 T-M2-013（配置层基础）、T-M0-007；对应 PRD AI-01（多 provider 选择，落业务数据根不侵入 ~/.pi） |
| T-M3-005 | export_csv 工具 + CSV 导出 UI | 打磨 | MALF | P1 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/export-csv.ts` | — | 依赖 T-M1-003/004 |
| T-M3-006 | 性能优化（Electron 启动 < 3s / 查询 < 500ms） | 打磨 | 通用 | P1 | pending | 组装 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | — | — | 依赖 M1/M2 完成 |
| T-M3-007 | 文档治理检查脚本（check-docs-governance.mjs） | 治理 | 通用 | P1 | pending | 单件 | [10-开发规范](./10-开发规范-Dev-Rules.md) | `scripts/check-docs-governance.mjs` | — | 无前置（design 阶段已创建，M3 补全断言用例） |
| T-M3-008 | M3 系统冒烟 + E2E | 验证 | 通用 | P1 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m3.spec.ts` | — | 依赖 T-M3-001~007/009~012 |
| T-M3-009 | ⚙️ 设置 Tab 骨架（从 M4 上移，对齐 11-组件装配 §10 批次 3） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/settings.tsx` | — | 依赖 M1 完成 |
| T-M3-010 | models_config_get/set 工具 + UI（从 M4 上移） | 业务模块 | AI | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/models-config.ts` | — | 依赖 T-M3-004 |
| T-M3-011 | credentials_get/set 工具 + UI（从 M4 上移） | 业务模块 | 壳层 | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/credentials.ts` | — | 依赖 T-M0-007 |
| T-M3-012 | 路径配置 UI（DATA_ROOT / TDX_ROOT / runtime）（从 M4 上移） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/settings-paths.tsx` | — | 依赖 T-M3-009 |
| T-M3-013 | Streams 边界落地（backtest.progress + ai.interpretation.streaming 实现；snapshot.updated/signal.detected 明确为 v0.1 预留不实现） | 业务模块 | 通用 | P2 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) §5 | `apps/desktop/src/streams/` | — | 依赖 T-M2-008/006（P2-1 修复：Streams 边界明确） |

### §7.5 M4 任务大纲（治理补全+打包部署）

> 说明：T-M4-001~004（设置页业务接线）已上移至 M3（T-M3-009~012），对齐 11-组件装配 §10 批次 3。M4 仅保留治理脚本断言补全 + Electron + Python 子进程打包部署。T-M4-001~004 task-id 按 §2.1 规则 1 保留 cancelled 占位（不重用）。

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M4-001 | ~~设置 Tab 骨架~~ | — | — | — | cancelled | — | — | — | — | 已上移至 T-M3-009（对齐 11-组件装配 §10 批次 3） |
| T-M4-002 | ~~models_config_get/set 工具 + UI~~ | — | — | — | cancelled | — | — | — | — | 已上移至 T-M3-010 |
| T-M4-003 | ~~credentials_get/set 工具 + UI~~ | — | — | — | cancelled | — | — | — | — | 已上移至 T-M3-011 |
| T-M4-004 | ~~路径配置 UI~~ | — | — | — | cancelled | — | — | — | — | 已上移至 T-M3-012 |
| T-M4-005 | verify.mjs 统一质量门——补全 m0/full 阶段断言用例 | 治理 | 通用 | P0 | pending | 单件 | [10-开发规范](./10-开发规范-Dev-Rules.md) | `scripts/verify.mjs` | — | 无前置（design 阶段已创建骨架，M4 补全断言用例） |
| T-M4-006 | check-contract-coverage.mjs——补全 22 RPC 方法 AST 校验用例 | 治理 | 通用 | P0 | pending | 单件 | [06-API](./06-API契约-API-Contracts.md) | `scripts/check-contract-coverage.mjs` | — | 无前置（design 阶段已创建骨架，M4 补全断言用例） |
| T-M4-007 | check-desktop-security.mjs——补全 INV-01~06 硬断言用例 | 治理 | 壳层 | P0 | pending | 单件 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | `scripts/check-desktop-security.mjs` | — | 无前置（design 阶段已创建骨架，M4 补全断言用例） |
| T-M4-008a | Electron 主进程打包（electron-builder，NSIS .exe） | 部署 | 壳层 | P0 | pending | 组装 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/electron-builder.yml` | — | 依赖 M3 完成 |
| T-M4-008b | Python MALF 子进程打包（PyInstaller / embedded Python，含 v0.01 五组件 + riskbench-shared） | 部署 | MALF | P0 | pending | 组装 | [03-架构设计](./03-架构设计-Architecture-Design.md) §4.1 | `apps/desktop/python-dist/` | — | 依赖 T-M4-008a |
| T-M4-008c | v0.01 组件 + 资源打包（DuckDB 生产库首次启动配置引导） | 部署 | 通用 | P0 | pending | 组装 | [12-目录治理](./12-目录治理-Directory-Governance.md) | `apps/desktop/resources/` | — | 依赖 T-M4-008a |
| T-M4-009 | 打包冒烟测试（安装包冒烟 + 首次启动冒烟 + 子进程握手冒烟） | 部署 | 壳层 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/packaging/smoke.spec.ts` | — | 依赖 T-M4-008a/008b/008c |
| T-M4-010 | M4 系统冒烟 + E2E + 打包验证 | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m4.spec.ts` | — | 依赖 T-M4-005/006/007/009 |

### §7.6 全局执行顺序表

| 执行序 | task-id | 里程碑 | 标题 | 前置依赖 |
|---|---|---|---|---|
| 1 | T-M0-001 | M0 | Electron main 进程骨架 | 无 |
| 2 | T-M0-002 | M0 | preload 受控桥接 + 白名单 | T-M0-001 |
| 3 | T-M0-005 | M0 | contract RPC + MessagePort + 统一信封 | T-M0-001（与 T-M0-002/003/004 并行） |
| 4 | T-M0-003 | M0 | renderer React 骨架 + 三栏布局 | T-M0-001、T-M0-005 |
| 5 | T-M0-004 | M0 | agent-host pi 嵌入 + createAgentSession | T-M0-001 |
| 6 | T-M0-006 | M0 | 安全沙箱（sandbox:true + 严格 CSP） | T-M0-001 |
| 7 | T-M0-007 | M0 | credential-vault safeStorage | T-M0-006 |
| 8 | T-M0-008 | M0 | MALF Adapter 试炼场单件 | T-M0-005 |
| 9 | T-M0-009 | M0 | M0 系统冒烟 | T-M0-001~008 |
| 10 | T-M1-001 | M1 | DuckDB 只读访问层 + 连接池 | T-M0-008 |
| 11 | T-M1-002 | M1 | pi 扩展空壳 + registerTool 框架 | T-M0-004 |
| 12 | T-M1-003 | M1 | query_snapshot 工具 | T-M1-001、T-M1-002 |
| 13 | T-M1-004 | M1 | query_signals 工具 | T-M1-001、T-M1-002 |
| 14 | T-M1-005 | M1 | query_symbol_list / query_timeframes 工具 | T-M1-001、T-M1-002 |
| 15 | T-M1-011 | M1 | explain_snapshot 工具（TS 原生静态查询） | T-M1-002 |
| 16 | T-M1-006 | M1 | 📊 市场事实 Tab（44 字段展示 + honest degradation） | T-M1-003、T-M1-004、T-M1-005 |
| 17 | T-M1-007 | M1 | 💬 AI 对话 Tab（pi 原生 AI 承载） | T-M0-004、T-M0-005、T-M1-002 |
| 18 | T-M1-008 | M1 | 左侧栏标的导航 + 周期选择 | T-M1-005 |
| 19 | T-M1-009 | M1 | v0.01 继承测试复验（290 passed） | T-M0-008（Adapter 桥接就绪后复验） |
| 20 | T-M1-010 | M1 | M1 系统冒烟 + E2E | T-M1-001~008/011 |
| 21 | T-M2-016 | M2 | v0.02 运行时可写 DuckDB | T-M0-005 |
| 22 | T-M2-001 | M2 | risk_declarations 表 + DuckDB schema | T-M2-016 |
| 23 | T-M2-002 | M2 | declare_risk / list_risk_declarations 工具 | T-M2-001 |
| 24 | T-M2-003 | M2 | update_risk_declaration / delete_risk_declaration 工具 | T-M2-001 |
| 25 | T-M2-004 | M2 | check_risk_contradiction 工具 | T-M2-002、T-M2-003 |
| 26 | T-M2-005 | M2 | ⚠️ 风险声明 Tab | T-M2-002、T-M2-003 |
| 27 | T-M2-006 | M2 | ai_interpret_snapshot 工具（标注"AI 解读"） | T-M1-003 |
| 28 | T-M2-014 | M2 | ai_discover_rules 工具（AI 辅助规则发现） | T-M2-006 |
| 29 | T-M2-015 | M2 | RISK 量化器（P1/P2/P3 视图提取） | T-M1-003 |
| 30 | T-M2-013 | M2 | 配置层基础（paths.py + config + models.json 骨架） | T-M0-005 |
| 31 | T-M2-008 | M2 | run_backtest_report / read_backtest_report 工具 | T-M0-008、T-M1-001 |
| 32 | T-M2-007 | M2 | ai_interpret_backtest 工具 | T-M2-008 |
| 33 | T-M2-009 | M2 | 📋 回测报告 Tab + HTML 预览（独立 CSP） | T-M2-008 |
| 34 | T-M2-010 | M2 | AI 解读标注机制（每条 AI 回复标"AI 解读"） | T-M2-006、T-M2-007 |
| 35 | T-M2-011 | M2 | 三层权威可视化（市场事实/用户声明/AI 解读分层） | T-M2-005、T-M2-010 |
| 36 | T-M2-012 | M2 | M2 系统冒烟 + E2E | T-M2-001~016 |
| 37 | T-M3-001 | M3 | 技能系统（3 个技能） | M2 完成 |
| 38 | T-M3-002 | M3 | prompt 模板（3 个） | T-M3-001 |
| 39 | T-M3-007 | M3 | 文档治理检查脚本 | 无（可并行） |
| 40 | T-M3-004 | M3 | model_select 钩子 + config/models.json 持久化 | T-M2-013、T-M0-007 |
| 41 | T-M3-003 | M3 | 多模型切换 UI（pi provider 体系） | T-M3-004 |
| 42 | T-M3-005 | M3 | export_csv 工具 + CSV 导出 UI | T-M1-003、T-M1-004 |
| 43 | T-M3-006 | M3 | 性能优化（启动 < 3s / 查询 < 500ms） | M1、M2 完成 |
| 44 | T-M3-009 | M3 | ⚙️ 设置 Tab 骨架 | M1 完成 |
| 45 | T-M3-010 | M3 | models_config_get/set 工具 + UI | T-M3-004 |
| 46 | T-M3-011 | M3 | credentials_get/set 工具 + UI | T-M0-007 |
| 47 | T-M3-012 | M3 | 路径配置 UI（DATA_ROOT / TDX_ROOT / runtime） | T-M3-009 |
| 48 | T-M3-013 | M3 | Streams 边界落地（backtest.progress + ai.streaming） | T-M2-008/006 |
| 49 | T-M3-008 | M3 | M3 系统冒烟 + E2E | T-M3-001~007/009~013 |
| 50 | T-M4-005 | M4 | verify.mjs 补全断言用例 | 无（可并行） |
| 51 | T-M4-006 | M4 | check-contract-coverage.mjs 补全 AST 校验用例 | 无（可并行） |
| 52 | T-M4-007 | M4 | check-desktop-security.mjs 补全 INV-01~06 断言用例 | 无（可并行） |
| 53 | T-M4-008a | M4 | Electron 主进程打包（electron-builder，NSIS） | M3 完成 |
| 54 | T-M4-008b | M4 | Python MALF 子进程打包（PyInstaller / embedded） | T-M4-008a |
| 55 | T-M4-008c | M4 | v0.01 组件 + 资源打包 | T-M4-008a |
| 56 | T-M4-009 | M4 | 打包冒烟测试（安装包 + 首启 + 子进程握手） | T-M4-008a/008b/008c |
| 57 | T-M4-010 | M4 | M4 系统冒烟 + E2E + 打包验证 | T-M4-005/006/007/009 |

> 说明：无前置依赖的任务（T-M3-007、T-M4-005/006/007）可与同里程碑其他任务并行执行，但不得违反"单一执行任务门禁"（铁律 4）。T-M4-001~004 已上移至 M3（T-M3-009~012）。T-M1-011（explain_snapshot）与 T-M2-014（ai_discover_rules）为 06-API §3 缺 task-id 补齐（交叉审查 N-9 修复）。T-M2-015（RISK 量化器）/ T-M2-016（运行时可写 DB）/ T-M3-013（Streams 边界）为第三轮交叉审查任务缺口补齐。

---

## §8 修复记录区（FR-<序号> 模板）

修复记录用于登记合并 master 后发现的缺陷修复，不占用 task-id 序号空间。

**FR 编号规则**：`FR-<四位序号>`，如 FR-0001、FR-0042。

**模板**：

| 字段 | 说明 | 示例 |
|---|---|---|
| FR-id | `FR-<四位序号>` | `FR-0001` |
| 关联 task-id | 缺陷所属任务 | `T-M1-003` |
| 标题 | 缺陷简述 | `query_snapshot 在空数据集时返回 500` |
| 严重度 | P0（阻塞）/ P1（严重）/ P2（一般）/ P3（轻微） | `P1` |
| 状态 | pending / in_progress / testing / done | `pending` |
| 发现日期 | YYYY-MM-DD | `2026-08-09` |
| 修复日期 | YYYY-MM-DD | — |
| 根因 | 缺陷根因分析 | `未处理 DuckDB 空结果集` |
| 修复方案 | 修复措施 | `添加空结果集守卫，返回空数组` |
| 证据 | 修复证据（commit hash / 测试报告） | — |
| 备注 | 补充说明 | — |

**修复记录表**（按 FR-id 升序）：

| FR-id | 关联 task-id | 标题 | 严重度 | 状态 | 发现日期 | 修复日期 | 根因 | 修复方案 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — | — | _暂无修复记录_ |

---

## §9 任务统计

### §9.1 按里程碑统计

| 里程碑 | 总任务数 | pending | in_progress | testing | done | blocked | cancelled |
|---|---|---|---|---|---|---|---|
| M0 | 9 | 9 | 0 | 0 | 0 | 0 | 0 |
| M1 | 11 | 11 | 0 | 0 | 0 | 0 | 0 |
| M2 | 16 | 16 | 0 | 0 | 0 | 0 | 0 |
| M3 | 13 | 13 | 0 | 0 | 0 | 0 | 0 |
| M4 | 12 | 8 | 0 | 0 | 0 | 0 | 4（T-M4-001~004 占位） |
| **合计** | **61** | **57** | **0** | **0** | **0** | **0** | **4** |

> 说明：原 T-M4-001~004 业务模块上移至 M3（T-M3-009~012）；M0 新增 T-M0-009 系统冒烟；M1 新增 T-M1-011 explain_snapshot 工具（06-API §3.1 缺 task-id 补齐）；M2 新增 T-M2-013 配置层基础 + T-M2-014 ai_discover_rules 工具（06-API §3.3 缺 task-id 补齐）+ T-M2-015 RISK 量化器（PRD RISK-01~04 补齐）+ T-M2-016 运行时可写 DuckDB（P1-2 修复）；M3 新增 T-M3-013 Streams 边界落地（P2-1 修复）；M4 T-M4-008 拆分为 008a/008b/008c（Python 子进程打包 + v0.01 组件资源打包）。T-M4-001~004 task-id 一经分配不可重用（§2.1 规则 1），保留占位但状态标 cancelled。

### §9.2 v0.01 继承基线统计

| 项目 | 状态 | 说明 |
|---|---|---|
| v0.01 继承测试 | — | 290 passed（v0.02 须复验通过，不得回退） |

### §9.3 组件治理看板统计

| 状态 | 组件数 | 组件清单 |
|---|---|---|
| done（继承） | 5 | malf-engine、malf-data、riskbench-shared、malf-signal、malf-backtest |
| pending | 9 | Electron 桌面壳、MALF Adapter、DuckDB 只读访问层、pi 扩展层、MALF 查询工具、RISK 风险声明、AI 解读层、回测报告 Viewer、只读 Viewer |
| in_progress | 0 | — |
| testing | 0 | — |
| blocked | 0 | — |
| **合计** | **14** | — |

### §9.4 优先级分布

| 优先级 | 任务数 | 占比 |
|---|---|---|
| P0 | 42 | 73.7% |
| P1 | 11 | 19.3% |
| P2 | 4 | 7.0% |
| P3 | 0 | 0.0% |
| **合计** | **57**（按 task-id 计数，T-M4-008a/b/c 各计 1） | — |

---

## §10 版本历史

| 版本 | 日期 | 变更说明 | 维护者 |
|---|---|---|---|
| v0.1.0 | 2026-08-09 | 初版草案：M0-M4 五里程碑 + 48 任务大纲 + 组件治理看板 + 退出门槛 + 全局执行顺序表 | pi-malf-riskbench v0.02 |
| v0.1.1 | 2026-08-09 | P0 审计修复：① §1.4 治理脚本就绪状态由"⏳ 待建"对齐为"✅ 已创建"（与 AGENTS.md §3.4 一致）；② §5.2 门槛 B 安全不变量六条由 Electron 配置项替换为 INV-01~06 权威定义（01-TRD §5.5 + 03-Arch §7）；③ §5.3 退回机制补 v0.01 继承复验失败路径；④ §6.0 v0.01 继承基线补"主仓编排 51"行（290 passed 三处一致）；⑤ §6.2 M0 退出门槛第 4 项改为"继承基线状态确认"，v0.02 复验归 M1（T-M1-009）；⑥ T-M0-009 M0 系统冒烟补登；⑦ T-M0-008 产物路径改为试炼场 composer/（R1/R2/A5 物理隔离）；⑧ T-M4-001~004 业务模块上移至 M3（T-M3-009~012，对齐 11-组件装配 §10 批次 3）；⑨ T-M4-008 拆分为 008a/008b/008c（补 Python MALF 子进程打包 + v0.01 组件资源打包）；⑩ 修复依赖反向（T-M0-005 并行、T-M1-007/T-M1-009/T-M2-008/T-M2-007/T-M3-003/004 补依赖）；⑪ §7.6 全局执行顺序表重排；⑫ §9 统计重算（52 task-id）。审计洞集见 .record/ 实施记录。 | pi-malf-riskbench v0.02 |
| v0.1.2 | 2026-08-09 | 交叉审查延后 7 洞修复（AGENTS.md §11.4，M0 前必处理项）：① **N-7** §6.6 移除残留设置 Tab 项 1-4（已上移 M3），核心交付重编号 1-7，退出门槛移除"设置 Tab 全功能"；② **N-8** §3.3 典型任务归类修正，5 行全部与 §7.1~§7.5 治理阶段列精确对齐；③ **N-9** 新增 T-M1-011 explain_snapshot（P1）+ T-M2-014 ai_discover_rules（P2），§6.1/§7.2/§7.3/§7.6/§9.1/§9.4 统计同步更新（56→58 总，52→54 pending）；④ **N-11** §4.2 补"v0.01 主仓编排"行（51 passed）；⑤ **O-8** §6.1 M4 ~9→~8。交叉审查洞集至此全闭合。 | pi-malf-riskbench v0.02 |
| v0.1.3 | 2026-08-10 | 第三轮交叉审查 15 洞修复 + 任务边界审计（AGENTS.md §11.4）：① 新增 T-M2-015 RISK 量化器（PRD RISK-01~04 补齐，P0-B 修复）+ T-M2-016 运行时可写 DuckDB（P1-2 修复，运行时沙箱 WAL 模式）+ T-M3-013 Streams 边界落地（P2-1 修复）；② §6.1/§7.3/§7.6/§9.1/§9.4 统计同步更新（58→61 总，54→57 pending，P1 9→10，P2 2→3）；③ §7.3 M2 核心交付补"RISK 量化器 + 运行时可写 DB"；④ §7.4 M3 核心交付补"Streams 边界"；⑤ §6.1 合计 ~54→~57（pending，不含 cancelled 4）；⑥ §9.4 优先级统计同步。第四轮交叉审查 P0-A/P0-B/P1-1~P1-6 修复见 AGENTS.md v0.1.6/v0.1.7。 | pi-malf-riskbench v0.02 |

---

**文档维护**：任务状态变更时更新

**最后更新**：2026-08-10
