# pi-malf-riskbench-v0.02

**AI MALF 个人风险工作台** — 以 pi coding agent 为 AI 底座的 Windows 单机只读风险工作台

**版本**：v0.1.0 📝 草案（待用户审查批准）
**日期**：2026-08-09
**许可**：待定（参考仓库：pi MIT / pi-desktop Apache-2.0 / pi-skills MIT）

---

## 项目定位

AI MALF RiskBench v0.02 = **pi（AI 底座）+ pi-desktop 式桌面壳 + v0.01 已实现组件（MALF 地板层）+ MALF v2.1 领域权威 + Electron 只读 Viewer**

在 v0.01 五组件（290 passed）基础上，以 pi-coding-agent 为 AI 底座、Electron 为桌面壳，把 MALF 结构测量 → RISK 风险量化 → AI 信号发现 → BENCH 基准验证连成只读风险工作台。服务单一个体交易者，做数据整理、风险声明与决策。

### 核心特色

- **三层权威分层**：第一层市场事实（MALF 引擎产出，确定性）/ 第二层用户声明（风险声明，AI 不可修改）/ 第三层 AI 解读（必须标注，不凌驾前两层）
- **只读 Viewer**：v0.02 Viewer 对生产库 snapshots/signals 表只 SELECT，不修改（D28）
- **确定性可见**：lineage_hash（SHA256）+ rule_versions + usage + freshness 在介面上显式展示
- **honest degradation**：None 字段标灰 + reason_codes 旁注，不补零不估计不掩盖
- **MALF Adapter 桥接**：Python MALF 引擎经子进程 + JSON Lines 协议被 pi 扩展调用
- **v0.01 继承不重写**：五组件 290 passed 测试全部继承复验，生产数据库只读访问
- **单机单用户单写**：无多用户、无远程协作、无公网入口、无自动交易

### 与 v0.01（ai-malf-riskbench）的关系

**继承不重写**。v0.01 已完成五组件原型验证（malf-engine 115 + malf-data 46 + riskbench-shared 10 + malf-signal 37 + malf-backtest 31 + 主仓编排 51 = 290 passed）；v0.02 以 pi 为底座重新组装桌面壳与 Viewer，**不复制 v0.01 实现**。

---

## 文档体系（13 份，全部 📝 草案待用户审查批准）

| # | 文档 | 版本 | 权威范围 |
|---|---|---|---|
| prep | [参考点核对表](./docs/prep-参考点核对表.md) | v0.1.0 | 03-Arch 准备材料（四参考点核对） |
| 00 | [文档索引](./docs/00-文档索引-Index.md) | v0.1.0 | 文档导航 + 门禁 + Z 盘拓扑 + 版本历史 |
| 01 | [TRD 技术需求](./docs/01-TRD-技术需求-Technical-Requirements.md) | v0.1.0 | 技术底座 + 六点定案 + D1-D29 + INV-01~06 |
| 02 | [PRD 产品需求](./docs/02-PRD-产品需求-Product-Requirements.md) | v0.1.0 | 三层权威 + 四层闭环 + 非目标 |
| 03 | [架构设计](./docs/03-架构设计-Architecture-Design.md) | v0.1.0 | 四层架构 + Electron 五件骨架 + MALF Adapter |
| 04 | [任务清单](./docs/04-任务清单-Todo-List.md) | v0.1.0 | M0-M4 五里程碑 + 48 task-id + 看板 |
| 05 | [数据模型 ERD](./docs/05-数据模型-ERD-Data-Model.md) | v0.1.0 | DuckDB schema + 44 字段 + v0.02 新表 |
| 06 | [API 契约](./docs/06-API契约-API-Contracts.md) | v0.1.0 | 21 RPC + MALF Adapter JSON Lines + DTO |
| 07 | [工作流](./docs/07-工作流-Workflow.md) | v0.1.0 | 数据管道 + 风险声明 + 6 状态机 + SOP |
| 08 | [测试验收](./docs/08-测试验收-Test-Plan.md) | v0.1.0 | 四层金字塔 + INV-01~06 + G0-G3 门禁 |
| 09 | [UI 设计](./docs/09-使用者介面-UI-Design.md) | v0.1.0 | 三栏布局 + 6 Tab + 44 字段展示 |
| 10 | [开发规范](./docs/10-开发规范-Dev-Rules.md) | v0.1.0 | 16 步流程 + .plan/.record 双目录 |
| 11 | [组件装配](./docs/11-组件装配-Component-Assembly.md) | v0.1.0 | 先分解再组合 + 四道装配门 + 三批次 |
| 12 | [目录治理](./docs/12-目录治理-Directory-Governance.md) | v0.1.0 | 14 Z 盘拓扑 + 三层物理隔离 |

### 治理资产（✅ 已就绪）

| 文件 | 状态 | 作用 |
|---|---|---|
| `AGENTS.md` | ✅ v0.1.0 已创建 | 仓库操作宪章（对人+agent 同约束） |
| `README.md`（本文件） | ✅ v0.1.0 已创建 | 项目总览 |
| `.pi/skills/*` | ✅ 已创建 | 治理用 Skill（riskbench-task-complete / riskbench-component-assembly） |
| `.pi/prompts/*` | ✅ 已创建 | 工作流模板（wr / plan） |
| `scripts/verify.mjs` | ✅ 已创建 | 统一质量门（design/m0/full 阶段自适应） |
| `scripts/check-docs-governance.mjs` | ✅ 已创建 | 文档治理检查 |
| `scripts/check-contract-coverage.mjs` | ✅ 已创建 | 契约 AST 校验（M0 后启用完整校验） |
| `scripts/check-desktop-security.mjs` | ✅ 已创建 | 安全不变量六条断言（INV-01~06） |
| `.plan/` | ✅ 已就绪 | 任务计划目录（无执行中任务，等待 M0 启动） |
| `.record/` | ✅ 已就绪 | 实施记录目录（待首任务收尾写入） |

---

## 快速开始

### 前置条件（M0 启动时确认）

- Windows 10/11（单机桌面）
- Node.js >= 20.6（本项目基线 Node 24）
- Python 3.10+（MALF 引擎 + v0.01 组件继承复验）
- DuckDB CLI / Python duckdb 模块（生产库访问）
- Git

### 当前阶段（设计完成 + 治理体系就绪，待启动 M0）

```bash
# 克隆仓库
cd Z:\pi-malf-riskbench-v0.02

# 阅读文档（按 AGENTS.md §0 强制入口顺序）
# 1. AGENTS.md
# 2. docs/00-文档索引-Index.md
# 3. docs/04-任务清单-Todo-List.md
# 4. .plan/00-当前任务.md（若存在）
# 5. 相关设计文档

# 文档治理检查（design 阶段即可用）
node scripts/check-docs-governance.mjs

# 契约校验（M0 骨架 src/contract/api.ts 就绪后自动启用完整校验）
node scripts/check-contract-coverage.mjs

# 安全不变量六条（M0 骨架 src/main/window.ts 就绪后启用完整校验）
node scripts/check-desktop-security.mjs

# 统一质量门（按阶段自适应：design / m0 / full）
node scripts/verify.mjs
```

### M0 启动后（待补全）

```bash
# 待 M0 骨架搭建启动时补全
# pnpm install
# pnpm dev
# pnpm verify
```

### v0.01 继承测试复验（M0 启动后启用）

```bash
# 五组件 290 passed 复验，不得回退
# cd Z:\ai-malf-riskbench-components\malf-engine && python -m pytest
# cd Z:\ai-malf-riskbench-components\malf-data && python -m pytest
# cd Z:\ai-malf-riskbench-components\riskbench-shared && python -m pytest
# cd Z:\ai-malf-riskbench-components\malf-signal && python -m pytest
# cd Z:\ai-malf-riskbench-components\malf-backtest && python -m pytest
```

---

## 仓库结构

```
pi-malf-riskbench-v0.02/
├── AGENTS.md                    # 仓库操作宪章（对人+agent 同约束）
├── README.md                    # 项目总览（本文件）
├── .gitignore
│
├── docs/                        # 设计文档（13 份，全部 📝 草案待审查批准）
│   ├── prep-参考点核对表.md
│   ├── 00-文档索引-Index.md
│   ├── 01-TRD-技术需求.md
│   ├── 02-PRD-产品需求.md
│   ├── 03-架构设计.md
│   ├── 04-任务清单-Todo-List.md
│   ├── 05-数据模型-ERD.md
│   ├── 06-API契约.md
│   ├── 07-工作流.md
│   ├── 08-测试验收.md
│   ├── 09-使用者介面-UI-Design.md
│   ├── 10-开发规范.md            # ✅ v0.1.0 已创建
│   ├── 11-组件装配.md            # ✅ v0.1.0 已创建
│   └── 12-目录治理.md            # ✅ v0.1.0 已创建
│
├── .pi/                         # pi 生态治理资产（✅ 已就绪）
│   ├── skills/                  # 治理用 Skill
│   │   ├── riskbench-task-complete/SKILL.md
│   │   └── riskbench-component-assembly/SKILL.md
│   └── prompts/                 # 工作流模板
│       ├── wr.md                # Wrap it 收尾
│       └── plan.md              # 创建任务计划
│
├── scripts/                     # 自动化门禁（✅ 已就绪）
│   ├── verify.mjs               # 统一质量门（design/m0/full 阶段自适应）
│   ├── check-docs-governance.mjs # 文档治理检查
│   ├── check-contract-coverage.mjs # 契约 AST 校验（M0 后启用）
│   └── check-desktop-security.mjs # 安全不变量六条断言（INV-01~06）
│
├── .plan/                       # 任务计划（✅ 已就绪，无执行中任务）
│   ├── 00-当前任务.md           # 当前任务指针
│   └── README.md                # 目录说明 + 单一任务门禁
│
├── .record/                     # 实施记录（✅ 已就绪，待首任务收尾写入）
│   └── README.md                # 目录说明 + 8 章节模板
│
└── src/                         # 源码（M0 启动后创建）
    ├── contract/                # 类型化 IPC 契约（借鉴 pi-desktop）
    ├── main/                    # Electron 主进程
    ├── preload/                 # 安全桥接
    ├── agent-host/              # utilityProcess 跑 pi-coding-agent
    ├── renderer/                # React UI
    └── shared/                  # 可测试纯函数与共享模块
```

---

## 里程碑规划（04-Todo §6）

| 里程碑 | 目标 | 退出门槛 |
|---|---|---|
| **M0 骨架** | Electron 五件骨架 + 安全沙箱 + MALF Adapter 试炼场 | 五件骨架可启动 + 安全六条 + Adapter 调通 + 290 passed 复验 |
| **M1 核心闭环** | MALF 查询工具 + 只读 Viewer + DuckDB 只读访问 | DuckDB 只读 + query_snapshot + 市场事实 Tab + AI 对话 Tab |
| **M2 完整闭环** | RISK 风险声明 + AI 解读 + 回测报告 Viewer | 风险声明 CRUD + AI 解读标注 + 回测报告 Tab + 三层权威可视化 |
| **M3 打磨** | 技能系统 + prompt 模板 + 多模型切换 + 性能优化 | 3 技能 + 3 prompt + 多模型切换 + 性能基准 |
| **M4 业务接线+打包部署** | 设置页 + 质量门三件套 + 打包冒烟 | 设置 Tab + verify/contract/security 三脚本 + 打包冒烟 |

---

## 技术底座（01-TRD §7 已定案六决策）

| 决策项 | 定案 | 理由 |
|---|---|---|
| AI 底座 | `@earendil-works/pi-coding-agent` | 不修改内核，通过 registerTool/扩展/技能接入 |
| 桌面壳 | 取 pi-desktop 架构自建业务化壳 | 五件骨架直接搬运改名，业务层独立自建 |
| MALF Adapter | Python 子进程 + JSON Lines | 复用 v0.01 Python MALF 引擎，零重写 |
| 数据隔离 | `~/.pi` / `Z:\ai-malf-riskbench-data` / v0.02-runtime 三层物理隔离 | pi 自管会话目录，业务数据根 v0.01 继承只读 |
| 文档语言 | 中文优先 | 用户母语中文；代码标识符英文，注释中文 |
| 打包能力 | 源码形态可运行 + 打包能力常态化 | 系统功能正常即可打包 |

---

## 治理纪律（AGENTS.md 摘要）

1. **文档优先，禁止依赖聊天记忆** — 按 AGENTS.md §0 强制入口顺序读文档
2. **单一执行任务门禁** — `.plan/` 同一时刻只允许一个执行中任务
3. **TDD 强制** — RED → GREEN → REFACTOR
4. **拆分 → 小组件 → 组合** — 组件先在试炼场单件调通，再 Adapter 装配进主仓
5. **五阶段不可跳越** — 下载储存 → 单件 → 集成 → 组装 → 冒烟E2E
6. **受控收尾** — 复验 → 更新 04-Todo → 创建 .record → 停止
7. **自动化门禁** — verify.mjs + check-docs-governance.mjs + check-contract-coverage.mjs + check-desktop-security.mjs
8. **v0.01 继承复验** — 290 passed 不得回退
9. **AGENTS.md 对人+agent 同约束** — 作为 context file 自动注入

详见 [AGENTS.md](./AGENTS.md)。

---

## 参考仓库

| 仓库 | 路径 | 用途 |
|---|---|---|
| pi | `H:\pi-references\pi` | AI 底座 + AGENTS.md 范式 + extensions/skills 规范 |
| pi-skills | `H:\pi-references\pi-skills` | 技能供给 + SKILL.md 格式 |
| pi-desktop | `H:\pi-references\pi-desktop` | 桌面壳架构 + contract + verify.mjs 范式 |
| inno-agent | `H:\pi-references\inno-agent` | 业务化范本 + 工作区级治理 |
| pi-studybuddy | `H:\pi-studybuddy` | 13 文档结构模板 + 治理范式 |
| ai-malf-riskbench | `Z:\ai-malf-riskbench` | v0.01 主仓 + 治理范式参考 |
| MALF-Definitive v2.1 | `Z:\ai-malf-riskbench-Definitive\...` | MALF 五层架构 + 44 字段契约 + 不变量（领域最高权威） |

---

## 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：项目定位 + 13 文档体系导航 + 治理资产清单 + 仓库结构 + 里程碑规划 + 技术底座定案 + 治理纪律摘要。设计阶段 13 文档全部草案完成，治理体系（AGENTS.md + scripts 四件 + .pi/skills 2 个 + .pi/prompts 2 个 + .plan/.record 骨架）就绪，待启动 M0 骨架开发 |
