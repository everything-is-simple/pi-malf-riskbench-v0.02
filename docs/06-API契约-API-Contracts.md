# 06-API契约-API-Contracts

**版本**：v0.1.3
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：[03-架构设计](./03-架构设计-Architecture-Design.md)、[05-ERD](./05-数据模型-ERD-Data-Model.md)
**下游**：[07-工作流](./07-工作流-Workflow.md)、[09-UI](./09-使用者介面-UI-Design.md)
**用途**：v0.02 RPC 契约 + MALF 工具 + Streams + DTO 规范 SoT

---

## §1 API 概述

### 1.1 架构定位

v0.02 是**单机桌面应用**，不是 Web 服务。API 由两条通道组成：

1. **MessagePort RPC 契约**（借鉴 pi-desktop `contract/api.ts`）：renderer ↔ main ↔ agent-host 的类型化 IPC，非 HTTP REST。
2. **MALF 子进程 JSON Lines 协议**（v0.02 新增，03-Architecture §4.1）：TypeScript 扩展层 ↔ Python MALF 引擎子进程，经 stdin/stdout 通信。

```
renderer (React)  ←PiBridge→  main (Electron)  ←RPC→  agent-host (utilityProcess)
     │                              │                          │
     └ contextBridge 受控桥接       └ MessageChannelMain        └ createRpcServer()
                                                                   │
                                                                   ├ pi 扩展层（registerTool 工具集）
                                                                   │     ├ malf.* / risk.* / ai.*
                                                                   │     ├ bench.* / viewer.* / system.*
                                                                   │     └ pi.on 钩子 + pi-ai provider
                                                                   └ MALF Adapter（TypeScript）
                                                                         │  JSON Lines（stdin/stdout）
                                                                         ▼
                                                                   MALF 子进程（Python）
                                                                   ├ malf-engine（on_bar → WaveStructuralSnapshot）
                                                                   ├ malf-data（tdx_reader + DuckDBAdapter）
                                                                   ├ malf-signal（detect_events）
                                                                   └ malf-backtest（run_full_verification）
```

### 1.2 双层 API 体系

| 层 | 调用者 | 入口 | 用途 |
|---|---|---|---|
| **RPC 方法**（本文件 §3） | renderer UI | `contract/api.ts` 的 `interface Api` | 用户操作（查 snapshot、声明风险、跑回测、看 Viewer） |
| **registerTool 工具**（03-Architecture §3.2） | AI agent | `pi.registerTool(tool)` | AI 受约束调用业务能力，execute 返回统一信封 |

> 两者关系：RPC 方法是用户视角的契约入口，内部常委托 registerTool 工具执行（如 `risk.declare` RPC 委托 `declare_risk` 工具）；registerTool 工具是 AI 视角的契约入口。本文档以 registerTool 工具名为方法名（与 03-Architecture §3.2 一致）。

### 1.3 绑定与安全

- **仅 127.0.0.1**：无公网入口，loopback Origin 策略（01-TRD S2/S3）
- **sandbox:true + 严格 CSP**：renderer 沙箱化（INV-01/INV-02）
- **preload 受控桥接**：仅 `contextBridge.exposeInMainWorld("piBridge", bridge)`，白名单接口，不暴露 Node API（INV-03）
- **Host RPC 契约化**：`contract/{api,rpc}.ts` 类型约束 + ipcMain 白名单（INV-05）
- **MALF 子进程隔离**：Python 引擎不嵌入主进程，崩溃不拖垮桌面（DECISION-v02-004 / D27）

### 1.4 设计原则

1. **继承不重写**：v0.01 五组件 290 passed 的 API 封装为 Adapter 方法（§4.2），不重写实现
2. **pi 不改内核**：业务能力经 registerTool + 扩展 + 技能接入，不修改 pi 源码
3. **只读 Viewer**：viewer.* 路由只读 DuckDB，不修改写入路径（D28 / DECISION-v02-005）
4. **三层权威**：第一层市场事实（MALF，确定性）/ 第二层用户声明（RISK，AI 不可改）/ 第三层 AI 解读（必须标注，AI-05）
5. **错误 throw 不返回 error 对象**：registerTool execute 抛错，由 pi 统一捕获并映射为安全错误码（S9）

---

## §2 统一信封规范

### 2.1 统一信封（继承 pi registerTool 契约）

所有 registerTool 工具的 `execute` 返回统一信封（03-Architecture §3.2 + prep-参考点核对表 §一）：

```typescript
// 成功
{
  content: T,                 // 主结果（DTO 或 DTO 数组或基本类型）
  details: string,            // 人类可读说明（脱敏，不含密钥/路径/堆栈）
  usage?: {                   // 可选：本次调用资源用量
    inputTokens?: number,
    outputTokens?: number,
    modelProvider?: string,   // 仅 provider 名，不含 apiKey
    latencyMs?: number
  },
  terminate?: boolean         // 可选：是否终止当前 agent turn
}

// 失败：execute 抛出异常（throw），不返回 error 对象
// 异常由 pi 底座捕获，映射为 §2.2 的统一错误码
```

**关键约束**：
- 错误 **throw 不返回 error 对象**：registerTool 契约要求 execute 在失败时抛出异常，不允许在返回值里塞 `error` 字段
- `details` 字段脱敏：永不暴露 API Key、文件路径、SQL 语句、完整堆栈、完整 UUID（S7/S8/S9）
- `usage` 仅记录 provider 名与 token 数，**不记录 apiKey**

### 2.2 统一错误码（5 个）

| 错误码 | 含义 | 触发场景 | 中文消息示例 |
|---|---|---|---|
| `INTERNAL_ERROR` | 内部错误（脱敏后返回） | 未预期的运行时异常、子进程崩溃 | "操作失败，请稍后重试；如持续发生请重启应用" |
| `MALF_ENGINE_ERROR` | MALF 引擎错误 | MALF 子进程返回 error、规则版本缺失、lineage_hash 不一致 | "市场结构计算异常，请检查数据完整性" |
| `DUCKDB_ERROR` | DuckDB 访问错误 | 连接失败、查询超时、表不存在、只读约束被违反 | "数据库读取失败，请稍后重试" |
| `VALIDATION_ERROR` | 业务校验失败 | 参数缺失/类型错、状态机非法转移、路径逃逸、权限不足 | "参数不合法：symbol 不能为空" |
| `NOT_FOUND` | 资源不存在 | snapshot/signal/report/declaration 未找到 | "未找到该快照，请检查标的与时间" |

**错误码格式约束**：`errorCode` 必须匹配 `^[A-Z][A-Z0-9_]{1,63}$`

### 2.3 安全编码原则（S9）

- 错误返回固定安全编码，**不暴露 Key/URL/路径/堆栈**
- 面向用户：中文、可操作，告诉用户"怎么办"
- 失败可重试：提示重试方式（如"请稍后重试"/"请检查参数"）
- 失败不可重试：提示具体操作（如"重启应用"/"检查数据源"）
- 明文不入日志（S7/S8）：apiKey、SMTP、webhook URL、文件绝对路径不在 `details`/日志/终端输出

---

## §3 RPC 方法表（按路由分组）

> 共 24 个 RPC 方法（contract/api.ts 的 `interface Api`），方法名采用 `<route_group>.<action>` 风格。
>
> **双层暴露说明**：24 个 RPC 方法是 renderer UI 视角的契约入口；其中 17 个同时暴露为 registerTool 工具供 AI agent 调用（03-Architecture §3.2）。7 个不暴露为 registerTool 的方法分两类：
> - **安全隔离**（6 个）：`update_risk_declaration` / `delete_risk_declaration` / `models_config_get` / `models_config_set` / `credentials_get` / `credentials_set` —— AI 不可修改用户声明（三层权威第二层）或触碰凭据/系统配置。
> - **RPC 专用**（1 个）：`query_snapshot_range` —— 范围查询仅供 UI 渲染图表，AI 用 `query_snapshot` 单点查询即可。

| 方法名 | 路由组 | 请求 DTO | 响应 DTO | 权限 | 暴露为 registerTool | 说明 |
|---|---|---|---|---|:--:|---|
| `query_snapshot` | malf.* | `{symbol, timeframe, bar_dt}` | `WaveStructuralSnapshotDTO` | 只读 | ✅ | 查询单个 snapshot（44 字段，防泄露） |
| `query_snapshot_range` | malf.* | `{symbol, timeframe, start_dt, end_dt}` | `WaveStructuralSnapshotDTO[]` | 只读 | ❌（RPC 专用） | 查询 snapshot 范围 |
| `query_signals` | malf.* | `{symbol, timeframe, start_dt, end_dt}` | `SignalDTO[]` | 只读 | ✅ | 查询事件流（4 事件码） |
| `query_symbol_list` | malf.* | `{}` | `string[]` | 只读 | ✅ | 获取标的列表 |
| `query_timeframes` | malf.* | `{symbol}` | `string[]` | 只读 | ✅ | 获取周期列表（day/week/month） |
| `query_market_snapshot` | malf.* | `{timeframe?, direction?, state?, min_span_rank?, max_rows?}` | `MarketSnapshotRowDTO[]` | 只读 | ✅ | **全市场横截面（D2 修复）**：全部标的×周期最新快照，按 rank 分位分布排序，供全市场 Tab |
| `query_rankings` | malf.* | `{timeframe?, metric, top_n?, window?}` | `RankingDTO[]` | 只读 | ✅ | **寿命排行榜（D2 修复）**：按 span/range/stagnation 排名 Top-N，支持历史窗口（全历史/近 N 期） |
| `explain_snapshot` | malf.* | `{symbol, timeframe, bar_dt}` | `{explanation: string}` | 只读 | ✅ | 解释 snapshot 字段（引用 MALF v2.1，TS 原生静态查询） |
| `declare_risk` | risk.* | `{symbol, timeframe, bar_dt, user_text, linked_snapshot_fields}` | `RiskDeclarationDTO` | 需会话 | ✅ | 创建风险声明 |
| `list_risk_declarations` | risk.* | `{symbol?, timeframe?}` | `RiskDeclarationDTO[]` | 只读 | ✅ | 列出风险声明 |
| `update_risk_declaration` | risk.* | `{declaration_id, user_text}` | `RiskDeclarationDTO` | 需会话 | ❌（安全隔离） | 修改风险声明（AI 不可调用） |
| `delete_risk_declaration` | risk.* | `{declaration_id}` | `{deleted: bool}` | 需会话 | ❌（安全隔离） | 删除风险声明（AI 不可调用） |
| `check_risk_contradiction` | risk.* | `{declaration_id}` | `{contradictions: string[]}` | 只读 | ✅ | 检测风险声明与市场事实矛盾 |
| `quantify_risk` | risk.* | `{symbol, timeframe, bar_dt}` | `RiskQuantifierDTO` | 只读 | ✅ | RISK 量化器（P0-B 修复，02-PRD §2.2 RISK-01~04）：从 snapshot 提取极端度/动量/方向优势 + 联合风险提示 |
| `ai_interpret_snapshot` | ai.* | `{symbol, timeframe, bar_dt}` | `{interpretation: string, marked: true}` | 需会话 | ✅ | AI 解读 snapshot（必须标注"AI 解读"） |
| `ai_interpret_backtest` | ai.* | `{report_id}` | `{interpretation: string, marked: true}` | 需会话 | ✅ | AI 解读回测报告 |
| `ai_discover_rules` | ai.* | `{symbol, timeframe}` | `{rules: object[]}` | 需会话 | ✅ | AI 辅助信号规则发现 |
| `run_backtest_report` | bench.* | `{symbol, timeframe}` | `{report_id: string}` | 只读 | ✅ | 运行 T4 确定性规则验证 |
| `read_backtest_report` | bench.* | `{report_id}` | `BacktestReportDTO` | 只读 | ✅ | 读取回测报告 |
| `export_csv` | viewer.* | `{symbol, timeframe, start_dt, end_dt}` | `{csv_path: string}` | 只读 | ✅ | 导出 CSV（只读 Viewer） |
| `models_config_get` | system.* | `{}` | `{providers: object[]}` | 需授权 | ❌（安全隔离） | 获取模型配置（AI 不可调用） |
| `models_config_set` | system.* | `{providers: object[]}` | `{updated: bool}` | 需授权 | ❌（安全隔离） | 设置模型配置（AI 不可调用） |
| `credentials_get` | system.* | `{key: string}` | `{has: bool}` | 需授权 | ❌（安全隔离） | 查询凭据是否存在（不回传明文） |
| `credentials_set` | system.* | `{key: string, value: string}` | `{set: bool}` | 需授权 | ❌（安全隔离） | 设置凭据（DPAPI 加密） |

> **registerTool 工具数**：17（✅ 标记的方法）。**RPC 专用方法数**：7（❌ 标记的方法）。合计 24。

### 3.1 malf.* 路由组（MALF 查询工具，6 个）

只读路由，无需授权。封装 v0.01 malf-data / malf-engine / malf-signal 的查询能力（详见 §4.2 Adapter 方法表）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `query_snapshot` | `{symbol: string, timeframe: 'day'\|'week'\|'month', bar_dt: string}` | `WaveStructuralSnapshotDTO` | PK(symbol, timeframe, bar_dt)；不暴露 runtime_fingerprint（D5） |
| `query_snapshot_range` | `{symbol, timeframe, start_dt, end_dt}` | `WaveStructuralSnapshotDTO[]` | 范围按 bar_dt 升序；上限 1000 条防内存膨胀 |
| `query_signals` | `{symbol, timeframe, start_dt, end_dt}` | `SignalDTO[]` | 4 事件码；按 event_dt 升序 |
| `query_symbol_list` | `{}` | `string[]` | DuckDB SELECT DISTINCT symbol；当前 3 标的（sh510050/sh510300/sz159915） |
| `query_timeframes` | `{symbol}` | `string[]` | 返回 `['day','week','month']` 子集 |
| `query_market_snapshot` | `{timeframe?, direction?, state?, min_span_rank?, max_rows?}` | `MarketSnapshotRowDTO[]` | **全市场横截面（D2 修复，02-PRD 四层闭环全市场视角）**：全标的×周期最新快照；按 span_rank 降序；上限 200 行防内存膨胀；只读 DuckDB（D28） |
| `query_rankings` | `{timeframe?, metric, top_n?, window?}` | `RankingDTO[]` | **寿命排行榜（D2 修复）**：metric ∈ {span, range, stagnation, range_evolution, range_resolution}；window 全历史/近 N 期；基于 44 字段 Lifespan 双轨排名 |
| `explain_snapshot` | `{symbol, timeframe, bar_dt}` | `{explanation: string}` | 引用 MALF v2.1 字段权威解释；不含运行时指纹 |

### 3.2 risk.* 路由组（风险声明 + 量化工具，6 个）

第二层用户声明权威 + RISK 量化器（从第一层快照提取风险特征，不修改确定性计算）。AI 不可修改 user_text（02-PRD §6.3）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `declare_risk` | `{symbol, timeframe, bar_dt, user_text: string, linked_snapshot_fields: string[]}` | `RiskDeclarationDTO` | 创建声明；linked_snapshot_fields 引用 snapshot 字段（如 rank/label） |
| `list_risk_declarations` | `{symbol?, timeframe?}` | `RiskDeclarationDTO[]` | 可选过滤；按 created_at 降序 |
| `update_risk_declaration` | `{declaration_id, user_text}` | `RiskDeclarationDTO` | 仅修改 user_text；声明归属用户校验 |
| `delete_risk_declaration` | `{declaration_id}` | `{deleted: bool}` | 软删除（留审计痕迹） |
| `check_risk_contradiction` | `{declaration_id}` | `{contradictions: string[]}` | 检测声明与市场事实的矛盾；AI 只提醒不改写 |
| `quantify_risk` | `{symbol, timeframe, bar_dt}` | `RiskQuantifierDTO` | RISK 量化器（P0-B 修复，02-PRD §2.2 RISK-01~04）：从 snapshot 提取极端度/动量/方向优势 + 联合风险提示；**只量化不评分不交易决策**；只读 snapshot 不修改引擎（D29/S35） |

### 3.3 ai.* 路由组（AI 解读工具，3 个）

第三层 AI 解读，必须标注"AI 解读"，不凌驾第一层+第二层（AI-05）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `ai_interpret_snapshot` | `{symbol, timeframe, bar_dt}` | `{interpretation: string, marked: true}` | 响应 DTO 必须标 `ai_interpretation_marked=true`（AI-05） |
| `ai_interpret_backtest` | `{report_id}` | `{interpretation: string, marked: true}` | 同上；解读回测报告 |
| `ai_discover_rules` | `{symbol, timeframe}` | `{rules: object[]}` | AI 辅助信号规则发现；结果仅供参考，不写入确定性规则 |

### 3.4 bench.* 路由组（回测报告工具，2 个）

只读路由，封装 v0.01 malf-backtest T4 确定性规则验证。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `run_backtest_report` | `{symbol, timeframe}` | `{report_id: string}` | 触发 T4 验证；返回 report_id 供轮询/读取；超时 60 秒（P1-1 修复，见 §6.5 容错策略） |
| `read_backtest_report` | `{report_id}` | `BacktestReportDTO` | 读取报告；**含绩效指标（D1 修复，research_only，02-PRD §4.4 用户裁决）** |

### 3.5 viewer.* 路由组（只读 Viewer 工具，1 个）

只读路由，不修改写入路径（D28 / DECISION-v02-005）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `export_csv` | `{symbol, timeframe, start_dt, end_dt}` | `{csv_path: string}` | 仅 SELECT；路径守卫防 `../` 逃逸（S16） |

### 3.6 system.* 路由组（系统工具，4 个）

需用户授权。模型配置落业务数据根，凭据走 credential-vault DPAPI 加密（INV-04）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `models_config_get` | `{}` | `{providers: object[]}` | 读 `<dataRoot>/config/models.json`（受控 fixture，不读 ~/.pi） |
| `models_config_set` | `{providers: object[]}` | `{updated: bool}` | 写 `<dataRoot>/config/models.json`（带 `__riskbench_managed` 标记） |
| `credentials_get` | `{key: string}` | `{has: bool}` | 仅返回是否存在，不回传明文；键名匹配 `/^modelProvider:[a-z0-9._-]{1,160}$/i` 或 `/^riskbench:[a-z0-9._-]{1,160}$/i`（与 03-Arch §2.4 一致） |
| `credentials_set` | `{key: string, value: string}` | `{set: bool}` | DPAPI 加密存储；明文不入日志 |

---

## §4 MALF Adapter JSON Lines 协议

### 4.1 协议规范（03-Architecture §4.1 / D27）

TypeScript 扩展层与 Python MALF 子进程经 stdin/stdout JSON Lines 通信，stderr 仅日志。

**请求格式**：
```json
{"id": "<uuid>", "method": "<method_name>", "params": {...}}
```

**响应格式（成功）**：
```json
{"id": "<uuid>", "result": {...}}
```

**响应格式（失败）**：
```json
{"id": "<uuid>", "error": {"code": "<code>", "message": "<msg>"}}
```

**通信规则**：
- 每行一个 JSON 对象，以 `\n` 分隔
- `id` 由调用方生成（UUID），响应原样回传用于配对
- stderr 仅输出日志，不参与协议解析
- 请求-响应严格按 `id` 配对，支持并发请求（子进程内部按需串行化）
- 子进程崩溃 → Adapter 自动重启子进程（最多 3 次），超过阈值返回 `MALF_ENGINE_ERROR`，不拖垮桌面

**子进程崩溃恢复策略**（P0-A 修复，与 03-Arch §4.1 / 08-Test T-UT-327 一致，4 阶段）：

| 阶段 | 行为 | 阈值/超时 |
|---|---|---|
| 1. 崩溃检测 | Adapter 监听子进程 `exit` 事件（非 0 退出码）或 `disconnected` 事件 | 实时 |
| 2. 自动重启 | Adapter 销毁旧子进程句柄，重新 spawn 子进程，重放握手 | 最多 3 次 |
| 3. 重启失败 | 第 4 次失败 → 放弃重启，返回 `MALF_ENGINE_ERROR`，桌面进程存活 | 阈值后终止 |
| 4. 重启期间请求 | 在途请求（按 `id` 配对未返回的）→ 返回 `MALF_ENGINE_ERROR`，调用方可重试 | 立即 |

> **日志记录（通用规则，非独立阶段）**：每次崩溃/重启记 stderr 日志（含退出码、重启次数），不暴露堆栈（S9）。
>
> **阈值依据**：3 次重启阈值平衡"瞬时故障可恢复"与"持续故障快速失败"。超过阈值不拖垮桌面（DECISION-v02-004 / D27），用户重启应用可重置计数器。

### 4.2 Adapter 方法表（封装 v0.01 API，6 个）

v0.01 五组件的 API 经 MALF Adapter 封装为 §3 的 registerTool 工具。下表为 Adapter 内部方法与 v0.01 API 的映射（共 6 个，与 03-Arch §4.1 / 11-组件装配 §5.3 一致）：

| Adapter 方法 | 对应 v0.01 API | 暴露为 | 用途 |
|---|---|---|---|
| `querySnapshot(symbol, timeframe, bar_dt)` | DuckDB SELECT（malf-data DuckDBAdapter） | `query_snapshot` | 查询单个 snapshot |
| `querySnapshotRange(symbol, timeframe, start_dt, end_dt)` | DuckDB SELECT | `query_snapshot_range` | 查询 snapshot 范围 |
| `querySignals(symbol, timeframe, start_dt, end_dt)` | `malf-signal.SignalStore.read_events` | `query_signals` | 查询事件流 |
| `runBacktestVerification(symbol, timeframe)` | `malf-backtest.run_full_verification` | `run_backtest_report` | 运行 T4 验证 |
| `getSymbolList()` | DuckDB SELECT DISTINCT symbol | `query_symbol_list` | 获取标的列表 |
| `getTimeframes(symbol)` | DuckDB SELECT DISTINCT timeframe | `query_timeframes` | 获取周期列表 |

> **`explain_snapshot` 不属于 Adapter 方法**：该工具是 TypeScript 原生静态查询，直接引用 MALF v2.1 字段权威文档（`Z:\ai-malf-riskbench-Definitive\...\MALF_Definitive_v2_1-*.md`），不经过 Python 子进程，因此不计入 MALF Adapter 方法表。这与 03-Arch §4.1（6 个 Adapter 方法）和 11-组件装配 §5.3（6 个 Adapter 方法）一致。

### 4.3 v0.01 API 继承清单（封装为 Adapter 方法）

以下 v0.01 API 不直接对外暴露，经 Adapter 桥接后以 §3 的工具形式供 pi 扩展层调用：

| 组件 | v0.01 API | 封装为 |
|---|---|---|
| malf-data | `read_tdx_day` / `build_snapshots` / `DuckDBAdapter` | `querySnapshot*` / `getSymbolList` / `getTimeframes` |
| malf-engine | `MALFCoreEngine.on_bar` / `LifespanEngine` / `RankEngine` / `StructuralPositionEngine` / `build_wave_structural_snapshot` / `calculate_lineage_hash` | 引擎内部计算，经 `querySnapshot` 读取产出 |
| malf-signal | `detect_events` / `load_snapshots` / `SignalStore` | `querySignals` |
| malf-backtest | `EngineRunner` / `verify_sequence` / `crosscheck_symbol_timeframe` / `audit_signals` / `run_full_verification` | `runBacktestVerification` |
| riskbench-shared | `config`（ConfigManager 类）/ `paths`（DATA_ROOT 推导 + `_guard`） | Adapter 配置与路径层 |

> **Adapter 签名包装责任**（P0-10 修复，与 03-Arch §4.1 / 11-组件装配 §5.3 一致）：Adapter 方法签名（TypeScript 侧，如 `querySnapshot(symbol, timeframe, bar_dt)`）与 v0.01 Python API 签名可能不完全一致。Adapter 负责：
> 1. **参数名/类型转换**：TS 侧 `bar_dt: string`（ISO 日期）→ Python 侧 `bar_dt: datetime.date`
> 2. **返回值归一**：Python dict / dataclass → TS DTO（44 字段 + 防泄露 D5 过滤）
> 3. **错误码映射**：Python 异常 → §4.4 四码（INTERNAL_ERROR / MALF_ENGINE_ERROR / DUCKDB_ERROR / VALIDATION_ERROR）
> 4. **`lineage_hash` / `rule_versions` 原样透传**：Adapter 不重算、不修改（D29），直接从 v0.01 产出透传到 DTO
>
> 能力卡（COMPONENT-CARD.md §3 公开 API）须记录两侧签名映射关系，作为主仓独立实现的契约输入。

### 4.4 MALF Adapter 错误码（4 个）

Adapter 层错误码是 §2.2 统一错误码的子集（不含 `NOT_FOUND`，资源不存在由 Adapter 上层判断）：

| 错误码 | 含义 | 映射到统一错误码 |
|---|---|---|
| `INTERNAL_ERROR` | 子进程未预期异常 | `INTERNAL_ERROR` |
| `MALF_ENGINE_ERROR` | MALF 引擎规则/lineage 错误 | `MALF_ENGINE_ERROR` |
| `DUCKDB_ERROR` | DuckDB 访问错误 | `DUCKDB_ERROR` |
| `VALIDATION_ERROR` | 参数校验失败 | `VALIDATION_ERROR` |

---

## §5 Streams（流式推送主题）

> 借鉴 pi-desktop `contract/api.ts` 的 `interface Streams`。renderer 通过 `subscribe(topic, key, on)` 订阅，服务端推送 `event`。

> **实现边界**（P2-1 修复）：v0.02 是只读 Viewer，无 ingest、无 watcher、无后台调度（S5）。因此 4 个主题分两类：
> - **v0.1 实际实现**（2 个）：`backtest.progress`（§5.3）、`ai.interpretation.streaming`（§5.4）——由 v0.02 进程内主动触发
> - **v0.1 预留主题**（2 个）：`snapshot.updated`（§5.1）、`signal.detected`（§5.2）——v0.02 只读 Viewer 不产出新数据，这两个流在 v0.1 不实现，仅保留主题定义供未来 v0.2+ 扩展（如接入 v0.01 run_pipeline 完成事件）

### 5.1 snapshot.updated 流（v0.1 预留，不实现）

| 属性 | 值 |
|---|---|
| 主题 | `snapshot.updated` |
| 触发条件 | MALF 引擎产出新 snapshot 并写入 DuckDB/var/published |
| 推送数据 | `{symbol, timeframe, bar_dt, lineage_hash}` |
| 说明 | 仅推送摘要（不含完整 44 字段，防泄露）；renderer 收到后按需调用 `query_snapshot` 拉取完整 DTO |

### 5.2 signal.detected 流（v0.1 预留，不实现）

| 属性 | 值 |
|---|---|
| 主题 | `signal.detected` |
| 触发条件 | `malf-signal.detect_events` 检出事件（4 事件码之一） |
| 推送数据 | `SignalDTO`（事件摘要） |
| 说明 | 事件流实时推送；renderer 用于风险提醒与 AI 解读触发 |

### 5.3 backtest.progress 流（v0.1 实现）

| 属性 | 值 |
|---|---|
| 主题 | `backtest.progress` |
| 触发条件 | T4 验证进度变更（started/verify_sequence/crosscheck/audit/completed） |
| 推送数据 | `{report_id, phase, progress: number}` |
| 说明 | 进度 0-100；完成后 renderer 调用 `read_backtest_report` 拉取完整报告 |

### 5.4 ai.interpretation.streaming 流（v0.1 实现）

| 属性 | 值 |
|---|---|
| 主题 | `ai.interpretation.streaming` |
| 触发条件 | `ai_interpret_*` 工具调用 pi-ai provider 流式输出 |
| 推送数据 | `{interpretation_id, token: string, done: bool}` |
| 说明 | 流式 token 增量；`done=true` 时整体解读必须已标注"AI 解读"（AI-05）；payload 脱敏，不含 apiKey/完整 UUID |

**Streams 通用脱敏铁律**：所有流推送 payload 经脱敏，不含 apiKey、完整 UUID、文件绝对路径、SQL 语句（S7/S8/S9）；renderer 渲染前二次脱敏（UUID 正则过滤）。

---

## §6 DTO 规范

### 6.1 防泄露总原则

| 规则 | 约束 | 出处 |
|---|---|---|
| D5 防泄露 | `WaveStructuralSnapshotDTO` 不暴露 `runtime_fingerprint` | 01-TRD D5 |
| AI-05 标注 | AI 解读 DTO 必须标 `ai_interpretation_marked=true` | 02-PRD AI-05 |
| S9 安全编码 | 错误返回固定安全编码，不暴露 Key/URL/路径/堆栈 | 01-TRD S9 |
| 三层权威 | AI 解读不凌驾第一层（市场事实）+ 第二层（用户声明） | 02-PRD §1.3 |

### 6.2 WaveStructuralSnapshotDTO（44 字段，防泄露）

> 字段契约来自 MALF v2.1 Service §2（03-Architecture §9.1），身份4 + Core10 + Transition/Range9 + Lifespan Wave3 + Lifespan Range4 + Structural Position9 + 元数据5 = 44。

```typescript
{
  // 身份（4）
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  bar_dt: string,                        // ISO 日期
  bar_index: number,                     // bar 序号（从 0 起，与 05-ERD §3.1 表 schema 一致）

  // Core（10）
  wave_direction: 'up' | 'down' | null,
  wave_status: string,
  pivot_extreme_price: number | null,    // 整数价格（/1000 仅展示）
  pivot_confirm_bar_dt: string | null,
  // ... 其余 Core 字段

  // Transition / Range（9）
  // ...

  // Lifespan Wave（3）
  wave_rank: number | null,
  // ...

  // Lifespan Range（4）
  // ...

  // Structural Position（9）
  p1: object | null,
  p2: object | null,
  p3: object | null,
  p4: object | null,
  // ...

  // 元数据（5）
  usage: 'research_only' | 'stale_research_only' | 'verification_only' | 'rejected',
  reason_codes: string[],
  rule_versions: object,                 // 完整性必填
  lineage_hash: string,                  // SHA256 64 字符 hex
  approved_as_of_date: string

  // ⛔ 不暴露：runtime_fingerprint（D5 防泄露）
}
```

**防泄露规则**：
- `runtime_fingerprint` **永不暴露**（D5：runtime_fingerprint 排除出 lineage_hash，亦排除出 DTO）
- 整数价格策略：DTO 中价格为整数（source_integer_fixed_point，D2），`/1000` 仅在 UI 展示层转换（D21）
- `None` 字段必须附 `reason_codes`（honest degradation，不补零不估计）
- `rule_versions` 必须完整，缺失则禁止发布（MALF v2.1 Service S4）

### 6.3 SignalDTO

```typescript
{
  signal_id: string,
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  event_code: string,                    // 4 事件码之一
  event_dt: string,                      // ISO 8601
  bar_dt: string,
  direction: 'up' | 'down' | null,
  reason_codes: string[],
  rule_version: string,                  // malf-signal-event-v1
  lineage_hash: string                   // 与 snapshot lineage_hash 可交叉校验
}
```

### 6.4 RiskDeclarationDTO

```typescript
{
  declaration_id: string,
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  bar_dt: string,
  user_text: string,                     // 用户手写/模板辅助，AI 不可改
  linked_snapshot_fields: string[],       // 关联 snapshot 字段（如 rank/label，与 05-ERD §5.1 表 schema 一致）
  created_at: string,                    // ISO 8601
  ai_interpretation: string | null,      // AI 解读（必须标注"AI 解读"）
  ai_interpretation_marked: boolean      // AI 解读是否已标注（AI-05）
}
```

**规则**：
- `user_text` 仅用户可改（第二层权威，AI 只读）
- `ai_interpretation` 非空时 `ai_interpretation_marked` 必须为 `true`
- `ai_interpretation_marked=false` 但 `ai_interpretation` 非空 → `VALIDATION_ERROR`

> **与 ai_interpretations 表的关系**（P2-4 修复）：RiskDeclarationDTO 的 `ai_interpretation` 字段是内嵌在声明上的**当前最新解读快照**；05-ERD §5.2 的 `ai_interpretations` 独立表记录所有 AI 解读的**历史版本**（source_type 含 snapshot/backtest/risk_declaration 三种，1:N 关系）。二者互补：内嵌字段提供 UI 渲染快速访问，独立表保留完整审计轨迹。`ai_interpret_*` 工具调用时先写独立表（新增一行），再更新对应声明的内嵌字段。独立表落盘到运行时沙箱 DB（与 risk_declarations 同库，T-M2-016 可写连接层）。

### 6.5 BacktestReportDTO

```typescript
{
  report_id: string,
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  generated_at: string,                  // ISO 8601
  status: 'running' | 'completed' | 'failed',
  verify_sequence_result: object,        // 触发序列验证
  crosscheck_result: object,             // SQL 交叉验证
  audit_result: object,                  // 规则版本审计
  robustness_result?: object,            // 参数鲁棒性（可选，v0.01 run_full_verification 不含此项；
                                         // 独立函数 k_perturbation_report/threshold_perturbation_report
                                         // 可选集成，M2 设计时决定是否调用）
  performance?: {                         // 绩效指标（D1 修复，research_only，02-PRD §4.4）
    annualized_return?: number,           // 年化收益率（%）
    sharpe_ratio?: number,                // 夏普比率
    max_drawdown?: number,                // 最大回撤（%）
    win_rate?: number,                    // 胜率（%）
    profit_loss_ratio?: number,           // 盈亏比
    trade_count?: number,                 // 交易次数
    // ⚠ 研究验证用途标记（不可省略）
    research_only: true
  },
  lineage_hash: string,
  rule_versions: object
  // ⛔ 仍禁止：买卖建议/仓位/订单/PnL 作为决策输出（D19 边界，02-PRD §4.4 仅允许 research_only 研究展示）
}
```

> **落盘目标**（P1-3 修复）：v0.01 `run_full_verification(db_path, symbols, timeframes)` 纯内存返回 dict（实查 runner.py 确认），不落盘、无 report_id、无进度回调。v0.02 的 `report_id` 由 Adapter 生成（UUID），报告落盘到运行时沙箱 `Z:\pi-malf-riskbench-v0.02-runtime\reports\<report_id>.json`（JSONL 格式，与 v0.01 `canonical_report` 输出兼容）。`status: 'running'` 通过 `backtest.progress` Stream 推送进度（见 §5.3）。

> **绩效指标来源**（D1 修复）：v0.01 malf-backtest 当前只做 T4 确定性验证（verify_sequence/crosscheck/audit，无收益计算）。绩效指标（夏普/回撤/胜率/盈亏比/年化）由 **T-M2-018 新增绩效模块**计算（基于 signals 事件序列 + snapshots，research_only，02-PRD §4.4）。performance 字段为空时（未启用或计算失败）前端隐藏绩效区块，不影响确定性验证结果展示（AI-06 失败降级原则）。

**回测运行容错策略**（P1-1 修复）：

| 场景 | 行为 | 错误码 |
|---|---|---|
| 运行超时（> 60 秒） | Adapter 终止子进程调用，返回失败，进度不保存（用户重跑） | `INTERNAL_ERROR` |
| 运行中子进程崩溃 | 经 Adapter 3 次重启阈值（§4.1）；超阈值返回失败 | `MALF_ENGINE_ERROR` |
| 运行中用户关闭窗口 | 后台标记 `status: 'failed'`，进度不保存；用户重跑生成新 report_id | — |
| 报告文件写盘失败 | 返回失败，运行时沙箱磁盘检查提示 | `INTERNAL_ERROR` |
| lineage_hash 不一致 | T4 验证失败，返回错误，提示检查数据完整性 | `MALF_ENGINE_ERROR` |

> **超时依据**：60 秒阈值基于 v0.01 `run_full_verification` 实测单标的单周期 < 5 秒（15397 行快照），留 12 倍裕量覆盖 cold start + DuckDB 连接建立。超时后进度不保存（纯内存返回，无中间态），用户重跑生成新 report_id。

### 6.6 AI 解读 DTO 防泄露规则

所有 `ai.*` 路由的响应 DTO 必须满足：

| 规则 | 约束 |
|---|---|
| `ai_interpretation_marked` | 必须为 `true`（AI-05） |
| 标注文案 | interpretation 内容必须明确含"AI 解读"标识 |
| 不凌驾 | 解读不覆盖第一层市场事实与第二层用户声明 |
| 脱敏 | interpretation 不含 apiKey/完整 UUID/文件路径/堆栈（S9） |
| 可重试失败 | AI provider 失败 → `INTERNAL_ERROR`，提示重试；**AI 失败不阻塞确定性规则（AI-06，07-Workflow §4.4）**：第一层市场事实与第二层用户声明继续可用 |

### 6.7 RiskQuantifierDTO（RISK 量化器，P0-B 修复）

RISK 量化器从 WaveStructuralSnapshot 提取风险特征（02-PRD §2.2 RISK-01~04）。**只量化，不评分，不产生交易决策**（02-PRD §2.2 边界）。

```typescript
{
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  bar_dt: string,                         // ISO 8601，关联 snapshot
  extremity: {                            // RISK-01：极端度（P1 视图）
    rank: number,                         // 0.00-1.00，来自 snapshot.rank
    is_extreme: boolean,                  // rank > threshold → true（提示非正常状态）
    threshold: number                     // 阈值参数化，默认 0.80，可由用户在设置页调整（不硬编码）
  },
  momentum: {                             // RISK-02：动量方向（P2 视图）
    direction: 'accelerating' | 'decelerating' | 'flat',
    evidence: string                      // 量化依据（脱敏，不含堆栈）
  },
  directional_advantage: {                // RISK-03：方向优势（P3 视图）
    type: 'self_dominant' | 'opposite_dominant' | 'balanced',
    evidence: string
  },
  joint_risk_alert: {                     // RISK-04：联合风险提示
    is_high_risk: boolean,                // 极端 + 衰减 + 方向切换 → true
    factors: string[],                    // 触发因素列表（如 ["extremity", "momentum_decelerating"]）
    suggestion: string                    // 提示文案（不输出买卖建议，D19）
  },
  lineage_hash: string,                   // 原样透传自 snapshot（D29，不重算）
  rule_versions: object                   // 原样透传自 snapshot（D29）
  // ⛔ 不输出：评分/胜率/买卖建议/仓位/PnL（D19/02-PRD §2.2 边界）
}
```

**边界约束**：
- **只读 snapshot**：quantify_risk 经 MALF Adapter 子进程读取 snapshot（D5 过滤 runtime_fingerprint），不修改引擎产出（D29/S35）
- **阈值参数化**：extremity.threshold 默认 0.80（02-PRD RISK-01），可由用户在设置页调整，不硬编码到代码
- **不评分不决策**：DTO 只输出特征值与提示文案，不输出综合交易分/买卖建议/仓位（02-PRD §2.2 / D19）
- **失败降级**：snapshot 不存在 → `NOT_FOUND`；量化器内部异常 → `INTERNAL_ERROR`，提示重试

### 6.8 MarketSnapshotRowDTO / RankingDTO（全市场横截面 + 寿命排行榜，D2 修复）

**用途**：支撑全市场 Tab 与寿命排行榜 Tab（02-PRD 四层闭环全市场视角 + Lifespan 双轨排名），DuckDB 只读查询（D28）。

```typescript
// 全市场横截面行（query_market_snapshot 响应元素）
interface MarketSnapshotRowDTO {
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  bar_dt: string,                          // 最新快照日期
  direction: 'up' | 'down' | null,
  system_state: string,                    // wave_alive / transition_active 等
  // Lifespan 双轨排名（44 字段直接投影）
  wave_span_rank: number | null,
  wave_range_rank: number | null,
  wave_stagnation_rank: number | null,
  range_evolution_rank: number | null,
  range_resolution_distance_rank: number | null,
  // RISK 量化器投影（P0-B，可选展示列）
  risk?: {
    extremity: number | null,              // 极端度（rank > 0.80 → 高风险）
    momentum: 'accelerating' | 'decelerating' | 'flat' | null,
    directional_advantage: 'self_dominant' | 'opposite_dominant' | 'balanced' | null
  },
  reason_codes: string[],                  // honest degradation 透传
  lineage_hash: string                     // 可下钻到单标的快照（D29 原样）
  // ⛔ 不含：runtime_fingerprint（D5）、完整 44 字段（下钻用 query_snapshot）
}

// 寿命排行榜条目（query_rankings 响应元素）
interface RankingDTO {
  metric: 'span' | 'range' | 'stagnation' | 'range_evolution' | 'range_resolution',
  rank: number,                            // 1..N
  symbol: string,
  timeframe: 'day' | 'week' | 'month',
  bar_dt: string,                          // 排名基于的快照日期
  value: number | null,                    // 排名值（0-1 分位）
  direction: 'up' | 'down' | null,
  reason_codes: string[]
}
```

**约束**：
- 排名数据来自 DuckDB snapshots 表 44 字段 Lifespan 双轨（05-ERD §3.4/§3.5），**零引擎改动**（v0.01 已产出）
- 只读（D28）；上限 200 行防内存膨胀（query_market_snapshot）
- 未形成排名（None）的标的附 reason_codes 展示，不补零不估计（honest degradation）
- 全市场视图的标的池 = query_symbol_list（当前 3 标的，D3 扩展待用户裁决）
- **AI 可调用**：白名单 ✅（§7.3），AI 可读取量化结果用于解读，但不可修改 user_text（三层权威第二层）

---

## §7 路由分组与权限

### 7.1 路由分组

| 路由组 | 子系统 | 方法数 | 说明 |
|---|---|:--:|---|
| `malf.*` | MALF 查询 | 8 | 只读，封装 v0.01 引擎/数据/信号查询 + 全市场横截面/排名（D2） |
| `risk.*` | 风险声明 + 量化 | 6 | 第二层用户声明 + RISK 量化器，AI 只读不改 |
| `ai.*` | AI 解读 | 3 | 第三层 AI 解读，必须标注 |
| `bench.*` | 回测报告 | 2 | 只读，T4 确定性规则验证 |
| `viewer.*` | 只读 Viewer | 1 | 只读 DuckDB，不修改写入路径 |
| `system.*` | 系统工具 | 4 | 模型配置/凭据管理 |

### 7.2 权限模型

| 权限级别 | 适用路由 | 说明 |
|---|---|---|
| **只读**（无需授权） | `malf.*` / `bench.read*` / `viewer.*` / `risk.list_risk_declarations` / `risk.check_risk_contradiction` / `risk.quantify_risk` | 单用户单机，只读查询无需授权（quantify_risk 只读 snapshot 不修改引擎；全市场/排名查询只读 DuckDB，D28） |
| **需会话**（用户会话） | `risk.declare_risk` / `risk.update_risk_declaration` / `risk.delete_risk_declaration` / `ai.*` | 写入用户声明或调用 AI，需活跃用户会话 |
| **需授权**（用户明确授权） | `system.*`（模型配置/凭据管理） | 涉及凭据与系统配置，需用户明确授权 |

**权限规则**：
- **单用户单机**：用户拥有全部读写权限，无需 RBAC（01-TRD §4.1）
- **AI 不进系统路由**：AI agent 不可调用 `system.*`（凭据管理对 AI 不可见）
- **workspace-path-guard**：写/导出类操作受路径守卫拦截，拒绝 `../` 逃逸（S16）
- **credential-vault**：密钥读写经 DPAPI 加密（INV-04），明文不入日志（S7/S8）
- **只读 Viewer 边界**：viewer.* 仅 SELECT，不修改 snapshots/signals 表（D28）

### 7.3 AI agent 工具调用权限边界（白名单 + 黑名单）

AI agent 经 registerTool 调用工具时受 **白名单 + 黑名单** 双重约束，由 `before_tool_call` 钩子（03-Arch §3.3）在工具执行前拦截：

**白名单（17 个，AI 可调用）**：

| 路由组 | 工具名 | 说明 |
|---|---|---|
| malf.* | `query_snapshot` / `query_signals` / `query_symbol_list` / `query_timeframes` / `query_market_snapshot` / `query_rankings` / `explain_snapshot` | 只读市场事实查询（第一层权威）+ 全市场横截面/排名（D2） |
| risk.* | `declare_risk` / `list_risk_declarations` / `check_risk_contradiction` / `quantify_risk` | 声明创建 + 只读列表 + 矛盾检测 + RISK 量化（只读 snapshot） |
| ai.* | `ai_interpret_snapshot` / `ai_interpret_backtest` / `ai_discover_rules` | AI 解读（必须标注，第三层权威） |
| bench.* | `run_backtest_report` / `read_backtest_report` | 只读回测验证 |
| viewer.* | `export_csv` | 只读导出 |

**黑名单（7 个，AI 禁止调用）**：

| 路由组 | 方法名 | 禁止原因 | 权威依据 |
|---|---|---|---|
| risk.* | `update_risk_declaration` | AI 不可修改用户声明（三层权威第二层） | 02-PRD §1.3 / AI-05 |
| risk.* | `delete_risk_declaration` | AI 不可删除用户声明 | 02-PRD §1.3 / AI-05 |
| system.* | `models_config_get` | 系统配置对 AI 不可见 | 01-TRD §5 安全边界 |
| system.* | `models_config_set` | AI 不可修改模型配置 | 01-TRD §5 安全边界 |
| system.* | `credentials_get` | 凭据管理对 AI 不可见 | INV-04 / S7-S8 |
| system.* | `credentials_set` | AI 不可修改凭据 | INV-04 / S7-S8 |
| malf.* | `query_snapshot_range` | RPC 专用（UI 图表渲染），AI 用单点查询 | §3 双层暴露说明 |

**执行机制**：
- `before_tool_call` 钩子（03-Arch §3.3）在每次 `registerTool` execute 前校验工具名是否在白名单内
- 黑名单工具被调用时 → 钩子返回 `terminate: true` + 安全错误码 `VALIDATION_ERROR`（"AI 无权调用此工具"）
- 白名单 + 黑名单与 §3 "暴露为 registerTool" 列严格一致（15 ✅ / 7 ❌）
- `check-contract-coverage.mjs` AST 校验断言：registerTool 注册的工具集 = 白名单 17 个（§8.1 校验项"权限标注"）

---

## §8 契约 AST 校验（check-contract-coverage.mjs）

### 8.1 校验目标

`scripts/check-contract-coverage.mjs`（✅ 已创建，design 阶段 graceful skip，M0 后启用完整校验）作为合并 master 前的硬门禁，对契约与代码一致性做 AST 校验：

| 校验项 | 断言 | 失败处理 |
|---|---|---|
| 方法覆盖 | `contract/api.ts` 的 `interface Api` 方法数 = §3 RPC 方法表方法数（24） | 阻断合并 |
| 路由组一致 | 每个方法名前缀匹配 §7.1 路由组（malf/risk/ai/bench/viewer/system） | 阻断合并 |
| registerTool 白名单 | registerTool 注册的工具集 = §7.3 白名单 17 个（不含黑名单 7 个） | 阻断合并 |
| 信封形状 | registerTool execute 返回 `{content, details, usage?, terminate?}` | 阻断合并 |
| 错误码枚举 | 错误 throw 且映射到 §2.2 五码之一 | 阻断合并 |
| DTO 防泄露 | `WaveStructuralSnapshotDTO` 类型定义不含 `runtime_fingerprint` 字段（D5） | 阻断合并 |
| AI 标注 | `ai.*` 工具响应类型含 `marked: true` 字面量（AI-05） | 阻断合并 |
| 权限标注 | 每个方法标注权限（只读/需会话/需授权）与 §7.2 一致 | 阻断合并 |
| Streams 主题 | `contract/api.ts` 的 `interface Streams` 主题 = §5 四主题 | 阻断合并 |

### 8.2 校验流程

```
check-contract-coverage.mjs
├── 解析 contract/api.ts AST → 提取 Api 方法签名 + Streams 主题
├── 解析 registerTool 调用 AST → 提取 execute 返回形状 + 错误 throw
├── 解析 DTO 类型定义 AST → 提取字段列表
├── 对照本文件 §3/§5/§6 表格做一致性断言
└── 任一断言失败 → exit(1) 阻断合并
```

> 详见 [08-测试验收 §5](./08-测试验收-Test-Plan.md) 与 [10-开发规范](./10-开发规范-Dev-Rules.md)。

---

## §9 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：API 概述（MessagePort RPC + MALF JSON Lines）；统一信封（`{content, details, usage?, terminate?}` + 错误 throw + 5 错误码）；RPC 方法表（malf/risk/ai/bench/viewer/system 共 21 方法）；MALF Adapter JSON Lines 协议 + v0.01 API 封装；Streams（4 主题）；DTO 规范（WaveStructuralSnapshotDTO 44 字段防泄露 D5 + AI 解读标注 AI-05）；路由分组与权限；契约 AST 校验。输入：03-Architecture §3.2/§4.1 + 01-TRD D5/S9 + 02-PRD AI-05 + prep-参考点核对表 |
| v0.1.1 | 2026-08-09 | P0 审计修复：① §3 RPC 方法表新增"暴露为 registerTool"列（14 ✅ / 7 ❌，双层暴露说明，P0-11）；② §4.2 Adapter 方法表移除 `explainSnapshot`（TS 原生静态查询，非子进程调用，与 03-Arch §4.1 / 11-组件装配 §5.3 一致，P0-9）；③ §4.3 新增 Adapter 签名包装责任说明（参数/返回值/错误码/lineage_hash 透传，P0-10）；④ §7.3 新增 AI agent 工具调用权限边界（白名单 14 + 黑名单 7 + before_tool_call 执行机制，P0-8）；⑤ §8.1 新增 registerTool 白名单 AST 校验项。审计洞集见 .record/ 实施记录。 |
| v0.1.2 | 2026-08-09 | 第三轮交叉审查修复：§5 Streams 边界实现说明（§5.1/5.2 v0.1 预留，§5.3/5.4 v0.1 实现，P2-1）；§6.5 BacktestReportDTO robustness_result 改可选 + 落盘目标说明（P1-3，实查 runner.py 纯内存返回）；§6.4 ai_interpretations 孤儿表关系说明（P2-4）；§3 双层暴露分类 5+2→6+1（O-3）。 |
| v0.1.3 | 2026-08-10 | 任务边界与容错审计 P0+P1 修复：§3.2 新增 quantify_risk 方法（risk.* 路由组 5→6，RPC 21→22，registerTool 14→15，P0-B）；§4.1 子进程崩溃恢复策略（P0-A，4 阶段表）；§6.5 回测运行容错策略（P1-1，60 秒超时 + 子进程崩溃 + 窗口关闭 + 磁盘写失败）；§6.7 RiskQuantifierDTO（P0-B，extremity/momentum/directional_advantage/joint_risk_alert + lineage_hash/rule_versions 透传）；§6.4 RiskDeclarationDTO linked_fields→linked_snapshot_fields（P1-2，第四轮交叉审查，与 05-ERD §5.1 表 schema 一致）；§6.2 WaveStructuralSnapshotDTO snapshot_id→bar_index（P1-3，第四轮交叉审查，与 05-ERD §3.1 表 schema 一致）；§6.5 交叉引用 §5.2→§5.3（P1-4，第四轮交叉审查，backtest.progress 在 §5.3）。 |
| v0.1.4 | 2026-08-10 | 工作台功能扩展（D1+D2 用户裁决）：§3 新增 query_market_snapshot / query_rankings（malf.* 6→8，RPC 22→24，registerTool 15→17，D2 全市场落地）；§3.4/§6.5 回测绩效指标放开（D1，research_only，02-PRD §4.4 语义恢复，performance 字段可选 + research_only:true 强制标记）；§6.8 新增 MarketSnapshotRowDTO / RankingDTO；§7.1 malf 8 + §7.3 白名单 17 + §8.1 AST 校验 24/17 同步。对应 04-Todo T-M1-012/013 + T-M2-017/018 新任务。 |

---

**文档维护**：契约变更时更新，重大变更需用户批准
**最后更新**：2026-08-10
