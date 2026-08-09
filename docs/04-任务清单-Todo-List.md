# 04-任务清单-Todo-List

**版本**：v0.1.0
**日期**：2026-08-09
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
| `verify.mjs` 质量门 | ⏳ 待建 | T-M4-005 交付 |
| `check-desktop-security.mjs` 安全断言 | ⏳ 待建 | T-M4-007 交付 |

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
| 单件 | 阶段2 单件 | T-M0-006 ~ T-M0-008、T-M1-001 ~ T-M1-005（单组件可独立运行） |
| 集成 | 阶段3 集成 | T-M1-006 ~ T-M1-008、T-M2-001 ~ T-M2-004（组件间协同） |
| 组装 | 阶段4 组装 | T-M2-005 ~ T-M2-011、T-M3-001 ~ T-M3-006（端到端功能闭环） |
| 冒烟E2E | 阶段5 冒烟E2E | T-M1-010、T-M2-012、T-M3-008、T-M4-010（系统级验收） |

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

**门槛 B：安全不变量六条**

- 引用 01-TRD 安全不变量六条，由 `check-desktop-security.mjs`（T-M4-007）断言：
  1. sandbox:true 不可关闭
  2. CSP 严格策略不可放宽
  3. nodeIntegration:false 不可开启
  4. contextIsolation:true 不可关闭
  5. webSecurity:true 不可关闭
  6. credential-vault 须使用 safeStorage 加密

**门槛 C：确定性验证**

- 继承测试（v0.01 290 passed）复验通过
- 当前里程碑系统冒烟 + E2E 全通过
- `verify.mjs`（T-M4-005）质量门通过

**门槛 D：文档治理检查**

- `check-docs-governance.mjs`（T-M3-007）通过
- `check-contract-coverage.mjs`（T-M4-006）契约 AST 校验通过
- 04-Todo 证据列已填写

### §5.3 退回机制

| 触发条件 | 退回动作 |
|---|---|
| 单件测试失败 | 组件回退至阶段1 下载储存，重新进入阶段2 |
| 集成测试失败（契约违例） | 组件回退至阶段2 单件，重新进入阶段3 |
| 组装阶段功能不闭环 | 组件回退至阶段3 集成，重新进入阶段4 |
| 冒烟E2E 失败 | 组件回退至阶段4 组装，重新进入阶段5 |
| 安全不变量六条任一失败 | 组件回退至阶段1，修复后重新走完五阶段 |
| 合并 master 后发现缺陷 | 不回退，新建 `FR-<序号>` 修复记录（见 §8） |

---

## §6 里程碑规划

### §6.0 v0.01 继承基线（已完成）

| 项目 | 状态 | 说明 |
|---|---|---|
| malf-engine | ✅ done | MALF 引擎核心 |
| malf-data | ✅ done | MALF 数据层 |
| riskbench-shared | ✅ done | 共享类型与工具 |
| malf-signal | ✅ done | 信号计算 |
| malf-backtest | ✅ done | 回测引擎 |
| 继承测试套件 | ✅ 290 passed | v0.02 须复验通过，不得回退 |

### §6.1 总览（M0-M4 五里程碑）

| 里程碑 | 名称 | 目标 | 任务数（预估） |
|---|---|---|---|
| M0 | 骨架 | Electron 五件骨架 + 安全沙箱 + MALF Adapter 试炼 | ~8 |
| M1 | 核心闭环 | MALF 查询工具 + 只读 Viewer + DuckDB 只读访问 | ~10 |
| M2 | 完整闭环 | RISK 风险声明 + AI 解读 + 回测报告 Viewer | ~12 |
| M3 | 打磨 | 技能系统 + prompt 模板 + 多模型切换 + 性能优化 | ~8 |
| M4 | 业务接线+打包部署 | 设置页 + 模型配置 + 打包冒烟 | ~10 |
| **合计** | — | — | **~48** |

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

**退出门槛**：

- [ ] Electron 五件骨架可启动
- [ ] 安全不变量六条全通过（check-desktop-security.mjs）
- [ ] MALF Adapter 试炼场调通（Python ↔ TS JSON Lines）
- [ ] v0.01 继承测试 290 passed 复验通过

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

**目标**：交付技能系统 + prompt 模板 + 多模型切换 + 性能优化 + 文档治理检查脚本。

**核心交付**：

1. 技能系统（malf-snapshot-explain / risk-declare / backtest-report-read）
2. prompt 模板（/declare-risk / /explain-snapshot / /compare-backtest）
3. 多模型切换 UI（pi provider 体系）
4. model_select 钩子 + 业务数据根 config/models.json 持久化
5. export_csv 工具 + CSV 导出 UI
6. 性能优化（Electron 启动 < 3s / 查询 < 500ms）
7. 文档治理检查脚本（check-docs-governance.mjs）

**退出门槛**：

- [ ] 技能系统 3 个技能可加载
- [ ] prompt 模板 3 个可调用
- [ ] 多模型切换 UI 全通
- [ ] 性能基准达标（启动 < 3s / 查询 < 500ms）
- [ ] M3 系统冒烟 + E2E 全通过

### §6.6 M4 业务接线+打包部署

**目标**：交付设置页（模型/凭据/路径配置）+ 质量门脚本三件套（verify.mjs / check-contract-coverage.mjs / check-desktop-security.mjs）+ 打包冒烟。

**核心交付**：

1. ⚙️ 设置 Tab 骨架
2. models_config_get / set 工具 + UI
3. credentials_get / set 工具 + UI
4. 路径配置 UI（DATA_ROOT / TDX_ROOT / runtime）
5. verify.mjs 统一质量门脚本
6. check-contract-coverage.mjs 契约 AST 校验
7. check-desktop-security.mjs 安全不变量六条断言
8. 打包配置（electron-builder）
9. 打包冒烟测试

**退出门槛**：

- [ ] 设置 Tab 全功能（模型/凭据/路径）
- [ ] verify.mjs + check-contract-coverage.mjs + check-desktop-security.mjs 全通过
- [ ] 打包冒烟测试通过
- [ ] M4 系统冒烟 + E2E + 打包验证全通过

---

## §7 任务登记表

### §7.1 M0 任务大纲（壳层骨架）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M0-001 | Electron main 进程骨架 | 壳层 | 壳层 | P0 | pending | 下载储存 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/main/index.ts` | — | 无前置 |
| T-M0-002 | preload 受控桥接 + 白名单 | 壳层 | 壳层 | P0 | pending | 下载储存 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/preload/index.ts` | — | 依赖 T-M0-001 |
| T-M0-003 | renderer React 骨架 + 三栏布局 | 壳层 | Viewer | P0 | pending | 下载储存 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/` | — | 依赖 T-M0-001 |
| T-M0-004 | agent-host pi 嵌入 + createAgentSession | 壳层 | 壳层 | P0 | pending | 下载储存 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/agent-host/` | — | 依赖 T-M0-001 |
| T-M0-005 | contract RPC + MessagePort + 统一信封 | 壳层 | 通用 | P0 | pending | 下载储存 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/contract/` | — | 依赖 T-M0-001~004 |
| T-M0-006 | 安全沙箱（sandbox:true + 严格 CSP） | 壳层 | 壳层 | P0 | pending | 单件 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | `apps/desktop/src/main/security.ts` | — | 依赖 T-M0-001~005 |
| T-M0-007 | credential-vault safeStorage | 壳层 | 壳层 | P0 | pending | 单件 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | `apps/desktop/src/main/credential-vault.ts` | — | 依赖 T-M0-006 |
| T-M0-008 | MALF Adapter 试炼场（Python ↔ TS JSON Lines） | 公用零件 | MALF | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/malf-adapter/` | — | 依赖 T-M0-005 |

### §7.2 M1 任务大纲（核心闭环）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M1-001 | DuckDB 只读访问层 + 连接池 | 公用零件 | 通用 | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/db/duckdb-readonly.ts` | — | 依赖 T-M0-008 |
| T-M1-002 | pi 扩展空壳 + registerTool 框架 | 公用零件 | 通用 | P0 | pending | 单件 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/pi-extension/` | — | 依赖 T-M0-004 |
| T-M1-003 | query_snapshot 工具 | 业务模块 | MALF | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/query-snapshot.ts` | — | 依赖 T-M1-001/002 |
| T-M1-004 | query_signals 工具 | 业务模块 | MALF | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/query-signals.ts` | — | 依赖 T-M1-001/002 |
| T-M1-005 | query_symbol_list / query_timeframes 工具 | 业务模块 | MALF | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/query-meta.ts` | — | 依赖 T-M1-001/002 |
| T-M1-006 | 📊 市场事实 Tab（44 字段展示 + honest degradation） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/market-facts.tsx` | — | 依赖 T-M1-003/004/005 |
| T-M1-007 | 💬 AI 对话 Tab（pi 原生 AI 承载） | 业务模块 | AI | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/ai-chat.tsx` | — | 依赖 T-M0-004 |
| T-M1-008 | 左侧栏标的导航 + 周期选择 | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/sidebar/` | — | 依赖 T-M1-005 |
| T-M1-009 | v0.01 继承测试复验（290 passed） | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/inherited/` | — | 不得回退 |
| T-M1-010 | M1 系统冒烟 + E2E | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m1.spec.ts` | — | 依赖 T-M1-001~008 |

### §7.3 M2 任务大纲（完整闭环）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M2-001 | risk_declarations 表 + DuckDB schema | 数据层 | RISK | P0 | pending | 单件 | [05-ERD](./05-数据模型-ERD-Data-Model.md) | `apps/desktop/src/db/schema/risk-declarations.sql` | — | 依赖 T-M1-001 |
| T-M2-002 | declare_risk / list_risk_declarations 工具 | 业务模块 | RISK | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/risk-declare.ts` | — | 依赖 T-M2-001 |
| T-M2-003 | update_risk_declaration / delete_risk_declaration 工具 | 业务模块 | RISK | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/risk-mutate.ts` | — | 依赖 T-M2-001 |
| T-M2-004 | check_risk_contradiction 工具 | 业务模块 | RISK | P1 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/risk-contradiction.ts` | — | 依赖 T-M2-002/003 |
| T-M2-005 | ⚠️ 风险声明 Tab | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/risk-declarations.tsx` | — | 依赖 T-M2-002/003 |
| T-M2-006 | ai_interpret_snapshot 工具（标注"AI 解读"） | 业务模块 | AI | P2 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/ai-interpret-snapshot.ts` | — | 依赖 T-M1-003 |
| T-M2-007 | ai_interpret_backtest 工具 | 业务模块 | AI | P2 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/ai-interpret-backtest.ts` | — | 依赖 T-M2-008 |
| T-M2-008 | run_backtest_report / read_backtest_report 工具 | 业务模块 | BENCH | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/backtest-report.ts` | — | 依赖 T-M1-001 |
| T-M2-009 | 📋 回测报告 Tab + HTML 预览（独立 CSP） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/backtest-report.tsx` | — | 依赖 T-M2-008 |
| T-M2-010 | AI 解读标注机制（每条 AI 回复标"AI 解读"） | 业务模块 | AI | P0 | pending | 组装 | [02-PRD](./02-PRD-产品需求-Product-Requirements.md) | `apps/desktop/src/renderer/ai-badge.tsx` | — | 依赖 T-M2-006/007 |
| T-M2-011 | 三层权威可视化（市场事实/用户声明/AI 解读分层） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/three-layer-view.tsx` | — | 依赖 T-M2-005/010 |
| T-M2-012 | M2 系统冒烟 + E2E | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m2.spec.ts` | — | 依赖 T-M2-001~011 |

### §7.4 M3 任务大纲（打磨）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M3-001 | 技能系统（malf-snapshot-explain / risk-declare / backtest-report-read） | 打磨 | 通用 | P1 | pending | 组装 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/skills/` | — | 依赖 M2 完成 |
| T-M3-002 | prompt 模板（/declare-risk / /explain-snapshot / /compare-backtest） | 打磨 | AI | P1 | pending | 组装 | [07-工作流](./07-工作流-Workflow.md) | `apps/desktop/src/prompts/` | — | 依赖 T-M3-001 |
| T-M3-003 | 多模型切换 UI（pi provider 体系） | 打磨 | AI | P1 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/model-switcher.tsx` | — | 依赖 T-M3-004 |
| T-M3-004 | model_select 钩子 + 业务数据根 config/models.json 持久化 | 打磨 | AI | P1 | pending | 集成 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/src/main/model-config.ts` | — | 依赖 T-M0-007 |
| T-M3-005 | export_csv 工具 + CSV 导出 UI | 打磨 | MALF | P1 | pending | 组装 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/export-csv.ts` | — | 依赖 T-M1-003/004 |
| T-M3-006 | 性能优化（Electron 启动 < 3s / 查询 < 500ms） | 打磨 | 通用 | P1 | pending | 组装 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | — | — | 依赖 M1/M2 完成 |
| T-M3-007 | 文档治理检查脚本（check-docs-governance.mjs） | 治理 | 通用 | P1 | pending | 单件 | [10-开发规范](./10-开发规范-Dev-Rules.md) | `scripts/check-docs-governance.mjs` | — | 无前置 |
| T-M3-008 | M3 系统冒烟 + E2E | 验证 | 通用 | P1 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m3.spec.ts` | — | 依赖 T-M3-001~007 |

### §7.5 M4 任务大纲（业务接线+打包部署）

| task-id | 标题 | 分类 | 子系统 | 优先级 | 状态 | 治理阶段 | 关联文档 | 产物 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| T-M4-001 | ⚙️ 设置 Tab 骨架 | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/settings.tsx` | — | 依赖 M1 完成 |
| T-M4-002 | models_config_get/set 工具 + UI | 业务模块 | AI | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/models-config.ts` | — | 依赖 T-M3-004 |
| T-M4-003 | credentials_get/set 工具 + UI | 业务模块 | 壳层 | P0 | pending | 集成 | [06-API](./06-API契约-API-Contracts.md) | `apps/desktop/src/tools/credentials.ts` | — | 依赖 T-M0-007 |
| T-M4-004 | 路径配置 UI（DATA_ROOT / TDX_ROOT / runtime） | 业务模块 | Viewer | P0 | pending | 组装 | [09-UI](./09-使用者介面-UI-Design.md) | `apps/desktop/src/renderer/tabs/settings-paths.tsx` | — | 依赖 T-M4-001 |
| T-M4-005 | verify.mjs 统一质量门脚本 | 治理 | 通用 | P0 | pending | 单件 | [10-开发规范](./10-开发规范-Dev-Rules.md) | `scripts/verify.mjs` | — | 无前置 |
| T-M4-006 | check-contract-coverage.mjs 契约 AST 校验 | 治理 | 通用 | P0 | pending | 单件 | [06-API](./06-API契约-API-Contracts.md) | `scripts/check-contract-coverage.mjs` | — | 无前置 |
| T-M4-007 | check-desktop-security.mjs 安全不变量六条断言 | 治理 | 壳层 | P0 | pending | 单件 | [01-TRD](./01-TRD-技术需求-Technical-Requirements.md) | `scripts/check-desktop-security.mjs` | — | 无前置 |
| T-M4-008 | 打包配置（electron-builder） | 部署 | 壳层 | P0 | pending | 组装 | [03-架构设计](./03-架构设计-Architecture-Design.md) | `apps/desktop/electron-builder.yml` | — | 依赖 M3 完成 |
| T-M4-009 | 打包冒烟测试 | 部署 | 壳层 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/packaging/smoke.spec.ts` | — | 依赖 T-M4-008 |
| T-M4-010 | M4 系统冒烟 + E2E + 打包验证 | 验证 | 通用 | P0 | pending | 冒烟E2E | [08-测试验收](./08-测试验收-Test-Plan.md) | `tests/e2e/m4.spec.ts` | — | 依赖 T-M4-001~009 |

### §7.6 全局执行顺序表

| 执行序 | task-id | 里程碑 | 标题 | 前置依赖 |
|---|---|---|---|---|
| 1 | T-M0-001 | M0 | Electron main 进程骨架 | 无 |
| 2 | T-M0-002 | M0 | preload 受控桥接 + 白名单 | T-M0-001 |
| 3 | T-M0-003 | M0 | renderer React 骨架 + 三栏布局 | T-M0-001 |
| 4 | T-M0-004 | M0 | agent-host pi 嵌入 + createAgentSession | T-M0-001 |
| 5 | T-M0-005 | M0 | contract RPC + MessagePort + 统一信封 | T-M0-001 ~ T-M0-004 |
| 6 | T-M0-006 | M0 | 安全沙箱（sandbox:true + 严格 CSP） | T-M0-001 ~ T-M0-005 |
| 7 | T-M0-007 | M0 | credential-vault safeStorage | T-M0-006 |
| 8 | T-M0-008 | M0 | MALF Adapter 试炼场（Python ↔ TS JSON Lines） | T-M0-005 |
| 9 | T-M1-001 | M1 | DuckDB 只读访问层 + 连接池 | T-M0-008 |
| 10 | T-M1-002 | M1 | pi 扩展空壳 + registerTool 框架 | T-M0-004 |
| 11 | T-M1-003 | M1 | query_snapshot 工具 | T-M1-001、T-M1-002 |
| 12 | T-M1-004 | M1 | query_signals 工具 | T-M1-001、T-M1-002 |
| 13 | T-M1-005 | M1 | query_symbol_list / query_timeframes 工具 | T-M1-001、T-M1-002 |
| 14 | T-M1-006 | M1 | 📊 市场事实 Tab（44 字段展示 + honest degradation） | T-M1-003、T-M1-004、T-M1-005 |
| 15 | T-M1-007 | M1 | 💬 AI 对话 Tab（pi 原生 AI 承载） | T-M0-004 |
| 16 | T-M1-008 | M1 | 左侧栏标的导航 + 周期选择 | T-M1-005 |
| 17 | T-M1-009 | M1 | v0.01 继承测试复验（290 passed） | 无（可并行） |
| 18 | T-M1-010 | M1 | M1 系统冒烟 + E2E | T-M1-001 ~ T-M1-008 |
| 19 | T-M2-001 | M2 | risk_declarations 表 + DuckDB schema | T-M1-001 |
| 20 | T-M2-002 | M2 | declare_risk / list_risk_declarations 工具 | T-M2-001 |
| 21 | T-M2-003 | M2 | update_risk_declaration / delete_risk_declaration 工具 | T-M2-001 |
| 22 | T-M2-004 | M2 | check_risk_contradiction 工具 | T-M2-002、T-M2-003 |
| 23 | T-M2-005 | M2 | ⚠️ 风险声明 Tab | T-M2-002、T-M2-003 |
| 24 | T-M2-006 | M2 | ai_interpret_snapshot 工具（标注"AI 解读"） | T-M1-003 |
| 25 | T-M2-007 | M2 | ai_interpret_backtest 工具 | T-M2-008 |
| 26 | T-M2-008 | M2 | run_backtest_report / read_backtest_report 工具 | T-M1-001 |
| 27 | T-M2-009 | M2 | 📋 回测报告 Tab + HTML 预览（独立 CSP） | T-M2-008 |
| 28 | T-M2-010 | M2 | AI 解读标注机制（每条 AI 回复标"AI 解读"） | T-M2-006、T-M2-007 |
| 29 | T-M2-011 | M2 | 三层权威可视化（市场事实/用户声明/AI 解读分层） | T-M2-005、T-M2-010 |
| 30 | T-M2-012 | M2 | M2 系统冒烟 + E2E | T-M2-001 ~ T-M2-011 |
| 31 | T-M3-001 | M3 | 技能系统（3 个技能） | M2 完成 |
| 32 | T-M3-002 | M3 | prompt 模板（3 个） | T-M3-001 |
| 33 | T-M3-003 | M3 | 多模型切换 UI（pi provider 体系） | T-M3-004 |
| 34 | T-M3-004 | M3 | model_select 钩子 + config/models.json 持久化 | T-M0-007 |
| 35 | T-M3-005 | M3 | export_csv 工具 + CSV 导出 UI | T-M1-003、T-M1-004 |
| 36 | T-M3-006 | M3 | 性能优化（启动 < 3s / 查询 < 500ms） | M1、M2 完成 |
| 37 | T-M3-007 | M3 | 文档治理检查脚本（check-docs-governance.mjs） | 无（可并行） |
| 38 | T-M3-008 | M3 | M3 系统冒烟 + E2E | T-M3-001 ~ T-M3-007 |
| 39 | T-M4-001 | M4 | ⚙️ 设置 Tab 骨架 | M1 完成 |
| 40 | T-M4-002 | M4 | models_config_get/set 工具 + UI | T-M3-004 |
| 41 | T-M4-003 | M4 | credentials_get/set 工具 + UI | T-M0-007 |
| 42 | T-M4-004 | M4 | 路径配置 UI（DATA_ROOT / TDX_ROOT / runtime） | T-M4-001 |
| 43 | T-M4-005 | M4 | verify.mjs 统一质量门脚本 | 无（可并行） |
| 44 | T-M4-006 | M4 | check-contract-coverage.mjs 契约 AST 校验 | 无（可并行） |
| 45 | T-M4-007 | M4 | check-desktop-security.mjs 安全不变量六条断言 | 无（可并行） |
| 46 | T-M4-008 | M4 | 打包配置（electron-builder） | M3 完成 |
| 47 | T-M4-009 | M4 | 打包冒烟测试 | T-M4-008 |
| 48 | T-M4-010 | M4 | M4 系统冒烟 + E2E + 打包验证 | T-M4-001 ~ T-M4-009 |

> 说明：表中 `...` 表示中间序号任务按 §7.1 ~ §7.5 顺序衔接，完整序号见上表 1-48。无前置依赖的任务（T-M1-009、T-M3-007、T-M4-005/006/007）可与同里程碑其他任务并行执行，但不得违反"单一执行任务门禁"（铁律 4）。

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

| 里程碑 | 总任务数 | pending | in_progress | testing | done | blocked |
|---|---|---|---|---|---|---|
| M0 | 8 | 8 | 0 | 0 | 0 | 0 |
| M1 | 10 | 10 | 0 | 0 | 0 | 0 |
| M2 | 12 | 12 | 0 | 0 | 0 | 0 |
| M3 | 8 | 8 | 0 | 0 | 0 | 0 |
| M4 | 10 | 10 | 0 | 0 | 0 | 0 |
| **合计** | **48** | **48** | **0** | **0** | **0** | **0** |

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
| P0 | 38 | 79.2% |
| P1 | 7 | 14.6% |
| P2 | 2 | 4.2% |
| P3 | 0 | 0.0% |
| **合计** | **47** | _注：T-M1-005 含两个工具，按 1 任务计_ |

---

## §10 版本历史

| 版本 | 日期 | 变更说明 | 维护者 |
|---|---|---|---|
| v0.1.0 | 2026-08-09 | 初版草案：M0-M4 五里程碑 + 48 任务大纲 + 组件治理看板 + 退出门槛 + 全局执行顺序表 | pi-malf-riskbench v0.02 |

---

**文档维护**：任务状态变更时更新

**最后更新**：2026-08-09
