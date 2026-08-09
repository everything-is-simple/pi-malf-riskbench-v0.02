# 12-目录治理-Directory-Governance

**版本**：v0.1.0
**日期**：2026-08-09
**状态**：📝 草案（待用户审查批准）
**上游**：AGENTS.md（待创建）§9.5、[01-TRD](./01-TRD-技术需求-Technical-Requirements.md) §7 决策 3、[04-任务清单](./04-任务清单-Todo-List.md) §4、[11-组件装配](./11-组件装配-Component-Assembly.md) §3
**下游**：无
**用途**：v0.02 所有目录职责定义与边界隔离 SoT

---

## §1 概述

### 1.1 治理原则四句

v0.02 目录治理遵循四条不可违反的根本原则：

1. **源码不存真实数据**：仓库源码内禁止出现真实密钥、真实用户数据、真实数据库文件（`.duckdb`/`.parquet`）等运行态数据；只能保留示例/测试桩数据，且须明确标注。
2. **试炼场不变成主系统**：试炼场（composer）用于 MALF Adapter 试炼与边界探索，禁止演化为承载生产逻辑的主系统；不 import 主仓、不被主仓依赖。
3. **运行数据不进 Git**：所有运行时产物（runs、logs、tmp、cache、数据库、Parquet 备份）一律隔离在主仓之外的运行时目录，不进 Git 历史。
4. **备份不反向污染当前 SoT**：备份目录（backup）是只读快照，禁止从备份回灌或反向复制到当前 SoT 主仓/试炼场/运行时。

### 1.2 治理目标

- **职责单一**：每个目录承担单一明确职责，避免多用途叠加导致污染。
- **边界隔离**：源码、试炼场、运行时、业务数据、外部数据源、会话目录六类物理隔离，互不交叉写入。
- **可审计**：写权限矩阵明确，每个目录的写入主体唯一可追溯。
- **可清空**：派生数据目录（运行时、备份、数据库）应可在不影响 SoT 的前提下整体清空重建。
- **只读保护**：外部数据源与历史废弃目录强制只读，禁止任何修改/删除/迁移。

### 1.3 与其他文档关系

- **上游**：AGENTS.md（安全约束最高权威，不可被本文档覆盖）、01-TRD §7 决策 3（物理隔离三层定案）、04-任务清单 §4（目录创建任务序列）、11-组件装配 §3（组件装配路径约束）。
- **下游**：无直接下游，本文档是目录职责与边界隔离的终态 SoT。
- **权威**：本文档定义的目录职责、写权限矩阵、隔离规则经用户批准后，所有 v0.02 子文档与任务必须遵守。

---

## §2 目录总览

### 2.1 目录地图（Z 盘拓扑）

```
Z:\
├── pi-malf-riskbench-v0.02\                 ← v0.02 主仓（源码+文档+测试+计划）
├── pi-malf-riskbench-v0.02-composer\        ← v0.02 试炼场（MALF Adapter 试炼）
├── pi-malf-riskbench-v0.02-runtime\         ← v0.02 运行时沙箱（可清空）
│
├── ai-malf-riskbench\                       ← v0.01 主仓（治理文档+编排胶水）
├── ai-malf-riskbench-components\            ← v0.01 组件实现（5 个独立 Git 仓库）
├── ai-malf-riskbench-data\                  ← 业务数据根（DuckDB + Parquet）
├── ai-malf-riskbench-Definitive\            ← MALF 等领域权威定义（只读）
├── ai-malf-riskbench-everyday\              ← 每日工作记录
├── ai-malf-riskbench-history\               ← 历史废弃项目（只读）
├── ai-malf-riskbench--runtime\              ← v0.01 运行时沙箱（可清空）
├── ai-malf-riskbench-worktrees\             ← v0.01 git worktree 隔离区
├── ai-malf-riskbench-backup\                ← v0.01 系统备份
│
├── new_tdx64\                               ← TDX 原始行情权威（只读）
└── riskbench-data-old\                      ← 旧版 DuckDB 交叉核验源（只读）

~/.pi/agent/                                  ← pi 会话目录（pi 自管，非 Z 盘）
```

### 2.2 目录职责速查表

| # | 目录 | 用途 | 读写权限 | 是否进 Git | 写入主体 |
|---|------|------|:--:|:--:|------|
| 1 | `Z:\pi-malf-riskbench-v0.02\` | v0.02 主仓（源码+文档+测试+计划） | 读写 | ✅ 进 Git | v0.02 开发者/pi |
| 2 | `Z:\pi-malf-riskbench-v0.02-composer\` | v0.02 试炼场（MALF Adapter 试炼） | 读写 | ❌ 不进 Git | v0.02 试炼任务 |
| 3 | `Z:\pi-malf-riskbench-v0.02-runtime\` | v0.02 运行时沙箱 | 读写（可清空） | ❌ 不进 Git | v0.02 主进程 |
| 4 | `Z:\ai-malf-riskbench\` | v0.01 主仓（治理文档+编排胶水） | 读写 | ✅ 进 Git | v0.01 开发者 |
| 5 | `Z:\ai-malf-riskbench-components\` | v0.01 组件实现（5 个独立 Git 仓库） | 读写 | ✅ 进 Git | v0.01 组件开发者 |
| 6 | `Z:\ai-malf-riskbench-data\` | DuckDB 生产库 + Parquet 备份 | 读写（派生） | ❌ 不进 Git | v0.01 run_pipeline.ps1 |
| 7 | `Z:\ai-malf-riskbench-Definitive\` | MALF 等领域权威定义文档 | 只读 | ✅ 进 Git（只读） | — |
| 8 | `Z:\ai-malf-riskbench-everyday\` | 每日工作记录 | 读写 | ❌ 不进 Git | 用户 |
| 9 | `Z:\ai-malf-riskbench-history\` | 历史废弃项目（14+） | 只读 | — | — |
| 10 | `Z:\ai-malf-riskbench--runtime\` | v0.01 运行时沙箱 | 读写（可清空） | ❌ 不进 Git | v0.01 主进程 |
| 11 | `Z:\ai-malf-riskbench-worktrees\` | v0.01 git worktree 任务开发隔离区 | 读写 | ❌ 不进 Git | v0.01 任务开发者 |
| 12 | `Z:\ai-malf-riskbench-backup\` | v0.01 系统备份 | 读写 | ❌ 不进 Git | 备份脚本 |
| 13 | `Z:\new_tdx64\` | 原始行情权威（TDX） | 只读 | — | — |
| 14 | `Z:\riskbench-data-old\` | 旧版 DuckDB 交叉核验源 | 只读 | — | — |
| 15 | `~/.pi/agent/` | pi 会话目录（pi 自管） | 读写 | ❌ 不进 Git | pi 内核 |

---

## §3 v0.02 主仓库目录（Z:\pi-malf-riskbench-v0.02\）

### 3.1 职责：源码 + 文档 + 测试 + 计划

v0.02 主仓承载：

- **源码**：Electron 五件骨架（main/preload/renderer/agent-host/contract）+ MALF Adapter + pi 扩展层 + DuckDB 只读访问层。
- **文档**：13 份设计文档 + prep 参考点核对表。
- **测试**：vitest 单件/集成测试 + pytest 单件测试 + E2E（vitest + Electron）。
- **计划**：任务计划（`.plan/`，唯一执行中）与实施记录（`.record/`，每任务一份）。

### 3.2 规则五条

主仓内禁止存在以下五类内容：

1. **不存运行数据**：禁止出现 runs/logs/tmp/cache 等运行时产物（写入 `Z:\pi-malf-riskbench-v0.02-runtime\`）。
2. **不存数据库**：禁止出现 `*.duckdb`/`*.parquet` 生产数据文件（写入 `Z:\ai-malf-riskbench-data\`）。
3. **不存密钥**：禁止出现真实密钥、`.env.local`、`credentials.json` 等敏感信息（写入 pi 会话目录或忽略）。
4. **不存组件代码**：禁止出现 v0.01 五组件源码副本（通过 Adapter 子进程桥接访问 `Z:\ai-malf-riskbench-components\`）。
5. **不存 worktree**：禁止在主仓内直接开发任务分支（v0.02 暂不启用 worktree 隔离；如启用须落 `Z:\pi-malf-riskbench-v0.02-worktrees\`，不在主仓内）。

### 3.3 子目录结构

```
Z:\pi-malf-riskbench-v0.02\
├── src/                    ← 源码（main/preload/renderer/agent-host/contract）
├── docs/                   ← 设计文档（13 份 + prep）
├── scripts/                ← 质量门脚本（verify.mjs / check-docs-governance.mjs / check-contract-coverage.mjs）
├── .plan/                  ← 任务计划（唯一执行中）
├── .record/                ← 实施记录（每任务一份）
├── .pi/                    ← pi 扩展/技能/prompt 模板
│   ├── extensions/
│   ├── skills/
│   └── prompts/
├── package.json            ← pnpm + pi manifest
├── tsconfig.json
├── .gitignore
└── README.md
```

**子目录职责**：

| 子目录 | 职责 | 进 Git |
|---|---|:--:|
| `src/` | 源码（main + preload + renderer + agent-host + contract 五件骨架 + MALF Adapter + pi 扩展） | ✅ |
| `docs/` | 设计文档（13 份 + prep 参考点核对表） | ✅ |
| `scripts/` | 质量门脚本（verify / check-docs-governance / check-contract-coverage） | ✅ |
| `.plan/` | 任务计划（唯一执行中任务，进 Git 便于追踪） | ✅ |
| `.record/` | 实施记录（每任务一份记录，进 Git 便于审计） | ✅ |
| `.pi/` | pi 扩展/技能/prompt 模板（extensions/ + skills/ + prompts/） | ✅ |

### 3.4 .gitignore

主仓 `.gitignore` 不提交清单（继承 v0.01 + v0.02 新增）：

**敏感信息类**：
- 真实密钥 / `.env.local` / `credentials.json`
- 资料原文 / 完整 UUID / 用户数据

**依赖与缓存类**：
- `node_modules/`
- `venv/` / `__pycache__/`
- 临时文件 / `*.log`

**试炼场与运行时类**：
- 试炼场代码副本（`Z:\pi-malf-riskbench-v0.02-composer\` 内容）
- 运行数据（`Z:\pi-malf-riskbench-v0.02-runtime\` 内容）

**生产数据类**：
- `*.duckdb` / `*.parquet`（生产数据，写入业务数据根）

**保留项（不忽略）**：
- `.plan/` 保留（计划进 Git）
- `.record/` 保留（记录进 Git）

---

## §4 v0.02 试炼场目录（Z:\pi-malf-riskbench-v0.02-composer\）

**职责**：MALF Adapter 试炼场，用于在隔离环境中验证 Adapter 桥接、子进程 JSON 协议、DuckDB 只读访问等边界探索，避免污染主仓。

**规则**：

| 规则 | 说明 |
|---|---|
| 不进 Git | 试炼场整体不进 Git 历史（通过 `.gitignore` 忽略主仓内的副本引用） |
| 不 import 主仓 | 试炼场代码禁止 import 主仓模块，保持独立可弃 |
| 不被主仓依赖 | 主仓源码禁止 import 试炼场任何模块 |
| 可整体清空 | 试炼场内容可在不影响 SoT 的前提下整体清空重建 |
| 单一职责 | 仅承载试炼代码与临时验证产物，不承载生产逻辑 |

**结构（建议）**：

```
Z:\pi-malf-riskbench-v0.02-composer\
├── experiments/          ← 试炼实验代码
├── scratch/               ← 临时草稿
└── README.md             ← 试炼场说明（不进 Git）
```

---

## §5 v0.02 运行时目录（Z:\pi-malf-riskbench-v0.02-runtime\）

**职责**：v0.02 运行时沙箱，承载 Electron 主进程运行日志、任务运行产物、临时文件与缓存。

**结构**：

```
Z:\pi-malf-riskbench-v0.02-runtime\
├── runs/<task-id>/        ← 任务运行产物（每任务一目录）
│   ├── input/             ← 任务输入
│   ├── output/            ← 任务输出
│   └── manifest.json      ← 任务运行清单
├── logs/                  ← 运行日志
├── tmp/                   ← 临时文件
└── cache/                 ← 缓存
```

**规则**：

| 规则 | 说明 |
|---|---|
| 不进 Git | 运行时整体不进 Git 历史 |
| 可清空 | runs/logs/tmp/cache 均可在不影响 SoT 的前提下整体清空 |
| 写权限唯一 | 仅 v0.02 主进程可写入，禁止其他主体写入 |
| 不污染生产库 | 运行时数据禁止回灌业务数据根（`Z:\ai-malf-riskbench-data\`） |
| 任务隔离 | 每任务独立目录 `runs/<task-id>/`，禁止跨任务交叉写入 |

---

## §6 v0.01 继承目录（Z:\ai-malf-riskbench*）

### 6.1 v0.01 主仓（Z:\ai-malf-riskbench\）

**职责**：v0.01 主仓，承载治理文档与编排胶水。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench\` |
| 用途 | v0.01 治理文档 + 编排胶水 |
| 读写权限 | 读写 |
| 是否进 Git | ✅ 进 Git |
| 远端 | github.com/everything-is-simple/ai-malf-riskbench |
| v0.02 访问方式 | 只读参考（提取已批准领域事实，禁止直接 import） |

### 6.2 组件仓（Z:\ai-malf-riskbench-components\）

**职责**：v0.01 五组件实现，5 个独立 Git 仓库。

| 组件 | 职责 | 测试覆盖 |
|---|---|---|
| malf-engine | MALF 引擎（核心） | 115 passed |
| malf-data | 数据接入（TDX + DuckDB） | 46 passed |
| riskbench-shared | 共享配置/路径层 | 10 passed |
| malf-signal | 信号层（四事件码） | 37 passed |
| malf-backtest | 验证层（确定性规则） | 31 passed |

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench-components\` |
| 用途 | v0.01 组件实现（5 个独立 Git 仓库） |
| 读写权限 | 读写 |
| 是否进 Git | ✅ 进 Git |
| v0.02 访问方式 | 通过 MALF Adapter 子进程桥接，禁止源码 import |

### 6.3 数据库（Z:\ai-malf-riskbench-data\）

> 详见 §9 业务数据根。

### 6.4 权威定义（Z:\ai-malf-riskbench-Definitive\，只读）

**职责**：MALF 等领域权威定义文档，领域语义最高权威。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench-Definitive\` |
| 用途 | MALF 等领域权威定义文档 |
| 读写权限 | 只读 |
| 是否进 Git | ✅ 进 Git（只读） |
| 远端 | github.com/everything-is-simple/malf-Definitive |
| 关键内容 | 7 份权威文档（含 `MALF_Definitive_v2_1-deepseek-20260726\`） |

**规则**：历史代码与 Definitive 冲突时，以 Definitive 为准。

### 6.5 每日记录（Z:\ai-malf-riskbench-everyday\）

**职责**：每日工作记录，按日期 `YYYY-MM-DD.md` 组织。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench-everyday\` |
| 用途 | 每日工作记录 |
| 读写权限 | 读写 |
| 是否进 Git | ❌ 不进 Git |
| 命名规则 | `YYYY-MM-DD.md` |

### 6.6 历史废弃（Z:\ai-malf-riskbench-history\，只读）

**职责**：历史废弃项目（14+），强制只读。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench-history\` |
| 用途 | 历史废弃项目（14+） |
| 读写权限 | 只读 |
| 是否进 Git | ❌ 不进 Git |

**规则**：禁止复制代码 / 禁止迁移目录 / 禁止以旧仓库为模板克隆复杂度。

### 6.7 v0.01 运行时（Z:\ai-malf-riskbench--runtime\）

**职责**：v0.01 运行时沙箱。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench--runtime\`（注意双连字符） |
| 用途 | v0.01 运行时沙箱 |
| 读写权限 | 读写（可清空） |
| 是否进 Git | ❌ 不进 Git |
| 子目录 | `runs/` + `logs/` + `tmp/` + `backups/` |

### 6.8 worktrees（Z:\ai-malf-riskbench-worktrees\）

**职责**：v0.01 git worktree 任务开发隔离区。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench-worktrees\` |
| 用途 | v0.01 git worktree 任务开发隔离区 |
| 读写权限 | 读写 |
| 是否进 Git | ❌ 不进 Git |

**规则**：主仓内禁止直接开发，任务开发须落 worktree 隔离区。

### 6.9 备份（Z:\ai-malf-riskbench-backup\）

**职责**：v0.01 系统备份，含 Parquet/DuckDB 导出与源码 ZIP。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\ai-malf-riskbench-backup\` |
| 用途 | v0.01 系统备份 |
| 读写权限 | 读写 |
| 是否进 Git | ❌ 不进 Git |
| 内容 | Parquet/DuckDB 导出 + 源码 ZIP |

**规则**：备份不反向污染当前 SoT；禁止从备份回灌主仓/试炼场/运行时。

---

## §7 外部数据源目录（只读）

### 7.1 TDX 原始行情（Z:\new_tdx64\）

**职责**：原始行情权威（TDX），提供 32B `.day` 行情文件。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\new_tdx64\` |
| 用途 | 原始行情权威（TDX） |
| 读写权限 | 只读 |
| 关键路径 | `vipdoc/sh/lday/` + `vipdoc/sz/lday/` |
| 文件格式 | 32B `.day` 文件（结构 `<5If2I`） |

**规则**：禁止修改/删除/移动/重命名任何文件；禁止在目录内运行会生成缓存/日志/数据库/测试产物/锁文件的命令。

### 7.2 旧版 DuckDB（Z:\riskbench-data-old\）

**职责**：旧版 DuckDB 交叉核验源，用于与当前生产库交叉核验数据精度。

| 字段 | 值 |
|---|---|
| 路径 | `Z:\riskbench-data-old\` |
| 用途 | 旧版 DuckDB 交叉核验源 |
| 读写权限 | 只读 |
| 文件数量 | 6 个 `.duckdb` 文件 |
| 精度说明 | 元精度（÷100，须做单位换算核验） |

**规则**：仅作交叉核验只读访问，禁止修改；禁止作为生产数据源。

---

## §8 pi 会话目录（~/.pi/agent/）

### 8.1 职责：pi 自管

pi 会话目录由 pi 内核自管，承载 pi 的认证、模型选型、设置、扩展、技能、prompt 模板等运行态配置。

### 8.2 结构

```
~/.pi/agent/
├── auth.json          ← 认证信息（pi 自管）
├── models.json        ← 模型选型（pi 自管）
├── settings.json      ← pi 设置（pi 自管）
├── extensions/        ← pi 扩展
├── skills/            ← pi 技能
└── prompts/           ← pi prompt 模板
```

### 8.3 规则：v0.02 不侵入 ~/.pi

继承 01-TRD §7 决策 3：

| 规则 | 说明 |
|---|---|
| 不侵入 | v0.02 不修改 `~/.pi/agent/auth.json` / `models.json` / `settings.json` |
| 不依赖 | v0.02 源码不直接读写 `~/.pi` 任意文件 |
| 不污染 | v0.02 运行产物不写入 `~/.pi` |
| 隔离 | v0.02 默认模型选型落业务数据根 `config/models.json` 带 `__riskbench_managed` 标记，不落 `~/.pi` |

---

## §9 业务数据根（Z:\ai-malf-riskbench-data\，v0.01 继承）

### 9.1 职责：DuckDB 生产库 + Parquet 备份

业务数据根承载 MALF 引擎的生产数据库与 Parquet 冷备，是 v0.02 只读访问的唯一业务数据入口。

### 9.2 结构

```
Z:\ai-malf-riskbench-data\
├── riskbench.duckdb       ← DuckDB 生产库（44 列 snapshots + 10 列 signals）
├── *.parquet              ← Parquet 冷备（EXPORT DATABASE 产物）
└── logs/                  ← 数据库日志
```

### 9.3 规则：单写进程（v0.01 run_pipeline.ps1），v0.02 只读访问

| 规则 | 说明 |
|---|---|
| 单写进程 | 仅 v0.01 `run_pipeline.ps1` 可写入，禁止其他主体写入 |
| v0.02 只读 | v0.02 通过 DuckDB 只读访问层读取，禁止写入 |
| 派生数据 | 数据库与 Parquet 均为派生数据，可删除重建 |
| 不进 Git | 业务数据根整体不进 Git 历史 |
| 不回灌 | 运行时数据禁止回灌业务数据根 |

---

## §10 目录边界隔离矩阵

### 10.1 写权限矩阵

行表示写入主体，列表示目标目录；✅ 允许写入，❌ 禁止写入，🔵 只读访问。

| 写入主体 \ 目标目录 | v0.02 主仓 | v0.02 试炼场 | v0.02 运行时 | v0.01 主仓 | v0.01 组件仓 | 业务数据根 | Definitive | everyday | history | v0.01 运行时 | worktrees | backup | TDX | riskbench-data-old | ~/.pi |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| v0.02 主进程 | ❌ | ❌ | ✅ | ❌ | ❌ | 🔵 | 🔵 | ❌ | 🔵 | ❌ | ❌ | ❌ | 🔵 | 🔵 | ❌ |
| v0.02 开发者 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔵 | ❌ | 🔵 | ❌ | ❌ | ❌ | 🔵 | 🔵 | ❌ |
| v0.02 试炼任务 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔵 | ❌ | 🔵 | ❌ | ❌ | ❌ | 🔵 | 🔵 | ❌ |
| v0.01 run_pipeline.ps1 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 🔵 | ❌ | 🔵 | ❌ | ❌ | ❌ | 🔵 | 🔵 | ❌ |
| v0.01 开发者 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | 🔵 | ✅ | 🔵 | ❌ | ✅ | ❌ | 🔵 | 🔵 | ❌ |
| 备份脚本 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔵 | ❌ | 🔵 | ❌ | ❌ | ✅ | 🔵 | 🔵 | ❌ |
| pi 内核 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔵 | ❌ | 🔵 | ❌ | ❌ | ❌ | 🔵 | 🔵 | ✅ |

### 10.2 数据流矩阵

| 源 | 目标 | 流向 | 说明 |
|---|---|:--:|---|
| TDX `new_tdx64\` | 业务数据根 `ai-malf-riskbench-data\` | → | v0.01 run_pipeline.ps1 读取 .day 写入 DuckDB |
| 业务数据根 | v0.02 运行时 | → | v0.02 只读访问 DuckDB，禁止回灌 |
| v0.02 主仓 | v0.02 运行时 | → | 主进程运行写入运行时产物 |
| v0.02 试炼场 | v0.02 运行时 | → | 试炼任务运行写入运行时产物 |
| v0.02 运行时 | 业务数据根 | ❌ | 禁止回灌 |
| v0.02 运行时 | v0.02 主仓 | ❌ | 禁止回灌 |
| backup | 当前 SoT | ❌ | 禁止反向污染 |
| history | 当前 SoT | ❌ | 禁止复制代码/迁移目录 |
| riskbench-data-old | 业务数据根 | ❌ | 仅交叉核验，禁止写入 |

---

## §11 目录创建时机

| 目录 | 创建时机 | 触发任务 | 备注 |
|---|---|---|---|
| `Z:\pi-malf-riskbench-v0.02\` | v0.02 启动 | 任务 1 | 主仓初始化 |
| `Z:\pi-malf-riskbench-v0.02\docs\` | v0.02 启动 | 任务 1 | 文档目录 |
| `Z:\pi-malf-riskbench-v0.02\src\` | 源码编写启动 | 任务 4 | 五件骨架初始化 |
| `Z:\pi-malf-riskbench-v0.02\scripts\` | 质量门搭建 | 任务 2 | verify.mjs 等脚本 |
| `Z:\pi-malf-riskbench-v0.02\.plan\` | 任务规划启动 | 任务 1 | 任务计划目录 |
| `Z:\pi-malf-riskbench-v0.02\.record\` | 首任务实施 | 任务 1 | 实施记录目录 |
| `Z:\pi-malf-riskbench-v0.02\.pi\` | pi 扩展开发 | 任务 5 | pi 扩展/技能/prompt |
| `Z:\pi-malf-riskbench-v0.02-composer\` | MALF Adapter 试炼启动 | 任务 4 | 试炼场目录 |
| `Z:\pi-malf-riskbench-v0.02-runtime\` | Electron 主进程首次运行 | 任务 6 | 运行时沙箱 |

> 任务编号对应 04-任务清单 §4，详见该文档。

---

## §12 目录治理检查（六项）

v0.02 目录治理检查清单，用于在每个任务交付前与里程碑节点验证目录边界隔离：

| # | 检查项 | 检查方法 | 通过标准 |
|---|---|---|---|
| 1 | v0.02 主仓无运行数据 | 主仓内无 `runs/`/`logs/`/`tmp/`/`cache/` 目录 | 主仓内不存在运行时产物目录 |
| 2 | v0.02 主仓无 node_modules | 主仓内无 `node_modules/` 目录 | 依赖安装在主仓外或被 `.gitignore` 忽略 |
| 3 | v0.02 主仓无试炼场代码 | 主仓 `src/` 内无试炼场代码副本 | 主仓源码不 import 试炼场模块 |
| 4 | 业务数据根不进 Git | `.gitignore` 含 `*.duckdb`/`*.parquet` 规则 | 业务数据根内容不出现在 Git 历史 |
| 5 | pi 会话不侵入 | v0.02 源码无 `~/.pi` 读写 | v0.02 不修改 pi 自管文件 |
| 6 | 参考仓库只读 | v0.02 源码无对 `ai-malf-riskbench*` / `new_tdx64` / `riskbench-data-old` 的写操作 | 外部目录仅只读访问 |

**执行机制**：检查脚本落 `Z:\pi-malf-riskbench-v0.02\scripts\check-docs-governance.mjs`，由质量门 `verify.mjs` 在每次任务交付前调用。

---

## §13 版本历史

| 版本 | 日期 | 变更说明 | 维护者 |
|---|---|---|---|
| v0.1.0 | 2026-08-09 | 初版草案：建立 v0.02 目录治理 SoT，定义 Z 盘 14+1 目录拓扑、写权限矩阵、隔离规则与六项检查 | v0.02 文档维护者 |

---

**文档维护**：目录结构变更时更新，重大变更需用户批准

**最后更新**：2026-08-09
