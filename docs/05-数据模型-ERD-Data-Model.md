# 05-数据模型-ERD-Data-Model

**版本**：v0.1.3
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：[03-架构设计](./03-架构设计-Architecture-Design.md)
**下游**：[06-API](./06-API契约-API-Contracts.md)、[07-工作流](./07-工作流-Workflow.md)、[08-测试验收](./08-测试验收-Test-Plan.md)
**用途**：v0.02 数据层 schema SoT

---

## §1 数据库概述

### 1.1 数据库选型

v0.02 数据层完全继承 v0.01 的 DuckDB 生产库，新增表仅用于风险声明与 AI 解读的持久化。

| 属性 | 值 |
|---|---|
| 数据库引擎 | DuckDB（嵌入式分析数据库） |
| 数据库文件 | `Z:\ai-malf-riskbench-data\riskbench.duckdb`（v0.01 继承） |
| 进程模型 | 单机单用户单写进程（v0.01 SOP 约束） |
| v0.02 访问模式 | **只读 Viewer**（D28），不修改 snapshots/signals 表 |
| 写入路径 | 仍走 v0.01 `run_pipeline.ps1`（受 ops.md SOP 约束） |
| 备份格式 | Parquet（EXPORT DATABASE 产物） |

### 1.2 表清单

| # | 表名 | 类型 | 列数 | 主键 | 来源 |
|---|---|---|:--:|---|---|
| 1 | `snapshots` | v0.01 继承 | 44 | (symbol, timeframe, bar_dt) | v0.01 erd.md + MALF v2.1 Service §2 |
| 2 | `signals` | v0.01 继承 | 10 | signal_id | v0.01 erd.md + MALF v2.1 Service §2 |
| 3 | `risk_declarations` | v0.02 新增 | 9 | declaration_id | PRD §6.2 |
| 4 | `ai_interpretations` | v0.02 新增 | 13 | interpretation_id | v0.02 新建（§5.2） |
| 5 | `config/models.json` | v0.02 新增（文件） | — | — | TRD §7 决策 3 |

### 1.3 设计原则

1. **44 字段契约不可变**：WaveStructuralSnapshot 44 字段是 v0.02 唯一对外契约，下游（RISK/AI/BENCH/Viewer）只读不写
2. **v0.01 schema 不修改**：snapshots/signals 表结构与 v0.01 完全一致，v0.02 只新增表
3. **只读 Viewer 不改写**：v0.02 新增的 Viewer 只读 DuckDB，写入仍走 v0.01 管道（D28）
4. **持久化分层**：DuckDB（生产库）+ JSONL（引擎内部）+ Parquet（冷备）三层各司其职
5. **honest degradation**：None 就是 None，不补零不估计不降级替代（MALF v2.1 Service §8）

### 1.4 生产库现状（v0.01 继承基线）

| 维度 | 值 |
|---|---|
| 标的 | 3 个（sh510050 / sh510300 / sz159915）——D3 扩展目标 ETF 500+（见 T-M2-019~021） |
| 周期 | day / week / month（3 周期） |
| snapshots 行数 | 15397 行 |
| signals 事件数 | 2835 事件 |
| usage 分布 | 全 research_only / stale_research_only |
| approved_as_of_date | 20260804 |

---

## §2 DuckDB 生产库 schema（v0.01 继承）

### 2.1 snapshots 表（44 显式列，PK symbol,timeframe,bar_dt）

> 出处：v0.01 erd.md + MALF v2.1 Service §2 WaveStructuralSnapshot 44 字段契约

**主键**：`(symbol, timeframe, bar_dt)`，复合主键，无 surrogate id / created_at / JSON 单列。

**列分组**（按 dataclass 顺序）：

| 分组 | 字段数 | 范围 |
|---|:--:|---|
| 身份 | 4 | symbol, timeframe, bar_dt, bar_index |
| Core | 10 | system_state, direction, active_wave_id, progress_extreme_price, progress_extreme_bar_dt, guard_price, guard_bar_dt, bar_count, break_bar_dt, break_price |
| Transition/Range | 9 | transition_boundary_high, transition_boundary_low, candidate_pivot_type, candidate_pivot_price, range_boundary_high_now, range_boundary_low_now, range_evolution_count, range_candidate_replacement_count, range_type |
| Lifespan Wave | 3 | wave_span_rank, wave_range_rank, wave_stagnation_rank |
| Lifespan Range | 4 | range_span_rank, range_evolution_rank, range_replacement_rank, range_resolution_distance_rank |
| Structural Position | 9 | p2_same_dir_span_momentum, p2_same_dir_range_momentum, p2_same_dir_label, p3_cross_dir_span_momentum, p3_cross_dir_range_momentum, p3_cross_dir_label, p4_cross_span_momentum, p4_cross_range_momentum, p4_cross_alive_warning |
| 元数据 | 5 | rule_versions(JSON), lineage_hash, reason_codes(JSON), usage, freshness |
| **合计** | **44** | — |

> 完整字段说明见 §3。

### 2.2 signals 表（10 列，PK signal_id）

> 出处：v0.01 erd.md + MALF v2.1 Service §2 事件流契约

| # | 列名 | 类型 | 说明 |
|---|---|---|---|
| 1 | `signal_id` | VARCHAR (PK) | 事件唯一标识 |
| 2 | `symbol` | VARCHAR | 标的代码 |
| 3 | `timeframe` | VARCHAR | 周期（day/week/month） |
| 4 | `bar_dt` | VARCHAR | 关联 bar 时间 |
| 5 | `event_type` | VARCHAR | 事件类型（4 码，见下表） |
| 6 | `detail` | JSON | 事件详情 |
| 7 | `rule_version` | VARCHAR | 固定 `malf-signal-event-v1` |
| 8 | `lineage_hash` | VARCHAR | SHA256 指纹（确定性约束 D4） |
| 9 | `usage` | VARCHAR | 用途分级（research_only/stale_research_only） |
| 10 | `freshness` | VARCHAR | 新鲜度标记 |

**event_type 4 事件码**（方向 C，malf-signal）：

| 事件码 | 含义 |
|---|---|
| `wave_terminated` | 波段终止（break 触发） |
| `range_resolved` | 震荡区间解决 |
| `guard_triggered` | 守卫价触发 |
| `break_triggered` | 突破价触发 |

**约束**：
- `rule_version` 固定为 `malf-signal-event-v1`（v0.01 继承，v0.02 不变）
- 事件流确定性：相同输入 → 相同事件行与 lineage_hash（D23）
- SignalStore 幂等写入（v0.01 malf-signal 37 passed）

---

## §3 WaveStructuralSnapshot 44 字段详解（按层分组）

> 出处：MALF v2.1 Service §2 + `MALF_05_Service_v2_1-deepseek-20260726.md` + v0.01 erd.md

字段按 dataclass 顺序排列，分 7 组共 44 字段。所有 None 字段必须附 `reason_codes`（MALF v2.1 Service §8 honest degradation）。

### 3.1 身份（4 字段）

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 1 | `symbol` | str | 标的代码（如 sh510050） |
| 2 | `timeframe` | str | 周期（day/week/month） |
| 3 | `bar_dt` | str | bar 时间戳（严格递增，D12） |
| 4 | `bar_index` | int | bar 序号（从 0 起） |

### 3.2 Core（10 字段）

> 对应 MALF v2.1 Core 层 CoreStateSnapshot 的对外投影

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 5 | `system_state` | str | 系统状态（uninitialized/transition_active/wave_alive 等） |
| 6 | `direction` | str | 当前波段方向（up/down） |
| 7 | `active_wave_id` | str | 活跃波段 ID（永不复用，L6） |
| 8 | `progress_extreme_price` | int | 进展极值价（整数，D2） |
| 9 | `progress_extreme_bar_dt` | str | 进展极值 bar 时间 |
| 10 | `guard_price` | int | 守卫价（整数，严格 `<` 判定，D3） |
| 11 | `guard_bar_dt` | str | 守卫价 bar 时间 |
| 12 | `bar_count` | int | 当前波段 bar 计数 |
| 13 | `break_bar_dt` | str | break 触发 bar 时间 |
| 14 | `break_price` | int | break 触发价（整数） |

### 3.3 Transition/Range（9 字段）

> 对应 MALF v2.1 Range 层震荡区间一等公民

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 15 | `transition_boundary_high` | int | 转换边界高（初始化后不可变，R1） |
| 16 | `transition_boundary_low` | int | 转换边界低（初始化后不可变，R1） |
| 17 | `candidate_pivot_type` | str | 候选 pivot 类型 |
| 18 | `candidate_pivot_price` | int | 候选 pivot 价格 |
| 19 | `range_boundary_high_now` | int | 区间边界高（当前，可演化，R2） |
| 20 | `range_boundary_low_now` | int | 区间边界低（当前，可演化，R2） |
| 21 | `range_evolution_count` | int | 区间演化计数 |
| 22 | `range_candidate_replacement_count` | int | 区间候选替换计数 |
| 23 | `range_type` | str | 区间类型 |

### 3.4 Lifespan Wave（3 字段）

> 对应 MALF v2.1 Lifespan 层 Wave 双轨排名

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 24 | `wave_span_rank` | float | 波段时间跨度排名 |
| 25 | `wave_range_rank` | float | 波段幅度排名 |
| 26 | `wave_stagnation_rank` | float | 波段停滞度排名 |

### 3.5 Lifespan Range（4 字段）

> 对应 MALF v2.1 Lifespan 层 Range 双轨排名

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 27 | `range_span_rank` | float | 区间时间跨度排名 |
| 28 | `range_evolution_rank` | float | 区间演化排名 |
| 29 | `range_replacement_rank` | float | 区间替换排名 |
| 30 | `range_resolution_distance_rank` | float | 区间解决距离排名 |

### 3.6 Structural Position（9 字段）

> 对应 MALF v2.1 Structural Position 层 P1/P2/P3/P4 四视图（v2.0→v2.1 Probability 更名）

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 31 | `p2_same_dir_span_momentum` | float | P2 同向时间跨度动量（向量差，非概率） |
| 32 | `p2_same_dir_range_momentum` | float | P2 同向幅度动量 |
| 33 | `p2_same_dir_label` | str | P2 同向标签（辅助性） |
| 34 | `p3_cross_dir_span_momentum` | float | P3 反向时间跨度动量 |
| 35 | `p3_cross_dir_range_momentum` | float | P3 反向幅度动量 |
| 36 | `p3_cross_dir_label` | str | P3 反向标签 |
| 37 | `p4_cross_span_momentum` | float | P4 跨向时间跨度动量 |
| 38 | `p4_cross_range_momentum` | float | P4 跨向幅度动量 |
| 39 | `p4_cross_alive_warning` | bool | P4 跨向存活警告（真实布尔，非 fallback） |

### 3.7 元数据（5 字段）

| # | 字段名 | 类型 | 说明 |
|---|---|---|---|
| 40 | `rule_versions` | JSON | 参与计算的规则版本（见 §3.8） |
| 41 | `lineage_hash` | str | SHA256 指纹（64 字符 hex，D4/D9） |
| 42 | `reason_codes` | JSON | 失败模式枚举（见 §3.9） |
| 43 | `usage` | str | 用途分级（research_only/stale_research_only 等） |
| 44 | `freshness` | str | 新鲜度标记 |

### 3.8 rule_versions 标准内容

每个 snapshot 必须携带完整 rule_versions，缺失则禁止发布（MALF v2.1 Service S4）。

| 键 | 值 |
|---|---|
| `pivot_rule` | `fractal_k2_v1.0` |
| `price_domain` | `source_integer_fixed_point_v0.1` |
| `adapter` | `malf-v2.0-etf-tick-v0.1` |
| `core_version` | `v2.1` |
| `range_version` | `v2.1` |
| `lifespan_version` | `v2.1` |
| `structural_position_version` | `v2.1` |

### 3.9 reason_codes 11 枚举

> 出处：MALF v2.1 Service §8 + types.py

| 枚举值 | 含义 |
|---|---|
| `uninitialized` | 引擎未初始化 |
| `transition_active` | 转换态激活（非波段） |
| `wave_alive` | 波段存活中 |
| `input_integrity_failure` | 输入完整性失败 |
| `data_stale` | 数据陈旧 |
| `peer_sample_insufficient` | peer 样本不足（N<30，L4） |
| `same_dir_peers_absent` | 同向 peers 缺失 |
| `cross_dir_peers_absent` | 反向 peers 缺失 |
| `no_prior_wave` | 无前序波段 |
| `range_alive` | 区间存活中 |
| `operational_disabled` | operational 用途禁用（v0.1 硬编码） |

---

## §4 CoreStateSnapshot 字段（引擎内部，不直接持久化）

> 出处：MALF v2.1 Core §8 + `MALF_01_Core_v2_1-deepseek-20260726.md` + `types.py`

CoreStateSnapshot 是 MALF 引擎 Core 层的内部状态对象，**不直接持久化到 DuckDB**，而是经 Service 层组装为 WaveStructuralSnapshot 44 字段后持久化。字段分 10 组共 43 字段（含 Range 扩展）。

| 分组 | 字段数 | 说明 |
|---|:--:|---|
| identity | 4 | symbol/timeframe/bar_dt/bar_index |
| system | 1 | system_state |
| wave | 7 | active_wave_id/direction/progress_extreme 等 |
| guard | 3 | guard_price/guard_bar_dt 等 |
| progress | 2 | progress_extreme_price/progress_extreme_bar_dt |
| break | 3 | break_bar_dt/break_price 等 |
| transition | 7 | transition_boundary_*/candidate_pivot_* 等 |
| version | 4 | rule_versions 子集 |
| audit | 2 | lineage_hash/audit |
| Range | 10 | range_boundary_*/range_evolution_* 等 |

**说明**：
- CoreStateSnapshot 经 Service 层组装后投影为 snapshots 表的 Core(10) + Transition/Range(9) 共 19 字段
- Lifespan 与 Structural Position 字段由各自层在组装时附加，不属于 CoreStateSnapshot
- 引擎内部持久化路径见 §6

---

## §5 v0.02 新增表

### 5.1 risk_declarations 表（风险声明记录）

> 出处：PRD §6.2 风险声明边界

风险声明是**用户对市场事实（第一层）的解读与风险判断**，属于第二层权威，AI 不可修改。

| # | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| 1 | `declaration_id` | VARCHAR | PK | 唯一标识 |
| 2 | `symbol` | VARCHAR | NOT NULL | 标的代码 |
| 3 | `timeframe` | VARCHAR | NOT NULL | 周期（day/week/month） |
| 4 | `bar_dt` | VARCHAR | NOT NULL | 关联 bar 时间 |
| 5 | `user_text` | TEXT | NOT NULL | 用户手写或模板辅助的声明文本 |
| 6 | `linked_snapshot_fields` | JSON | NOT NULL | 关联的 snapshot 字段（如 rank/label） |
| 7 | `created_at` | VARCHAR | NOT NULL | 创建时间（ISO 8601） |
| 8 | `ai_interpretation` | TEXT | NULLABLE | AI 解读（必须标注"AI 解读"） |
| 9 | `ai_interpretation_marked` | BOOLEAN | NOT NULL DEFAULT FALSE | AI 解读是否已标注 |

**约束**：
- 用户主权：用户可创建/修改/删除自己的风险声明
- AI 不可修改：AI 只能读取风险声明，不能修改 `user_text`（S33）
- AI 只提醒矛盾：AI 可检测风险声明与市场事实的矛盾并提醒（S34）
- AI 解读必须标注：`ai_interpretation` 字段必须标明"AI 解读"，`ai_interpretation_marked` 必须为 TRUE（S33）

**存储位置**：v0.02 运行时沙箱 `Z:\pi-malf-riskbench-v0.02-runtime\` 下独立 DuckDB 文件，**不污染生产库**。

> **写入通道**（P1-2 修复）：risk_declarations 表的建表与写入需 v0.02 自建**可写 DuckDB 连接层**（T-M2-016），**不依赖** T-M1-001（DuckDB 只读访问层，SELECT only）。T-M1-001 仅服务 UI 渲染路径的只读查询（snapshots/signals 表，生产库）；risk_declarations/ai_interpretations 表的写入走运行时沙箱独立 DB 的可写连接。

> **可写连接层容错**（P1-2 修复，与 03-Arch §4.2.2 一致）：
> - **WAL 模式**：`PRAGMA journal_mode=WAL`，写不阻塞读，崩溃后自动 WAL replay 恢复
> - **单连接串行写**：可写连接层单例（单写进程约束，AGENTS.md §1.1），写操作串行排队，避免并发写冲突
> - **崩溃恢复**：DuckDB WAL replay 自动恢复已提交事务；未提交事务回滚；连接断开自动重连（最多 3 次）
> - **写超时**：单次写操作超时 10 秒，超时返回 `DUCKDB_ERROR`
> - **数据隔离**：独立文件 `Z:\pi-malf-riskbench-v0.02-runtime\riskbench-runtime.duckdb`，不污染生产库
> - **失败降级**：写失败 → 返回 `DUCKDB_ERROR`，UI 提示重试；不阻塞查询路径（TS 只读层独立）

### 5.2 ai_interpretations 表（AI 解读记录）

> 出处：v0.02 新建，对应 PRD §2.3 AI 层 + §6.2 风险声明 AI 解读字段

AI 解读属于第三层权威，必须明确标注"AI 解读"，失败不阻塞确定性规则（AI-06）。

| # | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| 1 | `interpretation_id` | VARCHAR | PK | 唯一标识 |
| 2 | `symbol` | VARCHAR | NOT NULL | 标的代码 |
| 3 | `timeframe` | VARCHAR | NOT NULL | 周期 |
| 4 | `bar_dt` | VARCHAR | NOT NULL | 关联 bar 时间 |
| 5 | `source_type` | VARCHAR | NOT NULL | 解读源类型（snapshot/backtest/risk_declaration） |
| 6 | `source_ref` | VARCHAR | NOT NULL | 解读源引用（如 declaration_id） |
| 7 | `provider` | VARCHAR | NOT NULL | AI provider 标识 |
| 8 | `model` | VARCHAR | NOT NULL | AI model 标识 |
| 9 | `content` | TEXT | NOT NULL | AI 解读内容（自然语言） |
| 10 | `marked_label` | VARCHAR | NOT NULL DEFAULT 'AI 解读' | 标注标签 |
| 11 | `created_at` | VARCHAR | NOT NULL | 创建时间（ISO 8601） |
| 12 | `usage` | VARCHAR | NOT NULL DEFAULT 'research_only' | 用途分级 |
| 13 | `error_code` | VARCHAR | NULLABLE | AI 失败错误码（失败不阻塞） |

**约束**：
- AI 解读必须标注：`marked_label` 固定为 'AI 解读'（AI-05）
- AI 失败不阻塞：失败时记录 `error_code`，不影响确定性规则（AI-06）
- AI 不修改市场事实与用户声明两层（S33/S34/S35）
- provider/model 信息来自 `config/models.json`（见 §5.3）

**存储位置**：与 risk_declarations 同库（v0.02 运行时沙箱），不污染生产库。

### 5.3 config/models.json（pi 默认模型持久化，带 __riskbench_managed 标记）

> 出处：TRD §7 决策 3 + 03-Architecture §3.3 model_select 钩子 + prep-参考点核对表 §一

v0.02 默认模型选型落业务数据根 `config/models.json`，带 `__riskbench_managed` 标记，**不侵入 `~/.pi`**。

**路径**：`Z:\ai-malf-riskbench-data\config\models.json`

**结构示例**（伪 JSON，实现时以代码为准）：

```json
{
  "__riskbench_managed": true,
  "default_provider": "zai",
  "default_model": "glm-4.6",
  "providers": {
    "zai": { "endpoint": "...", "thinking_level": "medium" }
  },
  "updated_at": "2026-08-09T00:00:00+08:00"
}
```

**规则**：
- `__riskbench_managed: true` 标记此文件由 v0.02 管理，pi 内核不直接覆盖
- model_select 钩子触发时写入（03-Architecture §3.3）
- 与 pi 会话目录 `~/.pi/agent/models.json` 物理隔离（TRD §7 决策 3）
- 密钥不落此文件，走 credential-vault safeStorage（INV-04）

---

## §6 引擎内部持久化（MALF v2.1 Service §持久化）

> 出处：MALF v2.1 Service §持久化 + 03-Architecture §5.3

MALF 引擎 Core 层的内部状态（CoreStateSnapshot）经 Service 层组装为 WaveStructuralSnapshot 后，除持久化到 DuckDB 外，还在引擎内部维护一套 JSONL 持久化结构，用于中断恢复。

### 6.1 目录结构

```
var/
├── staging/       # 中间计算产物（可重建）
├── published/     # 不可变快照（JSON Lines）
│   └── {symbol}/{timeframe}/{symbol}_{timeframe}_{bar_dt}.jsonl
└── current.json   # 原子指针（指向最新已发布快照）
```

### 6.2 铁律

| 编号 | 规则 | 出处 |
|---|---|---|
| S5（MALF） | var/ 可重建，state/ 不可重建 | MALF v2.1 Service §持久化 |
| S-01 | 中断恢复：从 current.json 读最后快照 → 从其 bar_dt 之后重算 | MALF v2.1 Service §中断恢复 |
| — | 中断前快照不重算不覆盖 | MALF v2.1 Service §中断恢复 |

### 6.3 中断恢复流程

1. 读取 `current.json` 获取最后已发布快照的 bar_dt
2. 从该 bar_dt 之后重算后续 bar
3. 中断前的快照不重算、不覆盖
4. 重算结果追加到 published/ 并更新 current.json

---

## §7 备份结构（v0.01 继承）

> 出处：v0.01 erd.md + 03-Architecture §5.4

### 7.1 Parquet 冷备

- 备份方式：DuckDB `EXPORT DATABASE` 产物
- 备份路径：`Z:\ai-malf-riskbench-data\*.parquet`
- 备份脚本：v0.01 `scripts/backup.py` + `restore.py` + `pipeline_guard.py`
- 触发：v0.01 `run_pipeline.ps1` 管道运行前自动备份

### 7.2 三层 fallback

| 层 | 触发条件 | 动作 | 出处 |
|---|---|---|---|
| 1 软降级 | DuckDB 查询失败 | 返回 None + reason_codes，不崩溃 | honest degradation |
| 2 Parquet 恢复 | DuckDB 文件损坏 | 从 Parquet 冷备 restore | v0.01 restore.py |
| 3 TDX 全量重跑 | Parquet 亦不可用 | 从 TDX .day 原始数据全量重跑管道 | v0.01 run_pipeline.ps1 |

### 7.3 交叉核验源

- 旧版 DuckDB：`Z:\riskbench-data-old\*.duckdb`（6 个文件，只读，S15）
- 用途：交叉核验，非主要数据源

---

## §8 ER 关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                    DuckDB 生产库（v0.01 继承）                    │
│  ┌───────────────────────────┐    ┌──────────────────────────┐  │
│  │      snapshots (44 列)    │    │      signals (10 列)     │  │
│  │  PK(symbol,timeframe,     │    │  PK(signal_id)           │  │
│  │     bar_dt)               │    │                          │  │
│  │                           │    │  FK(symbol,timeframe,    │  │
│  │  rule_versions(JSON)      │◄───│     bar_dt) → snapshots  │  │
│  │  reason_codes(JSON)       │    │                          │  │
│  │  lineage_hash             │    │  event_type(4码)         │  │
│  │  usage/freshness          │    │  rule_version(固定)      │  │
│  └─────────────┬─────────────┘    └──────────────────────────┘  │
│                │                                                 │
│                │ 只读访问（D28，v0.02 Viewer）                   │
└────────────────┼─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              v0.02 运行时沙箱 DuckDB（独立文件）                  │
│  ┌───────────────────────────┐    ┌──────────────────────────┐  │
│  │  risk_declarations (9 列) │    │  ai_interpretations(13列)│  │
│  │  PK(declaration_id)       │    │  PK(interpretation_id)   │  │
│  │                           │    │                          │  │
│  │  symbol/timeframe/bar_dt  │    │  symbol/timeframe/bar_dt │  │
│  │  user_text                │    │  source_type/source_ref  │  │
│  │  linked_snapshot_fields   │    │  provider/model          │  │
│  │  ai_interpretation        │◄───│  content                 │  │
│  │  ai_interpretation_marked │    │  marked_label('AI 解读') │  │
│  └─────────────┬─────────────┘    └──────────────────────────┘  │
│                │                                                 │
│                │ 引用 snapshots（只读，逻辑外键）                 │
└────────────────┼─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              config/models.json（业务数据根，文件）               │
│  __riskbench_managed: true                                       │
│  default_provider / default_model                                │
│  providers{...}                                                  │
│  ── 提供 provider/model 给 ai_interpretations.provider/model     │
└─────────────────────────────────────────────────────────────────┘
```

**关系说明**：
- snapshots ↔ signals：1:N（一个 snapshot 可产生 0..N 个 signal 事件）
- snapshots ↔ risk_declarations：1:N（逻辑外键，不强制物理外键）
- risk_declarations ↔ ai_interpretations：1:N（一个声明可有多个 AI 解读版本）
- snapshots ↔ ai_interpretations：1:N（source_type='snapshot' 时引用）
- config/models.json → ai_interpretations：提供 provider/model 标识

---

## §9 数据流（4 条：Ingest/Signal/Backtest/Recovery）

### 9.1 Ingest 数据流（v0.01 继承，写入路径）

```
TDX .day (只读, Z:\new_tdx64\vipdoc\{sh,sz}\lday\*.day)
    │  tdx_reader 32B 严格解析 (D11/D22)
    ▼
PriceBar (全整数, D2/D13)
    │  bar_dt 严格递增 (D12)
    ▼
MALFCoreEngine.on_bar (malf-engine, 115 passed)
    │  → CoreStateSnapshot (引擎内部)
    ▼
Service 层组装 WaveStructuralSnapshot (44 字段)
    │  lineage_hash SHA256 (D4/D9)
    │  rule_versions 完整性校验 (S4)
    ▼
DuckDBAdapter 幂等写入 snapshots 表 (PK symbol,timeframe,bar_dt)
    │  逐行 INSERT + COMMIT (NF-07)
    ▼
var/published/{symbol}/{timeframe}/*.jsonl (引擎内部持久化)
    │  current.json 原子指针更新
    ▼
DuckDB 生产库 (Z:\ai-malf-riskbench-data\riskbench.duckdb)
```

**约束**：写入仍走 v0.01 `run_pipeline.ps1`（受 ops.md SOP 约束），v0.02 只读 Viewer 不触发此流。

### 9.2 Signal 数据流（v0.01 继承）

```
snapshots 序列 (DuckDB)
    │  malf-signal detect_events 纯函数 (37 passed)
    ▼
signals 事件流 (4 事件码: wave_terminated/range_resolved/guard_triggered/break_triggered)
    │  rule_version 固定 malf-signal-event-v1
    │  确定性: 相同输入 → 相同事件行与 lineage_hash (D23)
    ▼
SignalStore 幂等写入 signals 表 (PK signal_id)
    ▼
DuckDB 生产库 signals 表
```

### 9.3 Backtest 数据流（v0.01 继承 + v0.02 只读）

```
snapshots + signals (DuckDB, 只读)
    │  malf-backtest run_full_verification (31 passed)
    ▼
T4 确定性规则验证
    │  触发序列验证 + SQL 交叉验证 + 规则版本审计 + 参数鲁棒性
    │  两次运行报告逐字节一致 (D24)
    ▼
回测报告 (Markdown/HTML, research_only)
    │  v0.02: HTML 预览独立 CSP (INV-06)
    ▼
v0.02 只读 Viewer 展示 (BENC-08)
```

### 9.4 Recovery 数据流（v0.01 继承三层 fallback）

```
DuckDB 查询失败
    │  软降级 (honest degradation)
    ▼  返回 None + reason_codes
    │  若 DuckDB 文件损坏
    ▼
Parquet 冷备恢复 (restore.py)
    │  EXPORT DATABASE 产物
    ▼  若 Parquet 亦不可用
    │
TDX 全量重跑 (run_pipeline.ps1)
    │  从 .day 原始数据重新 ingest
    ▼
新 DuckDB 生产库
```

---

## §10 约束与触发器

### 10.1 PK 约束

| 表 | 主键 | 说明 |
|---|---|---|
| snapshots | (symbol, timeframe, bar_dt) | 复合主键，无 surrogate id |
| signals | signal_id | 单列主键 |
| risk_declarations | declaration_id | 单列主键 |
| ai_interpretations | interpretation_id | 单列主键 |

### 10.2 UNIQUE 约束

| 表 | 唯一约束 | 说明 |
|---|---|---|
| snapshots | (symbol, timeframe, bar_dt) | 与 PK 一致，幂等写入 |
| signals | signal_id | 事件唯一标识 |
| risk_declarations | declaration_id | 声明唯一标识 |

### 10.3 CHECK 约束

| 表 | 约束 | 说明 |
|---|---|---|
| snapshots | usage IN ('rejected','research_only','stale_research_only','verification_only') | operational 禁用（S29） |
| snapshots | bar_dt 严格递增（应用层） | D12 |
| signals | event_type IN ('wave_terminated','range_resolved','guard_triggered','break_triggered') | 4 事件码 |
| signals | rule_version = 'malf-signal-event-v1' | 固定版本 |
| risk_declarations | ai_interpretation_marked IN (TRUE, FALSE) | 布尔 |
| ai_interpretations | marked_label = 'AI 解读' | AI-05 强制标注 |

### 10.4 路径穿透防护

| 编号 | 约束 | 出处 |
|---|---|---|
| S16 | 路径穿透防护：`_guard` 检查结果在 DATA_ROOT 子树内，拒绝 `../` 逃逸 | v0.01 riskbench-shared paths.py |
| S17 | 禁止硬编码绝对路径，所有路径经 paths.py 函数获取 | v0.01 riskbench-shared |
| — | v0.02 只读 Viewer 访问路径必须落在业务数据根子树内 | 03-Architecture §4.2 |

### 10.5 v0.02 访问约束

| 编号 | 约束 | 出处 |
|---|---|---|
| D28 | v0.02 只读 Viewer 不修改 snapshots/signals 表 | TRD §8 |
| D29 | pi 扩展层不修改 MALF 引擎的 rule_versions 与 lineage_hash | TRD §8 |
| NF-06 | DuckDB WAL 自动保护 | v0.01 |
| NF-07 | 逐行 INSERT + COMMIT | v0.01 |

---

## §11 PRAGMA 配置（DuckDB WAL + memory_limit + threads）

> 出处：v0.01 trd §7 性能基准 + 03-Architecture §5.2

### 11.1 DuckDB PRAGMA 配置

| PRAGMA | 值 | 说明 | 出处 |
|---|---|---|---|
| `wal_autocheckpoint` | ON | WAL 自动检查点（NF-06） | v0.01 |
| `memory_limit` | 4GB | 内存上限 | v0.01 trd §7 |
| `threads` | 2 | 线程数 | v0.01 trd §7 |
| `checkpoint_threshold` | 默认 | WAL 检查点阈值 | DuckDB 默认 |

### 11.2 连接池配置

- v0.02 只读访问层使用单例连接池（03-Architecture §4.2）
- 查询超时 30 秒
- 崩溃不拖垮桌面（子进程隔离，DECISION-v02-004）

### 11.3 性能基准（继承 v0.01 + D3 扩展目标）

| 指标 | 基准 | 出处 |
|---|---|---|
| 单 bar 处理 | < 50ms | v0.01 trd §7 |
| 3 标的全链路 | < 5 分钟 | v0.01 trd §7 |
| 全市场（v0.01 定义） | < 30 分钟 | v0.01 trd §7 |
| **D3 ETF 500+ 分批 ingest（T-M2-020）** | 每批 50 标的，全历史重建预估 8-14 小时（分批串行 + 增量续跑 S-01 中断恢复） | v0.02 T-M2-020 |
| **全市场横截面查询（D2）** | 500 标的×3 周期最新快照 < 500ms | v0.02 06-API §3.1（T-M1-012） |
| DuckDB 内存 | 4GB | v0.01 trd §7 |
| DuckDB 线程 | 2 | v0.01 trd §7 |
| 磁盘空间 | ≥ 2GB（D3 扩展后 snapshots 预计 750 万行，需 ≥ 10GB） | v0.01 trd §7 + D3 |
| Electron 启动 | < 3 秒（v0.02 新增） | — |
| MALF 查询响应 | < 500ms（v0.02 新增） | — |

---

## §12 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：继承 v0.01 snapshots(44)/signals(10) schema + 新增 risk_declarations/ai_interpretations/config.models.json + 引擎内部持久化 + 备份三层 fallback + ER 关系图 + 4 数据流 + 约束与 PRAGMA |
| v0.1.1 | 2026-08-09 | 第三轮交叉审查修复：§5.1 risk_declarations 表写入通道说明（P1-2 修复，建表需可写连接层 T-M2-016，非只读访问层 T-M1-001）；§5.2 ai_interpretations 表关系说明（P2-4，与内嵌字段关系）。 |
| v0.1.2 | 2026-08-10 | 任务边界与容错审计 P1-2 修复：§5.1 可写连接层容错（WAL 模式 + 单连接串行写 + 崩溃恢复 ≤3 次重连 + 写超时 10 秒 + 数据隔离 + 失败降级，与 03-Arch §4.2.2 一致）。 |
| v0.1.3 | 2026-08-10 | 标的池扩展 D3（ETF 500+）：§1.4 标的 3→500+（规划目标，T-M2-019~021）；§11.3 性能基准补 D3 分批 ingest 预估（每批 50 标的、全历史 8-14 小时）+ 全市场横截面查询 <500ms + 磁盘 ≥10GB。 |

---

**文档维护**：schema 变更时更新，重大变更需用户批准
**最后更新**：2026-08-10
