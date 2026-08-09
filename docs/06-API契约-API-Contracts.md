# 06-API契约-API-Contracts

**版本**：v0.1.0
**日期**：2026-08-09
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

> 共 21 个 RPC 方法（contract/api.ts 的 `interface Api`），方法名采用 `<route_group>.<action>` 风格，与 03-Architecture §3.2 的 registerTool 工具集对齐。下表按路由组分组列示。

| 方法名 | 路由组 | 请求 DTO | 响应 DTO | 权限 | 说明 |
|---|---|---|---|---|---|
| `query_snapshot` | malf.* | `{symbol, timeframe, bar_dt}` | `WaveStructuralSnapshotDTO` | 只读 | 查询单个 snapshot（44 字段，防泄露） |
| `query_snapshot_range` | malf.* | `{symbol, timeframe, start_dt, end_dt}` | `WaveStructuralSnapshotDTO[]` | 只读 | 查询 snapshot 范围 |
| `query_signals` | malf.* | `{symbol, timeframe, start_dt, end_dt}` | `SignalDTO[]` | 只读 | 查询事件流（4 事件码） |
| `query_symbol_list` | malf.* | `{}` | `string[]` | 只读 | 获取标的列表 |
| `query_timeframes` | malf.* | `{symbol}` | `string[]` | 只读 | 获取周期列表（day/week/month） |
| `explain_snapshot` | malf.* | `{symbol, timeframe, bar_dt}` | `{explanation: string}` | 只读 | 解释 snapshot 字段（引用 MALF v2.1） |
| `declare_risk` | risk.* | `{symbol, timeframe, bar_dt, user_text, linked_fields}` | `RiskDeclarationDTO` | 需会话 | 创建风险声明 |
| `list_risk_declarations` | risk.* | `{symbol?, timeframe?}` | `RiskDeclarationDTO[]` | 只读 | 列出风险声明 |
| `update_risk_declaration` | risk.* | `{declaration_id, user_text}` | `RiskDeclarationDTO` | 需会话 | 修改风险声明 |
| `delete_risk_declaration` | risk.* | `{declaration_id}` | `{deleted: bool}` | 需会话 | 删除风险声明 |
| `check_risk_contradiction` | risk.* | `{declaration_id}` | `{contradictions: string[]}` | 只读 | 检测风险声明与市场事实矛盾 |
| `ai_interpret_snapshot` | ai.* | `{symbol, timeframe, bar_dt}` | `{interpretation: string, marked: true}` | 需会话 | AI 解读 snapshot（必须标注"AI 解读"） |
| `ai_interpret_backtest` | ai.* | `{report_id}` | `{interpretation: string, marked: true}` | 需会话 | AI 解读回测报告 |
| `ai_discover_rules` | ai.* | `{symbol, timeframe}` | `{rules: object[]}` | 需会话 | AI 辅助信号规则发现 |
| `run_backtest_report` | bench.* | `{symbol, timeframe}` | `{report_id: string}` | 只读 | 运行 T4 确定性规则验证 |
| `read_backtest_report` | bench.* | `{report_id}` | `BacktestReportDTO` | 只读 | 读取回测报告 |
| `export_csv` | viewer.* | `{symbol, timeframe, start_dt, end_dt}` | `{csv_path: string}` | 只读 | 导出 CSV（只读 Viewer） |
| `models_config_get` | system.* | `{}` | `{providers: object[]}` | 需授权 | 获取模型配置 |
| `models_config_set` | system.* | `{providers: object[]}` | `{updated: bool}` | 需授权 | 设置模型配置 |
| `credentials_get` | system.* | `{key: string}` | `{has: bool}` | 需授权 | 查询凭据是否存在（不回传明文） |
| `credentials_set` | system.* | `{key: string, value: string}` | `{set: bool}` | 需授权 | 设置凭据（DPAPI 加密） |

### 3.1 malf.* 路由组（MALF 查询工具，6 个）

只读路由，无需授权。封装 v0.01 malf-data / malf-engine / malf-signal 的查询能力（详见 §4.2 Adapter 方法表）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `query_snapshot` | `{symbol: string, timeframe: 'day'\|'week'\|'month', bar_dt: string}` | `WaveStructuralSnapshotDTO` | PK(symbol, timeframe, bar_dt)；不暴露 runtime_fingerprint（D5） |
| `query_snapshot_range` | `{symbol, timeframe, start_dt, end_dt}` | `WaveStructuralSnapshotDTO[]` | 范围按 bar_dt 升序；上限 1000 条防内存膨胀 |
| `query_signals` | `{symbol, timeframe, start_dt, end_dt}` | `SignalDTO[]` | 4 事件码；按 event_dt 升序 |
| `query_symbol_list` | `{}` | `string[]` | DuckDB SELECT DISTINCT symbol；当前 3 标的（sh510050/sh510300/sz159915） |
| `query_timeframes` | `{symbol}` | `string[]` | 返回 `['day','week','month']` 子集 |
| `explain_snapshot` | `{symbol, timeframe, bar_dt}` | `{explanation: string}` | 引用 MALF v2.1 字段权威解释；不含运行时指纹 |

### 3.2 risk.* 路由组（风险声明工具，5 个）

第二层用户声明权威，AI 不可修改 user_text（02-PRD §6.3）。

| 方法 | 请求 DTO | 响应 DTO | 约束 |
|---|---|---|---|
| `declare_risk` | `{symbol, timeframe, bar_dt, user_text: string, linked_fields: string[]}` | `RiskDeclarationDTO` | 创建声明；linked_fields 引用 snapshot 字段（如 rank/label） |
| `list_risk_declarations` | `{symbol?, timeframe?}` | `RiskDeclarationDTO[]` | 可选过滤；按 created_at 降序 |
| `update_risk_declaration` | `{declaration_id, user_text}` | `RiskDeclarationDTO` | 仅修改 user_text；声明归属用户校验 |
| `delete_risk_declaration` | `{declaration_id}` | `{deleted: bool}` | 软删除（留审计痕迹） |
| `check_risk_contradiction` | `{declaration_id}` | `{contradictions: string[]}` | 检测声明与市场事实的矛盾；AI 只提醒不改写 |

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
| `run_backtest_report` | `{symbol, timeframe}` | `{report_id: string}` | 触发 T4 验证；返回 report_id 供轮询/读取 |
| `read_backtest_report` | `{report_id}` | `BacktestReportDTO` | 读取报告；不输出收益类指标（D19/战役 1 边界） |

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
| `credentials_get` | `{key: string}` | `{has: bool}` | 仅返回是否存在，不回传明文；键名匹配 `^(modelProvider\|riskbench):[a-z0-9._-]{1,160}$` |
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
- 子进程崩溃 → MALF 引擎错误，映射为 `MALF_ENGINE_ERROR`，不拖垮桌面

### 4.2 Adapter 方法表（封装 v0.01 API）

v0.01 五组件的 API 经 MALF Adapter 封装为 §3 的 registerTool 工具。下表为 Adapter 内部方法与 v0.01 API 的映射：

| Adapter 方法 | 对应 v0.01 API | 暴露为 | 用途 |
|---|---|---|---|
| `querySnapshot(symbol, timeframe, bar_dt)` | DuckDB SELECT（malf-data DuckDBAdapter） | `query_snapshot` | 查询单个 snapshot |
| `querySnapshotRange(symbol, timeframe, start_dt, end_dt)` | DuckDB SELECT | `query_snapshot_range` | 查询 snapshot 范围 |
| `querySignals(symbol, timeframe, start_dt, end_dt)` | `malf-signal.SignalStore.read_events` | `query_signals` | 查询事件流 |
| `runBacktestVerification(symbol, timeframe)` | `malf-backtest.run_full_verification` | `run_backtest_report` | 运行 T4 验证 |
| `getSymbolList()` | DuckDB SELECT DISTINCT symbol | `query_symbol_list` | 获取标的列表 |
| `getTimeframes(symbol)` | DuckDB SELECT DISTINCT timeframe | `query_timeframes` | 获取周期列表 |
| `explainSnapshot(symbol, timeframe, bar_dt)` | MALF v2.1 字段权威解释 | `explain_snapshot` | 解释字段含义 |

### 4.3 v0.01 API 继承清单（封装为 Adapter 方法）

以下 v0.01 API 不直接对外暴露，经 Adapter 桥接后以 §3 的工具形式供 pi 扩展层调用：

| 组件 | v0.01 API | 封装为 |
|---|---|---|
| malf-data | `read_tdx_day` / `build_snapshots` / `DuckDBAdapter` | `querySnapshot*` / `getSymbolList` / `getTimeframes` |
| malf-engine | `MALFCoreEngine.on_bar` / `LifespanEngine` / `RankEngine` / `StructuralPositionEngine` / `build_wave_structural_snapshot` / `calculate_lineage_hash` | 引擎内部计算，经 `querySnapshot` 读取产出 |
| malf-signal | `detect_events` / `load_snapshots` / `SignalStore` | `querySignals` |
| malf-backtest | `EngineRunner` / `verify_sequence` / `crosscheck_symbol_timeframe` / `audit_signals` / `run_full_verification` | `runBacktestVerification` |
| riskbench-shared | `config`（frozen dataclass）/ `paths`（DATA_ROOT 推导 + `_guard`） | Adapter 配置与路径层 |

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

### 5.1 snapshot.updated 流

| 属性 | 值 |
|---|---|
| 主题 | `snapshot.updated` |
| 触发条件 | MALF 引擎产出新 snapshot 并写入 DuckDB/var/published |
| 推送数据 | `{symbol, timeframe, bar_dt, lineage_hash}` |
| 说明 | 仅推送摘要（不含完整 44 字段，防泄露）；renderer 收到后按需调用 `query_snapshot` 拉取完整 DTO |

### 5.2 signal.detected 流

| 属性 | 值 |
|---|---|
| 主题 | `signal.detected` |
| 触发条件 | `malf-signal.detect_events` 检出事件（4 事件码之一） |
| 推送数据 | `SignalDTO`（事件摘要） |
| 说明 | 事件流实时推送；renderer 用于风险提醒与 AI 解读触发 |

### 5.3 backtest.progress 流

| 属性 | 值 |
|---|---|
| 主题 | `backtest.progress` |
| 触发条件 | T4 验证进度变更（started/verify_sequence/crosscheck/audit/completed） |
| 推送数据 | `{report_id, phase, progress: number}` |
| 说明 | 进度 0-100；完成后 renderer 调用 `read_backtest_report` 拉取完整报告 |

### 5.4 ai.interpretation.streaming 流

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
  snapshot_id: string,

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
  linked_fields: string[],               // 关联 snapshot 字段（如 rank/label）
  created_at: string,                    // ISO 8601
  ai_interpretation: string | null,      // AI 解读（必须标注"AI 解读"）
  ai_interpretation_marked: boolean      // AI 解读是否已标注（AI-05）
}
```

**规则**：
- `user_text` 仅用户可改（第二层权威，AI 只读）
- `ai_interpretation` 非空时 `ai_interpretation_marked` 必须为 `true`
- `ai_interpretation_marked=false` 但 `ai_interpretation` 非空 → `VALIDATION_ERROR`

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
  robustness_result: object,             // 参数鲁棒性
  lineage_hash: string,
  rule_versions: object
  // ⛔ 不输出：收益类指标（胜率/综合分/买卖建议/仓位/PnL，D19 战役 1 边界）
}
```

### 6.6 AI 解读 DTO 防泄露规则

所有 `ai.*` 路由的响应 DTO 必须满足：

| 规则 | 约束 |
|---|---|
| `ai_interpretation_marked` | 必须为 `true`（AI-05） |
| 标注文案 | interpretation 内容必须明确含"AI 解读"标识 |
| 不凌驾 | 解读不覆盖第一层市场事实与第二层用户声明 |
| 脱敏 | interpretation 不含 apiKey/完整 UUID/文件路径/堆栈（S9） |
| 可重试失败 | AI provider 失败 → `INTERNAL_ERROR`，提示重试 |

---

## §7 路由分组与权限

### 7.1 路由分组

| 路由组 | 子系统 | 方法数 | 说明 |
|---|---|:--:|---|
| `malf.*` | MALF 查询 | 6 | 只读，封装 v0.01 引擎/数据/信号查询 |
| `risk.*` | 风险声明 | 5 | 第二层用户声明，AI 只读不改 |
| `ai.*` | AI 解读 | 3 | 第三层 AI 解读，必须标注 |
| `bench.*` | 回测报告 | 2 | 只读，T4 确定性规则验证 |
| `viewer.*` | 只读 Viewer | 1 | 只读 DuckDB，不修改写入路径 |
| `system.*` | 系统工具 | 4 | 模型配置/凭据管理 |

### 7.2 权限模型

| 权限级别 | 适用路由 | 说明 |
|---|---|---|
| **只读**（无需授权） | `malf.*` / `bench.read*` / `viewer.*` / `risk.list_risk_declarations` / `risk.check_risk_contradiction` | 单用户单机，只读查询无需授权 |
| **需会话**（用户会话） | `risk.declare_risk` / `risk.update_risk_declaration` / `risk.delete_risk_declaration` / `ai.*` | 写入用户声明或调用 AI，需活跃用户会话 |
| **需授权**（用户明确授权） | `system.*`（模型配置/凭据管理） | 涉及凭据与系统配置，需用户明确授权 |

**权限规则**：
- **单用户单机**：用户拥有全部读写权限，无需 RBAC（01-TRD §4.1）
- **AI 不进系统路由**：AI agent 不可调用 `system.*`（凭据管理对 AI 不可见）
- **workspace-path-guard**：写/导出类操作受路径守卫拦截，拒绝 `../` 逃逸（S16）
- **credential-vault**：密钥读写经 DPAPI 加密（INV-04），明文不入日志（S7/S8）
- **只读 Viewer 边界**：viewer.* 仅 SELECT，不修改 snapshots/signals 表（D28）

---

## §8 契约 AST 校验（check-contract-coverage.mjs）

### 8.1 校验目标

`scripts/check-contract-coverage.mjs`（待创建）作为合并 master 前的硬门禁，对契约与代码一致性做 AST 校验：

| 校验项 | 断言 | 失败处理 |
|---|---|---|
| 方法覆盖 | `contract/api.ts` 的 `interface Api` 方法数 = §3 RPC 方法表方法数（21） | 阻断合并 |
| 路由组一致 | 每个方法名前缀匹配 §7.1 路由组（malf/risk/ai/bench/viewer/system） | 阻断合并 |
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

---

**文档维护**：契约变更时更新，重大变更需用户批准
**最后更新**：2026-08-09
