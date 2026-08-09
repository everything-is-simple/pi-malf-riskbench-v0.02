# 09-使用者介面-UI-Design

**版本**：v0.1.0
**日期**：2026-08-09
**状态**：📝 草案（待用户审查批准）
**上游**：[02-PRD](./02-PRD-产品需求-Product-Requirements.md)、[03-架构设计](./03-架构设计-Architecture-Design.md)、[06-API](./06-API契约-API-Contracts.md)、[07-工作流](./07-工作流-Workflow.md)、[08-测试验收](./08-测试验收-Test-Plan.md)
**下游**：[04-任务清单](./04-任务清单-Todo-List.md)
**架构依据**：pi-desktop 五件骨架（main + preload + renderer + agent-host + contract）
**用途**：v0.02 三栏布局 + 市场事实 Tab + 风险声明 Tab + AI 对话 Tab + 只读 Viewer SoT

---

## §1 概述

### 1.1 设计目标

v0.02 UI 是构建在 pi-desktop 五件骨架（main + preload + renderer + agent-host + contract）之上的**只读风险工作台**介面。它不替代 MALF 引擎的确定性计算，也不接管用户的风险决策，而是把三层权威（市场事实 / 用户声明 / AI 解读）分层、透明、可追溯地呈现给单一用户。

| 目标 | 说明 |
|---|---|
| 只读 Viewer 承载 | 以 React + TypeScript 三栏布局承载 BENC-06 改造后的 Electron 只读 Viewer（02-PRD §2.4） |
| 三层权威可视化 | 第一层市场事实、第二层用户声明、第三层 AI 解读在介面上分层可见，互不掩盖 |
| 确定性可见 | lineage_hash / rule_versions / usage / freshness 在介面上显式展示，不藏在黑盒 |
| honest degradation | None 字段标灰 + reason_codes 旁注，不补零不估计不掩盖（MALF v2.1 Service §8） |
| 防泄露边界 | runtime_fingerprint 永不展示（D5），密钥不明文（INV-04），路径/堆栈不外露（S9） |
| AI 承载 | pi 原生 AI（pi-ai provider 体系 + registerTool 工具）经 💬 AI 对话 Tab 承载，不另造聊天框 |
| 桌面优先 | 仅适配桌面浏览器宽度，不做 mobile 适配（02-PRD §4.2） |

### 1.2 设计原则七条铁律

| # | 铁律 | 介面体现 | 出处 |
|---|---|---|---|
| 1 | **只读优先** | Viewer 仅 SELECT，不修改生产库 snapshots/signals 表 | D28 / DECISION-v02-005 |
| 2 | **三层权威可视化** | 市场事实 Tab / 风险声明 Tab / AI 对话 Tab 分层展示，AI 解读不凌驾前两层 | 02-PRD §1.3 |
| 3 | **AI 解读必须标注** | 每条 AI 回复标"AI 解读"标识，颜色与字号与确定性数据区分 | AI-05 |
| 4 | **honest degradation 诚实展示** | None 字段标灰显示，reason_codes 旁注（如 `peer_sample_insufficient`），不掩盖 | MALF v2.1 Service §8 |
| 5 | **确定性可见** | lineage_hash（SHA256 64 字符）+ rule_versions + usage + freshness 在右侧上下文面板与字段区展示 | D4 / D9 / S4 |
| 6 | **防泄露** | runtime_fingerprint 不展示（D5），密钥不明文（INV-04），错误返回固定安全编码（S9） | 01-TRD D5/S9 |
| 7 | **响应式（桌面优先）** | 最小宽度 1280px，不做 mobile 适配 | 02-PRD §4.2 |

### 1.3 技术栈（React 18 + TypeScript + Electron）

| 层 | 技术 | 角色 | 出处 |
|---|---|---|---|
| renderer | React 18 + TypeScript | 三栏布局 + Tabs + 状态管理 | 03-Architecture §2.1 |
| 主进程 | Electron main | 窗口管理 + 原生能力 + MALF 子进程托管 | 03-Architecture §2.1 |
| 桥接 | Electron preload（contextBridge） | 受控白名单 API，不暴露 Node | INV-03 |
| AI 底座 | pi-coding-agent（agent-host utilityProcess） | createAgentSession + 扩展加载 + pi-ai provider | 03-Architecture §2.1 |
| 契约 | contract/{api,rpc}.ts | MessagePort RPC + 统一信封 | 06-API §1.1 |
| 样式 | CSS Modules / Tailwind（实现时定） | 桌面优先栅格 | — |
| 图表 | 轻量图表库（战役 2 选型） | 净值/回撤/信号标注 | 02-PRD §2.4 BENC-06 |

> 技术栈以 01-TRD §7 决策与 03-Architecture §2 为准；本文件仅锁定 UI 层的渲染技术与组件装配落点，不重复技术选型论证。

---

## §2 整体布局

### 2.1 三栏结构（左侧导航 + 主内容区 + 右侧上下文面板 + 状态栏）

v0.02 采用三栏 + 状态栏的桌面布局，参考 pi-studybuddy §2.1 三栏范式，落点为本项目的"标的导航 + Tabs + 上下文摘要"。

```
┌─────────────┬──────────────────────────────┬─────────────┐
│  左侧导航    │       主内容区（Tabs）        │  右侧上下文  │
│             │                              │             │
│  标的列表    │  💬AI对话 📊市场事实 ⚠️风险声明 │  当前标的    │
│  sh510050   │  📋回测报告 📈图表 ⚙️设置      │  当前周期    │
│  sh510300   │                              │  最新快照    │
│  sz159915   │  ┌──────────────────────────┐│  摘要        │
│             │  │                          ││             │
│  周期选择    │  │    Tab 内容区             ││  lineage    │
│  ○ day      │  │                          ││  rule_ver   │
│  ○ week     │  │                          ││  usage      │
│  ○ month     │  └──────────────────────────┘│  freshness  │
│             │                              │             │
│  时间范围    │  ┌──────────────────────────┐│             │
│  start:     │  │  输入区 / 操作区          ││             │
│  end:       │  └──────────────────────────┘│             │
├─────────────┴──────────────────────────────┴─────────────┤
│  状态栏：连接状态 | 数据新鲜度 | usage 分级 | 模型         │
└──────────────────────────────────────────────────────────┘
```

| 区域 | 宽度建议 | 职责 | 数据来源 |
|---|---|---|---|
| 左侧导航 | 240px | 标的列表 + 周期选择 + 时间范围 | `query_symbol_list` / `query_timeframes` |
| 主内容区 | 弹性（≥800px） | 6 个 Tab 内容 + 输入/操作区 | 各 Tab 对应 RPC（见 §4） |
| 右侧上下文 | 280px | 当前标的摘要 + 确定性指标 | `query_snapshot` 最新行 |
| 状态栏 | 全宽（28px） | 连接状态 / 数据新鲜度 / usage / 模型 | Streams + `models_config_get` |

**最小窗口**：1280×800；低于此宽度触发横向滚动，不触发 mobile 重排。

### 2.2 组件映射（pi-desktop 组件 → v0.02 落点）

参考 pi-studybuddy §2.2 组件映射范式，v0.02 把 pi-desktop 既有组件映射到本项目落点：

| 区域 | pi-desktop 组件 | v0.02 落点 | 说明 |
|---|---|---|---|
| 左侧导航 | SessionSidebar | 标的列表 + 周期选择 + 时间范围 | 把"会话列表"语义改为"标的导航" |
| 主内容区 | MarkdownBody | Tab 内容区（市场事实/风险声明/回测报告等） | 承载结构化字段 + Markdown 渲染 |
| 输入区 | ChatInput | AI 对话输入 + 风险声明编辑 + @文件引用 | 多 Tab 复用输入语义 |
| 文件浏览 | FileExplorer | CSV 导出列表 / HTML 报告预览 | 只读文件列表，不提供删除 |
| 应用壳 | AppShell | Electron BrowserWindow | 单窗口，sandbox:true |
| 上下文面板 | ContextPanel（pi-desktop 范式） | 右侧 lineage/rule_versions/usage/freshness | 确定性指标常驻 |
| 状态栏 | StatusBar（pi-desktop 范式） | 连接状态/数据新鲜度/usage/模型 | Streams 推送驱动 |

### 2.3 省略的 pi-desktop 组件

v0.02 单机只读场景下，下列 pi-desktop 组件**明确省略**，不进入实现：

| 组件 | 处置 | 理由 |
|---|---|---|
| Terminal | 省略 | v0.02 不需要终端模拟器；命令行需求由 MALF 子进程 + 编排脚本承担 |
| Multi-window | 省略 | 单窗口足够承载三栏 + Tabs；多窗口增加状态同步复杂度 |
| Workspace switcher | 省略 | 单一业务数据根（`Z:\ai-malf-riskbench-data\`），无多工作区切换需求 |
| Diff Viewer | 省略 | v0.02 不做代码 diff；回测报告对比走 HTML 预览 |
| Settings Center（可写） | 省略（改为只读面板） | 02-PRD §4.2 明确"不做可写设置中心"；配置走 ⚙️ 设置 Tab 的受控表单 |

---

## §3 左侧栏：标的导航

### 3.1 标的列表

标的列表来自 `query_symbol_list`（malf.* 只读路由），当前固定 3 标的（v0.01 生产库基线，05-ERD §1.4）：

| 标的 | 代码 | 市场 | 说明 |
|---|---|---|---|
| 上证 50ETF | sh510050 | sh | 主标的 |
| 沪深 300ETF | sh510300 | sh | 主标的 |
| 创业板 ETF | sz159915 | sz | 主标的 |

**交互**：
- 单击切换"当前标的"，触发右侧上下文面板刷新最新 snapshot 摘要
- 选中态高亮，未选中态灰显
- 列表项展示：代码 + 简称 + 最新 bar_dt（来自 `query_snapshot_range` 末行）

### 3.2 周期选择

周期来自 `query_timeframes`（返回 `['day','week','month']` 子集），单选：

```
周期选择
○ day     日线
○ week    周线
○ month   月线
```

**约束**：
- 切换周期触发右侧上下文面板 + 主内容区 Tab 数据刷新
- 周期与标的组合必须命中 snapshots 表 PK(symbol, timeframe, bar_dt)（05-ERD §2.1）

### 3.3 时间范围选择

时间范围用于限定查询区间（`query_snapshot_range` / `query_signals` 的 start_dt/end_dt）：

```
时间范围
start: [2024-01-01 ▼]
end:   [2026-08-04 ▼]
```

**约束**：
- start ≤ end，违反则 `VALIDATION_ERROR`（06-API §2.2）
- 默认 end = approved_as_of_date（20260804，05-ERD §1.4）
- 范围内 snapshot 上限 1000 条（06-API §3.1），超出提示用户收窄范围
- 日期选择器仅展示生产库实际存在的 bar_dt 范围

---

## §4 标签页结构

### 4.1 总览（6 个 Tab）

主内容区顶部为 Tab 栏，共 6 个 Tab，按角色与触发条件排列：

| Tab | 角色 | 触发条件 | 主要 RPC | 默认 |
|---|---|---|---|:--:|
| 💬 AI 对话 | pi 原生 AI 承载 | 启动默认 | `ai_interpret_*` / 所有工具 | ✅ 默认 |
| 📊 市场事实 | WaveStructuralSnapshot + signals 展示 | 选标的 | `query_snapshot` / `query_signals` | |
| ⚠️ 风险声明 | 用户声明 + AI 矛盾提醒 | 选标的 | `declare_risk` / `list_risk_declarations` / `check_risk_contradiction` | |
| 📋 回测报告 | T4 验证报告 + HTML 预览 | 用户触发 | `run_backtest_report` / `read_backtest_report` | |
| 📈 图表 | 净值/回撤/信号标注 | 战役 2 | —（数据来自 `query_snapshot_range`） | |
| ⚙️ 设置 | 模型/凭据/路径配置 | 用户触发 | `models_config_get/set` / `credentials_get/set` | |

**Tab 通用规则**：
- 切换 Tab 不卸载已加载数据（keep-alive），避免重复 RPC
- 每个 Tab 顶部展示当前标的 + 周期 + 时间范围面包屑
- 加载中展示骨架屏；错误展示安全编码中文消息（06-API §2.2）

### 4.2 💬 AI 对话 Tab（默认，pi 原生 AI 承载）

启动默认 Tab，承载 pi 原生 AI（pi-coding-agent + pi-ai provider）。详见 §5。

### 4.3 📊 市场事实 Tab（WaveStructuralSnapshot 44 字段 + signals 事件流）

展示第一层市场事实权威，确定性数据，不可改写。详见 §6。

### 4.4 ⚠️ 风险声明 Tab（用户声明 + AI 矛盾提醒）

展示第二层用户声明权威，用户主权，AI 不可修改 user_text。详见 §7。

### 4.5 📋 回测报告 Tab（T4 验证报告 + HTML 预览）

展示 T4 确定性规则验证报告，独立 CSP 预览 HTML。详见 §8。

### 4.6 📈 图表 Tab（净值曲线/回撤曲线/信号标注，战役 2）

战役 2 交付，基于 `query_snapshot_range` 数据绘制：

| 图表 | 数据源 | 用途 |
|---|---|---|
| 净值曲线 | snapshot 价格字段序列 | 展示标的走势 |
| 回撤曲线 | 净值峰值回撤计算 | 展示回撤区间 |
| 信号标注 | signals 事件流 | 在曲线上标注 4 事件码触发点 |

> 图表库选型在战役 2 启动时定案；当前仅锁定数据来源与展示目标。

### 4.7 ⚙️ 设置 Tab（模型配置/凭据管理/路径配置）

需用户授权（system.* 路由需授权，06-API §7.2）。详见 §9。

---

## §5 AI 对话 Tab 详解

💬 AI 对话 Tab 是 pi 原生 AI 的承载介面，复用 pi-coding-agent 的 agent session + pi-ai provider 体系，不另造聊天框。

### 5.1 流式回复

- 订阅 `ai.interpretation.streaming` 流（06-API §5.4），token 增量渲染
- `done=true` 时整条回复必须已标注"AI 解读"（AI-05）
- 流式期间展示打字机光标；失败展示安全编码 + 重试按钮
- payload 经脱敏，不含 apiKey / 完整 UUID / 文件路径 / 堆栈（S7/S8/S9）

### 5.2 工具调用视图（registerTool 工具自主调用）

AI 在对话中可自主调用 registerTool 工具（03-Architecture §3.2），介面展示工具调用过程：

```
┌─ AI 调用工具 ──────────────────────────────┐
│ 🔧 query_snapshot(symbol=sh510050,         │
│       timeframe=day, bar_dt=2026-08-04)     │
│   → lineage_hash: a3f1...（截断展示）       │
│   → usage: research_only                    │
│ ⏱ latencyMs: 230                           │
└─────────────────────────────────────────────┘
```

- 工具名 + 脱敏参数展示（不含 apiKey / 完整路径）
- `usage` 字段展示 provider 名 + token 数，**不展示 apiKey**（06-API §2.1）
- 失败展示错误码 + 中文消息，不展示堆栈（S9）
- `terminate=true` 时标注"本轮终止"

### 5.3 上下文压缩

- 长对话自动压缩，压缩点标注"上下文已压缩"
- 压缩前后内容可展开对比
- 压缩不丢弃 lineage_hash / rule_versions 等确定性引用

### 5.4 @文件引用

- 输入框支持 `@` 触发文件引用下拉
- 可引用：snapshot（按 bar_dt）/ 回测报告（按 report_id）/ 风险声明（按 declaration_id）
- 引用插入为 chip 标签，AI 可见引用上下文

### 5.5 多模型切换（pi provider 体系）

- 顶部模型选择器，来自 `models_config_get`（system.* 路由）
- 切换触发 `model_select` 钩子持久化到 `<dataRoot>/config/models.json`（带 `__riskbench_managed` 标记，03-Architecture §3.3）
- 国内供应商（ZAI/Qwen/Xiaomi）覆盖研究场景合规与成本（03-Architecture §3.4）
- 切换不影响已生成回复的历史记录

### 5.6 AI 解读标注（每条 AI 回复标"AI 解读"）

| 标注元素 | 样式 | 约束 |
|---|---|---|
| 徽章 | "🤖 AI 解读" 标签，黄色背景 | 每条 AI 回复必备（AI-05） |
| 字号 | 与确定性数据同级 | 不削弱可见性 |
| 颜色 | 黄色系（区别于市场事实的蓝色/用户声明的绿色） | 视觉区分三层权威 |
| 免责声明 | "本解读由 AI 生成，不凌驾市场事实与用户声明" | 折叠展示于回复末尾 |

**介面铁律**：AI 回复不可折叠隐藏"AI 解读"徽章；用户不可移除该标注。

---

## §6 市场事实 Tab 详解

📊 市场事实 Tab 展示第一层权威：WaveStructuralSnapshot 44 字段 + signals 事件流。确定性数据，不可改写（02-PRD §1.3）。

### 6.1 WaveStructuralSnapshot 44 字段展示（按层分组）

字段契约来自 05-ERD §3 + MALF v2.1 Service §2。介面按 7 组分层展示，每组可折叠：

#### 6.1.1 身份（4 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 1 | symbol | str | 文本（如 sh510050） |
| 2 | timeframe | str | 文本（day/week/month） |
| 3 | bar_dt | str | ISO 日期 |
| 4 | bar_index | int | 整数 |

#### 6.1.2 Core（10 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 5 | system_state | str | 状态徽章（uninitialized/transition_active/wave_alive 等） |
| 6 | direction | str | 方向箭头（up ↑ / down ↓） |
| 7 | active_wave_id | str | 文本（永不复用，L6） |
| 8 | progress_extreme_price | int | 整数价格 `/1000` 展示（D2/D21） |
| 9 | progress_extreme_bar_dt | str | ISO 日期 |
| 10 | guard_price | int | 整数价格 `/1000` 展示；严格 `<` 判定（D3） |
| 11 | guard_bar_dt | str | ISO 日期 |
| 12 | bar_count | int | 整数 |
| 13 | break_bar_dt | str | ISO 日期 |
| 14 | break_price | int | 整数价格 `/1000` 展示 |

#### 6.1.3 Transition/Range（9 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 15 | transition_boundary_high | int | 整数价格 `/1000`；初始化后不可变（R1） |
| 16 | transition_boundary_low | int | 同上 |
| 17 | candidate_pivot_type | str | 文本 |
| 18 | candidate_pivot_price | int | 整数价格 `/1000` |
| 19 | range_boundary_high_now | int | 整数价格 `/1000`；可演化（R2） |
| 20 | range_boundary_low_now | int | 同上 |
| 21 | range_evolution_count | int | 整数 |
| 22 | range_candidate_replacement_count | int | 整数 |
| 23 | range_type | str | 文本 |

#### 6.1.4 Lifespan Wave（3 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 24 | wave_span_rank | float | 排名条（0.0-1.0） |
| 25 | wave_range_rank | float | 排名条 |
| 26 | wave_stagnation_rank | float | 排名条 |

#### 6.1.5 Lifespan Range（4 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 27 | range_span_rank | float | 排名条 |
| 28 | range_evolution_rank | float | 排名条 |
| 29 | range_replacement_rank | float | 排名条 |
| 30 | range_resolution_distance_rank | float | 排名条 |

#### 6.1.6 Structural Position（9 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 31 | p2_same_dir_span_momentum | float | 向量差（非概率），正负色 |
| 32 | p2_same_dir_range_momentum | float | 同上 |
| 33 | p2_same_dir_label | str | 辅助标签 |
| 34 | p3_cross_dir_span_momentum | float | 向量差 |
| 35 | p3_cross_dir_range_momentum | float | 同上 |
| 36 | p3_cross_dir_label | str | 标签 |
| 37 | p4_cross_span_momentum | float | 向量差 |
| 38 | p4_cross_range_momentum | float | 同上 |
| 39 | p4_cross_alive_warning | bool | 真实布尔（非 fallback），警告红 |

#### 6.1.7 元数据（5 字段）

| # | 字段 | 类型 | 展示 |
|---|---|---|---|
| 40 | rule_versions | JSON | 展开树（pivot_rule/price_domain/adapter/core_version 等，05-ERD §3.8） |
| 41 | lineage_hash | str | SHA256 64 字符 hex，截断展示 + 复制按钮 |
| 42 | reason_codes | JSON | 失败模式枚举标签（见 §6.3） |
| 43 | usage | str | 用途分级色标（见 §6.3） |
| 44 | freshness | str | 新鲜度色标（见 §6.3） |

> **防泄露**：`runtime_fingerprint` 不在 44 字段内，介面永不展示（D5，06-API §6.2）。

### 6.2 signals 事件流展示（4 事件码）

signals 来自 `query_signals`（malf.* 只读），4 事件码（05-ERD §2.2）：

| 事件码 | 含义 | 介面图标 | 颜色 |
|---|---|---|---|
| `wave_terminated` | 波段终止（break 触发） | ⛔ | 红 |
| `range_resolved` | 震荡区间解决 | ✅ | 绿 |
| `guard_triggered` | 守卫价触发 | 🛡 | 黄 |
| `break_triggered` | 突破价触发 | ⚡ | 橙 |

**展示形式**：
- 时间线视图（按 event_dt 升序）
- 每条事件展示：事件码图标 + event_dt + bar_dt + direction + reason_codes
- `rule_version` 固定 `malf-signal-event-v1`，展示于事件详情
- `lineage_hash` 与 snapshot 可交叉校验，展示"✓ 校验通过"标记

### 6.3 honest degradation 展示（None 字段标灰 + reason_codes 展示）

honest degradation 是 v0.02 介面铁律（§1.2 铁律 4），None 字段不补零不估计不掩盖：

| 元素 | 展示规则 | 示例 |
|---|---|---|
| None 字段 | 标灰显示文字"None" | `guard_price: None`（灰色） |
| reason_codes | 旁注于 None 字段右侧，标签样式 | `None` `peer_sample_insufficient` |
| 整数价格 | 展示层 `/1000` 转换，标注"整数价格策略" | `progress_extreme_price: 1234.000（整数 /1000）` |

**reason_codes 11 枚举展示**（05-ERD §3.9）：

| 枚举值 | 含义 | 标签颜色 |
|---|---|---|
| `uninitialized` | 引擎未初始化 | 灰 |
| `transition_active` | 转换态激活 | 蓝 |
| `wave_alive` | 波段存活中 | 绿 |
| `input_integrity_failure` | 输入完整性失败 | 红 |
| `data_stale` | 数据陈旧 | 黄 |
| `peer_sample_insufficient` | peer 样本不足（N<30，L4） | 黄 |
| `same_dir_peers_absent` | 同向 peers 缺失 | 黄 |
| `cross_dir_peers_absent` | 反向 peers 缺失 | 黄 |
| `no_prior_wave` | 无前序波段 | 灰 |
| `range_alive` | 区间存活中 | 绿 |
| `operational_disabled` | operational 用途禁用（v0.1 硬编码） | 红禁用 |

**usage 分级色标**：

| usage | 颜色 | 说明 |
|---|---|---|
| `rejected` | 红 | 输入完整性失败，整只标的拒绝 |
| `research_only` | 黄 | 历史数据模拟、研究验证（当前数据固定档） |
| `stale_research_only` | 黄 | 数据陈旧的研究用途 |
| `verification_only` | 绿 | 确定性规则验证用途（T4） |
| `operational` | 灰禁用 | v0.1 硬编码禁用，需未来独立审批 |

**freshness 色标**：

| freshness | 颜色 |
|---|---|
| `current` | 绿 |
| `stale_research_only` | 黄 |

### 6.4 确定性展示（lineage_hash + rule_versions + usage + freshness）

确定性指标在右侧上下文面板常驻，并在本 Tab 字段区完整展示：

| 指标 | 展示位置 | 形式 |
|---|---|---|
| lineage_hash | 右侧面板 + 元数据组 | SHA256 64 字符 hex，截断 + 复制 + 全文 tooltip |
| rule_versions | 右侧面板 + 元数据组 | 展开树（7 键，05-ERD §3.8），完整性必填（S4） |
| usage | 右侧面板 + 状态栏 + 元数据组 | 色标徽章（见 §6.3） |
| freshness | 右侧面板 + 元数据组 | 色标徽章 |

**铁律**：lineage_hash 与 rule_versions 缺失则禁止发布（MALF v2.1 Service S4）；介面遇到缺失时展示红色警告并阻断展示，不静默吞过。

---

## §7 风险声明 Tab 详解

⚠️ 风险声明 Tab 展示第二层权威：用户声明 + AI 矛盾提醒。用户主权，AI 不可修改 user_text（02-PRD §6.3）。

### 7.1 声明列表

来自 `list_risk_declarations`（risk.* 路由），按 created_at 降序：

| 列 | 字段 | 展示 |
|---|---|---|
| 声明 ID | declaration_id | 截断 + 复制 |
| 标的 | symbol | 文本 |
| 周期 | timeframe | 文本 |
| bar 时间 | bar_dt | ISO 日期 |
| 声明文本 | user_text | 截断预览 + 展开全文 |
| 关联字段 | linked_snapshot_fields | chip 标签（如 rank/label） |
| 创建时间 | created_at | ISO 8601 |
| AI 解读 | ai_interpretation | 若有则标注"AI 解读"徽章（见 §7.4） |
| 操作 | — | 编辑 / 删除（用户主权） |

### 7.2 创建/编辑声明（用户主权，AI 不可修改 user_text）

创建走 `declare_risk`，编辑走 `update_risk_declaration`（仅修改 user_text）：

```
┌─ 创建风险声明 ──────────────────────────────┐
│ 标的:    [sh510050 ▼]                       │
│ 周期:    [day ▼]                            │
│ bar 时间: [2026-08-04 ▼]                    │
│ 关联字段: [wave_span_rank] [p2_same_dir_label] │
│ 声明文本:                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ 用户手写或模板辅助的声明文本...         │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                          [取消] [保存声明]   │
└─────────────────────────────────────────────┘
```

**用户主权铁律**：
- user_text 仅用户可编辑；AI 不可调用 `update_risk_declaration` 修改 user_text（S33）
- 删除走 `delete_risk_declaration`（软删除，留审计痕迹，06-API §3.2）
- `/declare-risk` 模板脚手架辅助用户起草（03-Architecture §3.6）

### 7.3 AI 矛盾提醒（check_risk_contradiction，只提醒不修改）

`check_risk_contradiction` 检测风险声明与市场事实的矛盾，AI 只提醒不修改：

| 矛盾类型 | 展示 |
|---|---|
| 声明方向与 snapshot direction 不一致 | 黄色提醒卡片 |
| 声明 rank 阈值与实际 rank 矛盾 | 黄色提醒卡片 |
| 声明关联字段已失效（snapshot 已更新） | 灰色提醒卡片 |

**展示规则**：
- 提醒卡片标"⚠️ AI 矛盾提醒"，不自动改写 user_text
- 用户可选择"采纳提醒"（手动编辑）或"忽略"
- 采纳后用户手动修改 user_text，AI 退出编辑权

### 7.4 AI 解读（ai_interpret_snapshot，标注"AI 解读"）

风险声明的 `ai_interpretation` 字段承载 AI 对声明的解读（第三层权威）：

| 元素 | 样式 | 约束 |
|---|---|---|
| 徽章 | "🤖 AI 解读" | ai_interpretation 非空时必备 |
| 标注字段 | ai_interpretation_marked=true | 必须 TRUE（AI-05） |
| 内容 | 自然语言解读 | 不凌驾第一层市场事实 + 第二层用户声明 |
| 免责 | "本解读由 AI 生成，仅供参考" | 折叠展示 |

**校验铁律**：`ai_interpretation_marked=false` 但 `ai_interpretation` 非空 → `VALIDATION_ERROR`（06-API §6.4）。

---

## §8 回测报告 Tab 详解

📋 回测报告 Tab 展示 T4 确定性规则验证报告，封装 v0.01 malf-backtest（31 passed）。

### 8.1 运行 T4 验证（run_backtest_report）

`run_backtest_report` 触发 T4 验证，返回 report_id 供轮询/读取（06-API §3.4）：

```
┌─ 运行 T4 验证 ─────────────────────────────┐
│ 标的:   [sh510050 ▼]                       │
│ 周期:   [day ▼]                            │
│                          [取消] [运行验证]  │
└─────────────────────────────────────────────┘
```

- 进度订阅 `backtest.progress` 流（06-API §5.3），phase 展示：started → verify_sequence → crosscheck → audit → completed
- 进度条 0-100，完成后调用 `read_backtest_report` 拉取完整报告
- 失败展示 `MALF_ENGINE_ERROR` / `DUCKDB_ERROR` 安全编码

### 8.2 读取报告（read_backtest_report）

`read_backtest_report` 返回 `BacktestReportDTO`（06-API §6.5）：

| 字段 | 展示 |
|---|---|
| report_id | 截断 + 复制 |
| symbol / timeframe | 文本 |
| generated_at | ISO 8601 |
| status | 状态徽章（running/completed/failed） |
| verify_sequence_result | 触发序列验证详情（展开树） |
| crosscheck_result | SQL 交叉验证详情 |
| audit_result | 规则版本审计详情 |
| robustness_result | 参数鲁棒性详情 |
| lineage_hash | SHA256 截断 + 复制 |
| rule_versions | 展开树 |

**边界铁律**：不输出收益类指标（胜率/综合分/买卖建议/仓位/PnL，D19 战役 1 边界，06-API §6.5）。

### 8.3 HTML 预览（独立 CSP，INV-06）

回测报告的 HTML 预览在**独立 session** 中渲染，应用独立 CSP（INV-06）：

- 预览窗口与主窗口 session 隔离
- CSP 限制 `script-src 'self'`，禁止外部脚本
- 预览内容来自报告 Markdown 渲染，不含外部资源
- 预览窗口不可访问主窗口的 contextBridge（物理隔离）

### 8.4 确定性验证结果展示（触发序列逐字节一致）

T4 验证的核心断言是"两次运行报告逐字节一致"（D24，05-ERD §9.3）：

| 展示项 | 形式 |
|---|---|
| 触发序列 | 时间线 + 逐事件 lineage_hash 对比 |
| 两次运行对比 | diff 视图（仅展示 hash 一致性，不做代码 diff） |
| 规则版本审计 | rule_versions 完整性 + 与 snapshot rule_versions 交叉校验 |
| 参数鲁棒性 | 鲁棒性测试结果摘要 |
| 结论徽章 | ✅ 逐字节一致 / ❌ 不一致（阻断展示） |

---

## §9 设置 Tab 详解

⚙️ 设置 Tab 承载模型配置 / 凭据管理 / 路径配置，需用户授权（system.* 路由，06-API §7.2）。

### 9.1 模型配置（models_config_get/set，落业务数据根 config/models.json 带 __riskbench_managed 标记）

`models_config_get` / `models_config_set` 读写 `<dataRoot>/config/models.json`（06-API §3.6）：

| 配置项 | 展示 | 约束 |
|---|---|---|
| default_provider | 下拉选择 | 来自 pi-ai 内置 provider 工厂（03-Architecture §3.4） |
| default_model | 下拉选择 | 依赖 provider |
| providers | 展开表 | endpoint / thinking_level 等 |
| __riskbench_managed | 只读标记 | true（05-ERD §5.3） |
| updated_at | 只读 | ISO 8601 |

**铁律**：
- 不读 `~/.pi/agent/models.json`（物理隔离，TRD §7 决策 3）
- 写入带 `__riskbench_managed: true` 标记，pi 内核不直接覆盖
- model_select 钩子触发写入（03-Architecture §3.3）

### 9.2 凭据管理（credentials_get/set，credential-vault safeStorage）

`credentials_get` / `credentials_set` 经 credential-vault safeStorage（Windows DPAPI 加密，INV-04）：

| 操作 | 展示 | 约束 |
|---|---|---|
| 查询凭据 | `credentials_get` 仅返回 `{has: bool}`，**不回传明文** | 06-API §3.6 |
| 设置凭据 | `credentials_set` 写入 DPAPI 加密存储 | 明文不入日志（S7/S8） |
| 键名校验 | 正则 `^(modelProvider\|riskbench):[a-z0-9._-]{1,160}$` | 03-Architecture §2.4 |

**介面铁律**：
- 凭据输入框 type=password，明文不展示
- 凭据状态展示"已设置 / 未设置"，不展示明文
- AI 不可调用 `system.*`（凭据管理对 AI 不可见，06-API §7.2）

### 9.3 路径配置（DATA_ROOT / TDX_ROOT / runtime 路径）

路径配置展示 v0.02 三层数据隔离（03-Architecture §6），**只读展示**，不可写：

| 路径 | 用途 | 可写 |
|---|---|:--:|
| `Z:\ai-malf-riskbench-data\` | 业务数据根（DuckDB + Parquet + 日志） | v0.01 run_pipeline.ps1 |
| `Z:\new_tdx64\vipdoc\` | TDX 原始行情（只读） | ❌ 只读 |
| `Z:\pi-malf-riskbench-v0.02-runtime\` | v0.02 运行时沙箱 | v0.02 主进程 |
| `~/.pi/agent/` | pi 会话目录 | pi 内核 |

**铁律**：路径配置仅展示，不接受用户输入修改（02-PRD §4.2 "不做可写设置中心"）。

---

## §10 文件体验 UI

### 10.1 CSV 导出（export_csv）

`export_csv`（viewer.* 只读路由）导出 snapshot 范围为 CSV：

```
┌─ 导出 CSV ─────────────────────────────────┐
│ 标的:   [sh510050 ▼]                       │
│ 周期:   [day ▼]                            │
│ start:  [2024-01-01]                        │
│ end:    [2026-08-04]                        │
│                          [取消] [导出 CSV]  │
└─────────────────────────────────────────────┘
```

- 仅 SELECT，不修改写入路径（D28 / DECISION-v02-005）
- 路径守卫防 `../` 逃逸（S16，06-API §3.5）
- 导出后展示 csv_path，提供"打开所在文件夹"按钮（不暴露完整路径明文于日志）

### 10.2 HTML 报告预览

回测报告 HTML 预览见 §8.3，独立 CSP 隔离。

### 10.3 Markdown 渲染

- AI 解读、风险声明、回测报告摘要支持 Markdown 渲染
- 渲染走主窗口 CSP（`script-src 'self'`），不允许内联脚本
- 渲染前二次脱敏（UUID 正则过滤，06-API §5 通用脱敏铁律）

---

## §11 技能/模型管理 UI

技能系统（pi-skills 范式，03-Architecture §3.5）在介面上的体现：

| 技能 | 介面入口 | 用途 |
|---|---|---|
| `malf-snapshot-explain` | 📊 市场事实 Tab "解释字段"按钮 | 解释 snapshot 字段含义（引用 MALF v2.1） |
| `risk-declare` | ⚠️ 风险声明 Tab "模板辅助"按钮 | 辅助用户创建风险声明 |
| `backtest-report-read` | 📋 回测报告 Tab "AI 解读"按钮 | 解读回测报告（标注"AI 解读"） |

**prompt 模板**（03-Architecture §3.6）：

| 模板 | 触发 | 用途 |
|---|---|---|
| `/declare-risk` | 风险声明 Tab 输入框 `/declare-risk` | 风险声明脚手架 |
| `/explain-snapshot` | 市场事实 Tab 输入框 `/explain-snapshot` | 快照解释脚手架 |
| `/compare-backtest` | 回测报告 Tab 输入框 `/compare-backtest` | 回测对比脚手架 |

**模型管理**：见 §9.1。

---

## §12 安全/隐私边界

### 12.1 INV-01~06 安全不变量在 UI 的体现

安全不变量六条（03-Architecture §7）在介面层的体现：

| 编号 | 不变量 | UI 体现 | 验证脚本 |
|---|---|---|---|
| INV-01 | renderer 沙箱 `sandbox:true` | renderer 不直触 MALF 引擎 / DuckDB / 文件系统；所有数据走 contract | check-desktop-security.mjs |
| INV-02 | 严格 CSP | `script-src 'self'` / `connect-src 'self' http://127.0.0.1:*`；无内联脚本 | check-desktop-security.mjs |
| INV-03 | preload 白名单 | 仅 `contextBridge.exposeInMainWorld("piBridge", bridge)`；不暴露 Node API | check-desktop-security.mjs |
| INV-04 | safeStorage | 密钥 Windows DPAPI 加密；介面不展示明文（§9.2） | check-desktop-security.mjs |
| INV-05 | Host RPC 契约 | 所有跨进程通信走 contract；ipcMain 白名单 | check-desktop-security.mjs |
| INV-06 | HTML 预览独立 CSP | 回测报告 / Markdown 渲染走独立 session（§8.3） | check-desktop-security.mjs |

### 12.2 防泄露（runtime_fingerprint 不展示）

| 防泄露项 | 约束 | 出处 |
|---|---|---|
| runtime_fingerprint | 永不展示（不在 44 字段 DTO 内） | D5 / 06-API §6.2 |
| apiKey | 永不展示（usage 仅记 provider 名 + token 数） | 06-API §2.1 |
| 完整 UUID | 流推送 payload 脱敏；渲染前二次脱敏 | 06-API §5 |
| 文件绝对路径 | 错误返回固定安全编码，不暴露路径 | S9 / 06-API §2.3 |
| 堆栈 | 错误返回固定安全编码，不暴露堆栈 | S9 |
| SQL 语句 | 不在 details / 日志 / 终端输出 | S7/S8 |

### 12.3 AI 解读标注

| 标注项 | 约束 | 出处 |
|---|---|---|
| 每条 AI 回复 | 标"🤖 AI 解读"徽章 | AI-05 |
| ai_interpretation_marked | 必须 TRUE | AI-05 / 06-API §6.4 |
| 不凌驾 | AI 解读不覆盖第一层市场事实 + 第二层用户声明 | 02-PRD §1.3 |
| 失败不阻塞 | AI 失败不影响确定性规则 | AI-06 |

---

## §13 响应式设计（桌面优先，不做 mobile）

| 断点 | 宽度 | 布局 |
|---|---|---|
| 桌面标准 | ≥ 1280px | 三栏 + 状态栏 |
| 桌面紧凑 | 1024-1280px | 右侧上下文面板可折叠 |
| 低于 1024px | < 1024px | 横向滚动，不触发 mobile 重排 |

**明确不做**（02-PRD §4.2）：
- 不做 mobile 适配
- 不做平板适配
- 不做响应式重排（仅桌面浏览器宽度）

---

## §14 UI 测试断言（对齐 08-Test）

UI 层测试断言对齐 08-测试验收（待写）与 03-Architecture §7 安全不变量、06-API §8 契约 AST 校验：

| # | 断言 | 验证方式 | 对齐 |
|---|---|:--:|---|
| 1 | renderer `sandbox:true` | Electron BrowserWindow 配置检查 | INV-01 |
| 2 | CSP `script-src 'self'` / `connect-src 'self' http://127.0.0.1:*` | session header 检查 | INV-02 |
| 3 | preload 不暴露 Node API | contextBridge 白名单 AST 校验 | INV-03 |
| 4 | 凭据不明文展示 | UI 渲染断言（密码框 + 状态展示） | INV-04 |
| 5 | 跨进程通信走 contract | ipcMain 白名单 AST 校验 | INV-05 |
| 6 | HTML 预览独立 session | 预览窗口 session 隔离断言 | INV-06 |
| 7 | runtime_fingerprint 不展示 | DTO 类型 AST + UI 渲染断言 | D5 |
| 8 | AI 回复标"AI 解读"徽章 | UI 渲染断言 | AI-05 |
| 9 | WaveStructuralSnapshot 44 字段完整展示 | 字段覆盖断言 | 05-ERD §3 |
| 10 | None 字段标灰 + reason_codes 旁注 | UI 渲染断言 | honest degradation |
| 11 | lineage_hash + rule_versions 展示 | UI 渲染断言 | D4/D9/S4 |
| 12 | 回测报告不输出收益类指标 | DTO 类型 AST + UI 渲染断言 | D19 |
| 13 | AI 不可修改 user_text | 权限模型断言（system.* 对 AI 不可见） | S33 |
| 14 | 标的列表 = 3 标的 | UI 渲染断言 | 05-ERD §1.4 |
| 15 | 周期 = day/week/month | UI 渲染断言 | 05-ERD §1.4 |

> E2E 测试用 Playwright（与 pi-desktop verify.mjs 范式一致，03-Architecture §8.1）；安全不变量由 `check-desktop-security.mjs` 硬断言。

---

## §15 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：三栏布局 + 6 Tab（AI 对话/市场事实/风险声明/回测报告/图表/设置）+ WaveStructuralSnapshot 44 字段按层分组展示 + signals 4 事件码 + honest degradation 展示规则 + 确定性展示 + pi-desktop 组件映射 + 省略组件 + INV-01~06 安全边界 + 防泄露 + AI 解读标注 + 桌面优先响应式 + UI 测试断言。输入：02-PRD §1.3/§6 + 03-Architecture §2/§3/§7 + 05-ERD §3 + 06-API §3/§5/§6 + pi-studybuddy §2 范式 |

---

**文档维护**：UI 设计变更时更新，重大变更需用户批准
**最后更新**：2026-08-09
