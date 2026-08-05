# AGENTS.md — pi-malf-riskbench-v0.02 仓库级操作宪章

> 状态：战役 2 文档起草基线（未进入代码施工）
> 版本：pi-malf-riskbench-v0.02
> 创建日期：2026-08-05
>
> 本目录是 AI MALF RiskBench 战役 2 的重新构造版本。它不替代战役 1 的 `Z:\ai-malf-riskbench`，也不修改战役 1 代码。

## 0. 系统身份

- 系统名：**pi-malf-riskbench-v0.02**。
- 产品定位：以 Pi Agent Runtime 为 AI 底座、以 `malf-engine` 为领域底座的本地交易员 AI 工作系统。
- 战役 1 基线：`Z:\ai-malf-riskbench`，作为已验证原型和审计证据来源。
- MALF 权威：`Z:\ai-malf-riskbench-Definitive\malf-Definitive（v1.0-v2.1）\MALF_Definitive_v2_1-deepseek-20260726`。

## 1. 版本关系

```text
ai-malf-riskbench v0.01
    = 战役 1 原型与确定性验证基线
    = T9 验证闭环的对象

pi-malf-riskbench-v0.02
    = 战役 2 重新构造版本
    = Pi AI 底座 + MALF 领域底座 + 专属 Skills + 交易员工作流
```

T9 属于战役 1 的定义对齐、偏差核对、组件传播、独立审查和专项裁决闭环。v0.02 只能引用 T9 完成后冻结的基线，不能把 T9 伪写成 v0.02 已完成能力。

## 2. 领域边界

- `malf-engine`、数据、信号、回测和 G0–G3 门禁是确定性事实层。
- Pi Agent 负责查询、解释、总结、文件处理、研究探索和固定工作流入口编排。
- AI 不修改 MALF 事实、规则、风险数值、lineage、已发布快照或真实交易数据。
- 不生成买卖建议、仓位、订单或自动交易动作。
- 回测绩效指标如进入 v0.02，必须使用 `research_only` 语义并单独形成合同。

## 3. 施工门禁

- 本目录当前只允许文档起草、架构裁决和测试设计。
- Pi、MCP、scheduler、GUI automation、模型 Provider 和第三方依赖的安装，均需单独批准的战役 2 任务。
- 不从历史项目复制代码、目录或复杂度。
- 不直接修改 `Z:\ai-malf-riskbench`、MALF Definitive 或其他只读参考目录。
- 任何代码任务必须先有唯一的 `.plan/T0X-*.md`、TDD 计划和用户明确的施工批准。

## 4. 文档权威顺序

1. 用户明确提交的战役 2 裁决；
2. 本文件；
3. `docs/spec/` 下 v0.02 合同；
4. 战役 1 T9 冻结后的验证证据；
5. MALF Definitive v2.1 原文；
6. v0.01 的其他历史文档和聊天记录。

## 5. 记录要求

所有新增函数和特殊状态必须使用中文注释。所有 AI 调用、工具调用、工作流调用和副作用操作必须有可追溯审计设计。API Key、用户秘密和机器本地路径不得写入日志或 Git。
