# 03-架构设计-Architecture-Design

**版本**：v0.1.3
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：[01-TRD](./01-TRD-技术需求-Technical-Requirements.md)、[02-PRD](./02-PRD-产品需求-Product-Requirements.md)、[prep-参考点核对表](./prep-参考点核对表.md)
**下游**：[05-ERD](./05-数据模型-ERD-Data-Model.md)、[06-API](./06-API契约-API-Contracts.md)、[08-测试验收](./08-测试验收-Test-Plan.md)、[09-UI](./09-使用者介面-UI-Design.md)、[11-组件装配](./11-组件装配-Component-Assembly.md)
**用途**：v0.02 四层架构 + pi 扩展 + MALF Adapter + 数据层 + 安全不变量 SoT

---

## §1 概述

### 1.1 架构总览

v0.02 采用**四层架构**，自底向上：

```
┌─────────────────────────────────────────────────────────┐
│  Layer 4: 桌面壳（Electron + React + TypeScript）        │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐    │
│  │  main   │ preload │renderer │agent-host│contract │    │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘    │
├─────────────────────────────────────────────────────────┤
│  Layer 3: pi 扩展层（registerTool + pi.on + pi-ai）      │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ MALF 工具 │ RISK 工具│ AI 工具  │BENCH 工具│         │
│  └──────────┴──────────┴──────────┴──────────┘         │
├─────────────────────────────────────────────────────────┤
│  Layer 2: 业务 Adapter 层（MALF Adapter + DuckDB 访问）  │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ MALF 子进程  │ DuckDB 只读  │ 配置/路径层   │        │
│  │ Adapter      │ 访问层       │（v0.01 继承） │        │
│  └──────────────┴──────────────┴──────────────┘        │
├─────────────────────────────────────────────────────────┤
│  Layer 1: 数据与引擎层（v0.01 继承 + MALF v2.1 权威）    │
│  ┌────────┬────────┬────────┬────────┬────────┐        │
│  │malf-   │malf-   │riskbench│malf-  │malf-   │        │
│  │engine  │data    │shared  │signal │backtest│        │
│  │(115✅) │(46✅)  │(10✅)  │(37✅) │(31✅)  │        │
│  └────────┴────────┴────────┴────────┴────────┘        │
│  + DuckDB 生产库 + TDX 原始数据 + Parquet 备份           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

1. **继承不重写**：v0.01 五组件 290 passed 直接继承，v0.02 只加 Adapter 桥接
2. **pi 不改内核**：所有业务能力通过 registerTool + 扩展 + 技能接入，不修改 pi 源码
3. **子进程隔离**：Python MALF 引擎不嵌入 Electron 主进程，经子进程 + JSON 协议桥接
4. **只读 Viewer**：v0.02 新增的 Viewer 只读取 DuckDB，不修改写入路径
5. **安全不变量六条**：叠加 v0.01 S1-S38，桌面壳安全硬断言

---

## §2 Layer 4：桌面壳（Electron + React + TypeScript）

### 2.1 五件骨架（继承 pi-desktop 范式）

| 组件 | 职责 | 技术 | 安全约束 |
|---|---|---|---|
| main | 窗口管理 + 原生能力 + MALF 子进程托管 | Electron main 进程 | INV-01 sandbox:true |
| preload | 受控桥接，白名单 API | Electron preload 脚本 | INV-03 不暴露 Node API |
| renderer | React UI，三栏布局 + Tabs | React 18 + TypeScript | INV-02 严格 CSP |
| agent-host | pi 嵌入，createAgentSession + 扩展加载 | pi-coding-agent SDK | INV-05 Host RPC 契约 |
| contract | RPC 契约，MessagePort + 统一信封 | TypeScript | INV-05 ipcMain 白名单 |

### 2.2 进程模型

```
Electron main 进程
├── BrowserWindow (renderer)
│   ├── preload.ts (受控桥接)
│   └── React App (三栏布局)
├── agent-host (pi session)
│   ├── pi-coding-agent 内核
│   ├── v0.02 扩展（registerTool 工具集）
│   └── pi-ai provider（多供应商）
├── MALF 子进程（Python）
│   ├── malf-engine（五层领域模块）
│   ├── malf-data（TDX 接入 + DuckDB）
│   └── malf-signal/malf-backtest
└── contract (MessagePort RPC)
```

### 2.3 安全沙箱配置

```typescript
// BrowserWindow 配置（伪代码，实现时以代码为准）
new BrowserWindow({
  webPreferences: {
    sandbox: true,                    // INV-01
    contextIsolation: true,           // 上下文隔离
    nodeIntegration: false,           // 禁止 Node
    preload: path.join(__dirname, 'preload.js'),
  }
});

// CSP 配置（伪代码）
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",          // INV-02
        "connect-src 'self' http://127.0.0.1:*",  // 只允许本地
      ]
    }
  });
});
```

### 2.4 credential-vault（继承 pi-desktop）

- 密钥存储用 Electron safeStorage（Windows DPAPI 加密）
- 键名匹配正则：`/^modelProvider:[a-z0-9._-]{1,160}$/i` 和 `/^riskbench:[a-z0-9._-]{1,160}$/i`
- 明文不入日志（S7-S8）
- AI provider 密钥、SMTP、飞书 webhook 全部走 credential-vault

**DPAPI 解密失败降级**（P1-6 修复）：

| 场景 | 行为 | 错误码 |
|---|---|---|
| Windows 账户变更导致 DPAPI 密钥不可用 | `safeStorage.decryptString` 抛错 → 捕获 → 返回 `VALIDATION_ERROR` | `VALIDATION_ERROR` |
| 密文损坏（非 base64 / 长度异常） | 同上，捕获后返回 `VALIDATION_ERROR` | `VALIDATION_ERROR` |
| 用户响应 | UI 提示"密钥已失效，请重新输入 API Key" → 引导用户重设（不自动清空旧密钥） | — |
| 重设流程 | 用户输入新 apiKey → `credentials_set` 重新加密存储（覆盖旧密文） | — |

> **降级依据**：safeStorage 解密失败不可恢复（密钥与 Windows 账户绑定），不自动重试，直接降级为用户重设。日志仅记"DPAPI decrypt failed"（S9 脱敏，不暴露密文/堆栈）。

### 2.5 进程崩溃恢复策略（P1-4 + P1-5 修复）

v0.02 多进程架构下，各进程崩溃的恢复策略：

| 进程 | 角色 | 崩溃影响 | 恢复策略 |
|---|---|---|---|
| **Electron main**（T-M0-001） | 主进程，承载 BrowserWindow + IPC + credential-vault | 主进程崩溃 → 整个应用退出 | **不自动重启**：触发 Electron 原生崩溃对话框（crashReporter）→ 用户手动重启应用。理由：自动重启可能导致未保存的 risk_declarations 写入损坏（违反单写进程约束），用户重启可重置状态 |
| **renderer**（T-M0-003） | UI 进程，sandbox 隔离 | renderer 崩溃 → 主窗口白屏，主进程存活 | 主进程监听 `render-process-gone` → 提示用户"界面崩溃，是否重新加载" → 用户确认后 `webContents.reload()`（不丢主进程状态） |
| **agent-host utilityProcess**（T-M0-004） | pi 会话宿主，承载 registerTool + 钩子 | utilityProcess 崩溃 → AI 会话丢失，主进程存活 | **不自动重启**：主进程监听 `utilityProcess.exit` → UI 提示"AI 会话已断开，请重启会话" → 用户确认后销毁旧 utilityProcess + 重新 spawn + 重新 createAgentSession（旧会话上下文丢失，risk_declarations 数据不丢） |
| **MALF 子进程**（T-M0-008） | Python 引擎，JSON Lines 通信 | 子进程崩溃 → MALF 工具不可用，桌面存活 | Adapter 自动重启（最多 3 次），超阈值返回 `MALF_ENGINE_ERROR`（见 §4.1 子进程崩溃恢复策略） |

**通用原则**：
- **不自动重启主进程**：避免数据损坏，用户手动重启可重置全部状态
- **utilityProcess 不自动重启会话**：旧会话上下文（AI 对话历史）丢失，但 risk_declarations 持久化数据不丢
- **MALF 子进程自动重启**：无状态（纯查询），3 次阈值平衡可用性与故障快速失败
- **崩溃日志**：crashReporter 落盘到 `Z:\pi-malf-riskbench-v0.02-runtime\crashes\`，不含 apiKey/堆栈明文（S9）
- **数据完整性优先**：任何崩溃场景下，risk_declarations 表的写入完整性由可写连接层 WAL 模式保证（§4.2.2）

---

## §3 Layer 3：pi 扩展层

### 3.1 扩展工厂

v0.02 以单一 extension factory + registerTool 批量挂载业务工具（继承 inno-agent 范式）：

```typescript
// 伪代码，实现时以代码为准
function createRiskBenchExtension(pi: PiExtensionContext) {
  // 注册 MALF 查询工具
  for (const tool of createMalfQueryTools()) {
    pi.registerTool(tool);
  }
  // 注册 RISK 风险声明工具
  for (const tool of createRiskDeclarationTools()) {
    pi.registerTool(tool);
  }
  // 注册 AI 解读工具
  for (const tool of createAiInterpretationTools()) {
    pi.registerTool(tool);
  }
  // 注册 BENCH 回测报告工具
  for (const tool of createBacktestReportTools()) {
    pi.registerTool(tool);
  }
  // 注册模型供应商
  pi.registerProvider(riskBenchProvider);
  // 钩子
  pi.on("before_agent_start", beforeAgentStartHook);
  pi.on("before_tool_call", beforeToolCallHook);  // AI 工具调用权限拦截（06-API §7.3 白名单/黑名单）
  pi.on("tool_call", toolCallHook);
  pi.on("tool_result", toolResultHook);
  pi.on("model_select", modelSelectHook);
}
```

### 3.2 registerTool 工具集（15 个，与 06-API §7.3 白名单一致）

> AI agent 可调用的工具集（registerTool 注册）。共 15 个，与 06-API §3 "暴露为 registerTool" 列 ✅ 标记的方法一一对应。7 个 RPC 方法（update/delete_risk_declaration / system.* / query_snapshot_range）不暴露为 registerTool（详见 06-API §7.3 黑名单）。

| 工具名 | 路由组 | 用途 | aiCallable | 优先级 |
|---|---|---|:--:|:--:|
| `query_snapshot` | malf.* | 查询 WaveStructuralSnapshot（44 字段） | ✅ | P0 |
| `query_signals` | malf.* | 查询 signals 事件流（4 事件码） | ✅ | P0 |
| `query_symbol_list` | malf.* | 查询可用标的列表 | ✅ | P0 |
| `query_timeframes` | malf.* | 查询可用周期（day/week/month） | ✅ | P0 |
| `explain_snapshot` | malf.* | 解释 snapshot 字段含义（TS 原生静态查询，引用 MALF v2.1） | ✅ | P1 |
| `declare_risk` | risk.* | 创建风险声明（AI 可创建，但不可 update/delete） | ✅ | P0 |
| `list_risk_declarations` | risk.* | 列出风险声明 | ✅ | P0 |
| `check_risk_contradiction` | risk.* | 检测风险声明与市场事实的矛盾 | ✅ | P1 |
| `quantify_risk` | risk.* | RISK 量化器（P0-B 修复）：从 snapshot 提取极端度/动量/方向优势 + 联合风险提示；只读不修改引擎 | ✅ | P1 |
| `ai_interpret_snapshot` | ai.* | AI 解读 snapshot（必须标注"AI 解读"） | ✅ | P2 |
| `ai_interpret_backtest` | ai.* | AI 解读回测报告 | ✅ | P2 |
| `ai_discover_rules` | ai.* | AI 辅助信号规则发现 | ✅ | P2 |
| `run_backtest_report` | bench.* | 运行 T4 确定性规则验证 | ✅ | P0 |
| `read_backtest_report` | bench.* | 读取回测报告 | ✅ | P0 |
| `export_csv` | viewer.* | 导出 CSV（只读） | ✅ | P1 |

> **`aiCallable` 列说明**：全部 15 个 registerTool 工具 `aiCallable=✅`。`update_risk_declaration` / `delete_risk_declaration` / `system.*` / `query_snapshot_range` 不在 registerTool 工具集内（06-API §7.3 黑名单），AI 经 `before_tool_call` 钩子拦截。

### 3.3 pi.on 钩子

| 钩子 | 用途 |
|---|---|
| `before_agent_start` | 注入上下文（当前标的、周期、最新 snapshot 摘要） |
| `before_tool_call` | **AI 工具调用权限拦截**：校验工具名在 §3.2 白名单（15 个）内；黑名单工具被调用时返回 `terminate: true` + `VALIDATION_ERROR`（详见 06-API §7.3） |
| `tool_call` | 工具调用日志（脱敏） |
| `tool_result` | 工具结果日志（脱敏） |
| `model_select` | 持久化默认模型（落业务数据根 config/models.json 带 `__riskbench_managed` 标记） |

### 3.4 pi-ai provider

- 不重写 provider，复用 pi-ai 抽象（38 个内置 provider 工厂）
- 通过 `pi.registerProvider()` 注入风险场景专用 provider
- 国内供应商（ZAI/Qwen/Xiaomi）覆盖对研究场景合规与成本控制
- 所有 model 选择、鉴权、流式派发复用 pi-ai 抽象

### 3.5 技能系统（pi-skills 范式）

| 技能名 | description（常驻 prompt） | 用途 |
|---|---|---|
| `malf-snapshot-explain` | 解释 MALF 快照字段含义 | snapshot 字段引用 MALF v2.1 权威 |
| `risk-declare` | 辅助用户创建风险声明 | 模板辅助 + 矛盾提醒 |
| `backtest-report-read` | 解读回测报告 | 标注"AI 解读" |

技能目录结构（扁平，一层深）：
```
.pi/skills/
├── malf-snapshot-explain/
│   ├── SKILL.md
│   └── helper.js
├── risk-declare/
│   ├── SKILL.md
│   └── helper.js
└── backtest-report-read/
    ├── SKILL.md
    └── helper.js
```

### 3.6 prompt 模板

| 模板名 | 用途 |
|---|---|
| `/declare-risk` | 风险声明脚手架 |
| `/explain-snapshot` | 快照解释脚手架 |
| `/compare-backtest` | 回测对比脚手架 |

---

## §4 Layer 2：业务 Adapter 层

### 4.1 MALF Adapter（Python ↔ TS 桥接）

**职责**：将 v0.01 Python MALF 引擎桥接进 pi 扩展层。

**架构**：
```
pi 扩展层（TypeScript）
    │
    │ JSON Lines（stdin/stdout）
    │
MALF 子进程（Python）
├── malf-engine（on_bar → CoreStateSnapshot → WaveStructuralSnapshot）
├── malf-data（tdx_reader + DuckDBAdapter）
├── malf-signal（detect_events）
└── malf-backtest（run_full_verification）
```

**协议**：
- 通信：stdin/stdout JSON Lines，stderr 仅日志
- 请求格式：`{"id": "<uuid>", "method": "<method_name>", "params": {...}}`
- 响应格式：`{"id": "<uuid>", "result": {...}}` 或 `{"id": "<uuid>", "error": {"code": "<code>", "message": "<msg>"}}`
- 错误码：INTERNAL_ERROR / MALF_ENGINE_ERROR / DUCKDB_ERROR / VALIDATION_ERROR

**子进程崩溃恢复策略**（P0-A 修复，与 06-API §4.1 / 08-Test T-UT-327 一致）：

| 阶段 | 行为 | 阈值 |
|---|---|---|
| 崩溃检测 | Adapter 监听子进程 `exit`/`disconnected` 事件 | 实时 |
| 自动重启 | 重新 spawn 子进程 + 握手重放 | 最多 3 次 |
| 超阈值 | 第 4 次失败 → 返回 `MALF_ENGINE_ERROR`，桌面存活 | 阈值后终止 |
| 在途请求 | 未配对返回的请求 → `MALF_ENGINE_ERROR`，调用方可重试 | 立即 |

> 阈值依据：3 次重启平衡"瞬时故障可恢复"与"持续故障快速失败"，超过阈值不拖垮桌面（DECISION-v02-004 / D27）。

**Adapter 方法**（封装为 pi registerTool，共 6 个，与 06-API §4.2 / 11-组件装配 §5.3 一致）：

| Adapter 方法 | 对应 v0.01 API | 用途 |
|---|---|---|
| `querySnapshot(symbol, timeframe, bar_dt)` | DuckDB SELECT | 查询单个 snapshot |
| `querySnapshotRange(symbol, timeframe, start_dt, end_dt)` | DuckDB SELECT | 查询 snapshot 范围 |
| `querySignals(symbol, timeframe, start_dt, end_dt)` | SignalStore.read_events | 查询事件流 |
| `runBacktestVerification(symbol, timeframe)` | run_full_verification | 运行 T4 验证 |
| `getSymbolList()` | DuckDB SELECT DISTINCT | 获取标的列表 |
| `getTimeframes(symbol)` | DuckDB SELECT DISTINCT | 获取周期列表 |

> **Adapter 签名包装责任**（P0-10 修复，与 06-API §4.3 / 11-组件装配 §5.3 一致）：Adapter 方法签名（TS 侧）与 v0.01 Python API 签名可能不完全一致，Adapter 负责参数名/类型转换（如 `bar_dt: string` → `datetime.date`）、返回值归一（dict/dataclass → DTO + D5 防泄露过滤）、错误码映射（Python 异常 → 4 码）、`lineage_hash`/`rule_versions` 原样透传（D29，不重算不修改）。能力卡须记录两侧签名映射。

### 4.2 DuckDB 只读访问层

**职责**：v0.02 只读 Viewer 访问 DuckDB 生产库。

**约束**：
- 只读访问（SELECT），不修改 snapshots/signals 表（D28）
- 访问路径经 paths.py + _guard 防护（S16-S17）
- 连接池单例，崩溃不拖垮桌面
- 查询超时 30 秒

**读路径归属裁决**（P2-3 修复）：
- **TS 只读访问层**（T-M1-001）**仅服务 UI 渲染路径**（renderer 经 contract RPC 查询 snapshots/signals 表，生产库只读）
- **所有 AI 工具查询必须走 MALF Adapter 子进程**（T-M0-008），不经 TS 只读访问层——确保 D5 过滤（runtime_fingerprint 不暴露）在 Adapter 侧统一实现，避免双实现漂移
- **risk_declarations/ai_interpretations 表的写入**走运行时沙箱独立 DB 的**可写连接层**（T-M2-016），不经 TS 只读访问层也不经 Adapter
- 三条读/写路径物理隔离：① TS 只读层（UI 渲染，生产库 SELECT）→ ② Adapter 子进程（AI 工具，生产库 SELECT + D5 过滤）→ ③ 可写连接层（声明/解读，运行时沙箱 DB CRUD）

### 4.2.1 RISK 量化器（P0-B 修复，与 06-API §3.2 quantify_risk / §6.7 RiskQuantifierDTO 一致）

**职责**：从 WaveStructuralSnapshot 提取风险特征（02-PRD §2.2 RISK-01~04），输出极端度/动量/方向优势 + 联合风险提示。

**边界约束**：
- **只读 snapshot**：经 MALF Adapter 子进程读取 snapshot（D5 过滤），不修改引擎产出（D29/S35）
- **不评分不决策**：只输出特征值与提示文案，不输出综合交易分/买卖建议/仓位/PnL（02-PRD §2.2 / D19）
- **阈值参数化**：extremity.threshold 默认 0.80（02-PRD RISK-01），可由用户在设置页调整，不硬编码
- **AI 可读不可改**：AI 可调用 quantify_risk 读取量化结果用于解读，但不可修改 user_text（三层权威第二层）
- **失败降级**：snapshot 不存在 → `NOT_FOUND`；量化器内部异常 → `INTERNAL_ERROR`，提示重试；**AI 工具失败不阻塞确定性规则（AI-06，07-Workflow §4.4）**：quantify_risk 失败不影响 snapshot 查询与风险声明 CRUD

**输入/输出**：详见 06-API §6.7 RiskQuantifierDTO。

### 4.2.2 可写连接层（运行时沙箱 DB，P1-2 修复）

**职责**：v0.02 自建可写 DuckDB 连接层，服务 risk_declarations / ai_interpretations 表的建表与写入（T-M2-016）。

**容错与并发控制**：

| 维度 | 策略 | 依据 |
|---|---|---|
| **WAL 模式** | 启用 `PRAGMA journal_mode=WAL`，写不阻塞读，崩溃后自动 WAL replay 恢复 | DuckDB 原生支持 |
| **单连接串行写** | 可写连接层单例（单写进程约束，AGENTS.md §1.1），写操作串行排队 | 避免并发写冲突 |
| **崩溃恢复** | DuckDB WAL replay 自动恢复已提交事务；未提交事务回滚；连接断开自动重连（最多 3 次） | 与 Adapter 子进程 3 次重启阈值一致（§4.1） |
| **写超时** | 单次写操作超时 10 秒，超时返回 `DUCKDB_ERROR` | 防止长时间阻塞 UI |
| **数据隔离** | 独立文件 `Z:\pi-malf-riskbench-v0.02-runtime\riskbench-runtime.duckdb`，不污染生产库 `Z:\ai-malf-riskbench-data\riskbench.duckdb` | 12-目录治理三层物理隔离 |
| **失败降级** | 写失败 → 返回 `DUCKDB_ERROR`，UI 提示重试；不阻塞查询路径（TS 只读层独立） | 三条读/写路径物理隔离（§4.2） |

> **单写进程约束保证**：v0.02 主进程独占可写连接（单例），v0.01 `run_pipeline.ps1` 独占生产库写，二者物理隔离。可写连接层不暴露给 AI agent（黑名单 7 个不含可写方法，AI 仅经 `declare_risk` 等白名单工具间接触发写入，由用户会话授权）。

### 4.3 配置/路径层（v0.01 继承）

- riskbench-shared config（ConfigManager 类，集中读 .env，P3 修正：实查 v0.01 config.py 为类非 frozen dataclass）
- riskbench-shared paths（DATA_ROOT 推导 + _guard 路径穿透防护）
- v0.02 新增 Electron 配置层（业务数据根 config/models.json）

---

## §5 Layer 1：数据与引擎层（v0.01 继承）

### 5.1 五组件 + 主仓编排（共 290 passed）

| 组件 | 路径 | 测试数 | 角色 |
|---|---|:--:|---|
| malf-engine | `Z:\ai-malf-riskbench-components\malf-engine` | 115 | 五层领域模块（Core/Range/Lifespan/Structural Position/Service） |
| malf-data | `Z:\ai-malf-riskbench-components\malf-data` | 46 | TDX 接入 + DuckDB 持久化 + 三周期聚合 |
| riskbench-shared | `Z:\ai-malf-riskbench-components\riskbench-shared` | 10 | 集中配置 + 路径推导 |
| malf-signal | `Z:\ai-malf-riskbench-components\malf-signal` | 37 | 方向 C 四事件码事件流 |
| malf-backtest | `Z:\ai-malf-riskbench-components\malf-backtest` | 31 | T4 确定性规则验证 |
| 主仓编排 | `Z:\ai-malf-riskbench\scripts` | 51 | run_pipeline + 备份恢复 |
| **合计** | — | **290** | v0.02 须复验通过（04-Todo §6.0 / AGENTS.md §5.5） |

### 5.2 DuckDB 生产库（v0.01 继承）

- 路径：`Z:\ai-malf-riskbench-data\riskbench.duckdb`
- snapshots 表：44 显式列，PK(symbol, timeframe, bar_dt)，15397 行
- signals 表：10 列，PK signal_id，2835 事件
- usage 全 research_only / stale_research_only
- approved_as_of_date = 20260804

### 5.3 引擎内部持久化（MALF v2.1 Service §持久化）

```
var/
├── staging/       # 中间计算产物
├── published/     # 不可变快照（JSON Lines）
│   └── {symbol}/{timeframe}/{symbol}_{timeframe}_{bar_dt}.jsonl
└── current.json   # 原子指针
```

- var/ 可重建，state/ 不可重建（S6 铁律）
- 中断恢复：从 current.json 读最后快照 → 从其 bar_dt 之后重算（S-01）

### 5.4 数据源（只读）

| 数据源 | 路径 | 用途 |
|---|---|---|
| TDX 原始行情 | `Z:\new_tdx64\vipdoc\{sh,sz}\lday\*.day` | 原始行情裁决源 |
| 旧版 DuckDB | `Z:\riskbench-data-old\*.duckdb` | 交叉核验源 |
| Parquet 冷备 | `Z:\ai-malf-riskbench-data\*.parquet` | EXPORT DATABASE 产物 |

---

## §6 数据隔离三层（01-TRD §7 决策 3）

| 层 | 路径 | 用途 | 写权限 |
|---|---|---|---|
| pi 会话目录 | `~/.pi/agent/` | pi 自管（auth.json/models.json/settings.json） | pi 内核 |
| 业务数据根 | `Z:\ai-malf-riskbench-data\`（v0.01 继承） | DuckDB 生产库 + Parquet 备份 + 日志 | v0.01 run_pipeline.ps1（受 ops.md SOP 约束） |
| v0.02 运行时 | `Z:\pi-malf-riskbench-v0.02-runtime\` | Electron 运行日志 + 缓存 + 临时 | v0.02 主进程 |

**规则**：
- v0.02 不侵入 `~/.pi`
- v0.02 默认模型选型落业务数据根 `config/models.json` 带 `__riskbench_managed` 标记
- v0.02 运行时沙箱 `Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\` 不污染生产库

---

## §7 安全不变量六条（v0.02 新增，叠加 v0.01 S1-S38）

> 断言列与 `scripts/check-desktop-security.mjs` 可执行条件严格一致（P0-3/N-2 修复，对齐 01-TRD §5.5 + 04-Todo §5.2 + AGENTS.md §9.6 + 08-Test §5.8 四处统一）。

| 编号 | 不变量 | 断言（脚本可执行条件） | 实现位置 | task-id | 验证脚本 |
|---|---|---|---|---|---|
| INV-01 | renderer 沙箱 | `sandbox:true`（webPreferences） | Electron BrowserWindow 配置 | T-M0-006 | check-desktop-security.mjs |
| INV-02 | 严格 CSP | `default-src 'self'` + `script-src 'self'` | Electron session 配置 | T-M0-006 | check-desktop-security.mjs |
| INV-03 | preload 受控桥接 | 仅 `exposeInMainWorld('piBridge')`，不暴露 Node API | preload.ts contextBridge 白名单 | T-M0-002 | check-desktop-security.mjs |
| INV-04 | credential-vault safeStorage | `safeStorage` Windows DPAPI 加密 | credential-vault.ts | T-M0-007 | check-desktop-security.mjs |
| INV-05 | Host RPC 契约化 | `api.ts` 完整接口，22 RPC 方法（六路由组 malf/risk/ai/bench/viewer/system） | contract.ts + ipcMain 白名单 | T-M0-005 | check-desktop-security.mjs |
| INV-06 | HTML 预览独立 CSP | `form-action 'none'`（HTML_PREVIEW_CSP） | 预览窗口独立 session | T-M2-009 | check-desktop-security.mjs |

详见 [08-测试验收 §5.8](./08-测试验收-Test-Plan.md)。

---

## §8 装配纪律（五阶段 × 装配顺序）

### 8.1 五阶段（继承 pi-studybuddy + v0.01 装配.md）

```
1. 下载储存    →  H:\pi-references\* 或 node_modules / venv / Z:\ai-malf-riskbench-components\*
2. 单件测试    →  独立冒烟 + 合成夹具断言（vitest + pytest）
3. 集成测试    →  extension×pi 底座契约 + 钩子协作 + MALF Adapter 桥接验证
4. 系统组装    →  代码进入 src/ + 类型检查 + lint + contract AST 校验
5. 冒烟 + E2E  →  系统冒烟 + 受影响 E2E + 安全不变量六条 + 确定性验证
```

### 8.2 装配顺序三批（壳层 → 公用零件 → 业务模块）

| 批次 | 里程碑 | 组件 | 前置 | 铁律 |
|---|---|---|---|---|
| 1 壳层 | M0 | Electron main + preload + renderer + agent-host + contract + 安全沙箱 + credential-vault | 无 | **禁止壳层未就绪时开发业务模块** |
| 2 公用零件 | M0-M1 | MALF Python 引擎 Adapter + DuckDB 只读访问层 + pi 扩展空壳 + 配置层 | 壳层就绪 | Adapter 试炼场先行 |
| 3 业务模块 | M1-M3 | MALF 查询工具 + 风险声明 + AI 解读 + 回测报告 + 只读 Viewer | 公用零件就绪 | 五阶段不可跳越 |

### 8.3 MALF Adapter 试炼场

- 路径：`Z:\pi-malf-riskbench-v0.02-composer\`
- 用途：先调通 MALF Python 引擎 ↔ pi TS 扩展的 Adapter
- 规则：试炼场代码不得被主仓 import，主仓不复制试炼场样例，必须在主仓独立重新实现 Adapter
- 能力卡：每个 Adapter 须有 COMPONENT-CARD.md 记录能力与边界

详见 [11-组件装配](./11-组件装配-Component-Assembly.md)。

---

## §9 MALF v2.1 领域权威（不可改写）

### 9.1 五层架构（领域语义）

| 层 | 代号 | 角色 | 产出 |
|----|------|----------------|----------|
| Core | L1 | 唯一结构状态机 | CoreStateSnapshot |
| Range | L1b | 震荡区间一等公民 | RangeSnapshot |
| Lifespan | L1c | 双轨户口与排名 | WaveLifespan / RangeLifespan |
| Structural Position | L1d | 结构位置（原 Probability） | P1/P2/P3/P4 四视图 |
| Service | L2 | 对外接口与铁律 | WaveStructuralSnapshot（44 字段） |

### 9.2 不变量汇总

| 层 | 不变量编号 | 数量 |
|---|---|:--:|
| Core | T1-T9 定理 + O1-O8 操作边界 + 8 条不变量 | 25 |
| Range | R1-R6 | 6 |
| Lifespan | L1-L7 | 7 |
| Structural Position | P1-P6 | 6 |
| Service | S1-S6 铁律 | 6 |

### 9.3 v0.02 不可改写清单

- WaveStructuralSnapshot 44 字段契约
- CoreStateSnapshot 字段定义
- 整数价格策略（source_integer_fixed_point）
- 严格不等式（`<` `>`）
- lineage_hash SHA256 算法
- honest degradation 5 级退化
- usage 四档（operational 禁用）
- reason_codes 11 枚举
- rule_versions 完整性
- 中断恢复（S-01）
- 持久化目录结构（var/staging + var/published + current.json）

详见 [prep-参考点核对表 §四](./prep-参考点核对表.md)。

---

## §10 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：四层架构 + pi 扩展层 + MALF Adapter + 数据层 + 安全不变量六条 + 装配纪律 |
| v0.1.1 | 2026-08-09 | P0 审计修复：① §3.2 registerTool 工具集新增 `aiCallable` 列（14 工具全部 ✅，与 06-API §7.3 白名单一致，P0-8/P0-11）；② §3.3 pi.on 钩子新增 `before_tool_call`（AI 工具调用权限拦截，P0-8）；③ §3.1 扩展工厂代码补 `before_tool_call` 注册；④ §4.1 Adapter 方法表标注"共 6 个"并新增签名包装责任说明（P0-10）。审计洞集见 .record/ 实施记录。 |
| v0.1.2 | 2026-08-09 | 第三轮交叉审查修复：§7 安全不变量六条断言列+task-id 列对齐（N-2，与 AGENTS.md §9.6 + 01-TRD §5.5 + 08-Test §5.8 四处统一）；§4.2 写死三条读/写路径物理隔离（P2-3）；§3.2/§4.1 引用对齐。 |
| v0.1.3 | 2026-08-10 | 任务边界与容错审计 P0+P1 修复：§2.4 DPAPI 解密失败降级（P1-6）；§2.5 进程崩溃恢复策略（P1-4 Electron main + P1-5 agent-host utilityProcess）；§3.2 quantify_risk 工具登记（P0-B，白名单 14→15）；§4.1 子进程崩溃恢复 4 阶段表（P0-A）；§4.2.1 RISK 量化器边界（P0-B）；§4.2.2 可写连接层容错 6 维度（P1-2）；§7 INV-05 21→22 RPC 方法（P0-1，第四轮交叉审查）；§3.3 before_tool_call 白名单 14→15（P1-1，第四轮交叉审查）。 |

---

**文档维护**：架构变更时更新，重大变更需用户批准
**最后更新**：2026-08-10
