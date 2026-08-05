# 验证与验收合同 — pi-malf-riskbench-v0.02

## 1. 验证原则

v0.02 的验证不能只验证“模型能回答”，而要验证：

```text
Pi 调用
    → 工具权限
    → RiskBench 查询
    → 事实 lineage
    → AI 解释
    → 审计记录
    → 回放一致性
```

## 2. 与 T9 的关系

T9 是战役 1 v0.01 的验证闭环，负责冻结：

- MALF 定义对齐；
- `malf-engine` 语义和修复；
- Service 版本合同；
- E1/E4/R5 等专项裁决；
- 数据、signal、backtest 和审计传播结果。

v0.02 不重新定义这些语义。v0.02 需要验证的是它是否正确消费 T9 冻结后的结果。

## 3. v0.02 验证层次

### V0：装配完整性

- Pi runtime 可加载；
- MALF identity 可加载；
- Skills manifest 可解析；
- Provider 配置不泄露 Key；
- 未登记工具不会出现在 Agent 工具集合中。

### V1：只读事实桥接

- 指定 `as_of` 查询返回正确 snapshot；
- freshness、usage、lineage、rule versions 完整传播；
- 无快照、过期和门禁失败时返回固定 reason code；
- Agent 不直接读取 TDX 或重算 MALF。

### V2：解释一致性

- 同一输入事实和同一 prompt version 可回放；
- AI 解释不得修改输入事实；
- 结构化字段和引用事实可审计；
- 禁止输出进入业务事实层。

### V3：工作流一致性

- morning-review 和 closing-review 只能调用批准步骤；
- 失败节点可定位；
- 不静默跳过数据、门禁或审计；
- workflow run 可重放。

### V4：用户状态安全

- state 写入追加 revision；
- 写入有锁、备份和恢复证据；
- 损坏状态停止写入；
- AI 解读不覆盖用户声明和风险边界。

## 4. Golden fixture

每个关键工具和工作流至少建立：

```text
权威条款
    → 测试 ID
    → fixture
    → 预期事件序列
    → 实际结果
    → 审计证据
```

fixture 不由待测实现自动生成。

## 5. 首期验收门槛

- 只读查询纵切通过；
- 工具白名单和 policy 测试通过；
- Provider 错误脱敏测试通过；
- audit record 可读取；
- 事实 lineage 可回放；
- v0.01 T9 冻结基线引用明确；
- 不产生公网监听、后台 scheduler 或自动交易行为。
