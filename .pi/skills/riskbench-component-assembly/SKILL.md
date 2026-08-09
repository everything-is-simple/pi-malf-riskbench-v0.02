---
name: riskbench-component-assembly
description: pi-malf-riskbench-v0.02 组件装配门禁检查。当组件完成试炼场单件测试、准备装配到主仓 src/ 时调用。执行 7 步检查：组件识别核验→试炼场单件确认→能力卡核验→Adapter 封装检查→主仓装配契约校验→装配门禁四项→装配记录。任一环节不通过则不装配。确保"先分解再组合"铁律（AGENTS.md §6）落实。
---

# riskbench-component-assembly

pi-malf-riskbench-v0.02 组件装配门禁检查 Skill。

## 触发条件

当以下情况之一发生时调用：
1. 组件在试炼场（`Z:\pi-malf-riskbench-v0.02-composer\<component>\`）完成单件测试，准备装配到主仓 `src/`
2. 用户明确要求"装配组件"/"检查装配门禁"/"组件门禁"
3. 开发流程进行到 docs/10-开发规范 步骤 6（拆分实现）中涉及组件装配的环节

## 执行流程（7 步检查，严格顺序）

### 步骤 1：组件识别核验

核验组件基本信息：
- [ ] 组件名在 `docs/04-任务清单-Todo-List.md §4` 组件治理看板中已登记
- [ ] 组件分类明确（壳层 / 扩展层 / 业务 Adapter / 外部桥 / 安全 / 只读 Viewer）
- [ ] 组件子系统归属明确（MALF / RISK / AI / BENCH / Viewer / 壳 / 跨切）
- [ ] 组件来源明确（自建 / v0.01 继承 / 开源 / pi 扩展）

**核验失败 → 拒绝装配，先登记到 04-Todo 看板**

### 步骤 2：试炼场单件确认

确认组件在试炼场已独立调通：
- [ ] 试炼场目录存在：`Z:\pi-malf-riskbench-v0.02-composer\<component>\`
- [ ] 最小冒烟测试存在：`smoke-test.mjs` 或 `smoke-test.py`
- [ ] 冒烟测试通过（现场运行或查看日志）
- [ ] 夹具存在（如需要）：`fixtures/`
- [ ] 阶段 2 单件测试状态为 ✅（04-Todo §4 看板）

**未通过 → 退回试炼场，继续单件调试**

### 步骤 3：能力卡核验

核验 `COMPONENT-CARD.md` 完整性（docs/11-组件装配 §4）：
- [ ] 能力卡存在：`Z:\pi-malf-riskbench-v0.02-composer\<component>\COMPONENT-CARD.md`
- [ ] 基本信息完整（组件名 / 分类 / 子系统 / 来源 / 依赖）
- [ ] 能力描述清晰（核心能力 / 输入 / 输出 / 边界）
- [ ] 公开 API 已列出（方法签名 / 参数 / 返回 / 错误码）
- [ ] 冒烟测试已记录（测试文件 / 通过标准 / 夹具）
- [ ] 五阶段状态已更新（阶段 1-2 标 ✅）
- [ ] 许可证可接受（如开源组件）
- [ ] 引用 MALF v2.1 权威（如涉及 MALF 领域语义）

**能力卡不完整 → 补齐后重新核验**

### 步骤 4：Adapter 封装检查

检查主仓 `src/` 中的 Adapter 实现：
- [ ] Adapter 在主仓 `src/` 独立实现（**非试炼场代码副本**，AGENTS.md §6.3）
- [ ] 契约优先：实现 06-API 契约定义的方法签名
- [ ] 类型安全：TS strict，禁 `any`
- [ ] 错误码统一：内部错误转为 5 个统一错误码（06-API §2.2：INTERNAL_ERROR / MALF_ENGINE_ERROR / DUCKDB_ERROR / VALIDATION_ERROR / ADAPTER_ERROR）
- [ ] 日志脱敏：遵循 allowlist（AGENTS.md §9.3，永不记录请求正文/模型完整输出/base URL/apiKey/完整 UUID/runtime_fingerprint）
- [ ] 路由组前缀合法（malf / risk / ai / bench / viewer / system，06-API §7.1）

**MALF Adapter 额外检查**（Python 子进程桥接）：
- [ ] 子进程隔离（Python 引擎崩溃不影响 Electron 主进程，03-Arch §2.2）
- [ ] JSON Lines 协议（stdin/stdout 严格 JSON Lines，stderr 仅日志）
- [ ] 路径只来自配置（不硬编码 v0.01 组件路径）
- [ ] 路径穿透防护（`_guard` 检查结果在 DATA_ROOT 子树内，拒绝 `../`）
- [ ] 查询超时 30 秒（03-Arch §4.2）

**只读 Viewer 额外检查**：
- [ ] 只读访问（SELECT，不修改 snapshots/signals 表，D28）
- [ ] 不写入业务数据根（`Z:\ai-malf-riskbench-data\`）
- [ ] 连接池单例，崩溃不拖垮桌面

**Adapter 不合规 → 修复后重新检查**

### 步骤 5：主仓装配契约校验

运行契约校验 `scripts/check-contract-coverage.mjs`：
- [ ] Api ↔ handlers 一致（每个 RPC 方法有 handler）
- [ ] 无 missing（Api 方法无遗漏 handler）
- [ ] 无 duplicates（handler 无重复注册）
- [ ] 无 unknown（handler 必须在 Api 契约中存在）
- [ ] PiBridge 桥接链路完整（renderer → preload → IPC → main handler 全链）
- [ ] IPC 通道登记一致（preload ipcRenderer.invoke ↔ main ipcMain.handle）
- [ ] RPC 方法名路由组前缀合法（malf / risk / ai / bench / viewer / system）

**契约不一致 → 修复后重新校验**

### 步骤 6：装配门禁四项

最终装配门禁（docs/11-组件装配 §7）：

| # | 门禁项 | 通过标准 |
|---|---|---|
| 1 | 组件测试全绿 | 试炼场冒烟 + 单件测试全通过 |
| 2 | 工作区干净 | 试炼场 `git status` 无 unstaged 改动（如试炼场有 Git） |
| 3 | 公开 API 有文档 | 能力卡完整 + 06-API 契约已登记 |
| 4 | 无越权行为 | 不写业务数据根外路径 / 不连真实外部服务 / 不泄漏密钥 / 不侵入 `~/.pi` / 不让 AI 改 MALF/RISK 确定性计算 |

**四项全过 → 装配通过，进入步骤 7（记录）**
**任一未过 → 不装配，退回修复**

### 步骤 7：装配记录（通过后）

装配通过后：
1. 更新能力卡"装配记录"章节：
   ```
   ## 装配记录
   - 装配到主仓：YYYY-MM-DD + commit-hash + src/adapter-path
   - 装配门禁：✅ 通过（四项全过）
   - 契约校验：✅ 通过（scripts/check-contract-coverage.mjs）
   ```
2. 更新 04-Todo §4 组件治理看板：该组件阶段 4 标 ✅
3. 报告装配结果

## 禁止事项（铁律，AGENTS.md §6）

1. **禁止跳越试炼场**——组件必须先在试炼场独立调通
2. **禁止复制试炼场代码**——主仓必须独立重新实现 Adapter
3. **禁止无能力卡装配**——能力卡是装配的凭证
4. **禁止契约不一致装配**——AST 校验必须通过
5. **禁止越权行为**——四项门禁必须全过
6. **禁止 AI 修改 MALF/RISK 确定性计算**（三层权威第一层）
7. **禁止 v0.02 侵入 `~/.pi`**（pi 会话目录由 pi 内核自管）

## 检查清单（可复制）

```markdown
## 组件装配门禁检查

组件名：_______________
分类：_______________
子系统：_______________
日期：_______________

### 步骤 1：组件识别核验
- [ ] 04-Todo 看板已登记
- [ ] 分类/子系统/来源明确

### 步骤 2：试炼场单件确认
- [ ] 试炼场目录存在（Z:\pi-malf-riskbench-v0.02-composer\<component>\）
- [ ] 冒烟测试通过
- [ ] 阶段 2 标 ✅

### 步骤 3：能力卡核验
- [ ] 能力卡存在
- [ ] 基本信息/能力/API/冒烟/许可证完整
- [ ] MALF 权威引用（如涉及）

### 步骤 4：Adapter 封装检查
- [ ] 独立实现（非副本）
- [ ] 契约/类型安全/错误码/日志脱敏/路由组前缀
- [ ] MALF Adapter 特殊规则（子进程/JSON Lines/路径穿透/超时，如适用）
- [ ] 只读 Viewer 特殊规则（只读/不写业务根/连接池，如适用）

### 步骤 5：契约校验
- [ ] Api↔handlers 一致
- [ ] 无 missing/duplicates/unknown
- [ ] PiBridge 桥接链路完整
- [ ] 路由组前缀合法

### 步骤 6：装配门禁四项
- [ ] 组件测试全绿
- [ ] 工作区干净
- [ ] 公开 API 有文档
- [ ] 无越权行为

### 结果
- [ ] ✅ 装配通过
- [ ] ❌ 装配未通过（原因：_______________）
```

## 参考

- AGENTS.md §6（拆分→小组件→组合宗旨）+ §6.3（试炼场与主仓边界）
- AGENTS.md §1.4（三层权威：AI 不可改 MALF/RISK 确定性计算）
- docs/11-组件装配（先分解再组合 SoT）
- docs/10-开发规范 步骤 6（拆分实现）
- docs/03-架构设计 §4（MALF Adapter 桥接）+ §4.2（DuckDB 只读访问层）
- docs/06-API契约 §7.1（六路由组前缀）
- pi `.pi/skills/add-llm-provider.md`（7 步检查清单范式来源）
- pi-desktop `scripts/check-contract-coverage.mjs`（AST 校验范式来源）
- ai-malf-riskbench `.pi/skills/riskbench-component-assembly/SKILL.md`（v0.01 范式来源）
