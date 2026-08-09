# 07-工作流-Workflow

**版本**：v0.1.1
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：[02-PRD](./02-PRD-产品需求-Product-Requirements.md)、[03-架构设计](./03-架构设计-Architecture-Design.md)、[06-API](./06-API契约-API-Contracts.md)
**下游**：[08-测试验收](./08-测试验收-Test-Plan.md)、[09-UI](./09-使用者介面-UI-Design.md)
**用途**：v0.02 业务流程与状态机 SoT

---

## §1 概述

### 1.1 文档定位

本文档是 v0.02 **业务流程与状态机的唯一权威来源（SoT）**，定义"系统怎么走"——业务路径、工具→Tab 映射、状态机、错误处理、运维 SOP。

| 维度 | 说明 |
|---|---|
| 数据来源 | v0.01 `kiro-design.md`（数据管道）+ `ops.md`（运行 SOP）+ `workflow.md`（开发流程）+ v0.02 02-PRD §1.3 三层权威 + 06-API 工具表 |
| 适用范围 | v0.02 全部业务路径（数据管道 / 风险声明 / AI 解读 / 备份恢复 / 数据运维 SOP） |
| 不适用 | 开发流程细节（见 [10-开发规范](./10-开发规范-Dev-Rules.md)）、组件装配（见 [11-组件装配](./11-组件装配-Component-Assembly.md)） |

### 1.2 三层权威（继承 02-PRD §1.3）

所有工作流必须服从三层权威，下层不凌驾上层：

```
第一层：市场事实（MALF 引擎产出，确定性，不可改写）
  │  产出：WaveStructuralSnapshot 44 字段 + signals 事件流
  │  特性：整数价格、严格不等式、lineage_hash 确定性、honest degradation
  │
第二层：用户声明（用户对市场事实的解读与风险声明，AI 不可修改）
  │  产出：风险声明记录（用户手写或模板辅助）
  │  特性：用户主权，AI 只提醒矛盾，不修改 user_text
  │
第三层：AI 解读（AI 对第一层+第二层的解释/总结/提醒，必须标注，不凌驾前两层）
  │  产出：自然语言解读、回测报告解读、矛盾提醒
  │  特性：明确标注"AI 解读"，失败不阻塞确定性规则（AI-06）
```

### 1.3 与其他文档关系

| 关系 | 文档 | 引用章节 |
|---|---|---|
| 上游 | 02-PRD | §1.3 三层权威 / §2.5 业务闭环图 / §6 风险声明边界 |
| 上游 | 03-架构设计 | §1 四层架构 / §3 pi 扩展层 / §4 MALF Adapter |
| 上游 | 06-API | §3 RPC 方法表 / §5 Streams / §6 DTO |
| 上游 | v0.01 spec/kiro-design.md | §1.1 完整管道 / §3 五层转换链 / §6.3 Fallback 决策树 |
| 上游 | v0.01 spec/ops.md | §1 触发条件 / §2 步骤 5 项 / §3 禁止 |
| 上游 | v0.01 spec/workflow.md | §3 调试策略 / §5 Golden fixture / §7 中断恢复 |
| 下游 | 08-测试验收 | 流程验证测试用例与门禁 |
| 下游 | 09-UI | Tab 跳转与交互流程 |

---

## §2 数据管道主路径（v0.01 继承 + v0.02 只读访问）

### 2.1 总览

数据管道由 v0.01 写入路径与 v0.02 只读查询路径组成，二者经 DuckDB 生产库解耦：

```
TDX .day (32B <5If2I, 只读源)
    │
    ▼  malf-data tdx_reader
PriceBar (全 int 价格、严格时间序列)
    │
    ▼  malf-engine MALFCoreEngine.on_bar
CoreStateSnapshot
    │
    ▼  LifespanEngine → RankEngine → StructuralPositionEngine
WaveStructuralSnapshot (44 字段, 含 lineage_hash)
    │
    ▼  malf-data DuckDBAdapter（逐行 INSERT + COMMIT）
DuckDB snapshots 表 (PK: symbol, timeframe, bar_dt)
    │
    ├──────────────────────┐
    │                      │
    ▼                      ▼
malf-signal detect_events   v0.02 只读 Viewer
    │                      │  (DuckDB 只读连接 → contract RPC → renderer)
    ▼                      │
signals 事件流 (4 事件码)    │
    │                      │
    ▼                      ▼
malf-backtest run_full_verification
    │
    ▼
T4 验证报告（触发序列/规则版本审计/参数鲁棒性/SQL 交叉验证）
```

**关键边界**：
- 写入路径由 v0.01 `run_pipeline.ps1` 独占（受 §7 数据运维 SOP 约束）
- 只读 Viewer 不进入写入路径（D28 / DECISION-v02-005）
- 三层权威第一层（市场事实）= snapshots + signals，确定性不可改写

### 2.2 MALF Ingest 流程（v0.01 继承）

> 受 §7 数据运维 SOP 约束，由 v0.01 `run_pipeline.ps1` 编排，v0.02 不接管。

**五层转换链**（来自 v0.01 kiro-design.md §3.1）：

| 层 | 模块 | 输入 | 输出 | 关键约束 |
|---|---|---|---|---|
| L1 Core | `MALFCoreEngine.on_bar` | PriceBar | CoreStateSnapshot | 每 bar 必调；端点检测/Guard break/Progress 追踪 |
| L2-L3 Lifespan | `LifespanEngine.calculate_*` | Core 输出 + 历史池 | WaveLifespan / RangeLifespan | 仅调用实际存在的 API；未形成则 None |
| L4 Position | `StructuralPositionEngine.build_p1_view ~ build_p4_view` | Lifespan 输出 | P1/P2/P3/P4 视图 | P1 不产生独立持久化列 |
| L5 Service | `build_wave_structural_snapshot` | 全层输出 | WaveStructuralSnapshot (44 字段) | 纯函数；lineage_hash 在最后一步计算 |
| 持久化 | `malf-data DuckDBAdapter` | Snapshot | DuckDB snapshots 表 | 逐行 INSERT + COMMIT；完整前缀 replay；跳过已提交写入 |

**lineage_hash 确定性门禁**：

```
run_1 = ingest(symbol, timeframe)  → lineage_hash_1
run_2 = ingest(symbol, timeframe)  → lineage_hash_2
assert lineage_hash_1 == lineage_hash_2, "DETERMINISM_VIOLATION"
```

违反 → 停止写入，报告用户（详见 §9.4）。

**中断恢复**：完整输入前缀 replay + 跳过已持久化 bar（MALF-06）。

**优雅降解**：peer_sample < 30 → 对应字段 None，附 `reason_codes`，不补零不估计（MALF-07）。

### 2.3 只读 Viewer 查询流程（v0.02 新增）

v0.02 在写入路径之外新增只读 Viewer 查询通道，renderer → contract RPC → DuckDB 只读连接：

```
renderer (React Tab)
    │  调用 contract/api.ts 的 Api 方法
    ▼
contract RPC（MessagePort，统一信封）
    │  委托 pi 扩展层 registerTool 工具
    ▼
malf.* / bench.* / viewer.* 工具（只读）
    │  调用 MALF Adapter 或 DuckDB 只读访问层
    ▼
DuckDB 只读连接（单例连接池）
    │  SELECT 查询，超时 30 秒
    ▼
snapshots / signals / backtest_reports 表
```

**只读 Viewer 边界**（D28 / 06-API §3.5）：

| 约束 | 说明 |
|---|---|
| 只读访问 | 仅 SELECT，不修改 snapshots/signals 表 |
| 查询超时 | 30 秒（DUCKDB_ERROR） |
| 连接池 | 单例，只读模式打开 |
| 路径守卫 | 导出类操作拒绝 `../` 逃逸（S16） |
| 防泄露 | `runtime_fingerprint` 永不暴露（D5） |

### 2.4 工具→Tab 映射表

参考 pi-studybuddy §2.8 范式，registerTool 工具调用后由 renderer 跳转到对应 Tab：

| 工具名 | 跳转 Tab | 说明 |
|---|---|---|
| `query_snapshot` | 市场事实 Tab | 展示 44 字段快照 |
| `query_snapshot_range` | 市场事实 Tab | 展示 snapshot 范围 |
| `query_signals` | 市场事实 Tab | 展示事件流（4 事件码） |
| `query_symbol_list` | 市场事实 Tab | 切换标的 |
| `query_timeframes` | 市场事实 Tab | 切换周期 |
| `explain_snapshot` | 市场事实 Tab | 字段权威解释（MALF v2.1） |
| `declare_risk` | 风险声明 Tab | 创建/编辑声明 |
| `list_risk_declarations` | 风险声明 Tab | 列出声明 |
| `update_risk_declaration` | 风险声明 Tab | 修改 user_text |
| `delete_risk_declaration` | 风险声明 Tab | 软删除声明 |
| `check_risk_contradiction` | 风险声明 Tab | 矛盾提醒（AI 只提醒不修改） |
| `quantify_risk` | 风险声明 Tab | RISK 量化器展示（极端度/动量/方向优势/联合风险提示，P0-B 修复） |
| `ai_interpret_snapshot` | AI 对话 Tab | AI 解读 snapshot（必须标注） |
| `ai_interpret_backtest` | AI 对话 Tab | AI 解读回测报告 |
| `ai_discover_rules` | AI 对话 Tab | AI 信号发现（P2，结果仅供参考） |
| `run_backtest_report` | 回测报告 Tab | 运行 T4 验证 |
| `read_backtest_report` | 回测报告 Tab | 读取报告 |
| `export_csv` | — | 导出 CSV（无 Tab 跳转，落本地文件） |

**跳转规则**：
- 只读工具（malf.* / bench.read* / viewer.* / risk.list / risk.check）无需用户会话
- 写入工具（risk.declare/update/delete / ai.*）需活跃用户会话
- system.* 工具不暴露给 AI agent，对 UI Tab 也不可见（凭据管理）

---

## §3 风险声明路径（v0.02 新增）

> 第二层用户声明权威，AI 不可修改 user_text（02-PRD §6.3）。

### 3.1 用户创建风险声明

```
用户在风险声明 Tab 编写 user_text
    │  选择 symbol / timeframe / bar_dt
    │  勾选 linked_fields（引用 snapshot 字段，如 rank/label）
    ▼
declare_risk 工具（需会话）
    │  写入 risk_declarations 表
    │  ai_interpretation = null
    │  ai_interpretation_marked = false
    ▼
返回 RiskDeclarationDTO
    │
    ▼
风险声明 Tab 渲染声明
```

**字段约束**（06-API §6.4 RiskDeclarationDTO）：

| 字段 | 类型 | 约束 |
|---|---|---|
| declaration_id | str | 唯一标识 |
| symbol / timeframe / bar_dt | str | 关联到具体 bar |
| user_text | str | 用户手写或模板辅助，AI 不可改 |
| linked_fields | list[str] | 引用 snapshot 字段 |
| created_at | str | ISO 8601 |
| ai_interpretation | str \| null | AI 解读，必须标注"AI 解读" |
| ai_interpretation_marked | bool | AI 解读非空时必须为 true |

**用户主权**：
- 用户可创建/修改/删除自己的风险声明（update/delete 仅修改 user_text）
- update/delete 走软删除（留审计痕迹）
- AI 可调用 `declare_risk` 创建声明（白名单 ✅，06-API §7.3 / 03-Arch §3.2 aiCallable=true），但**不可调用 `update_risk_declaration` / `delete_risk_declaration`**（黑名单，06-API §7.3 黑名单 7 个；其中安全隔离 6 个见 §3 双层暴露说明）
- **裁决依据**（P1-1 修复）：创建 ≠ 修改，AI 创建声明属于"第三层 AI 解读的主动建议"，仍受 `ai_interpretation_marked=true` 约束（AI-05）；而修改/删除属于"改写第二层用户声明"，违反三层权威。AI 创建的声明默认 `draft` 状态，用户审查后才转 `declared`（状态机 §6.3）

### 3.2 AI 检测矛盾（只提醒不修改）

```
用户在风险声明 Tab 触发"检查矛盾"
    │  调用 check_risk_contradiction 工具
    ▼
check_risk_contradiction（只读）
    │  读取声明 + 关联 snapshot
    │  对比 user_text 与 snapshot 字段（rank/label/direction 等）
    │  检测语义矛盾
    ▼
返回 {contradictions: string[]}
    │
    ▼
风险声明 Tab 展示矛盾提醒（标注"AI 提醒"）
```

**关键约束**：
- AI 只提醒矛盾，不修改 user_text（02-PRD §6.3）
- 矛盾提醒属于第三层 AI 解读，必须标注"AI 解读"标识
- 用户可忽略提醒，AI 不强制用户接受

### 3.3 AI 解读（必须标注"AI 解读"）

```
用户在风险声明 Tab 触发"AI 解读此声明"
    │  调用 ai_interpret_snapshot 工具（需会话）
    ▼
ai_interpret_snapshot 工具
    │  读取声明 + 关联 snapshot
    │  调用 pi-ai provider（流式输出）
    │  通过 ai.interpretation.streaming 流推送 token
    ▼
组装完整解读（必须含"AI 解读"标识）
    │  ai_interpretation_marked = true
    ▼
回写 RiskDeclarationDTO.ai_interpretation
```

**标注铁律**（AI-05 / 06-API §6.6）：
- `ai_interpretation` 非空时 `ai_interpretation_marked` 必须为 `true`
- interpretation 内容必须明确含"AI 解读"标识
- 解读不覆盖第一层市场事实与第二层用户声明
- 解读脱敏：不含 apiKey / 完整 UUID / 文件路径 / 堆栈（S9）

---

## §4 AI 解读路径（v0.02 新增）

> 第三层 AI 解读，必须标注，不凌驾第一层+第二层（AI-05）。AI 失败不阻塞确定性规则（AI-06）。

### 4.1 AI 解读 snapshot

```
用户在市场事实 Tab 选择某 snapshot → 点击"AI 解读"
    │  调用 ai_interpret_snapshot 工具（需会话）
    ▼
ai_interpret_snapshot 工具
    │  读取 WaveStructuralSnapshotDTO（44 字段，防泄露）
    │  组装 prompt（含 snapshot 字段 + MALF v2.1 字段语义）
    │  调用 pi-ai provider（流式）
    ▼
ai.interpretation.streaming 流推送 token 增量
    │  payload: {interpretation_id, token, done}
    │  payload 脱敏（不含 apiKey / 完整 UUID）
    ▼
done=true 时整体解读必须已标注"AI 解读"
    │  返回 {interpretation: string, marked: true}
    ▼
AI 对话 Tab 渲染解读
```

### 4.2 AI 解读回测报告

```
用户在回测报告 Tab 选择某 report → 点击"AI 解读"
    │  调用 ai_interpret_backtest 工具（需会话）
    ▼
ai_interpret_backtest 工具
    │  读取 BacktestReportDTO（T4 验证结果，无收益类指标）
    │  组装 prompt（含 verify_sequence/crosscheck/audit/robustness）
    │  调用 pi-ai provider（流式）
    ▼
ai.interpretation.streaming 流推送
    ▼
返回 {interpretation: string, marked: true}
    │  标注异常区间、规则版本偏移、参数鲁棒性风险
    ▼
AI 对话 Tab 渲染解读
```

**关键约束**：
- BacktestReportDTO 不输出收益类指标（D19 / 战役 1 边界），AI 解读也不得输出
- AI 解读可建议关注点，不输出买卖建议/仓位/订单

### 4.3 AI 信号发现（P2，结果仅供参考）

```
用户在 AI 对话 Tab 选择 symbol/timeframe → 触发"AI 发现规则"
    │  调用 ai_discover_rules 工具（需会话，P2 优先级）
    ▼
ai_discover_rules 工具
    │  读取该 symbol/timeframe 的 snapshots + signals 序列
    │  分析回测中对/错的快照序列
    │  调用 pi-ai provider 提取候选规则
    ▼
返回 {rules: object[]}
    │  每条规则标注"AI 候选规则，仅供参考"
    ▼
AI 对话 Tab 展示候选规则
    │  用户决定是否采纳（不自动写入确定性规则）
```

**关键约束**：
- 结果仅供参考，**不写入确定性规则**（06-API §3.3）
- 采纳与否由用户裁决，写入需走 v0.01 组件变更流程
- P2 优先级，v0.02 未必实现

### 4.4 AI 失败不阻塞确定性规则（规则优先可证伪）

**AI-06 铁律**：AI 失败不阻塞确定性规则。

| 场景 | AI 失败处理 | 确定性规则处理 |
|---|---|---|
| `ai_interpret_snapshot` 失败 | 返回 INTERNAL_ERROR，提示重试 | snapshot 查询不受影响 |
| `ai_interpret_backtest` 失败 | 返回 INTERNAL_ERROR，提示重试 | 回测报告仍可读取 |
| `ai_discover_rules` 失败 | 返回 INTERNAL_ERROR，提示重试 | 现有规则不变 |
| `check_risk_contradiction` 失败 | 返回 INTERNAL_ERROR，提示重试 | 风险声明保留，用户主权不受影响 |
| AI provider 全部不可用 | UI 显示"AI 不可用"，第一层+第二层正常工作 | 确定性规则继续运行 |

**架构保障**（03-架构设计 DECISION-v02-004 / D27）：
- MALF 引擎在独立子进程，AI provider 在 pi-ai 层，二者进程隔离
- AI 失败仅影响第三层（AI 解读），第一层（市场事实）和第二层（用户声明）继续可用

---

## §5 备份恢复路径（v0.01 继承）

> 由 v0.01 `backup_database.ps1` / `restore_database.ps1` / `backup.py` / `restore.py` 实现，v0.02 直接继承不重写。

### 5.1 备份流程

```
触发：每次生产库写入后自动调用（§7.2 步骤 3 内含）
    │
    ▼
backup_database.ps1 -AllowProductionWrite
    │  对 --db 解析到生产数据根（Z:/ai-malf-riskbench-data）默认拒绝
    │  需显式 -AllowProductionWrite（用户授权）
    ▼
backup.py backup_database(db_path, backup_dir, keep_days=7)
    │  Step 1: CHECKPOINT（WAL 落盘）
    │  Step 2: 复制 .duckdb 文件（duckdb_backup）
    │  Step 3: EXPORT DATABASE 到 Parquet（parquet_export）
    │  Step 4: 产物内建验证（Parquet 内存 IMPORT 校验）
    │  Step 5: 清理旧备份（保留最近 7 个）
    ▼
返回 BackupResult(timestamp, duckdb_backup, parquet_export)
    │  产物验证失败 → 抛 RuntimeError
    ▼
备份产物抽查（§7.2 步骤 4）
```

**备份产物**：
| 产物 | 路径 | 用途 |
|---|---|---|
| `.duckdb` 副本 | `<backup_dir>/<timestamp>/*.duckdb` | 快速恢复（层级 2a） |
| Parquet 导出 | `<backup_dir>/<timestamp>/parquet/` | 冷备恢复（层级 2b） |
| manifest | `<backup_dir>/<timestamp>/manifest.json` | 产物清单与校验和 |

### 5.2 恢复流程

```
触发：生产库损坏或用户要求回滚
    │
    ▼
restore_database.ps1 -BackupDir <dir> -Target <path> [-Force] [-AllowProductionWrite]
    │  对 --target 解析到生产数据根默认拒绝
    │  --force 不能绕过生产根拒绝（必须 -AllowProductionWrite）
    ▼
restore.py find_latest_backup(backup_dir)
    │  跨 .duckdb/Parquet 统一比较，找最新可用备份
    ▼
分支：
    ├─ 优先 restore_from_duckdb（.duckdb 副本，速度快）
    │   返回 RestoreResult(source, target, kind="duckdb", tables, row_counts)
    │
    └─ 次 选 restore_from_parquet（Parquet 冷备，跨版本兼容）
        返回 RestoreResult(source, target, kind="parquet", tables, row_counts)
    ▼
目标已存在 → 必须 -Force 覆盖
    ▼
恢复后建议重新跑 §5.3 层级 1 验证
```

**恢复联锁**（v0.01 api.md 备份/恢复生产联锁 2026-08-05 第二轮整改）：

| 工具 | 联锁规则 |
|---|---|
| `backup.py` | `--db` 解析到生产数据根默认拒绝（PermissionError），需 `--allow-production` |
| `restore.py` | `--target` 解析到生产数据根默认拒绝，`--force` **不能绕过**，需 `--allow-production` |
| `backup_database.ps1` | 生产库需 `-AllowProductionWrite`（需用户授权） |
| `restore_database.ps1` | 生产目标需 `-AllowProductionWrite`；覆盖已存在目标需 `-Force` |

**所有拒绝均为受控错误输出（无 traceback）**。

### 5.3 三层 fallback

来自 v0.01 kiro-design.md §6.3 Fallback 决策树 + kiro-require.md NF-08：

```
打开数据库
  │
  ├─ 成功 → CHECKPOINT → 正常使用（层级 1：软降级，内存限制 + 磁盘检查）
  │
  └─ IOException / 损坏
      │
      ├─ 层级 2: backups/ 下最新备份存在?
      │   ├─ 是 .duckdb 副本 → restore_from_duckdb → 正常使用
      │   ├─ 是 Parquet 冷备 → restore_from_parquet → 正常使用
      │   └─ 否 → 层级 3
      │
      └─ 层级 3: 全量重跑（从 TDX 原始数据重建）
          ├─ 删除损坏的 .duckdb
          ├─ run_pipeline.ps1 -AllowProductionWrite（全量 ingest + signal）
          ├─ 自动触发备份
          └─ 完成
```

| 层级 | 触发条件 | 恢复源 | 数据完整性 |
|---|---|---|---|
| 1 软降级 | 内存/磁盘检查通过，库可打开 | 当前 .duckdb + WAL | 完整 |
| 2 备份恢复 | 库损坏但备份可用 | `.duckdb` 副本 或 Parquet 冷备 | 最近一次备份时点 |
| 3 全量重跑 | 库损坏且无可用备份 | TDX 原始 `.day` + MALF 引擎确定性 | 全量重建（lineage_hash 一致） |

**层级 3 可行性保障**：
- TDX 原始数据是只读权威源（`Z:\new_tdx64\vipdoc\`）
- MALF 引擎确定性：lineage_hash 两次运行一致（MALF-04）
- `Z:\ai-malf-riskbench-data` 下所有数据可重建（NF-10）

---

## §6 组件治理流程（引用 11-组件装配）

v0.02 组件治理遵循五阶段，任一阶段失败退回上一阶段，不进 master。详见 [11-组件装配](./11-组件装配-Component-Assembly.md)。

```
1. 下载储存    →  H:\pi-references\* 或 node_modules / venv / Z:\ai-malf-riskbench-components\*
2. 单件测试    →  独立冒烟 + 合成夹具断言（vitest + pytest）
3. 集成测试    →  extension×pi 底座契约 + 钩子协作 + MALF Adapter 桥接验证
4. 系统组装    →  代码进入 src/ + 类型检查 + lint + contract AST 校验
5. 冒烟 + E2E  →  系统冒烟 + 受影响 E2E + 安全不变量六条 + 确定性验证
```

**与工作流的衔接**：
- 阶段 2-3 在 `Z:\pi-malf-riskbench-v0.02-composer`（试炼场）进行
- 阶段 4 进入 `Z:\pi-malf-riskbench-v0.02\src\`（主仓）
- 阶段 5 触发 §7 数据运维 SOP 验证生产库可读
- v0.01 继承组件（290 passed）跳过阶段 1-2，直接从阶段 3 Adapter 桥接验证开始

### 6.1 Golden fixture 原则（继承 v0.01 workflow.md §5）

> 测试 fixture 是人肉推导的正确答案，绝对不改 fixture 让测试通过。

**Golden fixture 铁律**：

| 规则 | 说明 |
|---|---|
| 人肉推导 | 预期输出由人手工推导，不是代码生成 |
| 存放位置 | `tests/fixtures/` 目录 |
| fixture 结构 | `{ "description": "场景说明", "input": {...}, "expected": {...} }` |
| 不可改 fixture | 绝对不改 golden fixture 来让测试通过 |

**调试策略**（v0.01 workflow.md §3）：

| 症状 | 策略 |
|---|---|
| 管道不通（import 失败 / AttributeError） | 逐层隔离：①确认 Python 环境 ②确认引擎可 import ③逐模块 test ④端到端（一个 bar） |
| 引擎崩溃（on_bar 抛异常） | 打印 bar 序列的 pivot 信息，定位到出错 bar（崩溃在 bar #i (bar_dt)，当前状态，异常） |
| 信号 FLAT 太多/太少 | ①查 rank 分布（null_rank 占比 > 80% → peer_sample 不足）②选更早上市的标的或降阈值 ③若分布缺乏区分度 → 记录事实请求参数裁决，不得自行调整阈值 |
| Golden fixture 不通过 | ①读 spec 对应编号（MALF Definitive v2.1）②代码与 spec 不一致 → 修代码 ③spec 模糊 → 不猜，记录到 task ④**fixture 绝对不改** |

### 6.2 中断恢复（继承 v0.01 workflow.md §7）

> 开发会话被中断后，下次开工按此顺序恢复上下文。

```
1. 读 docs/.plan/00-当前任务.md（v0.02 路径：.plan/00-当前任务.md）
   │
   ├─ 若没有用户已批准且正在执行的任务 → 停止业务施工，等待用户选择
   │
   └─ 若有当前任务 → 读唯一的执行中 .plan/T0X-*.md
       │
       ├─ 从第一个未完成验收项继续
       │
       └─ 已完成计划只作历史对照，不得继续施工
   │
   ▼
2. git status 检查半成品
   │
   └─ 不留无说明的 unstaged 代码
```

**关键纪律**：
- 从文档恢复上下文，**不从聊天记忆恢复**
- 未选任务不得预建分支、不预写未来计划
- 已完成计划保留为历史证据，不作为后续施工指令
- 每任务仅一份实施记录（`.record/T0X-实施记录.md`）

### 6.3 v0.02 开工强制入口顺序（继承 00-索引 §8）

任何开发会话开始时，按以下顺序读取文档建立完整上下文：

```
1. AGENTS.md（已创建 v0.1.7）          ← 系统身份 + 权威链 + 任务铁律
2. docs/00-文档索引-Index.md          ← 文档导航 + 门禁状态 + 当前状态总览
3. docs/04-任务清单-Todo-List.md      ← 当前任务注册表 + 里程碑状态
4. .plan/00-当前任务.md（若存在）     ← 唯一执行中任务计划
5. 相关设计文档（依据任务范围）        ← 01-TRD / 02-PRD / 03-Arch / 05-ERD / 06-API / 07-Workflow / 08-Test / 09-UI
```

**门禁规则**：若上述文件缺失、相互冲突或当前任务不明确 → 停止业务施工，只允许修复治理文档或请求用户裁决。

---

## §7 数据运维 SOP（v0.01 ops.md 继承）

> 来自 v0.01 spec/ops.md v1.0（2026-08-04 用户裁决转正）。与开发工作流并列，是数据侧日常运行 SOP。

### 7.1 触发条件

**人工触发，无后台调度**。建议在以下时机运行：

- TDX `vipdoc` 出现新交易日数据
- 用户要求"更新数据 / 跑一遍管道"

**禁止**（v0.01 AGENTS §8.3）：
- 后台调度 / 定时器 / 文件 watcher / 自动重跑
- 未经用户授权写生产库
- 把 `operational` 用途或"当前风险状态"表述强加于 `research_only` 数据
- 把生产库直接作为开发/验证对象（一律走沙箱副本）

### 7.2 步骤 5 项

| 步骤 | 名称 | 操作 | 写权限 |
|---|---|---|---|
| 1 | 检查数据新鲜度 | 查询生产库 `snapshots.MAX(bar_dt)` + `freshness`，对比 TDX 最新 `.day` 文件日期；无新数据 → 直接进入步骤 5 | 只读 |
| 2 | 沙箱副本验证 | 复制生产库到 `Z:\ai-malf-riskbench--runtime\tmp\<task>\`，对副本库运行 ingest（新数据区间）；验证 lineage 确定性、行数增量合理、usage/freshness 仍为 `research_only` / `stale_research_only`；失败 → 停止，不写生产 | 沙箱 |
| 3 | 生产库写入 | 用户确认后，对生产库运行 ingest（`run_pipeline.ps1 -AllowProductionWrite`）；写入前备份生产库（`backup_database.ps1 -AllowProductionWrite`） | 生产（需用户授权） |
| 4 | 备份产物抽查 | 确认备份文件存在、大小合理、可重新打开（duckdb 只读连接验证）；`backup.py` 已内建产物验证，失败即备份报错 | 只读 |
| 5 | 每日记录 | 写 `Z:\ai-malf-riskbench-everyday\YYYY-MM-DD.md`：数据状态（last_bar / freshness / 行数增量）、本次操作与结果、观察 / 注意事项 / 未决问题 | 日记 |

### 7.3 生产库写入联锁

来自 v0.01 api.md 生产写入联锁（2026-08-05 整改）：

| 联锁项 | 规则 |
|---|---|
| 生产数据根识别 | 目标库解析到 `Z:/ai-malf-riskbench-data` 时必须显式 `-AllowProductionWrite` |
| `-DbPath` 路径约束 | 必须位于 `-DataRoot` 内（规范化路径比较） |
| `-VerifyOnly` 豁免 | 不写目标库，不受联锁限制 |
| 前置守卫 | 每只标的 `.day` 文件在 ingest 前做 mtime 稳定性检查（间隔 2 秒），文件不稳定则拒绝 ingest |
| 备份前置 | 生产库写入前必须先备份（步骤 3 内含） |

**对应 v0.02 边界**：v0.02 只读 Viewer 不进入写入路径，不受本联锁约束；写入路径仍由 v0.01 `run_pipeline.ps1` 独占。

---

## §8 状态机汇总

v0.02 简化为 6 个状态机（参考 pi-studybuddy 11 个状态机，按 v0.02 业务范围裁剪）。

### 8.1 数据管道状态机

> 描述 DuckDB 生产库的数据新鲜度状态。

| 状态 | 进入条件 | 允许动作 | 退出条件 |
|---|---|---|---|
| `UNINITIALIZED` | 系统首次启动，库未初始化 | 走 §5.3 层级 3 全量重跑 | 首次 ingest 完成 |
| `INGESTING` | §7.2 步骤 3 开始写入 | 阻塞其他写入；只读 Viewer 可读已提交行 | ingest 完成 / 失败 |
| `VERIFYING` | ingest 完成，跑 lineage_hash 验证 + signals 派生 | 阻塞写入；只读 Viewer 暂缓读最新行 | 验证通过 / 失败 |
| `PUBLISHED` | 验证通过，freshness = `research_only` | 只读 Viewer 全量可读；备份完成 | TDX 出现新交易日 → `STALE` |
| `STALE` | TDX 最新 `.day` 日期 > 库 `MAX(bar_dt)` | 提示用户运行 §7 SOP；只读 Viewer 可读（标 `stale_research_only`） | §7.2 步骤 3 完成 → `INGESTING` |

**非法转移**：`PUBLISHED` → `INGESTING` 必须经 `STALE` 中转（避免跳过新鲜度检查）。

### 8.2 风险声明状态机

> 描述风险声明记录的生命周期。

| 状态 | 进入条件 | 允许动作 | 退出条件 |
|---|---|---|---|
| `draft` | 用户调用 `declare_risk` 创建 | 用户编辑 user_text；用户删除 | 用户保存 → `declared` |
| `declared` | 用户保存声明 | 用户修改（→ `draft`）；用户删除（→ `archived`）；AI 检测矛盾；AI 解读 | AI 检出矛盾 → `contradicted`；用户归档 → `archived` |
| `contradicted` | AI 检出声明与市场事实矛盾 | 用户查看矛盾提醒；用户修改 user_text（→ `draft`）；用户忽略（保持 `contradicted`） | 用户修改 → `draft`；用户归档 → `archived` |
| `archived` | 用户软删除声明 | 仅可读，留审计痕迹 | 终态 |

**约束**：
- AI 不可触发状态转移（仅 `check_risk_contradiction` 标记 `contradicted`，实际转移由用户确认）
- `archived` 为终态，不可恢复（保留审计痕迹）

### 8.3 AI 解读状态机

> 描述 AI 解读请求的生命周期（流式输出）。

| 状态 | 进入条件 | 允许动作 | 退出条件 |
|---|---|---|---|
| `pending` | 用户触发 `ai_interpret_*` 工具 | 等待 provider 响应 | provider 开始流式输出 → `streaming` |
| `streaming` | provider 开始推送 token | 通过 `ai.interpretation.streaming` 流推送 token；用户可取消 | 流式完成 → `completed`；provider 错误 / 用户取消 → `failed` |
| `completed` | `done=true`，解读组装完成 | 解读已写入 DTO（`ai_interpretation_marked=true`） | 终态 |
| `failed` | provider 错误 / 用户取消 | 返回 INTERNAL_ERROR，提示重试；不阻塞确定性规则（AI-06） | 终态（可重新触发 → `pending`） |

**约束**：
- `completed` 状态的解读必须已标注"AI 解读"（AI-05）
- `failed` 不影响第一层（市场事实）和第二层（用户声明）

### 8.4 备份恢复状态机

> 描述备份/恢复操作的生命周期。

| 状态 | 进入条件 | 允许动作 | 退出条件 |
|---|---|---|---|
| `idle` | 无备份/恢复任务 | 触发备份 / 恢复 | 备份触发 → `backing_up`；恢复触发 → `restoring` |
| `backing_up` | `backup_database.ps1` 启动 | CHECKPOINT → 复制 .duckdb → EXPORT Parquet → 产物验证 | 验证通过 → `verifying`；失败 → `failed` |
| `verifying` | 备份产物内建验证 | Parquet 内存 IMPORT 校验 | 校验通过 → `done`；失败 → `failed` |
| `restoring` | `restore_database.ps1` 启动 | 找最新备份 → restore_from_duckdb / restore_from_parquet | 恢复完成 → `done`；失败 → `failed` |
| `done` | 备份/恢复成功完成 | 清理旧备份（keep_days=7） | 自动 → `idle` |
| `failed` | 任意步骤失败 | 抛 RuntimeError（备份） / 受控错误输出（恢复联锁拒绝） | 用户处置后 → `idle` |

**约束**：
- 生产库备份/恢复需 `-AllowProductionWrite`（§5.2 联锁）
- `failed` 状态需用户介入，不自动重试

### 8.5 标的监控状态机

> 描述用户对标的的监控关注状态（v0.02 只读 Viewer 视角，非自动监控）。

| 状态 | 进入条件 | 允许动作 | 退出条件 |
|---|---|---|---|
| `not_watched` | 标的未在 Viewer 关注列表 | 用户添加关注 | 用户添加 → `watching` |
| `watching` | 用户关注该标的 | 查询 snapshot / signals；AI 解读；风险声明 | 用户取消关注 → `paused`；标的退市 → `not_watched` |
| `paused` | 用户暂停关注（保留历史声明） | 恢复关注；查看历史声明 | 用户恢复 → `watching`；用户移除 → `not_watched` |

**约束**：
- v0.02 不做后台监控/通知（02-PRD §4.2 不做的形态）
- "监控"仅指用户在 Viewer 中的关注列表，不触发自动操作

### 8.6 回测验证状态机

> 描述 T4 确定性规则验证的生命周期。

| 状态 | 进入条件 | 允许动作 | 退出条件 |
|---|---|---|---|
| `idle` | 无回测任务 | 用户触发 `run_backtest_report` | 触发 → `running` |
| `running` | `run_full_verification` 启动 | 通过 `backtest.progress` 流推送进度（started/verify_sequence/crosscheck/audit/completed） | 完成 → `completed`；失败 → `failed` |
| `completed` | T4 验证完成 | 用户读取 `read_backtest_report`；AI 解读（`ai_interpret_backtest`） | 终态（可重新触发 → `running`） |
| `failed` | 验证过程异常 | 返回 INTERNAL_ERROR / MALF_ENGINE_ERROR；不写入生产库 | 用户处置后 → `idle` |

**约束**：
- 回测只读，不修改 snapshots/signals（bench.* 只读路由）
- 回测报告不输出收益类指标（D19）
- `failed` 不影响生产库数据

---

## §9 错误处理

> 错误码来自 06-API §2.2 统一错误码（5 个）。本节描述各错误码在工作流中的触发场景与处理策略。

### 9.1 MALF 引擎错误（MALF_ENGINE_ERROR）

| 触发场景 | 处理策略 |
|---|---|
| MALF 子进程崩溃 | 子进程隔离（DECISION-v02-004 / D27），不拖垮桌面；重启子进程；用户重试 |
| MALF 子进程返回 error | 映射为 MALF_ENGINE_ERROR；安全编码提示"市场结构计算异常，请检查数据完整性" |
| 规则版本缺失 | Service 拒绝发布（MALF v2.1 S4）；返回 MALF_ENGINE_ERROR |
| lineage_hash 不一致 | 停止写入，报告用户（DETERMINISM_VIOLATION，详见 §9.4） |

**架构保障**：MALF 引擎在独立 Python 子进程，经 JSON Lines 协议与 TypeScript 扩展层通信；子进程崩溃不拖垮 Electron 主进程（03-架构设计 §4.1）。

### 9.2 DuckDB 错误（DUCKDB_ERROR）

| 触发场景 | 处理策略 |
|---|---|
| 连接失败 | 重试 3 次；仍失败 → 提示"数据库读取失败，请稍后重试" |
| 查询超时（>30 秒） | 取消查询；提示"查询超时，请缩小查询范围" |
| 表不存在 | 返回 NOT_FOUND；提示"未找到该快照，请检查标的与时间" |
| 只读约束被违反 | 拒绝写入（D28）；返回 DUCKDB_ERROR；记录违规尝试 |
| 库损坏 | 走 §5.3 三层 fallback；层级 2 备份恢复或层级 3 全量重跑 |

**连接池策略**：单例只读连接，超时 30 秒，失败可重试。

### 9.3 AI provider 错误（INTERNAL_ERROR）

| 触发场景 | 处理策略 |
|---|---|
| AI provider 返回错误 | 返回 INTERNAL_ERROR，提示"操作失败，请稍后重试；如持续发生请重启应用" |
| AI provider 全部不可用 | UI 显示"AI 不可用"；第一层+第二层正常工作（AI-06） |
| AI 流式中断 | 状态机转 `failed`；用户可重新触发 |
| AI 解读未标注 | VALIDATION_ERROR；`ai_interpretation_marked=false` 但 `ai_interpretation` 非空 → 拒绝返回 |

**关键约束**：AI 失败不阻塞确定性规则（AI-06）；AI 错误码不暴露 apiKey/URL/路径/堆栈（S9）。

### 9.4 确定性违规（DETERMINISM_VIOLATION）

> 最严重错误，触发停止写入并报告。

| 触发场景 | 处理策略 |
|---|---|
| lineage_hash 两次运行不一致 | **立即停止写入**；报告用户；不自动重试 |
| signals 派生与 snapshots 不一致 | T4 验证失败；报告用户；不写入生产库 |
| rule_versions 缺失 | Service 拒绝发布（MALF v2.1 S4） |
| runtime_fingerprint 泄露 | D5 违规；阻断合并（contract AST 校验） |

**处理流程**：

```
检测到 DETERMINISM_VIOLATION
    │
    ▼
停止写入生产库（不继续 ingest）
    │
    ▼
回退到沙箱副本（§7.2 步骤 2）
    │
    ▼
定位违规根因（查 spec → 查代码，不改 fixture，见 §6.1 Golden fixture 原则）
    │
    ▼
修复后重新跑 §7.2 步骤 2 沙箱验证
    │
    ▼
用户授权后才允许重试生产库写入
```

---

## §10 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：数据管道主路径（v0.01 继承 + v0.02 只读 Viewer）；风险声明路径（declare/check/interpret 三步）；AI 解读路径（snapshot/backtest/discover，AI-06 失败不阻塞）；备份恢复路径（联锁 + 三层 fallback）；组件治理流程（引用 11-组件装配 + Golden fixture 原则 + 中断恢复 + 开工强制入口顺序）；数据运维 SOP（v0.01 ops.md 继承，5 步 + 联锁）；6 个状态机（数据管道/风险声明/AI 解读/备份恢复/标的监控/回测验证）；错误处理（4 类错误码 + DETERMINISM_VIOLATION 流程）。输入：02-PRD §1.3/§6 + 03-架构设计 §4 + 06-API §2/§3/§5/§6 + v0.01 kiro-design.md §1.1/§3/§6.3 + ops.md v1.0 + workflow.md §3/§5/§7 + 00-索引 §8 |
| v0.1.1 | 2026-08-10 | 第五轮交叉审查修复（AGENTS.md §11.4）：① §3.1 交叉引用修正（"06-API §7.3 安全隔离 6 个"→"06-API §3 安全隔离 6 个"，§7.3 实际标题为"黑名单 7 个"，安全隔离 6 个是 §3 双层暴露分类术语）；② §2.4 工具→Tab 映射表补 `quantify_risk` 行（风险声明 Tab，RISK 量化器展示，P0-B 修复同步）；③ 头部版本号 v0.1.0→v0.1.1 对齐 AGENTS.md §3.1 已登记版本（v0.1.6 阶段头部修正的版本历史补登）。 |

---

**文档维护**：流程变更时更新，重大变更需用户批准
**最后更新**：2026-08-10
