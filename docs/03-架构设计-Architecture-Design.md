# 03-架构设计-Architecture-Design

**版本**：v0.1.0
**日期**：2026-08-09
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
  pi.on("tool_call", toolCallHook);
  pi.on("tool_result", toolResultHook);
  pi.on("model_select", modelSelectHook);
}
```

### 3.2 registerTool 工具集

| 工具名 | 路由组 | 用途 | 优先级 |
|---|---|---|:--:|
| `query_snapshot` | malf.* | 查询 WaveStructuralSnapshot（44 字段） | P0 |
| `query_signals` | malf.* | 查询 signals 事件流（4 事件码） | P0 |
| `query_symbol_list` | malf.* | 查询可用标的列表 | P0 |
| `query_timeframes` | malf.* | 查询可用周期（day/week/month） | P0 |
| `explain_snapshot` | malf.* | 解释 snapshot 字段含义（引用 MALF v2.1） | P1 |
| `declare_risk` | risk.* | 创建/修改/删除风险声明 | P0 |
| `list_risk_declarations` | risk.* | 列出风险声明 | P0 |
| `check_risk_contradiction` | risk.* | 检测风险声明与市场事实的矛盾 | P1 |
| `ai_interpret_snapshot` | ai.* | AI 解读 snapshot（必须标注"AI 解读"） | P2 |
| `ai_interpret_backtest` | ai.* | AI 解读回测报告 | P2 |
| `ai_discover_rules` | ai.* | AI 辅助信号规则发现 | P2 |
| `run_backtest_report` | bench.* | 运行 T4 确定性规则验证 | P0 |
| `read_backtest_report` | bench.* | 读取回测报告 | P0 |
| `export_csv` | viewer.* | 导出 CSV（只读） | P1 |

### 3.3 pi.on 钩子

| 钩子 | 用途 |
|---|---|
| `before_agent_start` | 注入上下文（当前标的、周期、最新 snapshot 摘要） |
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

**Adapter 方法**（封装为 pi registerTool）：

| Adapter 方法 | 对应 v0.01 API | 用途 |
|---|---|---|
| `querySnapshot(symbol, timeframe, bar_dt)` | DuckDB SELECT | 查询单个 snapshot |
| `querySnapshotRange(symbol, timeframe, start_dt, end_dt)` | DuckDB SELECT | 查询 snapshot 范围 |
| `querySignals(symbol, timeframe, start_dt, end_dt)` | SignalStore.read_events | 查询事件流 |
| `runBacktestVerification(symbol, timeframe)` | run_full_verification | 运行 T4 验证 |
| `getSymbolList()` | DuckDB SELECT DISTINCT | 获取标的列表 |
| `getTimeframes(symbol)` | DuckDB SELECT DISTINCT | 获取周期列表 |

### 4.2 DuckDB 只读访问层

**职责**：v0.02 只读 Viewer 访问 DuckDB 生产库。

**约束**：
- 只读访问（SELECT），不修改 snapshots/signals 表（D28）
- 访问路径经 paths.py + _guard 防护（S16-S17）
- 连接池单例，崩溃不拖垮桌面
- 查询超时 30 秒

### 4.3 配置/路径层（v0.01 继承）

- riskbench-shared config（frozen dataclass，集中读 .env）
- riskbench-shared paths（DATA_ROOT 推导 + _guard 路径穿透防护）
- v0.02 新增 Electron 配置层（业务数据根 config/models.json）

---

## §5 Layer 1：数据与引擎层（v0.01 继承）

### 5.1 五组件（290 passed）

| 组件 | 路径 | 测试数 | 角色 |
|---|---|:--:|---|
| malf-engine | `Z:\ai-malf-riskbench-components\malf-engine` | 115 | 五层领域模块（Core/Range/Lifespan/Structural Position/Service） |
| malf-data | `Z:\ai-malf-riskbench-components\malf-data` | 46 | TDX 接入 + DuckDB 持久化 + 三周期聚合 |
| riskbench-shared | `Z:\ai-malf-riskbench-components\riskbench-shared` | 10 | 集中配置 + 路径推导 |
| malf-signal | `Z:\ai-malf-riskbench-components\malf-signal` | 37 | 方向 C 四事件码事件流 |
| malf-backtest | `Z:\ai-malf-riskbench-components\malf-backtest` | 31 | T4 确定性规则验证 |

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

| 编号 | 不变量 | 断言 | 实现位置 | 验证脚本 |
|---|---|---|---|---|
| INV-01 | renderer 沙箱 | `sandbox:true` | Electron BrowserWindow 配置 | check-desktop-security.mjs |
| INV-02 | 严格 CSP | script-src/connect-src 限制 | Electron session 配置 | check-desktop-security.mjs |
| INV-03 | preload 受控桥接 | 不暴露 Node API | preload.ts 白名单 | check-desktop-security.mjs |
| INV-04 | credential-vault safeStorage | 密钥 Windows DPAPI 加密 | credential-vault.ts | check-desktop-security.mjs |
| INV-05 | Host RPC 契约 | 所有跨进程通信走 contract | contract.ts + ipcMain 白名单 | check-desktop-security.mjs |
| INV-06 | HTML 预览独立 CSP | 回测报告/Markdown 渲染隔离 | 预览窗口独立 session | check-desktop-security.mjs |

详见 [08-测试验收 §5.7](./08-测试验收-Test-Plan.md)。

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

---

**文档维护**：架构变更时更新，重大变更需用户批准
**最后更新**：2026-08-09
