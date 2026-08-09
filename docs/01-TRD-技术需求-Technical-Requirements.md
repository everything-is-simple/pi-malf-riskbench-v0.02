# 01-TRD-技术需求-Technical-Requirements

**版本**：v0.1.1
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：AGENTS.md（已创建 v0.1.7）、[00-文档索引](./00-文档索引-Index.md)
**下游**：[02-PRD](./02-PRD-产品需求-Product-Requirements.md)、[03-架构设计](./03-架构设计-Architecture-Design.md)
**用途**：v0.02 技术底座决策与六点定案，决定"系统以什么技术栈构建"

---

## §1 概述

### 1.1 文档定位

本文档是 v0.02 技术需求的最高权威，定义：
- 技术底座（pi + pi-desktop + v0.01 组件 + MALF v2.1）
- 系统形态（Electron 单机桌面）
- 安全/隐私边界
- 六点决策定案（经用户批准后不可随意改）

### 1.2 与其他文档关系

- **上游**：AGENTS.md（安全约束不可被本文档覆盖）
- **下游**：02-PRD（产品需求基于本文档技术底座）、03-Architecture（架构设计基于本文档决策）
- **权威**：本文档 §7 决策记录经用户批准后，下游文档不得违反

### 1.3 与 v0.01 的关系

**继承不重写**：
- v0.01 的 trd.md（SPEC-TRD-001 v0.2）技术栈决策全部继承
- v0.01 的确定性约束 D1-D26 全部继承
- v0.01 的安全约束 S1-S38 全部继承
- v0.02 在此基础上新增 pi 底座 + Electron 壳 + Adapter 桥 + 只读 Viewer

---

## §2 技术底座

### 2.1 四动力组合

| 动力 | 角色 | 来源 | 版本约束 |
|---|---|---|---|
| **pi-coding-agent** | AI 底座 | `H:\pi-references\pi` | `@earendil-works/pi-coding-agent`（peerDependency） |
| **pi-desktop 架构** | 桌面壳范本 | `H:\pi-references\pi-desktop` | 五件骨架（main + preload + renderer + agent-host + contract） |
| **v0.01 五组件** | MALF 地板层 | `Z:\ai-malf-riskbench-components\*` | 290 passed，零外部依赖（核心引擎） |
| **MALF v2.1 Definitive** | 领域权威 | `Z:\ai-malf-riskbench-Definitive\...\MALF_Definitive_v2_1-deepseek-20260726\` | 7 份权威文档，领域语义最高权威 |

### 2.2 技术栈决策

| 层 | 技术 | 用途 | 来源 | 版本约束 |
|---|---|---|---|---|
| AI 底座 | pi-coding-agent | AI 内核，不修改 | `@earendil-works/pi-coding-agent` | peerDependency |
| AI provider | @earendil-works/pi-ai | 多供应商抽象 | `@earendil-works/pi-ai` | peerDependency |
| 桌面壳 | Electron | 跨平台桌面应用 | Electron | ≥ 28.x |
| UI 框架 | React + TypeScript | renderer 层 | React 18 + TS 5.x | — |
| MALF 引擎 | Python 3.10+ | 五层领域模块 | v0.01 malf-engine | 零外部依赖（核心） |
| 数据接入 | Python stdlib | TDX .day 解析 | v0.01 malf-data tdx_reader | 32B `<5If2I` |
| 分析数据库 | DuckDB | snapshots + signals 持久化 | v0.01 malf-data DuckDBAdapter | — |
| 配置层 | Python frozen dataclass + .env | 集中配置 | v0.01 riskbench-shared | — |
| 路径层 | Python paths.py + _guard | 集中路径推导 | v0.01 riskbench-shared | — |
| 信号层 | Python 纯函数 | 四事件码事件流 | v0.01 malf-signal | rule_version=malf-signal-event-v1 |
| 验证层 | Python 确定性验证 | 触发序列+交叉验证+审计 | v0.01 malf-backtest | 不输出收益类指标 |
| MALF Adapter | TypeScript | Python ↔ pi 桥接 | v0.02 新建 | 子进程 + JSON 协议 |
| 测试 | vitest + pytest | TS 单件/集成 + Python 单件 | — | — |
| E2E | vitest + Electron | 系统端到端 | — | 非 Playwright |
| 构建 | pnpm + pyproject.toml | 包管理 | — | — |
| 版本控制 | git + GitHub | 源码管理 | — | — |

### 2.3 明确不用

| 技术 | 不用原因 |
|---|---|
| Docker/Redis/PostgreSQL/Airflow | 单机桌面应用，无需持续运行的服务 |
| numpy/pandas/pydantic/orjson/polars/scipy（核心引擎内） | 防止 float64 精度跨平台漂移（v0.01 D16 继承） |
| backtrader（v0.1） | 战役 1 边界，T4 只做确定性规则验证，不输出收益类指标 |
| Streamlit（v0.1） | v0.02 改用 Electron 只读 Viewer 替代 |
| Playwright | E2E 改用 vitest + Electron（pi-studybuddy 范式） |
| MCP（内核侧） | pi 内核不内置 MCP，若需须在扩展层自建 |

---

## §3 格式矩阵

### 3.1 支持的输入格式

| 格式 | 用途 | 处理组件 | 备注 |
|---|---|---|---|
| TDX `.day` | 原始行情 | malf-data tdx_reader | 32B `<5If2I`，整只拒绝坏记录 |
| DuckDB | 生产库 | malf-data DuckDBAdapter | 44 列 snapshots + 10 列 signals |
| Parquet | 冷备 | v0.01 scripts/backup.py | EXPORT DATABASE 产物 |

### 3.2 支持的输出格式

| 格式 | 用途 | 处理组件 | 备注 |
|---|---|---|---|
| WaveStructuralSnapshot JSON | 引擎内部持久化 | malf-engine Service | var/published/{symbol}/{timeframe}/ |
| Markdown | AI 解读/回测报告 | pi 扩展层 | HTML 预览独立 CSP |
| HTML | 回测报告预览 | Electron renderer | 独立 session CSP |
| CSV | 数据导出（只读 Viewer） | v0.02 新建 | 用户手动导出 |

---

## §4 系统形态

### 4.1 Electron 单机桌面应用

| 属性 | 值 |
|---|---|
| 形态 | Electron 桌面应用（单机、单用户、单写进程） |
| 平台 | Windows x64（v0.1 目标） |
| 进程模型 | main + preload + renderer + agent-host + MALF 子进程 |
| 网络模型 | 只监听 127.0.0.1（如需），无公网入口 |
| 数据模型 | DuckDB 文件（v0.01 继承）+ JSONL（引擎内部）+ Parquet（冷备） |

### 4.2 五件骨架（继承 pi-desktop 范式）

```
main/          ← Electron 主进程：窗口管理 + 原生能力 + MALF 子进程托管
preload/       ← 受控桥接：白名单 API，不暴露 Node
renderer/      ← React UI：三栏布局 + Tabs + 只读 Viewer
agent-host/    ← pi 嵌入：createAgentSession + 扩展加载
contract/      ← RPC 契约：MessagePort + 统一信封
```

### 4.3 MALF 引擎子进程隔离

- Python MALF 引擎不嵌入 Electron 主进程
- 由 agent-host 经子进程 + JSON 协议桥接
- MALF 引擎崩溃不拖垮桌面
- 子进程通信：stdin/stdout JSON Lines，stderr 日志

---

## §5 安全/隐私边界

### 5.1 网络边界（继承 v0.01 S1-S5 + 新增）

| 编号 | 约束 |
|---|---|
| S1 | 单机本地运行（无 SaaS/无公网暴露计划） |
| S2 | 无 HTTP 服务（v0.1）；如需 HTTP 绑定 127.0.0.1 |
| S3 | 禁止公网绑定（不绑定 0.0.0.0/局域网 IP/公网 IP） |
| S4 | 禁止真机跨设备访问/LAN 绑定/隧道/公网/小主机/云部署 |
| S5 | 禁止后台 scheduler/文件 watcher/自动重算/遥测/公网依赖 |

### 5.2 密钥边界（继承 v0.01 S6-S9 + 新增 INV-04）

| 编号 | 约束 |
|---|---|
| S6 | .env 不入 git（.gitignore 排除）；.env.example 含空占位符纳入 git |
| S7 | 密钥/URL/路径不在日志和终端输出中明文暴露 |
| S8 | AI API Key 不入日志（只记 provider name+tokens+sanitized error code） |
| S9 | API 错误返回固定安全编码，不暴露 Key/URL/路径/堆栈 |
| INV-04 | credential-vault safeStorage：密钥 Windows DPAPI 加密 |

### 5.3 数据隔离（继承 v0.01 S12-S16 + 新增三层物理隔离）

| 编号 | 约束 |
|---|---|
| S12 | TDX 数据只读（Z:\new_tdx64 永远不写入） |
| S13 | 历史项目只读（Z:\ai-malf-riskbench-history 不修改不迁移） |
| S14 | 权威定义只读（Z:\ai-malf-riskbench-Definitive 不修改原文） |
| S15 | 旧版数据只读交叉核验源（Z:\riskbench-data-old 非主要数据源） |
| S16 | 路径穿透防护（_guard 检查结果在 DATA_ROOT 子树内，拒绝 `../` 逃逸） |
| S17 | 禁止硬编码绝对路径（所有路径经 paths.py 函数获取） |
| 新增 | pi 会话目录 `~/.pi` 与业务数据根 `Z:\ai-malf-riskbench-data` 物理隔离 |
| 新增 | v0.02 运行时 `Z:\pi-malf-riskbench-v0.02-runtime` 与生产库物理隔离 |

### 5.4 用途分级（继承 v0.01 S28-S35）

| 编号 | 约束 |
|---|---|
| S28 | 数据用途分级 G0-G3（G0 rejected / G1 合同与新鲜度降级 / G2 模型不完整 None+reason_codes / G3 lineage 不完整禁止发布） |
| S29 | v0.1 只允许 verification_only / research_only / rejected 三种 usage；operational 明确禁用 |
| S30 | 当前数据固定为 research_only / stale_research_only，不得称为"当前风险状态"，不得升级为 operational |
| S31 | 回测绩效指标属研究验证范畴（research_only），不得作为买卖建议输出、不得接入真实券商账户、不得用于自动交易 |
| S33 | AI 只解释/总结/提醒矛盾，不修改市场事实与用户声明两层 |
| S34 | 禁止用 AI 计算/修改/控制风险数值 |
| S35 | 不让 AI 修改 MALF/RISK 层的确定性计算 |

### 5.5 桌面壳安全不变量六条（v0.02 新增）

> 断言列与 `scripts/check-desktop-security.mjs` 可执行条件严格一致（P0-3/N-2 修复，对齐 04-Todo §5.2 + AGENTS.md §9.6 + 03-Arch §7 + 08-Test §5.8 四处统一）。

| 编号 | 不变量 | 断言（脚本可执行条件） | 实现位置 | task-id |
|---|---|---|---|---|
| INV-01 | renderer 沙箱 | `sandbox:true`（webPreferences） | Electron BrowserWindow 配置 | T-M0-006 |
| INV-02 | 严格 CSP | `default-src 'self'` + `script-src 'self'` | Electron session 配置 | T-M0-006 |
| INV-03 | preload 受控桥接 | 仅 `exposeInMainWorld('piBridge')`，不暴露 Node API | preload.ts contextBridge 白名单 | T-M0-002 |
| INV-04 | credential-vault safeStorage | `safeStorage` Windows DPAPI 加密 | credential-vault.ts | T-M0-007 |
| INV-05 | Host RPC 契约化 | `api.ts` 完整接口，24 RPC 方法（六路由组 malf/risk/ai/bench/viewer/system） | contract.ts + ipcMain 白名单 | T-M0-005 |
| INV-06 | HTML 预览独立 CSP | `form-action 'none'`（HTML_PREVIEW_CSP） | 预览窗口独立 session | T-M2-009 |

---

## §6 组件治理

### 6.1 五阶段（继承 pi-studybuddy 范式 + v0.01 装配.md）

```
1. 下载储存    →  H:\pi-references\* 或 node_modules / venv / Z:\ai-malf-riskbench-components\*
2. 单件测试    →  独立冒烟 + 合成夹具断言（vitest + pytest）
3. 集成测试    →  extension×pi 底座契约 + 钩子协作 + MALF Adapter 桥接验证
4. 系统组装    →  代码进入 src/ + 类型检查 + lint + contract AST 校验
5. 冒烟 + E2E  →  系统冒烟 + 受影响 E2E + 安全不变量六条 + 确定性验证
```

### 6.2 装配顺序（壳层 → 公用零件 → 业务模块）

| 批次 | 里程碑 | 组件 | 前置 |
|---|---|---|---|
| 1 壳层 | M0 | Electron main + preload + renderer + agent-host + contract + 安全沙箱 + credential-vault | 无 |
| 2 公用零件 | M0-M1 | MALF Python 引擎 Adapter + DuckDB 只读访问层 + pi 扩展空壳 + 配置层 | 壳层就绪 |
| 3 业务模块 | M1-M3 | MALF 查询工具 + 风险声明 + AI 解读 + 回测报告 + 只读 Viewer | 公用零件就绪 |

详见 [11-组件装配](./11-组件装配-Component-Assembly.md)。

---

## §7 决策记录

### 决策 1：全面 pi 化（技术栈方向）

| 字段 | 值 |
|---|---|
| 决策编号 | DECISION-v02-001 |
| 决策内容 | v0.02 以 pi-coding-agent 为 AI 底座，Electron + React + TypeScript 为桌面壳，Python MALF 引擎通过 Adapter 桥接 |
| 依据 | 用户 2026-08-09 明确指示"全面 pi 化" |
| 状态 | ✅ 生效 |
| supersedes | v0.01 的 Streamlit 可视化方案（战役 2 BENC-06） |

**理由**：
- pi 提供成熟的 AI 底座（extensions + skills + providers + SDK），不重复造轮子
- pi-desktop 提供成熟的桌面壳架构（五件骨架 + 安全沙箱 + credential-vault）
- v0.01 MALF 引擎零外部依赖、确定性可重放，通过 Adapter 即可桥接
- inno-agent 证明"以 pi SDK 构建完整产品"可行

### 决策 2：v0.02 继承 v0.01（组件关系）

| 字段 | 值 |
|---|---|
| 决策编号 | DECISION-v02-002 |
| 决策内容 | v0.02 继承 v0.01 五组件（290 passed）+ 生产数据库 + Z 盘目录拓扑 + 安全/确定性约束，不重写实现 |
| 依据 | 用户 2026-08-09 明确指示"v0.02 继承 v0.01" |
| 状态 | ✅ 生效 |

**继承清单**：
- malf-engine（115 passed）/ malf-data（46 passed）/ riskbench-shared（10 passed）/ malf-signal（37 passed）/ malf-backtest（31 passed）/ 主仓编排（51 passed）
- DuckDB 生产库（3 标的 × 3 周期 × 15397 行 + signals 2835）
- Z 盘 12 目录拓扑
- 安全约束 S1-S38 + 确定性约束 D1-D26
- MALF v2.1 五层架构领域权威

### 决策 3：物理隔离三层（数据隔离）

| 字段 | 值 |
|---|---|
| 决策编号 | DECISION-v02-003 |
| 决策内容 | pi 会话目录 `~/.pi`、业务数据根 `Z:\ai-malf-riskbench-data`、v0.02 运行时 `Z:\pi-malf-riskbench-v0.02-runtime` 三层物理隔离 |
| 依据 | pi-studybuddy 01-TRD §7 决策 3 范式 + v0.01 物理隔离规则 |
| 状态 | ✅ 生效 |

**规则**：
- v0.02 不侵入 `~/.pi`（pi 自管 auth.json/models.json/settings.json）
- v0.02 默认模型选型落业务数据根 `config/models.json` 带 `__riskbench_managed` 标记
- v0.02 运行时沙箱 `Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\` 不污染生产库

### 决策 4：MALF 引擎子进程隔离（架构决策）

| 字段 | 值 |
|---|---|
| 决策编号 | DECISION-v02-004 |
| 决策内容 | Python MALF 引擎不嵌入 Electron 主进程，由 agent-host 经子进程 + JSON 协议桥接 |
| 依据 | pi-studybuddy inno-agent terminal 范式 + v0.01 malf-engine 零外部依赖特性 |
| 状态 | ✅ 生效 |

**理由**：
- Python 与 Node.js 进程隔离，崩溃不互相拖垮
- MALF 引擎保持零外部依赖，不被 npm 生态污染
- JSON Lines 协议简单可靠，易于测试

### 决策 5：只读 Viewer（产品边界）

| 字段 | 值 |
|---|---|
| 决策编号 | DECISION-v02-005 |
| 决策内容 | v0.02 新增 Electron 只读 Viewer 访问 DuckDB，不修改写入路径；写入仍走 v0.01 的 run_pipeline.ps1（受 ops.md SOP 约束） |
| 依据 | v0.01 research_only 边界 + 用户单写进程约束 |
| 状态 | ✅ 生效 |

**边界**：
- Viewer 只读取 var/published/ 与 DuckDB snapshots/signals
- Viewer 不读取 TDX，不计算 MALF，不写入生产库
- 生产库写入必须用户明确授权（-AllowProductionWrite flag）

### 决策 6：一次出全 13 文档草案（工作范围）

| 字段 | 值 |
|---|---|
| 决策编号 | DECISION-v02-006 |
| 决策内容 | v0.02 文档重构一次出全 13 文档草案（00-索引 ~ 12-目录治理），基于 pi-studybuddy 13 文档结构 + v0.01 spec + MALF v2.1 权威 |
| 依据 | 用户 2026-08-09 明确指示"一次出全 13 文档草案" |
| 状态 | ✅ 生效 |

**工作范围**：
- prep-参考点核对表（03-Arch 准备材料）
- 00-索引 ~ 12-目录治理（13 文档）
- 不含 AGENTS.md（13 文档批准后单独创建）

---

## §8 确定性约束（继承 v0.01 D1-D26）

| # | 约束 | 出处 |
|---|------|------|
| D1 | 核心引擎零外部依赖 | NF-01 / v0.01 trd §3 |
| D2 | 源整数价格策略 source_integer_fixed_point | NF-02 / v0.01 trd §3 |
| D3 | 严格不等式（`<` `>`，非 `≤` `≥`） | NF-03 / v0.01 trd §3 / O3 |
| D4 | lineage_hash SHA256 算法 | NF-04 / v0.01 trd §3.6 |
| D5 | runtime_fingerprint 排除出 lineage_hash | NF-05 / v0.01 trd §3 |
| D6 | @dataclass(frozen=True) 所有值对象不可变 | v0.01 trd §3 |
| D7 | Pivot 双时间戳（extreme_bar_dt + confirm_bar_dt） | v0.01 trd §3 |
| D8 | 每次 ingest 必须验证 lineage_hash | NF-04 / v0.01 trd §3 |
| D9 | lineage_hash 规范化规则 | v0.01 trd §3.6 |
| D10 | 完整输入前缀 replay | v0.01 kiro-design §3.3 / DECISION-003 §5 |
| D11 | TDX .day 32B `<5If2I` 严格解析 | v0.01 trd §3 / kiro-design §2.1 |
| D12 | bar_dt 严格递增；不得排序/去重/跳过坏 bar | v0.01 kiro-task T02 |
| D13 | 禁止 binary float 和临时 round(2) | v0.01 AGENTS §6 |
| D14 | Pivot/Guard/Break 使用严格 `<` `>` | v0.01 AGENTS §6 |
| D15 | adapter 版本固定 malf-v2.0-etf-tick-v0.1 | v0.01 AGENTS §6 |
| D16 | 禁止 numpy/pandas/pydantic/orjson/polars/scipy 进入核心引擎 | v0.01 trd §2 |
| D17 | 三周期独立 snapshot 组合；不混池 rank | v0.01 AGENTS §6 / trd §5.4.3 |
| D18 | 永久撤回"27 桶"作为 MALF 正式模型 | v0.01 AGENTS §6 |
| D19 | 禁止 bucket_id/综合分/胜率/买卖建议/仓位/订单/PnL | v0.01 AGENTS §6 |
| D20 | v0.1 不读取/保存/校验交易所 tick_size | v0.01 AGENTS §6 |
| D21 | /1000 展示转换不得进入结构计算 | v0.01 AGENTS §6 |
| D22 | TDX .day 最后两字段按 unsigned 读取 | v0.01 AGENTS §6 |
| D23 | 事件流确定性：相同输入 → 相同事件行与 lineage_hash | v0.01 erd E4 |
| D24 | 触发序列验证两次运行报告逐字节一致 | v0.01 kiro-design §4.2 |
| D25 | run_pipeline.ps1 生产目标 fail-closed | v0.01 AGENTS §13 D3 收口 |
| D26 | 每次管道运行独立 PYTHONPYCACHEPREFIX | v0.01 AGENTS §13 D3 收口 |

**v0.02 新增确定性约束**：
| # | 约束 | 出处 |
|---|------|------|
| D27 | MALF Adapter 子进程通信使用 JSON Lines，stderr 仅日志 | v0.02 DECISION-v02-004 |
| D28 | Viewer 只读访问 DuckDB，不修改 snapshots/signals 表 | v0.02 DECISION-v02-005 |
| D29 | pi 扩展层不修改 MALF 引擎的 rule_versions 与 lineage_hash | v0.02 安全约束 |

---

## §9 性能基准（继承 v0.01）

| 指标 | 基准 | 出处 |
|---|---|---|
| 单 bar 处理 | < 50ms | v0.01 trd §7 |
| 3 标的全链路 | < 5 分钟 | v0.01 trd §7 / kiro-require §7.1 |
| 全市场 | < 30 分钟 | v0.01 trd §7 |
| DuckDB 内存 | 4GB | v0.01 trd §7 |
| DuckDB 线程 | 2 | v0.01 trd §7 |
| 磁盘空间 | ≥ 2GB | v0.01 trd §7 |
| Electron 启动 | < 3 秒（v0.02 新增） | — |
| MALF 查询响应 | < 500ms（v0.02 新增） | — |

---

## §10 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：四动力组合 + 技术栈决策 + 六点决策定案 + 确定性约束继承 + 安全不变量六条 |
| v0.1.1 | 2026-08-10 | 第四轮交叉审查 P0-1 修复：§5.5 INV-05 断言"21 RPC 方法"→"22 RPC 方法"（v0.1.6 新增 quantify_risk 后同步，与 AGENTS.md §9.6 + 03-Arch §7 + 08-Test §5.8 四处统一）。 |

---

**文档维护**：技术栈变更时更新，决策变更需用户批准
**最后更新**：2026-08-09
