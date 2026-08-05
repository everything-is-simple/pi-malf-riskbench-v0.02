# Skills 与固定工作流设计 — pi-malf-riskbench-v0.02

## 1. Skill 分类

### 1.1 MALF 领域 Skills

```text
malf-market-query
malf-daily-review
malf-closing-review
malf-data-quality
malf-signal-review
malf-backtest-research
malf-report
malf-research-note
```

### 1.2 通用办公 Skills

```text
pdf-processing
office-documents
spreadsheet-analysis
markdown-json
web-research
audio-transcription
video-analysis
video-editing
```

### 1.3 系统管理 Skills

```text
workspace-backup
workspace-restore
audit-inspection
fixture-replay
```

## 2. Skill 合同

每个 Skill 必须声明：

```text
name
purpose
allowed_inputs
allowed_tools
read_paths
write_paths
side_effect_level
expected_outputs
failure_reason_codes
audit_fields
```

Skill 只能组合已经批准的工具和工作流，不能绕过 policy 直接执行任意命令。

## 3. 每日固定工作流

### morning-review

```text
检查 as_of 和数据资格
    → 读取 published snapshots
    → 读取 signal / backtest 验证结果
    → 检查 freshness、lineage、G0–G3
    → 形成事实摘要
    → 生成待核对事项
    → 写入审计和用户报告
```

### closing-review

```text
读取当日已发布结果
    → 对照用户声明和风险边界
    → 标记事实缺失或矛盾
    → 生成复盘记录
    → 追加 state revision
```

### research-exploration

```text
用户指定资料范围
    → 读取文件 / 网页 / 音视频
    → 提取可引用事实
    → 与 RiskBench 已发布事实分层
    → 形成研究假设和待验证项
    → 不修改 MALF 计算结果
```

## 4. 工作流原则

- 固定流程由代码和合同定义，LLM 只负责理解输入、选择已批准入口和解释结果。
- 工作流失败必须停止在明确节点，不静默跳过市场数据或门禁。
- 每次运行记录 workflow id、as_of、输入快照、lineage、规则版本和输出 revision。
- 定时调度和 GUI automation 不属于本次默认施工范围。

## 5. 文件与外部资料处理

文件处理结果与市场事实分层保存：

```text
原始资料        = 用户输入或外部资料
提取结果        = 可追溯文本/表格/媒体元数据
研究解释        = AI 生成，需标记来源和不确定性
RiskBench事实   = 只能来自已发布快照和确定性管道
```

任何文件转换不得把用户本地路径、秘密或浏览器凭据写入模型日志。
