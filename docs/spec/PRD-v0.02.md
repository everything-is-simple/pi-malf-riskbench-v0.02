# PRD — pi-malf-riskbench-v0.02

> 状态：战役 2 产品需求草案
> 创建日期：2026-08-05
> 前置版本：ai-malf-riskbench v0.01（战役 1）

## 1. 产品定义

`pi-malf-riskbench-v0.02` 是 AI MALF RiskBench 的战役 2 重新构造版本。它以 Pi Agent Runtime 作为 AI 底座，以 `malf-engine` 作为 MALF 领域底座，为个人交易员提供本地、可审计、可复现的研究工作台和日常工作流助手。

v0.02 不是 v0.01 的简单 AI 插件，也不是通用聊天机器人。它是一个专属于 MALF RiskBench 的 Agent 系统：Pi 负责 Agent 生命周期、模型交互、工具调用和 Skills；RiskBench 负责市场事实、MALF 计算、信号、回测、门禁和审计。

## 2. 战役关系

### 2.1 战役 1：ai-malf-riskbench v0.01

战役 1 已形成确定性原型，包括：

- `malf-engine` 五层领域模块；
- TDX 数据接入和三周期聚合；
- signal 事件流；
- backtest 确定性规则验证；
- 编排、备份、端到端门禁；
- T9 定义对齐、偏差核对、组件传播、独立审查和专项裁决。

T9 的职责是闭合战役 1 的验证链：

```text
MALF Definitive v2.1
    → 定义对齐
    → 文档/实现偏差核对
    → 修复与组件传播
    → 独立审查
    → E4/R5 裁决
    → 回归和审计证据
    → v0.01 验证基线冻结
```

### 2.2 战役 2：pi-malf-riskbench-v0.02

战役 2 以战役 1 冻结的确定性基线为输入，重新构造 AI 工作系统：

- Pi 专属 Agent 底座；
- MALF 专属 system identity；
- Skills 能力体系；
- RiskBench 领域工具和桥接；
- 交易员每日固定工作流；
- 研究探索、文件处理和报告生产；
- AI 调用、工具调用和工作流审计；
- 用户状态、笔记、revision 和备份边界。

## 3. 目标用户与核心任务

### 3.1 目标用户

个人交易员/研究者，使用本地 TDX 数据和 RiskBench 结果，进行每日检查、历史研究、资料处理和风险记录。

### 3.2 核心任务

1. 查询指定 `as_of` 的已发布市场事实。
2. 解释月、周、日三个周期的 MALF 结构结果。
3. 检查数据新鲜度、lineage、规则版本和 G0–G3 门禁。
4. 运行已经批准的固定工作流。
5. 对特殊数据进行深度研究并形成可追溯笔记。
6. 读取、整理和转换 PDF、DOCX、PPTX、XLSX、Markdown、JSON、音频和视频资料。
7. 生成晨检、收盘复盘和研究报告。
8. 提醒数据缺失、语义矛盾、过期和审计异常。

## 4. 明确不做

- AI 不计算、修改或控制 MALF 风险数值。
- AI 不修改 `malf-engine` 规则和已发布市场事实。
- AI 不生成买卖建议、仓位、订单或自动交易动作。
- v0.02 不接入券商账户。
- v0.02 不把研究结果升级为 `operational` 状态。
- v0.02 不把 LLM 作为确定性事实源。
- v0.02 不将 Pi 的通用权限直接暴露给业务 Agent。

## 5. 产品能力分层

| 层 | 责任 |
|---|---|
| Pi Agent Runtime | Agent 生命周期、会话、模型、工具调用、事件钩子 |
| MALF Agent 层 | 身份、上下文、Skills 选择、任务分解、结果呈现 |
| Skills 层 | 文件、网页、Office、音视频、研究和报告能力 |
| RiskBench Bridge | 只读事实查询、固定工作流入口、审计传播 |
| 确定性领域层 | `malf-engine`、data、signal、backtest、G0–G3 |
| 用户状态层 | 声明、风险边界、笔记、AI 解读、revision 和备份 |

## 6. v0.02 首期目标

首期只要求形成一个可验证的本地 Agent 纵切：

```text
用户请求
    → MALF Pi
    → 只读 RiskBench 查询
    → 读取已发布快照/事件/门禁
    → 结构化解释
    → 审计记录
```

固定工作流、Skills 和文件能力分阶段加入，不以一次性做成全能系统为目标。

## 7. 产品验收目标

1. Pi Agent 可以加载 MALF 固定身份和 v0.02 Skills。
2. Agent 只能通过白名单工具访问 RiskBench。
3. 查询结果保留 `as_of`、freshness、usage、lineage 和规则版本。
4. AI 输出不修改确定性结果。
5. 每次模型调用和工具调用均有审计记录。
6. 失败、过期、缺失和权限拒绝均有固定 reason code。
7. 关键查询可重复回放。
8. 用户工作区写入采用 revision、锁和备份合同。
9. 首期仍绑定本机 `127.0.0.1` / 本地工作区，不建设公网和 LAN 服务。

## 8. 待裁决项

- Pi 上游采用依赖、独立 fork 还是固定源码镜像。
- Pi Agent Runtime 的具体版本和升级策略。
- MCP、stdio bridge 或本地 CLI 的首选接口。
- 模型 Provider 数量、密钥配置和离线模型策略。
- Windows Task Scheduler 是否进入首期。
- GUI automation 是否进入首期。
- 研究绩效指标是否进入 v0.02 首期。
- v0.02 的物理 UI 形态和是否引入 Streamlit。

## 9. 版本状态

本 PRD 是战役 2 起草基线。T9 / D3 尚未完成时，v0.02 只建立需求和设计合同，不代表代码施工已经授权。
