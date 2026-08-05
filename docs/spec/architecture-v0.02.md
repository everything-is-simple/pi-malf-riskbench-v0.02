# 总体架构 — pi-malf-riskbench-v0.02

> 状态：战役 2 架构草案

## 1. 总体分层

```text
┌────────────────────────────────────────────┐
│  交易员 / 用户工作区                         │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│  MALF Pi Agent 层                            │
│  身份 / 会话 / Skills / 任务分解 / 呈现       │
└──────────────────────┬─────────────────────┘
                       │ 白名单工具
┌──────────────────────▼─────────────────────┐
│  Policy + Audit + Bridge                     │
│  权限 / as_of / reason code / 审计 / 回放      │
└───────────────┬───────────────────┬────────┘
                │                   │
       ┌────────▼───────┐  ┌────────▼────────┐
       │ RiskBench 事实  │  │ 固定工作流入口   │
       │ snapshot/event  │  │ data/signal/bt  │
       └────────┬───────┘  └────────┬────────┘
                │                   │
       ┌────────▼───────────────────▼────────┐
       │ malf-data / malf-signal / malf-backtest│
       └──────────────────┬───────────────────┘
                          │
                 ┌────────▼────────┐
                 │ malf-engine      │
                 │ MALF 确定性核心  │
                 └─────────────────┘
```

## 2. Pi 底座边界

Pi 提供：

- Agent runtime；
- model provider 适配；
- session 和上下文；
- tool call 生命周期；
- extension/package/skill 装配点；
- 用户交互壳层。

Pi 不提供或不直接决定：

- MALF 领域语义；
- 市场事实；
- 风险数值；
- signal 规则；
- backtest 判定；
- G0–G3 门禁；
- 用户状态 revision；
- RiskBench 审计合同。

## 3. RiskBench 领域底座

`malf-engine` 保持确定性和领域权威地位。v0.02 通过桥接层读取它的结果，不在 Agent 层复制或重算。

允许读取的内容：

- 已发布 snapshot；
- 三周期结构结果；
- signal events；
- backtest verification；
- lineage；
- freshness；
- usage；
- reason codes；
- rule versions；
- G0–G3 状态。

## 4. Bridge 设计

首选顺序：

1. 本地 Python/CLI typed bridge；
2. 本地 stdio MCP bridge；
3. 在专项裁决后考虑本机 HTTP bridge。

v0.02 首期不开放公网、LAN 或远程服务。每个工具必须声明：

```text
tool_name
input_schema
output_schema
read_or_write
required_confirmation
allowed_paths
audit_fields
failure_reason_codes
```

## 5. 数据流

```text
TDX 原始只读输入
    → malf-data
    → malf-engine
    → published snapshot
    → RiskBench Bridge
    → MALF Pi
    → 解释 / 报告 / 用户笔记
```

Agent 不读取 TDX 并自行计算 MALF；Viewer 不读取 Agent 私有状态并重算市场事实。

## 6. 状态流

```text
用户声明 / 边界 / 笔记
    → state revision
    → workbench lock
    → backup
    → MALF Pi 读取
    → AI 解读附加 revision
```

市场派生数据写入 `var/`，用户不可再生资产写入 `state/`；两者不混淆。

## 7. 部署阶段

### 阶段 A：文档与合同

当前阶段。只完成 PRD、架构、Skills、工作流和验证合同。

### 阶段 B：本地只读纵切

Pi + 一个只读 RiskBench 查询工具 + 审计 + 最小 Skill。

### 阶段 C：固定工作流

接入晨检、收盘复盘、数据质量检查等命名入口。

### 阶段 D：工作区和文件能力

接入用户状态、研究笔记、报告和批准的文件处理 Skill。

### 阶段 E：调度 / GUI / 扩展

只有单独裁决后进入，不默认属于 v0.02 首期。
