# 参考点核对表（03-Architecture 准备材料）

**版本**：v0.1.0
**日期**：2026-08-09
**状态**：📝 准备材料，待 03-Architecture 吸收
**用途**：对照四类参考源逐项核对"参考什么 → 采用/不采用 → 理由"，作为 03-Architecture 设计的输入
**核对方法**：基于 v0.01 spec 内容、pi-studybuddy 13 文档结构、MALF v2.1 权威定义三路深挖结果交叉核对
**上游**：docs/00-索引 §二、docs/01-TRD §2

---

## 一、动力 1：pi 系统 —— AI 底座（`H:\pi-references\pi`）

**作用**：决定"系统以什么为内核运行"。AI MALF RiskBench v0.02 以 pi-coding-agent 为 AI 底座，不修改内核，通过扩展接入业务。

### 参考点核对

| 参考点 | 实际确认（路径/文件/签名） | 采用/不采用 | 理由 |
|---|---|---|---|
| `extensions.md`（扩展生命周期钩子） | `packages/coding-agent/docs/extensions.md`。完整覆盖 `project_trust`/`resources_discover`/`session_*`/`before_agent_start`/`agent_*`/`turn_*`/`message_*`/`tool_execution_*`/`tool_call`/`tool_result`/`model_select` 等钩子。扩展放置 `~/.pi/agent/extensions/`、`.pi/extensions/`，TS 经 jitti 加载 | 采用 | v0.02 通过扩展接入业务的核心入口，生命周期钩子决定 MALF 数据管道、风险声明、AI 解读各阶段何时挂载/卸载 |
| `skills.md`（SKILL.md 按需加载能力包） | `docs/skills.md`。实现 Agent Skills 标准，从 `~/.pi/agent/skills/`、`.pi/skills/` 发现。SKILL.md 必含 frontmatter `name`/`description`，可选 `license`/`compatibility`/`metadata`/`allowed-tools`。`/skill:name` 调用，按需 `read` 加载（progressive disclosure） | 采用 | MALF 风险工作台的能力包（如 `malf-snapshot-explain`、`risk-declare`、`backtest-report-read`）天然适合 SKILL.md 包装：description 常驻 system prompt，完整指令按需加载 |
| `sdk.md`（registerTool 等 API） | `docs/sdk.md`。SDK 主入口 `createAgentSession()`，导出 `defineTool`/`customTools`/`createCodingTools`。用法 `createAgentSession({ customTools: [myTool] })` 或 `tools: ["read","bash","my_tool"]` | 采用 | v0.02 桌面工作台程序化嵌入 pi 的第二入口；`customTools` 与扩展 `registerTool` 互备，便于集成测试直接构造 session |
| `prompt-templates.md` | `docs/prompt-templates.md`。Markdown 片段，文件名即 `/name` 命令；位置 `~/.pi/agent/prompts/*.md`、`.pi/prompts/*.md`。支持 `$1`/`$@`/`${1:-default}` 位置参数 | 采用 | MALF 工作脚手架（如 `/declare-risk`、`/explain-snapshot`、`/compare-backtest`）可用 prompt 模板固化，无需写代码 |
| `providers.md`（多供应商模型） | `docs/providers.md`。订阅类 OAuth（Codex/Claude/Copilot/xAI/OpenRouter）+ API Key 类 30+ 供应商（含国内 ZAI/Qwen/Xiaomi）。`/login` 写 `~/.pi/agent/auth.json`（0600） | 采用 | 不修改内核，全部模型层走 pi provider 体系；国内供应商覆盖对研究场景合规与成本控制是直接红利 |
| `models.md` | `docs/models.md`。`~/.pi/agent/models.json` 添加自定义 provider/model；支持 4 种 API（openai-completions/responses/anthropic-messages/google-generative-ai）。`thinkingLevelMap` 对齐统一"思考强度"档位 | 采用 | 风险工作台接本地推理（Ollama）或自建代理走 models.json，不动内核即可切换底座；落点业务数据根 config/models.json 带 `__riskbench_managed` 标记 |
| `mcp 接入` | docs 无 `mcp.md`；`usage.md` 明确："It intentionally does not include built-in MCP"。源码无 MCP server/client 实现 | 不采用（内核侧） | pi 内核不内置 MCP；v0.02 若需 MCP，必须在扩展层自建 MCP client（通过 `registerTool` 暴露、用 `pi.exec`/`fetch` 连接 MCP server） |
| `packages.md`（分发） | `docs/packages.md`。`pi install npm:@foo/bar@1.0.0`/`git:...`/本地路径；写 `~/.pi/agent/settings.json`。`package.json` 的 `pi` manifest 声明 `extensions`/`skills`/`prompts`/`themes` 路径。核心包须列为 peerDependencies：`pi-ai`/`pi-agent-core`/`pi-coding-agent`/`pi-tui`/`typebox` | 采用 | v0.02 自身可作为 pi 包分发（风险工作台能力包），依赖上述 5 个 peerDependency；分发机制决定"下载储存"阶段产物形态 |
| `registerTool` 工具注册契约 | `packages/coding-agent/src/core/extensions/types.ts`：`registerTool<TParams, TDetails, TState>(tool: ToolDefinition<...>): void`。`ToolDefinition` 必填 `name`/`label`/`description`/`parameters`/`execute`；可选 `promptSnippet`/`promptGuidelines`/`constrainedSampling`/`renderShell`/`prepareArguments`/`executionMode`。execute 返回 `{ content, details, usage?, terminate? }`，错误须 throw | 采用 | "业务能力唯一入口"的契约依据。v0.02 所有 MALF 工具（`query_snapshot`/`declare_risk`/`explain_event`/`run_backtest_report`）必须经 `registerTool` 注入；返回 `void` + execute 抛错语义决定单件测试断言形态 |
| `@earendil-works/pi-ai` AI provider 抽象层 | `packages/ai/package.json`。`Provider<TApi>` 接口含 `id`/`name`/`baseUrl`/`headers`/`auth`/`getModels()`/`stream`/`streamSimple`。`createProvider<TApi>()` 工厂。`Api` 类型联合 10 种已知 API。`builtinProviders()` 注册 38 个内置 provider 工厂 | 采用 | v0.02 多供应商可插拔的契约底座。不重写 provider，仅在扩展层用 `pi.registerProvider()` 注入风险场景专用 provider；所有 model 选择、鉴权、流式派发复用 pi-ai 抽象 |

### 装配纪律影响

1. **下载储存阶段**：`packages.md` 的 5 件套 peerDependencies 与 `providers.md` 的 auth.json 凭据路径是入库清单硬约束；MCP 不内置，不进入下载清单。
2. **单件测试阶段**：`registerTool` 契约与 `sdk.md` 的 `defineTool/customTools` 是工具单件断言唯一依据——每个 MALF 工具单测须断言 execute 返回形状与抛错语义，并断言 registerTool 返回 void。
3. **集成测试阶段**：`extensions.md` 钩子顺序与 `pi-ai Provider` 抽象（stream/streamSimple 契约）共同定义集成边界——须用 `createAgentSession({ customTools })` 拼装真实 pi-ai provider 验证工具与钩子协作。
4. **组装阶段**：以"扩展 + 技能包 + prompt 模板"的 pi 包形态组装，通过 `pi` manifest 声明四类资源路径，禁止改动内核源码。
5. **系统冒烟/E2E 阶段**：所有引用结论回填到 v0.02 有效编号文档：extensions 钩子顺序与 registerTool 签名回填到"组件治理-单件/集成测试"编号；packages peerDependencies 与 providers 凭据解析顺序回填到"下载储存"编号；MCP 不内置结论回填到"装配纪律-范围排除"编号。

---

## 二、动力 2：pi-desktop —— 桌面壳架构（`H:\pi-references\pi-desktop`）

**作用**：决定"桌面应用如何组装"。v0.02 采用 pi-desktop 五件骨架（main + preload + renderer + agent-host + contract），不复制其实现，在主仓 src/ 独立重新实现 Adapter。

### 参考点核对

| 参考点 | 实际确认（路径/文件/签名） | 采用/不采用 | 理由 |
|---|---|---|---|
| 五件骨架（main + preload + renderer + agent-host + contract） | pi-desktop 的 Electron 应用结构：main 进程管窗口+原生能力；preload 受控桥接；renderer UI；agent-host 嵌入 pi；contract RPC 契约 | 采用 | v0.02 桌面壳架构基础。MALF Python 引擎通过子进程隔离，由 agent-host 经 Adapter 桥接 |
| contract RPC（MessagePort + envelope） | pi-desktop 的 contract 层用 MessagePort 通信，统一信封 `{content, details, usage?, terminate?}`，错误 throw 不返回 error 对象 | 采用 | v0.02 RPC 契约规范直接复用；MALF 工具调用、数据查询、风险声明全部走 contract RPC |
| 安全沙箱（sandbox:true + 严格 CSP） | pi-desktop 的 BrowserWindow 配 `sandbox:true`；CSP 严格限制 script-src/connect-src；preload 受控桥接不暴露 Node API | 采用 | v0.02 安全不变量六条之一。renderer 永不直触 MALF 引擎、DuckDB、文件系统 |
| credential-vault（safeStorage） | pi-desktop 用 Electron safeStorage（Windows DPAPI）加密存储密钥；键名匹配正则 | 采用 | v0.02 AI provider 密钥、SMTP、飞书 webhook 全部走 credential-vault，明文不入日志 |
| verify.mjs（统一质量门） | pi-desktop 的 verify.mjs 是统一质量门脚本，含 type-check + build + test + lint | 采用 | v0.02 主仓 scripts/verify.mjs 作为合并 master 前的硬门禁 |
| 工作区路径守卫（workspace-path-guard） | pi-desktop 解决"cwd 不是充分边界，模型可能输出过期父路径逃逸工作区" | 采用 | v0.02 数据查询路径必须落在业务数据根子树内，拒绝 `../` 逃逸 |
| HTML 预览独立 CSP | pi-desktop 的 HTML 预览（如 Markdown 渲染）用独立 CSP，与主 renderer 隔离 | 采用 | v0.02 回测报告 HTML 预览、快照 Markdown 渲染用独立 CSP |

### 装配纪律影响

1. **壳层先于业务**：五件骨架必须在 M0 里程碑完成，禁止壳层未就绪时开发 MALF 业务模块。
2. **安全不变量六条**：sandbox:true / 严格 CSP / preload 受控桥接 / credential-vault safeStorage / Host RPC 契约 / HTML 预览独立 CSP，全部由 08-Test §5.7 的 `check-desktop-security.mjs` 硬断言。
3. **MALF 引擎子进程隔离**：Python MALF 引擎不嵌入 Electron 主进程，由 agent-host 经子进程 + JSON 协议桥接，崩溃不拖垮桌面。

---

## 三、动力 3：ai-malf-riskbench v0.01 —— 已实现组件继承（`Z:\ai-malf-riskbench*`）

**作用**：决定"已有资产如何继承"。v0.02 继承 v0.01 的五组件（290 passed）、生产数据库、Z 盘目录拓扑、安全约束，不重写实现。

### 参考点核对

| 参考点 | 实际确认（路径/组件/测试数） | 采用/不采用 | 理由 |
|---|---|---|---|
| malf-engine（五层领域模块） | `Z:\ai-malf-riskbench-components\malf-engine`；115 passed；零外部依赖；Core/Range/Lifespan/Structural Position/Service 五层；44 字段 WaveStructuralSnapshot | 采用（直接继承） | v0.02 的 MALF 地板层。通过 Adapter 桥接进 pi 扩展层，不改实现 |
| malf-data（T02+B 三周期聚合） | `Z:\ai-malf-riskbench-components\malf-data`；46 passed；tdx_reader 严格 32B 解析；DuckDBAdapter 44 列幂等建表；aggregate 周/月线从日线聚合 | 采用（直接继承） | v0.02 的数据接入层。TDX .day → PriceBar → DuckDB snapshots 管道直接复用 |
| riskbench-shared（配置+路径） | `Z:\ai-malf-riskbench-components\riskbench-shared`；10 passed；config frozen dataclass；paths DATA_ROOT 推导 + _guard 路径穿透防护 | 采用（直接继承） | v0.02 的集中配置层。映射 StudyBuddy env.ts+paths.ts 模式 |
| malf-signal（方向 C 四事件码） | `Z:\ai-malf-riskbench-components\malf-signal`；37 passed；detect_events 纯函数；4 事件码；SignalStore 幂等写入；严格继承 research_only | 采用（直接继承） | v0.02 的事件流层。快照序列 → 事件流，供风险声明与 AI 解读消费 |
| malf-backtest（T4 确定性验证） | `Z:\ai-malf-riskbench-components\malf-backtest`；31 passed；触发序列验证；SQL 交叉验证；规则版本审计；参数鲁棒性 | 采用（直接继承） | v0.02 的基准验证层。不输出收益类指标（战役 1 边界） |
| 主仓编排（T05+D2/D3） | `Z:\ai-malf-riskbench\scripts\`；51 passed；run_pipeline.ps1 参数化；backup.py+restore.py+pipeline_guard.py；t06_verify_e2e.py fail-closed 门禁 | 采用（部分继承，编排胶水重写） | 编排脚本在 v0.02 由 pi 扩展层 + Electron 主进程接管，但管道逻辑（lineage 验证、as-of 门禁、备份恢复联锁）直接复用 |
| DuckDB 生产库 | `Z:\ai-malf-riskbench-data\riskbench.duckdb`；3 标的 × day/week/month 快照 15397 行；signals 事件流 2835；usage 全 research_only/stale_research_only | 采用（直接继承） | v0.02 生产数据库基线。新增只读 Viewer 访问，不修改写入路径 |
| TDX 原始数据 | `Z:\new_tdx64\vipdoc\{sh,sz}\lday\*.day`；32B `<5If2I`；只读 | 采用（直接继承） | v0.02 数据源不变。TDX .day 是原始行情裁决源 |
| 旧版 DuckDB 交叉核验源 | `Z:\riskbench-data-old\*.duckdb`；6 个文件；只读 | 采用（直接继承） | v0.02 交叉核验源不变 |
| Z 盘目录拓扑（12 目录） | 见 12-目录治理 §2 | 采用（直接继承） | v0.02 维持 Z 盘 12 目录拓扑，新增 v0.02 主仓 `Z:\pi-malf-riskbench-v0.02` |
| 安全约束（S1-S38） | v0.01 AGENTS.md §8 + trd §4 | 采用（直接继承） | v0.02 安全约束全部继承，不放宽任何只读/确定性/数据安全限制 |
| 确定性约束（D1-D26） | v0.01 trd §3 + core-algorithm §6 | 采用（直接继承） | v0.02 确定性约束全部继承，lineage_hash/整数价格/严格不等式/完整前缀 replay 不变 |
| MALF v2.1 五层架构 | `Z:\ai-malf-riskbench-Definitive\malf-Definitive（v1.0-v2.1）\MALF_Definitive_v2_1-deepseek-20260726\`；7 份权威文档 | 采用（直接继承） | v0.02 领域语义最高权威，AGENTS.md 负责规定如何安全施工，不得改写 MALF 领域含义 |
| research_only 边界 | v0.01 AGENTS.md §1 + §7 | 采用（直接继承） | v0.02 维持 usage 三档（rejected/research_only/verification_only），operational 明确禁用 |
| 回测绩效指标用途边界 | 2026-08-05 用户裁决：属研究验证范畴，不是买卖建议 | 采用（直接继承） | v0.02 维持 BENC-03 绩效指标 research_only 边界，不接入真实券商 |

### 装配纪律影响

1. **继承不重写**：v0.01 五组件 290 passed 测试直接继承，v0.02 不重写实现，只加 Adapter 桥接进 pi 扩展层。
2. **生产数据库只读 Viewer**：v0.02 新增 Electron 只读 Viewer 访问 DuckDB，不修改写入路径；写入仍走 v0.01 的 run_pipeline.ps1（受 ops.md SOP 约束）。
3. **MALF Adapter 试炼场**：v0.02 新建 `Z:\pi-malf-riskbench-v0.02-composer\` 试炼场，先调通 MALF Python 引擎 ↔ pi TS 扩展的 Adapter，再装配进主仓。
4. **安全约束只收紧不放宽**：v0.01 的 S1-S38 + D1-D26 全部继承，v0.02 在此基础上新增 pi 桌面壳安全不变量六条。

---

## 四、动力 4：MALF-Definitive v2.1 —— 领域权威（`Z:\ai-malf-riskbench-Definitive`）

**作用**：决定"领域语义以什么为准"。v0.02 的 MALF/RISK/AI/BENCH 四层全部以 MALF v2.1 Definitive 为最高领域权威，AGENTS.md 不得改写领域含义。

### 参考点核对

| 参考点 | 实际确认（路径/文件/字段） | 采用/不采用 | 理由 |
|---|---|---|---|
| 五层架构（Core/Range/Lifespan/Structural Position/Service） | `MALF_00_Bridge_v2_1-deepseek-20260726.md` + 01-05 各层文档 | 采用 | v0.02 领域架构权威。Core 状态机 → Range 震荡区间 → Lifespan 双轨排名 → Structural Position 四视图 → Service 唯一对外契约 |
| WaveStructuralSnapshot 44 字段 | `MALF_05_Service_v2_1-deepseek-20260726.md` §2 + `types.py` | 采用 | v0.02 唯一对外契约。身份4 + Core10 + Transition/Range9 + Lifespan Wave3 + Lifespan Range4 + Structural Position9 + 元数据5 = 44 |
| CoreStateSnapshot 33 字段 | `MALF_01_Core_v2_1-deepseek-20260726.md` §8 + `types.py` | 采用 | v0.02 引擎内部状态。identity4 + system1 + wave7 + guard3 + progress2 + break3 + transition7 + version4 + audit2 + Range10 = 43（含 Range 扩展） |
| Core 层定理 T1-T9 | `MALF_01_Core_v2_1-deepseek-20260726.md` | 采用 | v0.02 Core 不变量。结构二分/progress-guard 成对/break 终止/旧波不可逆/candidate 最新/新波双条件/后 break 新波保证/transition 非波段/可消去性 |
| Core 层操作边界 O1-O8 | `MALF_01_Core_v2_1-deepseek-20260726.md` §9（v1.4 集成） | 采用 | v0.02 引擎施工铁律。规则版本/事件顺序 6 步/严格比较/candidate 刷新/transition 原语上下文/初始 candidate 重置/快照契约/重放确定性 |
| Range 层不变量 R1-R6 | `MALF_02_Range_v2_1-deepseek-20260726.md` | 采用 | v0.02 Range 不变量。boundary_init 不可变/boundary_now 演化/不修改 Core/Resolution 冻结/分池统计/continuation 命名陷阱 |
| Lifespan 层不变量 L1-L7 | `MALF_03_Lifespan_v2_1-deepseek-20260726.md` | 采用 | v0.02 Lifespan 不变量。Wave/Range 不混池/continuation-reversal 分池/peer_sample 防前视/N≥30/严格小于/wave_id 永不复用/新标的退化 |
| Structural Position 层不变量 P1-P6 | `MALF_04_Structural_Position_v2_1-deepseek-20260726.md` | 采用 | v0.02 Position 不变量。P1 透传/P2-P4 向量差非概率/标签辅助性/cross_alive_warning 真实/None 不 fallback/阈值待校准 |
| Service 层铁律 S1-S6 | `MALF_05_Service_v2_1-deepseek-20260726.md` | 采用 | v0.02 Service 铁律。唯一对外契约/不可变/None 附 reason_codes/rule_versions 完整/不可变 snapshot 发布/var 可重建 state 不可重建 |
| 整数价格策略（source_integer_fixed_point） | Bridge §核心不变量 + Core §9 O3 | 采用 | v0.02 确定性约束 D2。全链路禁止 float 价格，/1000 仅展示 |
| 严格不等式（`<` `>`，非 `≤` `≥`） | Core §9 O3 + C-02 | 采用 | v0.02 确定性约束 D3。边界判定无歧义，相等不触发任何事件 |
| lineage_hash SHA256 | Service §5 + trd §3.6 | 采用 | v0.02 确定性约束 D4。相同输入 → 相同 64 字符 hex，跨机器可重现 |
| honest degradation（5 级退化） | Service §8 | 采用 | v0.02 退化原则。None 就是 None，不补零不估计不降级替代；退化可审计（reason_codes）；退化可恢复 |
| usage 四档（rejected/research_only/verification_only/operational） | Service §7 | 采用（operational 禁用） | v0.02 维持 v0.01 边界：operational 在 v0.1 硬编码禁用 |
| reason_codes 11 枚举 | Service §8 + types.py | 采用 | v0.02 失败模式枚举。uninitialized/transition_active/wave_alive/input_integrity_failure/data_stale/peer_sample_insufficient/same_dir_peers_absent/cross_dir_peers_absent/no_prior_wave/range_alive/operational_disabled |
| v2.0 → v2.1 Probability → Structural Position 更名 | AUTHORITY.md + Structural Position §1 | 采用 | v0.02 直接采用 v2.1 命名。该层不输出概率，输出 rank 透传 + 向量差 + 比较标签 |
| 中断恢复（S-01） | Service §中断恢复 | 采用 | v0.02 数据管道中断恢复机制。从 current.json 读最后快照 → 从其 bar_dt 之后重算 → 中断前快照不重算不覆盖 |
| 持久化目录结构（var/staging + var/published + current.json） | Service §持久化 | 采用 | v0.02 引擎内部持久化结构。var/ 可重建，state/ 不可重建 |

### 装配纪律影响

1. **领域权威不可改写**：v0.02 的 AGENTS.md 负责规定如何安全施工，不得改写 MALF 领域含义；MALF v2.1 Definitive 是领域语义最高权威。
2. **44 字段契约不可变**：WaveStructuralSnapshot 44 字段是 v0.02 唯一对外契约，下游（RISK/AI/BENCH/Viewer）只读不写。
3. **honest degradation 是设计原则**：退化是确定性的、可预期的，不是 bug。v0.02 的 UI 必须诚实展示 None 字段及 reason_codes，不掩盖。
4. **rule_versions 必须完整**：每个快照必须携带参与计算的规则版本（pivot_rule/price_domain/adapter/core_version/range_version/lifespan_version/structural_position_version），缺失则禁止发布。

---

## 五、四参考点交叉影响汇总

### 5.1 装配顺序（壳层 → 公用零件 → 业务模块）

| 批次 | 里程碑 | 组件 | 前置 |
|---|---|---|---|
| 1 壳层 | M0 | Electron main + preload + renderer + agent-host + contract + 安全沙箱 + credential-vault | 无 |
| 2 公用零件 | M0-M1 | MALF Python 引擎 Adapter + DuckDB 只读访问层 + pi 扩展空壳 + 配置层 | 壳层就绪 |
| 3 业务模块 | M1-M3 | MALF 查询工具 + 风险声明 + AI 解读 + 回测报告 + 只读 Viewer | 公用零件就绪 |

### 5.2 安全不变量六条（v0.02 新增，叠加 v0.01 S1-S38）

| 编号 | 不变量 | 断言 | 实现位置 |
|---|---|---|---|
| INV-01 | renderer 沙箱 | `sandbox:true` | Electron BrowserWindow 配置 |
| INV-02 | 严格 CSP | script-src/connect-src 限制 | Electron session 配置 |
| INV-03 | preload 受控桥接 | 不暴露 Node API | preload.ts 白名单 |
| INV-04 | credential-vault safeStorage | 密钥 Windows DPAPI 加密 | credential-vault.ts |
| INV-05 | Host RPC 契约 | 所有跨进程通信走 contract | contract.ts + ipcMain 白名单 |
| INV-06 | HTML 预览独立 CSP | 回测报告/Markdown 渲染隔离 | 预览窗口独立 session |

### 5.3 数据隔离三层（叠加 v0.01 物理隔离）

| 层 | 路径 | 用途 | 写权限 |
|---|---|---|---|
| pi 会话目录 | `~/.pi/agent/` | pi 自管（auth.json/models.json/settings.json） | pi 内核 |
| 业务数据根 | `Z:\ai-malf-riskbench-data\`（v0.01 继承） | DuckDB 生产库 + Parquet 备份 + 日志 | v0.01 run_pipeline.ps1（受 ops.md SOP 约束） |
| v0.02 运行时 | `Z:\pi-malf-riskbench-v0.02-runtime\` | Electron 运行日志 + 缓存 + 临时 | v0.02 主进程 |

---

## 六、核对结论

1. **pi 系统**：作为 AI 底座，通过扩展 + 技能包 + prompt 模板接入业务，不修改内核。MCP 不内置，不进入下载清单。
2. **pi-desktop**：作为桌面壳架构范本，五件骨架 + 安全沙箱 + credential-vault 直接借鉴，主仓独立重新实现。
3. **ai-malf-riskbench v0.01**：五组件 290 passed + 生产数据库 + Z 盘目录拓扑 + 安全/确定性约束全部继承，v0.02 不重写实现，只加 Adapter 桥接。
4. **MALF-Definitive v2.1**：领域语义最高权威，五层架构 + 44 字段契约 + honest degradation + rule_versions 完整性不可改写。

**四参考点无冲突**：pi 提供底座，pi-desktop 提供壳架构，v0.01 提供已实现组件，MALF v2.1 提供领域权威。v0.02 的工作是"以 pi 为底座 + pi-desktop 为壳 + v0.01 组件为地板 + MALF v2.1 为权威"组合装配，不重写任何一层。

---

**文档维护**：03-Architecture 设计时吸收本文档结论，引用时注明"参考点核对表 §X"
**最后更新**：2026-08-09
