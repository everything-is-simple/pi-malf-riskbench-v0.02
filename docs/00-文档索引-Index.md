# 00-文档索引-Index

**版本**：v0.1.5
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：AGENTS.md（已创建 v0.1.7）
**下游**：docs/01 ~ docs/12 全部设计文档
**用途**：v0.02 项目文档地图唯一入口，提供文档导航、权威链、目录拓扑、门禁状态与当前状态总览

---

## §1 项目定位

### 1.1 系统身份

**AI MALF RiskBench v0.02 = pi（AI 底座）+ pi-desktop 式桌面壳 + v0.01 已实现组件（MALF 地板层）+ MALF v2.1 领域权威 + Electron 只读 Viewer**

| 属性 | 值 |
|------|-----|
| 系统全称 | AI MALF RiskBench v0.02 |
| 中文名 | AI MALF 个人风险工作台 v0.02 |
| 一句话定义 | 在 v0.01 五组件（290 passed）基础上，以 pi-coding-agent 为 AI 底座、Electron 为桌面壳，组装 MALF 结构测量 → RISK 风险量化 → AI 信号发现 → BENCH 基准验证闭环的只读风险工作台 |
| 关键词 | `pi` + `ai` + `malf` + `risk` + `bench` |
| 主仓目录 | `Z:\pi-malf-riskbench-v0.02` |
| 目标用户 | 单一个人开发者/交易者 |
| 运行模式 | 本地单机桌面应用（Electron），单写进程，非 SaaS、非 Web 服务 |
| 与 v0.01 关系 | **继承不重写**：v0.01 五组件 + 生产数据库 + Z 盘目录拓扑 + 安全/确定性约束全部继承；v0.02 新增 pi 底座 + Electron 壳 + Adapter 桥 + 只读 Viewer |

### 1.2 明确不做什么（v0.1 边界，继承 v0.01）

- 不支持多用户、多终端并发、远程协作
- 不自动选股、不替用户改写市场事实、不接管决策
- AI 解读必须明确标注，不可凌驾用户决策
- 不引入真实交易/支付/外部账户集成
- v0.1 明确禁用"运行级使用"（仅允许 verification_only / research_only / rejected）
- 不输出胜率预测、综合交易分、买卖建议、仓位计算、订单
- 不连接券商、不自动交易、不计算真实 PnL
- 不让 AI 修改 MALF/RISK 层的确定性计算

### 1.3 三层权威（继承 v0.01 AGENTS.md §1）

```
第一层：市场事实（MALF 引擎产出，确定性，不可改写）
  │
第二层：用户声明（用户对市场事实的解读与风险声明，AI 不可修改）
  │
第三层：AI 解读（AI 对第一层+第二层的解释/总结/提醒，必须标注，不凌驾前两层）
```

---

## §2 参考仓库清单

### 2.1 设计参考（仅参考，不构成权威）

| 仓库 | 路径 | 用途 |
|---|---|---|
| pi | `H:\pi-references\pi` | AI 底座 + AGENTS.md 范式 + extensions/skills 规范 |
| pi-skills | `H:\pi-references\pi-skills` | 技能供给 + SKILL.md 格式 |
| pi-desktop | `H:\pi-references\pi-desktop` | 桌面壳架构 + contract + verify.mjs 范式 |
| inno-agent | `H:\pi-references\inno-agent` | 业务化范本 + 工作区级治理 |
| pi-studybuddy | `H:\pi-studybuddy` | 13 文档结构模板 + 治理范式 |

### 2.2 领域权威（只读，最高领域权威）

| 仓库 | 路径 | 用途 |
|---|---|---|
| MALF-Definitive v2.1 | `Z:\ai-malf-riskbench-Definitive\malf-Definitive（v1.0-v2.1）\MALF_Definitive_v2_1-deepseek-20260726\` | MALF 五层架构 + 44 字段契约 + 不变量 + 铁律 |

### 2.3 v0.01 已实现组件（继承）

| 组件 | 路径 | 测试数 | 用途 |
|---|---|:--:|---|
| malf-engine | `Z:\ai-malf-riskbench-components\malf-engine` | 115 | 五层领域模块（Core/Range/Lifespan/Structural Position/Service） |
| malf-data | `Z:\ai-malf-riskbench-components\malf-data` | 46 | TDX 接入 + DuckDB 持久化 + 三周期聚合 |
| riskbench-shared | `Z:\ai-malf-riskbench-components\riskbench-shared` | 10 | 集中配置 + 路径推导 |
| malf-signal | `Z:\ai-malf-riskbench-components\malf-signal` | 37 | 方向 C 四事件码事件流 |
| malf-backtest | `Z:\ai-malf-riskbench-components\malf-backtest` | 31 | T4 确定性规则验证 |
| v0.01 主仓编排 | `Z:\ai-malf-riskbench\scripts\` | 51 | run_pipeline + 备份恢复 + 验收门禁 |
| **合计** | — | **290** | — |

### 2.4 外部数据源（只读）

| 数据源 | 路径 | 用途 |
|---|---|---|
| TDX 原始行情 | `Z:\new_tdx64\vipdoc\{sh,sz}\lday\*.day` | 原始行情裁决源（32B `<5If2I`） |
| 旧版 DuckDB | `Z:\riskbench-data-old\*.duckdb` | 交叉核验源（6 文件） |

---

## §3 文档结构

### 3.1 13 份设计文档目录树

```
docs/
├── prep-参考点核对表.md              ← 03-Arch 准备材料（四参考点核对）
├── 00-文档索引-Index.md              ← 本文件（导航 + 权威链 + 门禁）
├── 01-TRD-技术需求-Technical-Requirements.md    ← 技术底座 + 六点决策定案
├── 02-PRD-产品需求-Product-Requirements.md       ← 产品需求 + 四层业务 + 边界
├── 03-架构设计-Architecture-Design.md            ← 四层架构 + pi 扩展 + 安全不变量
├── 04-任务清单-Todo-List.md                      ← 里程碑 M0-M4 + task-id + 看板
├── 05-数据模型-ERD-Data-Model.md                 ← DuckDB + state + 备份结构
├── 06-API契约-API-Contracts.md                   ← RPC 契约 + MALF 工具 + Streams
├── 07-工作流-Workflow.md                         ← 数据管道 + 风险声明 + 状态机
├── 08-测试验收-Test-Plan.md                      ← 测试金字塔 + 确定性验证 + 门禁
├── 09-使用者介面-UI-Design.md                    ← 三栏布局 + Tabs + 只读 Viewer
├── 10-开发规范-Dev-Rules.md                      ← 16 步开发流程 + TDD + 门禁
├── 11-组件装配-Component-Assembly.md             ← 先分解再组合 + 6 步装配
└── 12-目录治理-Directory-Governance.md           ← Z 盘拓扑 + 物理隔离 + Git 纪律
```

### 3.2 文档登记表

| 编号 | 文档名 | 职责 | 状态 | 上游 | 下游 |
|---|---|---|:--:|---|---|
| prep | 参考点核对表 | 03-Arch 准备材料 | 📝 草案 | 00 §2 | 03 |
| 00 | 文档索引 | 导航 + 权威链 + 门禁 | 📝 草案 | AGENTS.md | 01-12 |
| 01 | TRD 技术需求 | 技术底座 + 六点决策 | 📝 草案 | AGENTS.md | 02-03 |
| 02 | PRD 产品需求 | 业务闭环 + 边界 | 📝 草案 | 01 | 03/07/09 |
| 03 | 架构设计 | 四层架构 + 安全不变量 | 📝 草案 | 01/02 | 05/06/08/09/11 |
| 04 | 任务清单 | 里程碑 + task-id + 看板 | 📝 草案 | 01-03/05-09 | 10/11 |
| 05 | ERD 数据模型 | DuckDB + state + 备份 | 📝 草案 | 03 | 06/07/08 |
| 06 | API 契约 | RPC + MALF 工具 + Streams | 📝 草案 | 03/05 | 07/09 |
| 07 | 工作流 | 数据管道 + 风险声明 + 状态机 | 📝 草案 | 02/03/06 | 08/09 |
| 08 | 测试验收 | 测试金字塔 + 确定性验证 | 📝 草案 | 02/03/05-07/09 | 04/10 |
| 09 | UI 设计 | 三栏布局 + Tabs + Viewer | 📝 草案 | 02/03/06/07/08 | 04 |
| 10 | 开发规范 | 16 步流程 + TDD + 门禁 | 📝 草案 | AGENTS/04/08/03 | — |
| 11 | 组件装配 | 先分解再组合 + 6 步装配 | 📝 草案 | AGENTS/01/03/04 | — |
| 12 | 目录治理 | Z 盘拓扑 + 物理隔离 + Git | 📝 草案 | AGENTS/01/04/11 | — |

### 3.3 文档用途分类

| 分类 | 文档 | 用途 |
|---|---|---|
| **导航** | 00 | 文档地图唯一入口 |
| **设计定案** | 01/02/03 | 技术底座 / 产品需求 / 架构设计（已审查批准后不可随意改） |
| **数据与契约** | 05/06 | 数据模型 / API 契约（与代码同步） |
| **流程** | 07 | 业务工作流与状态机 |
| **验证** | 08 | 测试验收与门禁 |
| **介面** | 09 | UI 设计 |
| **执行操作** | 04/10/11/12 | 任务清单 / 开发规范 / 组件装配 / 目录治理 |

---

## §4 权威链裁决

冲突时按以下优先级裁决（高优先级覆盖低优先级）：

| 优先级 | 权威源 | 说明 |
|---|---|---|
| 1 | 用户明确批准的治理决策 | 用户在本次会话的明确指令 |
| 2 | AGENTS.md 安全约束（已创建 v0.1.7） | 不可被下游文档覆盖 |
| 3 | MALF v2.1 Definitive 领域权威 | 领域语义最高权威，AGENTS.md 不得改写 |
| 4 | docs/01-TRD §7 已定案决策 | 六点待决项经用户批准定案 |
| 5 | docs/00-09 设计文档 | 设计阶段已审查批准的文档 |
| 6 | docs/04-Todo 已登记任务 | 任务注册表与证据 SoT |
| 7 | .plan/ 已批准任务计划（已就绪） | 唯一执行中计划 |
| 8 | 已通过测试的代码 | master 分支代码（v0.01 290 passed + v0.02 新增） |
| 9 | v0.01 历史参考（ai-malf-riskbench） | 仅参考不构成权威 |
| 10 | pi-studybuddy / 参考仓库 | 仅参考不构成权威 |
| 11 | 聊天记录 | 最弱，不可单独作为施工依据 |

**冲突处理纪律**：
- 不得删除历史决策来"让文档看起来一致"
- 冲突必须通过新增决策记录和显式 `supersedes` 关系解决
- 修改治理基线文件前必须说明原因、影响和权威依据

---

## §5 组件治理流程（五阶段总览）

任何组件必须走完五阶段，任一阶段失败退回上一阶段，不进 master：

```
1. 下载储存    →  H:\pi-references\* 或 node_modules / venv / Z:\ai-malf-riskbench-components\*
2. 单件测试    →  独立冒烟 + 合成夹具断言（vitest + pytest）
3. 集成测试    →  extension×pi 底座契约 + 钩子协作 + MALF Adapter 桥接验证
4. 系统组装    →  代码进入 src/ + 类型检查 + lint + contract AST 校验
5. 冒烟 + E2E  →  系统冒烟 + 受影响 E2E + 安全不变量六条 + 确定性验证
```

详见 [11-组件装配](./11-组件装配-Component-Assembly.md) 与 [08-测试验收](./08-测试验收-Test-Plan.md)。

---

## §6 目录治理（Z 盘拓扑速查）

### 6.1 Z 盘目录速查（继承 v0.01 + 新增 v0.02）

| 目录 | 唯一职责 | 是否进 Git | 是否存真实数据 |
|---|---|:--:|:--:|
| `Z:\pi-malf-riskbench-v0.02` | v0.02 主仓（源码 + 文档 + 测试 + 计划） | ✅ | ❌ |
| `Z:\pi-malf-riskbench-v0.02-composer` | v0.02 试炼场（MALF Adapter 试炼） | ❌ | ❌ |
| `Z:\pi-malf-riskbench-v0.02-runtime` | v0.02 运行时沙箱（runs/logs/tmp） | ❌ | ✅（可再生） |
| `Z:\ai-malf-riskbench` | v0.01 主仓（治理文档 + 编排胶水） | ✅ | ❌ |
| `Z:\ai-malf-riskbench-components` | v0.01 五组件实现（独立 Git 仓库） | ✅ | ❌ |
| `Z:\ai-malf-riskbench-data` | DuckDB 生产库 + Parquet 备份 | ❌ | ✅ |
| `Z:\ai-malf-riskbench-Definitive` | MALF 等领域权威定义文档 | ✅（只读） | ❌ |
| `Z:\ai-malf-riskbench-everyday` | 每日工作记录 | ❌ | ✅ |
| `Z:\ai-malf-riskbench-history` | 历史废弃项目（14+） | ❌（只读） | ❌ |
| `Z:\ai-malf-riskbench--runtime` | v0.01 运行时沙箱 | ❌ | ✅（可再生） |
| `Z:\ai-malf-riskbench-worktrees` | v0.01 git worktree 任务开发隔离区 | ❌ | ❌ |
| `Z:\ai-malf-riskbench-backup` | v0.01 系统备份 | ❌ | ✅ |
| `Z:\new_tdx64` | TDX 原始行情权威（只读） | ❌（只读） | ✅（只读） |
| `Z:\riskbench-data-old` | 旧版 DuckDB 交叉核验源（只读） | ❌（只读） | ✅（只读） |

### 6.2 物理隔离三层（v0.02 新增）

| 层 | 路径 | 用途 | 写权限 |
|---|---|---|---|
| pi 会话目录 | `~/.pi/agent/` | pi 自管（auth.json/models.json/settings.json） | pi 内核 |
| 业务数据根 | `Z:\ai-malf-riskbench-data\`（v0.01 继承） | DuckDB 生产库 + Parquet 备份 + 日志 | v0.01 run_pipeline.ps1（受 ops.md SOP 约束） |
| v0.02 运行时 | `Z:\pi-malf-riskbench-v0.02-runtime\` | Electron 运行日志 + 缓存 + 临时 | v0.02 主进程 |

详见 [12-目录治理](./12-目录治理-Directory-Governance.md)。

---

## §7 文档访问控制

### 7.1 读写权限矩阵

| 文档 | 谁可读 | 谁可写 | 写入时机 |
|---|---|---|---|
| AGENTS.md | 全部 | 用户 + 授权 agent | 治理基线变更 |
| 00-索引 | 全部 | 授权 agent | 文档状态变更 |
| 01-09 设计文档 | 全部 | 授权 agent | 设计阶段审查批准前 |
| 04-Todo | 全部 | 授权 agent | 任务状态变更 |
| 10-12 治理文档 | 全部 | 用户 + 授权 agent | 治理流程变更 |
| .plan/ | 全部 | 授权 agent | 任务计划创建/更新 |
| .record/ | 全部 | 授权 agent | 任务收尾时创建 |

### 7.2 文档治理检查（✅ scripts/check-docs-governance.mjs 已创建）

- 00-索引文档登记表与实际文件一致
- 04-Todo 任务状态与 .plan/ 一致
- 06-API 契约与代码 handlers 一致（AST 校验）
- 12-目录治理与实际目录一致
- 版本历史与实际变更一致

---

## §8 每次开工的强制入口顺序

任何开发会话开始时，必须按以下顺序读取文档，建立完整上下文：

```
1. AGENTS.md（已创建 v0.1.7）       ← 系统身份 + 权威链 + 任务铁律
2. docs/00-文档索引-Index.md（本文件）  ← 文档导航 + 门禁状态 + 当前状态总览
3. docs/04-任务清单-Todo-List.md     ← 当前任务注册表 + 里程碑状态
4. .plan/00-当前任务.md（若存在）    ← 唯一执行中任务计划
5. 相关设计文档（依据任务范围）       ← 01-TRD / 02-PRD / 03-Arch / 05-ERD / 06-API / 07-Workflow / 08-Test / 09-UI
```

**门禁规则**：
- 若上述文件缺失、相互冲突或当前任务不明确 → **停止业务施工**，只允许修复治理文档或请求用户裁决
- 未在 04-Todo 登记任务行时 → 先登记，不能直接写业务代码
- `.plan/` 无执行中任务时 → 等待用户明确选择任务，不预写未来计划

---

## §9 当前状态

### 9.1 设计阶段进度

| 阶段 | 状态 | 说明 |
|---|:--:|---|
| 源材料深挖 | ✅ 完成 | v0.01 spec + pi-studybuddy 13 文档 + MALF v2.1 权威三路深挖 |
| 参考点核对 | ✅ 完成 | prep-参考点核对表四参考点核对 |
| 13 文档草案 | ✅ 完成 | 00-12 共 13 份草案已创建，待用户审查批准 |
| 治理体系建立 | ✅ 完成 | AGENTS.md v0.1.7 + 5 治理脚本 + 2 Skill + 2 prompt + .plan/.record 目录 |
| 用户审查批准 | ⏳ 待定 | 13 文档草案 + 治理体系提交用户审查，交叉审查已闭合 P0 洞 |
| AGENTS.md 创建 | ✅ 完成 | 已创建 v0.1.7（含 P0 审计修复 + 交叉审查修复） |

### 9.2 v0.01 继承状态

| 组件 | 测试数 | 状态 |
|---|:--:|:--:|
| malf-engine | 115 passed | ✅ 可继承 |
| malf-data | 46 passed | ✅ 可继承 |
| riskbench-shared | 10 passed | ✅ 可继承 |
| malf-signal | 37 passed | ✅ 可继承 |
| malf-backtest | 31 passed | ✅ 可继承 |
| v0.01 主仓编排 | 51 passed | ✅ 可继承 |
| **合计** | **290 passed** | ✅ |

### 9.3 生产数据库状态

- 3 标的（sh510050 / sh510300 / sz159915）× day/week/month 快照 15397 行（D3 裁决：ETF 500+ 标的池扩展规划中，见 04-Todo T-M2-019~021）
- signals 事件流 2835（t07 沙箱复验，两次运行逐字节一致，0 孤儿）
- usage 全 `research_only / stale_research_only`
- approved_as_of_date = 20260804

---

## §10 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：13 文档骨架 + 权威链 + Z 盘拓扑 + v0.01 继承状态 |
| v0.1.1 | 2026-08-09 | 交叉审查 P1 修复：多处"AGENTS.md 待创建"→已创建 + §9.1 进度更新 |
| v0.1.2 | 2026-08-09 | 交叉审查延后 7 洞修复（O-9）：§3.2 状态符号统一（prep/00 ✅→📝 草案，与 01-12 一致）；AGENTS.md 版本引用更新至 v0.1.4 |
| v0.1.3 | 2026-08-10 | 工作台功能扩展（D1+D2+D3 用户裁决）：§9.3 标的池扩展规划标注（ETF 500+，T-M2-019~021）；文档登记表 06/08/09 版本描述同步。 |

---

**文档维护**：文档状态变更时更新，重大变更需用户批准
**最后更新**：2026-08-09
