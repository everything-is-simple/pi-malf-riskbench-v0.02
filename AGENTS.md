# AGENTS.md — pi-malf-riskbench-v0.02 仓库操作宪章

**版本**：v0.1.1
**日期**：2026-08-09
**状态**：📝 草案（待用户审查批准）
**适用**：对人和 AI agent 同等约束（仿 pi 生态 AGENTS.md 约定，作为 context file 自动注入 system prompt）

> 本文件是 pi-malf-riskbench-v0.02 仓库的最高治理文件。任何 AI、开发者或自动化工具在对话中断后，只读本文件与 [docs/00-文档索引](./docs/00-文档索引-Index.md) 即可恢复系统身份、权威来源、当前任务和禁止事项；**不得依赖聊天记忆代替仓库文档**。

---

## §0 每次开工的强制入口顺序

任何开发会话开始时，必须按以下顺序读取文档，建立完整上下文：

```
1. AGENTS.md（本文件）              ← 系统身份 + 权威链 + 任务铁律
2. docs/00-文档索引-Index.md         ← 文档导航 + 门禁状态 + 当前状态总览
3. docs/04-任务清单-Todo-List.md     ← 当前任务注册表 + 里程碑状态
4. .plan/00-当前任务.md（若存在）    ← 唯一执行中任务计划
5. 相关设计文档（依据任务范围）       ← 01-TRD / 02-PRD / 03-Arch / 05-ERD / 06-API / 07-Workflow / 08-Test / 09-UI
```

**门禁规则**：
- 若上述文件缺失、相互冲突或当前任务不明确 → **停止业务施工**，只允许修复治理文档或请求用户裁决
- 未在 04-Todo 登记任务行时 → 先登记，不能直接写业务代码
- `.plan/` 无执行中任务时 → 等待用户明确选择任务，不预写未来计划

---

## §1 系统身份与定位

### 1.1 系统身份

**AI MALF RiskBench v0.02 = pi（AI 底座）+ pi-desktop 式桌面壳 + v0.01 已实现组件（MALF 地板层）+ MALF v2.1 领域权威 + Electron 只读 Viewer**

- **服务对象**：单一个体交易者（独立个人，负责数据整理、风险声明、决策）
- **核心价值**：在 v0.01 五组件（290 passed）基础上，以 pi 为 AI 底座、Electron 为桌面壳，把 MALF 结构测量 → RISK 风险量化 → AI 信号发现 → BENCH 基准验证连成只读风险工作台
- **AI 底座**：pi coding agent（`@earendil-works/pi-coding-agent`），不修改内核，所有业务能力通过 `registerTool` + 扩展 + 技能接入
- **形态**：Electron 桌面应用（单机、单用户、单写进程）
- **领域权威**：MALF v2.1 Definitive 是最高领域语义权威，AGENTS.md 不得改写其语义

### 1.2 明确不做什么（v0.1 边界，继承 v0.01）

- 不支持多用户、多终端并发、远程协作
- 不自动选股、不替用户改写市场事实、不接管决策
- AI 解读必须明确标注，不可凌驾用户决策
- 不引入真实交易/支付/外部账户集成
- v0.1 明确禁用"运行级使用"（仅允许 verification_only / research_only / rejected）
- 不输出胜率预测、综合交易分、买卖建议、仓位计算、订单
- 不连接券商、不自动交易、不计算真实 PnL
- 不让 AI 修改 MALF/RISK 层的确定性计算

### 1.3 与 v0.01（ai-malf-riskbench）的关系

**继承不重写**。v0.01 五组件（malf-engine / malf-data / riskbench-shared / malf-signal / malf-backtest，290 passed）+ 生产数据库 + Z 盘目录拓扑 + 安全/确定性约束全部继承；v0.02 新增 pi 底座 + Electron 壳 + MALF Adapter 桥 + 只读 Viewer，**不复制 v0.01 实现**。

### 1.4 三层权威（继承 v0.01）

```
第一层：市场事实（MALF 引擎产出，确定性，不可改写）
  │
第二层：用户声明（用户对市场事实的解读与风险声明，AI 不可修改）
  │
第三层：AI 解读（AI 对第一层+第二层的解释/总结/提醒，必须标注，不凌驾前两层）
```

---

## §2 权威链裁决

冲突时按以下优先级裁决（高优先级覆盖低优先级）：

| 优先级 | 权威源 | 说明 |
|---|---|---|
| 1 | 用户明确批准的治理决策 | 用户在本次会话的明确指令 |
| 2 | AGENTS.md（本文件）安全约束 | 不可被下游文档覆盖 |
| 3 | MALF v2.1 Definitive 领域权威 | 领域语义最高权威，AGENTS.md 不得改写 |
| 4 | docs/01-TRD §7 已定案决策 | 六点待决项经用户批准定案 |
| 5 | docs/00-09 设计文档 | 设计阶段已审查批准的文档 |
| 6 | docs/04-Todo 已登记任务 | 任务注册表与证据 SoT |
| 7 | .plan/ 已批准任务计划 | 唯一执行中计划 |
| 8 | 已通过测试的代码 | master 分支代码（v0.01 290 passed + v0.02 新增） |
| 9 | v0.01 历史参考（ai-malf-riskbench） | 仅参考不构成权威 |
| 10 | pi-studybuddy / 参考仓库 | 仅参考不构成权威 |
| 11 | 聊天记录 | 最弱，不可单独作为施工依据 |

**冲突处理纪律**：
- 不得删除历史决策来"让文档看起来一致"
- 冲突必须通过新增决策记录和显式 `supersedes` 关系解决
- 修改治理基线文件（§11 列出）前必须说明原因、影响和权威依据

---

## §3 文档权威源

### 3.1 设计文档（docs/00-12，全部 📝 草案待用户审查批准）

| 文档 | 版本 | 权威范围 |
|---|---|---|
| [00-文档索引](./docs/00-文档索引-Index.md) | v0.1.0 | 文档导航 + 门禁 + Z 盘拓扑 + 版本历史 |
| [01-TRD](./docs/01-TRD-技术需求-Technical-Requirements.md) | v0.1.0 | 技术底座 + 六点定案决策 + D1-D29 确定性约束 + INV-01~06 安全不变量 |
| [02-PRD](./docs/02-PRD-产品需求-Product-Requirements.md) | v0.1.0 | 三层权威 + 四层业务闭环 + 非目标 + 风险声明边界 |
| [03-Architecture](./docs/03-架构设计-Architecture-Design.md) | v0.1.0 | 四层架构 + Electron 五件骨架 + pi 扩展 + MALF Adapter + 安全不变量六条 |
| [04-Todo](./docs/04-任务清单-Todo-List.md) | v0.1.0 | 任务登记 + 组件治理看板 + 里程碑 M0-M4 + 48 task-id |
| [05-ERD](./docs/05-数据模型-ERD-Data-Model.md) | v0.1.0 | DuckDB schema + WaveStructuralSnapshot 44 字段 + v0.02 新表 |
| [06-API](./docs/06-API契约-API-Contracts.md) | v0.1.0 | 21 RPC 方法 + MALF Adapter JSON Lines + DTO |
| [07-Workflow](./docs/07-工作流-Workflow.md) | v0.1.0 | 数据管道 + 风险声明 + 6 状态机 + SOP |
| [08-Test](./docs/08-测试验收-Test-Plan.md) | v0.1.0 | 四层金字塔 + INV-01~06 + G0-G3 门禁 + 确定性验证 |
| [09-UI](./docs/09-使用者介面-UI-Design.md) | v0.1.0 | 三栏布局 + 6 Tab + 44 字段展示 + honest degradation |
| [10-开发规范](./docs/10-开发规范-Dev-Rules.md) | v0.1.0 | 16 步流程 + .plan/.record 双目录 + TDD 纪律 |
| [11-组件装配](./docs/11-组件装配-Component-Assembly.md) | v0.1.0 | 先分解再组合 + 四道装配门 + 三批次 |
| [12-目录治理](./docs/12-目录治理-Directory-Governance.md) | v0.1.0 | 14 Z 盘拓扑 + 三层物理隔离 + .gitignore |

### 3.2 参考仓库（仅参考，不构成权威）

| 仓库 | 路径 | 用途 |
|---|---|---|
| pi | `H:\pi-references\pi` | AI 底座 + AGENTS.md 范式 + extensions/skills 规范 |
| pi-skills | `H:\pi-references\pi-skills` | 技能供给 + SKILL.md 格式 |
| pi-desktop | `H:\pi-references\pi-desktop` | 桌面壳架构 + contract + verify.mjs 范式 |
| inno-agent | `H:\pi-references\inno-agent` | 业务化范本 + 工作区级治理 |
| pi-studybuddy | `H:\pi-studybuddy` | 13 文档结构模板 + 治理范式 |
| ai-malf-riskbench | `Z:\ai-malf-riskbench` | v0.01 主仓 + 治理范式参考（AGENTS.md / .plan / .record） |

### 3.3 领域权威（只读，最高领域权威）

| 仓库 | 路径 | 用途 |
|---|---|---|
| MALF-Definitive v2.1 | `Z:\ai-malf-riskbench-Definitive\malf-Definitive（v1.0-v2.1）\MALF_Definitive_v2_1-deepseek-20260726\` | MALF 五层架构 + 44 字段契约 + 不变量 + 铁律 |

### 3.4 治理资产清单（✅ 已创建，v0.1.0 治理体系就绪）

| 文件 | 状态 | 作用 |
|---|---|---|
| `AGENTS.md`（本文件） | ✅ v0.1.0 已创建 | 仓库操作宪章 |
| `README.md` | ✅ v0.1.0 已创建 | 项目总览 |
| `docs/10-开发规范` | ✅ v0.1.0 已创建 | 16 步开发流程 |
| `docs/11-组件装配` | ✅ v0.1.0 已创建 | 先分解再组合 SoT |
| `docs/12-目录治理` | ✅ v0.1.0 已创建 | 目录职责隔离 |
| `.pi/skills/*` | ✅ 已创建 | 治理用 Skill（riskbench-task-complete / riskbench-component-assembly） |
| `.pi/prompts/*` | ✅ 已创建 | 工作流模板（wr / plan） |
| `scripts/verify.mjs` | ✅ 已创建 | 统一质量门（design/m0/full 阶段自适应） |
| `scripts/check-docs-governance.mjs` | ✅ 已创建 | 文档治理检查 |
| `scripts/check-contract-coverage.mjs` | ✅ 已创建 | 契约 AST 校验（M0 后启用完整校验） |
| `scripts/check-desktop-security.mjs` | ✅ 已创建 | 安全不变量六条断言（INV-01~06） |
| `scripts/smoke.mjs` | ✅ 已创建 | M0 系统冒烟（M0 后启用完整校验） |
| `.plan/` | ✅ 已就绪 | 任务计划目录（README + 00-当前任务，无执行中任务，等待 M0 启动） |
| `.record/` | ✅ 已就绪 | 实施记录目录（README，待首任务收尾写入） |

---

## §4 任务铁律

### 4.1 五阶段组件治理不可跳越（00 索引 §5）

任何组件必须走完五阶段：

```
1. 下载储存    →  H:\pi-references\* 或 node_modules / venv / Z:\ai-malf-riskbench-components\*
2. 单件测试    →  独立冒烟 + 合成夹具断言（vitest + pytest）
3. 集成测试    →  extension×pi 底座契约 + 钩子协作 + MALF Adapter 桥接验证
4. 系统组装    →  代码进入 src/ + 类型检查 + lint + contract AST 校验
5. 冒烟 + E2E  →  系统冒烟 + 受影响 E2E + 安全不变量六条 + 确定性验证
```

**任一阶段失败退回上一阶段，不进 master**（08-Test §2.3）。

### 4.2 task-id 全局唯一

```
T-M<里程碑>-<三位序号>
里程碑：M0（骨架）/ M1（核心闭环）/ M2（完整闭环）/ M3（打磨）/ M4（业务接线+打包部署）
示例：T-M0-001、T-M1-042

规则：
- task-id 一经分配不可重用，即使废弃也保留占位（状态 cancelled）
- 跨里程碑任务不得复用 id，新里程碑从 001 重新计数
- 修复记录使用 FR-<四位序号> 前缀，不占用 task-id 序号空间
```

运行数据隔离依赖此 id：`Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\`（00 索引 §6.2）。

### 4.3 壳层先于业务（03-Arch §9 装配顺序）

```
1. 壳层（Electron main + preload + renderer + agent-host + contract + 安全沙箱 + credential-vault + MALF Adapter 试炼场）
2. 公用零件（DuckDB 只读访问层 + pi 扩展空壳）
3. 业务模块（MALF 查询 / RISK 风险声明 / AI 解读 / 回测报告 / 设置页）
```

**禁止**在壳层未就绪时开发业务模块。

### 4.4 单一执行任务门禁（继承 v0.01 + ai-malf-riskbench）

`.plan/` 同一时刻只允许存在一个**正在执行**的详细任务计划。

创建新计划的三项前置条件（必须同时满足）：
1. 上一项任务已完成并在 04-Todo 记录
2. 用户已明确选择该任务并批准开工
3. 该任务即将进入实施

**未选任务**只能在 `.plan/00-当前任务.md` 作为候选名称出现，**不得**预写文件清单、命令、预期输出或实现步骤。

### 4.5 任务状态不得只存在于聊天

`docs/04-Todo` 是任务注册表和完成证据 SoT，`.plan/` 是获批行动计划 SoT。

- 计划文件存在 ≠ 实现开始
- 实现提交存在 ≠ master 完成
- **只有 docs/04 证据 + master 复验 + origin/master 推送三者齐全才可报告完成**

---

## §5 TDD 纪律（强制）

### 5.1 RED → GREEN → REFACTOR

```
RED      先写与权威条款对应的失败测试
GREEN    只写使当前测试通过的最小实现
REFACTOR 测试保持通过后再整理结构
```

**禁止**：
- 先实现再补测试
- 用待测实现自动生成自己的 golden 预期
- 仅以覆盖率百分比验收

### 5.2 证据顺序（08-Test §1.4）

```
设计文档权威条款 → 测试 ID → fixture → 预期事件序列 → 实际结果 → 审计证据
```

每条关键不变量必须建立完整证据链。

### 5.3 测试运行数据隔离

所有测试写 `Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\`，**绝不污染生产数据库根**（`Z:\ai-malf-riskbench-data\`）。

### 5.4 不连真实外部服务

AI provider / 飞书 / TDX 实时行情 全部 mock，仅冒烟/E2E 可走受控夹具（08-Test §1.4 铁律 4）。

### 5.5 v0.01 继承测试复验

v0.01 五组件 290 passed 测试在 v0.02 中必须复验通过，**不得回退**。复验失败立即停止业务施工，先修复继承断裂。

---

## §6 拆分 → 小组件 → 组合（用户宗旨）

### 6.1 核心原则：先分解，再组合

v0.02 的系统能力来自成熟组件的组合，**而不是从零造轮子**。

系统开发不是先写完整业务再找组件；而是**先把成熟组件一个个调通，再通过 Adapter 组合成系统能力**。

### 6.2 组件化装配流程（docs/11-组件装配）

```
1. 组件识别    →  从 01-TRD §2 + 03-Arch §3 识别所需组件
2. 试炼场单件  →  在试炼场独立调通（Z:\pi-malf-riskbench-v0.02-composer）
3. 能力卡沉淀  →  COMPONENT-CARD.md 记录组件能力与边界
4. Adapter 封装 →  在主仓 src/ 重新实现 Adapter（不复制试炼场代码）
5. 主仓装配    →  通过 contract RPC 装配进系统
6. 装配门禁    →  组件测试全绿 + 工作区干净 + 公开 API 有文档 + 无越权行为
```

### 6.3 试炼场与主仓的边界

- 试炼场代码**不得**被主仓库 `import`
- 主仓库**不复制**试炼场样例，必须在主仓独立重新实现 Adapter
- 试炼场不变成主系统，运行数据不进入 Git
- 备份不反向污染当前 SoT

### 6.4 组件粒度原则

- **直接套库**：成熟开源组件直接用（如 DuckDB、Electron）
- **套组件配薄胶水**：开源组件 + 薄 Adapter（如 MALF Python 引擎 + Adapter）
- **主要自研但薄**：业务逻辑自研但保持精简（如 RISK 风险声明 CRUD）
- **禁止过度工程化**：不为"将来可能需要"的功能提前设计

---

## §7 受控收尾流程

任务完成时必须按以下顺序执行（详见 `.pi/skills/riskbench-task-complete/SKILL.md`）：

```
1. 复验当前任务的测试和最小端到端路径
2. 更新 docs/04-Todo：任务完成、事实、提交号；不得替用户预选下一项
3. 创建 .record/T-M<里程碑>-<三位序号>-实施记录.md：本任务唯一记录（8 章节，见 §7.1）
4. 如 API 合同变化，更新对应 spec 文档
5. 在计划和当前任务看板中标明完成状态；保留该计划原件作为历史范围与验收证据
6. 运行文档治理检查（scripts/check-docs-governance.mjs）
7. 停止并报告，等待用户明确指示
```

**禁止**：
- 创建下一任务启动 Prompt
- 自动写生产数据库（`Z:\ai-malf-riskbench-data\`）
- 自动提交/推送/合并（必须在用户明确要求后执行）
- 以"任务完成"为由启动其他未选任务

### 7.1 实施记录 8 章节

`.record/T-M<里程碑>-<序号>-实施记录.md` 必须包含：

1. 任务裁决与范围
2. 实际交付
3. 偏差
4. 问题及根因
5. 关键决定及依据
6. 测试证据
7. Git 证据
8. 未解决事项/下一步约束

---

## §8 Git 纪律

### 8.1 分支命名

```
<executor>/<work-id>-<scope>
executor: human / agent（单人单机，不区分 codex/claude）
work-id:  task-id（如 T-M0-001）
scope:    简短英文 scope

示例：human/T-M0-001-electron-skeleton
       agent/T-M1-042-malf-query-tools
```

### 8.2 合并流程

```
git checkout master
git pull --ff-only
git merge --ff-only <task-branch>
```

- 只允许 `git merge --ff-only`（快进合并）
- **禁止** `git reset --hard` / `git clean -fd` / `git stash` / `--no-verify`
- 冲突时停下，**不得** 强推

### 8.3 提交纪律

- 只 commit 自己本 session 改的文件
- `git add <显式路径>`，**禁止** `git add -A` / `git add .`
- commit message 格式：`type(scope): 中文描述`
  - type: feat / fix / docs / test / refactor / chore
  - scope: 模块名（如 m0 / malf / risk / bench / ai / viewer）
  - 示例：`feat(m0): Electron 五件骨架 + contract RPC`

### 8.4 完成判据

master 分支只代表已集成、已验证、docs/04 已同步的事实。

**只有以下三者齐全才可报告任务完成**：
1. docs/04-Todo 证据已登记
2. master 分支复验通过（含 v0.01 290 passed 继承复验）
3. origin/master 推送成功

### 8.5 不提交清单

- 真实密钥 / `.env.local` / `credentials.json`
- DuckDB 生产库 / Parquet 备份 / 真实行情数据
- `node_modules/` / `venv/` / `__pycache__/` / 临时文件
- 试炼场代码副本 / 运行数据（`Z:\pi-malf-riskbench-v0.02-runtime\`）
- MALF v2.1 Definitive 原文（只读参考，不进入本仓）

---

## §9 安全与隐私边界（01-TRD §5 + 02-PRD §5.2）

### 9.1 网络边界

- 只监听 `127.0.0.1`，无公网入口
- 无云数据库，无远程协作
- 不连接券商 API，不发送真实交易指令

### 9.2 密钥边界

- 真实密钥只在本机配置存储（Windows DPAPI，pi-desktop credential-vault，safeStorage 加密）
- 键名匹配：`/^modelProvider:[a-z0-9._-]{1,160}$/i`（01-TRD §5.2）

### 9.3 日志脱敏

**永不记录**：请求正文、模型完整输出、base URL、apiKey、完整 UUID、runtime_fingerprint（D5）
**AI 日志字段 allowlist**：只记录 allowlist 内字段（provider name + tokens + sanitized error code）
**错误返回固定安全编码**：不暴露 Key/URL/路径/堆栈（S9）

### 9.4 组件安全

- MALF 子进程隔离（Python 引擎崩溃不影响 Electron 主进程）
- 路径穿透防护（`_guard` 检查结果在 DATA_ROOT 子树内，拒绝 `../`）
- MIME 严格匹配（HTML 预览独立 CSP，form-action 'none'）
- 符号链接逃逸防护

### 9.5 数据隔离三层（01-TRD §7 决策 3 + 12-目录治理）

| 层 | 路径 | 用途 | 写权限 |
|---|---|---|---|
| pi 会话目录 | `~/.pi/agent/` | pi 自管（auth.json/models.json/settings.json） | pi 内核 |
| 业务数据根 | `Z:\ai-malf-riskbench-data\`（v0.01 继承） | DuckDB 生产库 + Parquet 备份 + 日志 | v0.01 run_pipeline.ps1（受 ops.md SOP 约束） |
| v0.02 运行时 | `Z:\pi-malf-riskbench-v0.02-runtime\` | Electron 运行日志 + 缓存 + 临时 + 测试 runs | v0.02 主进程 |

- pi 会话目录与业务数据根**物理隔离**，v0.02 不侵入 `~/.pi`
- 业务数据根由 v0.01 run_pipeline.ps1 独占写，v0.02 Viewer **只读**
- v0.02 运行时可清空重建，不影响 SoT

### 9.6 安全不变量六条（01-TRD §5.5 + 08-Test §5.7）

由 `scripts/check-desktop-security.mjs` 硬断言，任一失败阻塞合并：

| 编号 | 不变量 | 实现位置 |
|---|---|---|
| INV-01 | renderer 沙箱 `sandbox:true` | Electron BrowserWindow webPreferences |
| INV-02 | 严格 CSP（default-src 'self'） | Electron session 配置 |
| INV-03 | preload 受控桥接（不暴露 Node API） | preload.ts contextBridge 白名单 |
| INV-04 | credential-vault safeStorage（Windows DPAPI） | credential-vault.ts |
| INV-05 | Host RPC 契约化（所有跨进程通信走 contract） | contract.ts + ipcMain 白名单 |
| INV-06 | HTML 预览独立 CSP（form-action 'none'） | 预览窗口独立 session |

---

## §10 开发命令（M0 启动后补全）

**当前阶段（设计 + 治理体系就绪，待启动 M0）**：

```bash
# 文档治理检查（design 阶段即可用）
node scripts/check-docs-governance.mjs

# 契约校验（M0 骨架 src/contract/api.ts 就绪后自动启用完整校验）
node scripts/check-contract-coverage.mjs

# 安全不变量六条（M0 骨架 src/main/window.ts 就绪后启用完整校验）
node scripts/check-desktop-security.mjs

# 统一质量门（按阶段自适应：design / m0 / full）
node scripts/verify.mjs
```

**M0 骨架启动后补全**（pnpm 包管理）：

```bash
# pnpm install              # 安装依赖
# pnpm dev                  # 构建 + 启动 Electron
# pnpm build                # tsc 编译 + vite 打包
# pnpm type-check           # tsc --noEmit
# pnpm test                 # vitest run（单件 + 集成 + 安全不变量）
# pnpm smoke                # node scripts/smoke.mjs
# pnpm verify               # 统一质量门
```

**Python 继承测试复验**（M0 启动后启用）：

```bash
# cd Z:\ai-malf-riskbench-components\malf-engine && python -m pytest
# cd Z:\ai-malf-riskbench-components\malf-data && python -m pytest
# cd Z:\ai-malf-riskbench-components\riskbench-shared && python -m pytest
# cd Z:\ai-malf-riskbench-components\malf-signal && python -m pytest
# cd Z:\ai-malf-riskbench-components\malf-backtest && python -m pytest
# 预期：290 passed 全部通过，不得回退
```

**质量门阶段**（scripts/verify.mjs 自动按当前阶段选择）：
- design 阶段：docs-governance
- m0 阶段：type-check + unit-test + contract-coverage + desktop-security + build + smoke
- full 阶段：再补 e2e + v0.01 继承测试复验

---

## §11 治理文件修改规则

### 11.1 治理基线文件

修改以下文件前必须说明原因、影响和权威依据：

- `AGENTS.md`（本文件）
- `README.md`
- `docs/00-文档索引-Index.md`
- `docs/01-TRD` ~ `docs/09-UI`（设计文档）
- `docs/10-开发规范` / `docs/11-组件装配` / `docs/12-目录治理`（治理文档）
- `.pi/skills/*/SKILL.md`
- `scripts/verify.mjs` / `scripts/check-docs-governance.mjs` / `scripts/check-contract-coverage.mjs` / `scripts/check-desktop-security.mjs` / `scripts/smoke.mjs`

### 11.2 修订纪律

- 不得删除历史决策来"让文档看起来一致"
- 冲突必须通过新增决策记录和显式 `supersedes` 关系解决
- 每次修订在 §12 修订记录中登记

### 11.3 用户授权

用户指令与本文件冲突时，**先明确确认才能覆盖**。不得凭推测扩大用户授权范围。

### 11.4 设计阶段与治理基线的交叉审查（元纪律）

设计阶段闭环、治理基线建立或重大修订、里程碑退出门禁，必须经 **≥2 个独立审查者交叉核对**才能定案。

**为什么**：单审查者（人或 AI）的盲区是结构性的。pi-studybuddy 2026-08-07 省察中，3 个 AI 审查者共发现 25 处洞，重叠仅 4 处——任一单点审查都会漏掉大部分问题。

**适用场景**：
- 设计文档体系闭环（00-12 全部审查批准时）
- 治理基线建立或重大修订（AGENTS.md / 治理脚本 / 治理 Skills）
- 里程碑退出门禁（M0-M4 完成）

**执行方式**：
- 至少 2 个独立审查者（不同 AI 会话 / 不同人 / AI+人组合）
- 各自独立输出洞集，再合并去重
- 交叉核对待办清单（非穷尽）：版本登记一致性、文件落位（无幽灵副本）、自指断言真实性、编号连续性、跨文档契约对齐、计划状态与实际实现一致性
- 洞未处置前不得报告"已完成"

**记录**：交叉审查结论写入对应文档版本历史或 `.record/` 实施记录。

---

## §12 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：12 章仓库操作宪章。参考 ai-malf-riskbench AGENTS.md（v0.01 治理范式 + 权威链 + 单一任务门禁 + 受控收尾 + 三层权威）+ pi AGENTS.md（对人+agent 同约束）+ pi-studybuddy AGENTS.md（13 文档结构 + 交叉审查元纪律 + verify.mjs + contract 校验 + .pi/skills 治理 Skill）+ pi-desktop（check-desktop-security.mjs 硬断言范式）。适配 v0.02 单人单机单写场景 + v0.01 继承（290 passed）+ MALF v2.1 领域权威 + 三层物理隔离 + 安全不变量六条（INV-01~06），落地"拆分→小组件→组合"宗旨。 |
| v0.1.1 | 2026-08-09 | 治理资产清单补全：§3.4 + §11.1 新增 `scripts/smoke.mjs` 登记（与 §10 开发命令引用对齐），§3.4 `.plan/` 描述精确化（README + 00-当前任务）。治理资产清单 14 项全部 ✅ 已创建并经 `scripts/check-docs-governance.mjs` 自检通过（13 份设计文档 + 2 个 Skill + 2 个 prompt + 5 件治理脚本 + .plan/.record 目录骨架）。修复 00-索引 §3.2 文档登记表状态字段一致性洞（01-12 由"📝 待写"对齐为"📝 草案"，与各文档头部状态一致）。 |
