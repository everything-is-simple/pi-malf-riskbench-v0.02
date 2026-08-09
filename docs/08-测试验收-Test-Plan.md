# 08-测试验收-Test-Plan

**版本**：v0.1.1
**日期**：2026-08-10
**状态**：📝 草案（待用户审查批准）
**上游**：[02-PRD](./02-PRD-产品需求-Product-Requirements.md)、[03-架构设计](./03-架构设计-Architecture-Design.md)、[05-ERD](./05-数据模型-ERD-Data-Model.md)、[06-API](./06-API契约-API-Contracts.md)、[07-工作流](./07-工作流-Workflow.md)、[09-UI](./09-使用者介面-UI-Design.md)
**下游**：[04-任务清单](./04-任务清单-Todo-List.md)、[10-开发规范](./10-开发规范-Dev-Rules.md)
**血统**：v0.01 测试规范 + pi-studybuddy 08-Test 范式迁移
**用途**：v0.02 测试金字塔 + 四层分层 + 确定性验证 + 安全不变量 + G0-G3 门禁 SoT

---

## §1 概述

### 1.1 文档定位

本文档是 AI MALF RiskBench v0.02 的**测试验收唯一权威**，规定测试金字塔四层分层、关键断言矩阵、状态机测试矩阵、测试夹具、测试命名规范与合并 master 门槛。

本规范继承 v0.01 测试规范（TDD 三步 + Golden fixture 原则 + 证据顺序 + 290 passed 复验）与 pi-studybuddy 08-Test 范式（四层金字塔 + 安全不变量 + E2E 框架 vitest + Electron），结合 v0.02 的 pi 底座 + Electron 壳 + Adapter 桥接 + 只读 Viewer 特点形成。

**适用范围**：
- v0.02 主仓 `Z:\pi-malf-riskbench-v0.02` 全部业务代码的测试设计与验收
- v0.02 试炼场 `Z:\pi-malf-riskbench-v0.02-composer` 的 Adapter 试炼测试
- v0.01 五组件继承时的 290 passed 复验
- 安全不变量六条硬断言（INV-01~06）与确定性验证（D1-D29）的执行依据

**不适用范围**：
- v0.01 已实现组件的内部测试逻辑——继承不重写，只复验
- MALF v2.1 领域权威定义的语义验证——以 Definitive 原文为准
- 性能基准的正式验收——本文档只登记基准值，正式性能验收由 ops.md SOP 约束

### 1.2 测试目标

| # | 目标 | 衡量标准 |
|---|------|---------|
| 1 | 继承完整性 | v0.01 五组件 290 passed 全部通过 |
| 2 | pi 底座集成 | createAgentSession 可加载 v0.02 扩展，registerTool 工具可调用 |
| 3 | 桌面壳安全 | INV-01~06 六条硬断言全通过 |
| 4 | Adapter 桥接 | MALF Python 引擎经子进程可被 pi 扩展调用，lineage_hash 一致 |
| 5 | 只读 Viewer | 三栏布局 + Tabs 可展示 snapshots/signals/回测报告 |
| 6 | 确定性不变 | D1-D26 + D27-D29 全部通过 |
| 7 | 防泄露 | runtime_fingerprint 不暴露 / AI 解读标注 / 错误固定编码 |
| 8 | 用途分级 | G0-G3 门禁全部按合同触发 |
| 9 | 单机本地 | 只监听 127.0.0.1，无公网入口 |

### 1.3 测试金字塔（四层）

```
                    ┌─────────────────┐
                    │   系统 E2E      │  ≥24（vitest + Electron）
                    │  学生主路径      │  真实窗口 + 127.0.0.1
                    └─────────────────┘
                  ┌───────────────────┐
                  │    系统冒烟        │  ≥30（vitest + pytest）
                  │  S1-S7 + 安全不变量│  确定性验证脚本
                  └───────────────────┘
              ┌───────────────────────────┐
              │        集成测试            │  ≥60（vitest）
              │  extension×pi 底座 + 钩子  │  MALF Adapter 桥接
              └───────────────────────────┘
        ┌─────────────────────────────────────┐
        │            单件测试                  │  ≥300（vitest + pytest）
        │  registerTool 契约 + 触发器 + Adapter│  技能夹具
        └─────────────────────────────────────┘
```

**金字塔纪律**：
- 底层最厚：单件测试数量最多，覆盖每个工具/触发器/Adapter/夹具
- 顶层最薄：E2E 只覆盖学生主路径，不追求覆盖率
- 越往上越接近真实环境，越往下越快越确定
- 任一层失败退回上一层，不进 master

### 1.4 测试纪律七条铁律

继承 v0.01 AGENTS §9 + workflow.md §5 + pi-studybuddy 08-Test：

| # | 铁律 | 含义 | 违反后果 |
|---|------|------|---------|
| **铁律 1** | RED → GREEN → REFACTOR | 先写与权威条款对应的失败测试，再写最小实现使其通过，最后重构 | 禁止先实现再补测试；禁止用待测实现自动生成 golden 预期 |
| **铁律 2** | 证据顺序固定 | 设计文档权威条款 → 测试 ID → fixture → 预期事件序列 → 实际结果 → 审计证据 | 证据链断裂视为未验证 |
| **铁律 3** | 测试运行数据隔离 | 所有测试写入 `Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\`，绝不污染生产库 | 污染生产库立即停止 |
| **铁律 4** | 不连真实外部服务 | AI / SMTP / 飞书 全 mock，不发起真实网络请求 | 违反即测试无效 |
| **铁律 5** | Golden fixture 人肉推导 | fixture 必须人肉推导预期值，绝不改 fixture 让测试通过 | fixture 绝对不改，先查 spec 再查代码 |
| **铁律 6** | 测试即文档 | 测试名用中文描述被验证行为，不写 `test_1` `test_func` 等无意义名 | 命名不清晰退回重写 |
| **铁律 7** | 防泄露优先级最高 | runtime_fingerprint 不暴露 / AI 解读标注 / 错误固定编码，三者不可妥协 | 防泄露失败立即停止 |

**证据顺序链（每条关键不变量必须建立）**：

```
权威条款（03-Arch / 06-API / 08-Test / MALF v2.1）
    │
    ▼
测试 ID（如 T-UT-001）
    │
    ▼
fixture（tests/fixtures/，人肉推导）
    │
    ▼
预期事件序列（如 wave_terminated → range_resolved）
    │
    ▼
实际结果（pytest / vitest 输出）
    │
    ▼
审计证据（.record/T-XX-实施记录.md）
```

---

## §2 测试分层总览（对应五阶段）

### 2.1 四层分层速查表

| 分层 | 五阶段 | 范围 | 工具 | 运行环境 | 目标数量 |
|---|---|---|---|---|:--:|
| **单件** | 阶段 2 | registerTool 契约 + 数据层触发器 + MALF Adapter + 技能夹具 + **v0.01 继承复验（T-INH-* 段，290 passed）** | vitest + pytest | `Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\` | ≥300（含继承 290） |
| **集成** | 阶段 3 | extension×pi 底座 + 钩子协作 + MALF Adapter 桥接 | vitest | 同上 | ≥60 |
| **系统冒烟** | 阶段 5 | S1-S7 + 安全不变量 + 确定性验证 | vitest + pytest | 同上 | ≥30 |
| **系统 E2E** | 阶段 5 | 学生主路径 + 备份恢复 + AI 解读 | vitest + Electron | 同上 | ≥24 |

### 2.2 四层与五阶段映射

| 五阶段 | 单件 | 集成 | 系统冒烟 | 系统 E2E | 门槛 |
|---|:--:|:--:|:--:|:--:|---|
| 1. 下载储存 | — | — | — | — | 组件入库清单 |
| 2. 单件测试 | ✅ | — | — | — | 单件全绿 |
| 3. 集成测试 | ✅ | ✅ | — | — | 集成全绿 |
| 4. 系统组装 | ✅ | ✅ | — | — | type-check + build + contract AST |
| 5. 冒烟 + E2E | ✅ | ✅ | ✅ | ✅ | 安全不变量 + 确定性验证 |

### 2.3 五阶段退回规则

| 阶段 | 失败场景 | 退回到 | 处理 |
|---|---|---|---|
| 阶段 2 单件 | 单件测试失败 | 阶段 2 | 修正实现或测试（遵循 TDD 纪律） |
| 阶段 3 集成 | 集成测试失败 | 阶段 2 | 修正单件实现，重新走阶段 2-3 |
| 阶段 4 组装 | type-check/build/contract AST 失败 | 阶段 3 | 修正集成实现，重新走阶段 3-4 |
| 阶段 5 冒烟/E2E | 冒烟/E2E/安全不变量失败 | 阶段 4 | 修正组装实现，重新走阶段 4-5 |
| 任一阶段 | 安全不变量失败 | 立即停止 | 安全不变量不可妥协，必须修复后才继续 |

---

## §3 单件测试

### 3.1 registerTool 契约测试

**目标**：每个工具断言 execute 返回形状与抛错语义，registerTool 返回 void。

**测试范围**（对应 [03-架构设计 §3.2](./03-架构设计-Architecture-Design.md) registerTool 工具集）：

| 工具名 | 路由组 | 单件测试要点 | 测试 ID 段 |
|---|---|---|---|
| `query_snapshot` | malf.* | 正常输入返回 44 字段形状；缺失 symbol 抛 VALIDATION_ERROR；返回 `void`（registerTool） | T-UT-001 ~ T-UT-010 |
| `query_signals` | malf.* | 正常输入返回事件流列表；空范围返回空数组；非法 timeframe 抛错 | T-UT-011 ~ T-UT-020 |
| `query_symbol_list` | malf.* | 返回标的列表；DuckDB 只读不写 | T-UT-021 ~ T-UT-025 |
| `query_timeframes` | malf.* | 返回 day/week/month；缺失标的返回空 | T-UT-026 ~ T-UT-030 |
| `explain_snapshot` | malf.* | 字段引用 MALF v2.1；不输出预测 | T-UT-031 ~ T-UT-035 |
| `declare_risk` | risk.* | 创建/修改/删除声明；用户主权（AI 不可修改 user_text）；幂等 | T-UT-036 ~ T-UT-050 |
| `list_risk_declarations` | risk.* | 列出声明；按 created_at 排序；过滤 symbol/timeframe | T-UT-051 ~ T-UT-055 |
| `check_risk_contradiction` | risk.* | 检测矛盾；只提醒不修改；标注"AI 解读" | T-UT-056 ~ T-UT-065 |
| `quantify_risk` | risk.* | RISK 量化器（P0-B 修复，v0.1.6 追加）：只读 snapshot；不评分不决策；阈值参数化；lineage_hash 透传 | **T-UT-136 ~ T-UT-145（追加段，编号位于 export_csv T-UT-126~135 之后，非顺序排列）** |
| `ai_interpret_snapshot` | ai.* | 标注"AI 解读"；失败不阻塞；mock provider | T-UT-066 ~ T-UT-080 |
| `ai_interpret_backtest` | ai.* | 标注"AI 解读"；research_only 边界；mock provider | T-UT-081 ~ T-UT-090 |
| `ai_discover_rules` | ai.* | 信号发现辅助；不修改 MALF 引擎；mock provider | T-UT-091 ~ T-UT-100 |
| `run_backtest_report` | bench.* | 运行 T4 确定性规则验证；不输出收益类指标；只读副本库。**签名映射（A-03 修复）**：v0.01 `run_full_verification(db_path, symbols, timeframes)` 为批量签名（list 参数），Adapter `runBacktestVerification(symbol, timeframe)` 必须包一层单标的调用并传 db_path（`symbols=[symbol]`、`timeframes=[timeframe]`），不得透传（能力卡 §3 须记录两侧签名映射） | T-UT-101 ~ T-UT-115 |
| `read_backtest_report` | bench.* | 读取报告；HTML 预览独立 CSP；不存在返回 None | T-UT-116 ~ T-UT-125 |
| `export_csv` | viewer.* | 只读导出；路径穿透防护；空结果导出空文件 | T-UT-126 ~ T-UT-135 |

**通用断言**（每个工具必须）：
- `registerTool(tool)` 返回 `void`（不返回值）
- `execute` 成功返回 `{ content, details, usage?, terminate? }` 形状
- `execute` 失败 throw（不返回 error 对象，与 pi-desktop contract 一致）
- 错误返回固定安全编码（不暴露 Key/URL/路径/堆栈）
- 脱敏日志（只记 provider name + tokens + sanitized error code）

### 3.2 数据层触发器测试

**目标**：验证 DuckDB snapshots/signals 表的 PK/UNIQUE/CHECK 约束与路径穿透防护。

**测试范围**（对应 [05-ERD §4](./05-数据模型-ERD-Data-Model.md)）：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-UT-201 | 重复主键插入被 PK 约束拒绝 | snapshots PK(symbol, timeframe, bar_dt) 违反 → 抛错 |
| T-UT-202 | signals signal_id 重复被 UNIQUE 拒绝 | signal_id PK 违反 → 抛错 |
| T-UT-203 | system_state CHECK 约束 | 非 UNINITIALIZED/UP_ALIVE/DOWN_ALIVE/TRANSITION → 拒绝 |
| T-UT-204 | direction CHECK 约束 | 非 UP/DOWN/None → 拒绝 |
| T-UT-205 | range_type CHECK 约束 | 非 continuation/reversal/None → 拒绝 |
| T-UT-206 | usage CHECK 约束 | 非 verification_only/research_only/rejected → 拒绝（operational 禁用） |
| T-UT-207 | freshness CHECK 约束 | 非 current/stale → 拒绝 |
| T-UT-208 | event_type CHECK 约束 | 非 wave_terminated/range_resolved/guard_triggered/break_triggered → 拒绝 |
| T-UT-209 | 路径穿透防护拒绝 ../ 逃逸 | `_guard` 检查结果在 DATA_ROOT 子树内，拒绝 `../` |
| T-UT-210 | 路径穿透防护拒绝绝对路径 | 硬编码绝对路径被 `_guard` 拒绝 |
| T-UT-211 | Viewer 只读不修改 snapshots | SELECT 通过；INSERT/UPDATE/DELETE 被拒绝（D28） |
| T-UT-212 | Viewer 只读不修改 signals | SELECT 通过；INSERT/UPDATE/DELETE 被拒绝（D28） |
| T-UT-213 | pi 扩展不修改 rule_versions | rule_versions 字段只读（D29） |
| T-UT-214 | pi 扩展不修改 lineage_hash | lineage_hash 字段只读（D29） |
| T-UT-215 | rule_versions JSON 非空 | 每行 rule_versions 必须含 7 个版本键 |
| T-UT-216 | lineage_hash 64 字符 hex | SHA256 输出 64 字符十六进制 |
| T-UT-217 | reason_codes JSON 数组 | reason_codes 为 JSON 数组，枚举值合法 |
| T-UT-218 | 整数价格全链路禁止 float | open/high/low/close 为 BIGINT，无 float（D2） |
| T-UT-219 | 严格不等式相等不触发 | 边界值相等不触发 pivot/guard/break 事件（D3） |
| T-UT-220 | bar_dt 严格递增 | 同一 symbol/timeframe 内 bar_dt 不重复不乱序（D12） |

### 3.3 MALF Adapter 桥接测试

**目标**：验证 Python ↔ TS 的 JSON Lines 协议与错误码映射。

**测试范围**（对应 [03-架构设计 §4.1](./03-架构设计-Architecture-Design.md) MALF Adapter）：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-UT-301 | querySnapshot 正常返回 44 字段 | JSON Lines 响应含 result.snapshot |
| T-UT-302 | querySnapshotRange 返回快照列表 | 响应为数组，每元素 44 字段 |
| T-UT-303~310 | _预留段_ | 预留给 querySnapshot 系列扩展测试（如异常输入、边界条件） |
| T-UT-311 | querySignals 返回事件流列表 | 响应含 result.events 数组 |
| T-UT-312 | runBacktestVerification 返回验证结果 | 触发序列逐字节一致 |
| T-UT-313 | getSymbolList 返回标的列表 | 响应含 result.symbols |
| T-UT-314 | getTimeframes 返回周期列表 | 响应含 result.timeframes |
| T-UT-315~320 | _预留段_ | 预留给 Adapter 方法扩展测试（如新方法、边界条件） |
| T-UT-321 | 子进程 stdin/stdout JSON Lines 格式 | 每行一个 JSON，stderr 仅日志（D27） |
| T-UT-322 | 请求 id 响应配对 | 响应 id == 请求 id |
| T-UT-323 | MALF_ENGINE_ERROR 错误码映射 | Python 引擎抛错 → 错误码 MALF_ENGINE_ERROR |
| T-UT-324 | DUCKDB_ERROR 错误码映射 | DuckDB 查询失败 → 错误码 DUCKDB_ERROR |
| T-UT-325 | VALIDATION_ERROR 错误码映射 | 参数校验失败 → 错误码 VALIDATION_ERROR |
| T-UT-326 | INTERNAL_ERROR 错误码映射 | 未知异常 → 错误码 INTERNAL_ERROR |
| T-UT-327 | 子进程崩溃不拖垮桌面 + 3 次重启阈值 | Python 进程退出 → Adapter 自动重启最多 3 次，桌面存活（P0-A 修复，与 06-API §4.1 / 03-Arch §4.1 一致） |
| T-UT-327a | 重启 3 次后仍失败 → MALF_ENGINE_ERROR | 第 4 次失败 → 返回 MALF_ENGINE_ERROR，桌面存活，在途请求全部失败 |
| T-UT-327b | 重启期间在途请求处理 | 未配对返回的请求 → MALF_ENGINE_ERROR，调用方可重试 |
| T-UT-328 | MALF 引擎零外部依赖保持 | 子进程不引入 numpy/pandas 等（D1/D16） |
| T-UT-329 | Adapter 不修改 rule_versions | 透传 rule_versions 不重写（D29） |
| T-UT-330 | Adapter 不修改 lineage_hash | 透传 lineage_hash 不重写（D29） |
| T-UT-331 | quantify_risk 正常输入返回 RiskQuantifierDTO | 含 extremity/momentum/directional_advantage/joint_risk_alert 四字段（P0-B 修复，06-API §6.7） |
| T-UT-332 | quantify_risk 极端度阈值参数化 | rank > 0.80 → is_extreme=true；阈值可由用户调整（不硬编码） |
| T-UT-333 | quantify_risk 不评分不决策 | DTO 不含评分/胜率/买卖建议/仓位/PnL 字段（D19/02-PRD §2.2） |
| T-UT-334 | quantify_risk 只读 snapshot 不修改引擎 | 调用前后 rule_versions/lineage_hash 不变（D29/S35） |
| T-UT-335 | quantify_risk 经 Adapter 子进程（不经 TS 只读层） | AI 工具查询路径走 Adapter，D5 过滤生效（runtime_fingerprint 不暴露） |
| T-UT-336 | quantify_risk snapshot 不存在 → NOT_FOUND | 查询成功但行不存在返回 NOT_FOUND（与 DUCKDB_ERROR 区分） |
| T-UT-337 | quantify_risk 内部异常 → INTERNAL_ERROR | 量化器异常返回 INTERNAL_ERROR，提示重试 |
| T-UT-338 | quantify_risk AI 可调用（白名单 ✅） | before_tool_call 不拦截 quantify_risk |
| T-UT-339 | quantify_risk AI 不可修改 user_text | AI 调用 quantify_risk 不影响 risk_declarations 表（三层权威第二层） |
| T-UT-340 | quantify_risk 联合风险提示触发条件 | 极端 + 衰减 + 方向切换 → is_high_risk=true，factors 列表正确 |
| T-UT-341 | quantify_risk lineage_hash/rule_versions 透传 | DTO 字段值 == snapshot 原值（不重算） |
| T-UT-342 | quantify_risk evidence 字段脱敏 | evidence 不含 apiKey/完整 UUID/文件路径/堆栈（S9） |
| T-UT-343 | quantify_risk joint_risk_alert.suggestion 不含买卖建议 | suggestion 文案不输出买卖/仓位/评分（D19） |
| T-UT-344 | quantify_risk 阈值调整后生效 | 用户调整 threshold=0.90 → rank=0.85 时 is_extreme=false |
| T-UT-345 | quantify_risk 失败降级不阻塞主流程 | 量化器异常 → INTERNAL_ERROR，UI 显示提示但不崩溃 |
| T-UT-346 | 表不存在 → DUCKDB_ERROR（与 NOT_FOUND 区分） | 查询不存在的表 → DUCKDB_ERROR（不是 NOT_FOUND） |
| T-UT-347 | 行不存在 → NOT_FOUND（与 DUCKDB_ERROR 区分） | 表存在但行不存在 → NOT_FOUND（不是 DUCKDB_ERROR） |

### 3.4 技能夹具测试

**目标**：验证 SKILL.md frontmatter 与 helper 脚本契约。

**测试范围**（对应 [03-架构设计 §3.5](./03-架构设计-Architecture-Design.md) 技能系统）：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-UT-401 | malf-snapshot-explain SKILL.md frontmatter | 含 name/description，description 常驻 prompt |
| T-UT-402 | risk-declare SKILL.md frontmatter | 含 name/description，辅助模板 |
| T-UT-403 | backtest-report-read SKILL.md frontmatter | 含 name/description，标注"AI 解读" |
| T-UT-404 | helper.js 可被 jitti 加载 | require/import 成功，无运行时错误 |
| T-UT-405 | 技能目录结构扁平一层 | `.pi/skills/<name>/SKILL.md` + `helper.js`，无嵌套 |
| T-UT-406 | description 引用 MALF v2.1 权威 | snapshot 字段引用 Definitive |
| T-UT-407 | 技能不输出预测 | 解释/辅助/解读，不买卖建议 |
| T-UT-408 | 技能标注"AI 解读" | AI 产物明确标注 |
| T-UT-409 | 技能不修改 MALF 引擎 | 只读不写（D29） |
| T-UT-410 | 技能失败不阻塞确定性规则 | 技能异常 → 降级，规则继续（AI-06） |

### 3.5 v0.01 继承测试（290 passed 复验）

**目标**：v0.01 五组件 + 主仓编排的 290 passed 测试在 v0.02 环境下全部通过。

**复验清单**（对应 [03-架构设计 §5.1](./03-架构设计-Architecture-Design.md)）：

| 组件 | 路径 | 测试数 | 复验要求 | 测试 ID 段 |
|---|---|:--:|---|---|
| malf-engine | `Z:\ai-malf-riskbench-components\malf-engine` | 115 | 全部通过 | T-INH-ENG-001 ~ T-INH-ENG-115 |
| malf-data | `Z:\ai-malf-riskbench-components\malf-data` | 46 | 全部通过 | T-INH-DAT-001 ~ T-INH-DAT-046 |
| riskbench-shared | `Z:\ai-malf-riskbench-components\riskbench-shared` | 10 | 全部通过 | T-INH-SHR-001 ~ T-INH-SHR-010 |
| malf-signal | `Z:\ai-malf-riskbench-components\malf-signal` | 37 | 全部通过 | T-INH-SIG-001 ~ T-INH-SIG-037 |
| malf-backtest | `Z:\ai-malf-riskbench-components\malf-backtest` | 31 | 全部通过 | T-INH-BTC-001 ~ T-INH-BTC-031 |
| 主仓编排 | `Z:\ai-malf-riskbench\scripts\` | 51 | 全部通过 | T-INH-ORC-001 ~ T-INH-ORC-051 |
| **合计** | — | **290** | **全部通过** | — |

**复验纪律**：
- 不修改继承测试代码（继承不重写）
- 复验失败 → 检查 Adapter 桥接是否破坏继承契约，不修改继承测试
- 复验通过 → 在 .record 实施记录登记"290 passed 复验通过"
- 生产库保持只读：`Z:\ai-malf-riskbench-data\riskbench.duckdb`（15397 行 / signals 2835）

---

## §4 集成测试

### 4.1 extension×pi 底座契约

**目标**：验证 v0.02 扩展与 pi-coding-agent 底座的 createAgentSession + customTools 集成。

**测试范围**：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-IT-001 | createAgentSession 加载 v0.02 扩展 | session 启动无错，扩展工厂执行 |
| T-IT-002 | registerTool 工具可被 session 调用 | customTools 含全部 v0.02 工具 |
| T-IT-003 | 工具调用经 contract RPC | 所有调用走 contract 统一信封（INV-05） |
| T-IT-004 | pi-ai provider 注入成功 | registerProvider 注入风险场景 provider |
| T-IT-005 | 扩展不修改 pi 内核 | pi 源码无 diff |
| T-IT-006 | 扩展加载路径正确 | `~/.pi/agent/extensions/` 或 `.pi/extensions/` |
| T-IT-007 | jitti 加载 TS 扩展 | 扩展 TS 经 jitti 加载无错 |
| T-IT-008 | 扩展卸载清理资源 | session 结束无泄漏 |
| T-IT-009 | 多工具并发调用 | 并发不冲突，响应 id 配对 |
| T-IT-010 | 工具调用超时处理 | 超时返回固定编码，不挂起 |
| T-IT-011 | pi-ai stream 流式回复 | streamSimple 契约正常 |
| T-IT-012 | pi-ai 多供应商切换 | provider 优先级 + 熔断（5 次失败冷却 10 分钟） |
| T-IT-013 | 默认模型落业务数据根 | config/models.json 带 `__riskbench_managed` 标记 |
| T-IT-014 | 扩展不侵入 ~/.pi | pi 自管目录不被业务写入 |
| T-IT-015 | contract RPC 错误 throw 不返回 error 对象 | 与 pi-desktop contract 一致 |

### 4.2 钩子协作

**目标**：验证 pi.on 四钩子的协作与执行顺序。

**测试范围**（对应 [03-架构设计 §3.3](./03-架构设计-Architecture-Design.md) pi.on 钩子）：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-IT-101 | before_agent_start 注入上下文 | 注入当前标的、周期、最新 snapshot 摘要 |
| T-IT-102 | tool_call 日志脱敏 | 只记 provider name + tokens + sanitized error code |
| T-IT-103 | tool_result 日志脱敏 | 同上，不记明文 |
| T-IT-104 | model_select 持久化默认模型 | 落 config/models.json 带 `__riskbench_managed` |
| T-IT-105 | 钩子执行顺序正确 | before_agent_start → tool_call → tool_result → model_select |
| T-IT-106 | 钩子失败不阻塞主流程 | 钩子异常 → 降级，session 继续 |
| T-IT-107 | before_agent_start 不修改 MALF 引擎 | 只注入上下文，不写引擎（D29） |
| T-IT-108 | tool_call 不泄露 runtime_fingerprint | 日志无 runtime_fingerprint（D5/防泄露） |
| T-IT-109 | tool_result 标注 AI 解读 | AI 产物明确标注 |
| T-IT-110 | 钩子注册不重复 | 同一钩子不重复注册 |

### 4.3 MALF 子进程集成

**目标**：验证 Python ↔ TS 的 JSON Lines 通信在集成环境下端到端可用。

**测试范围**：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-IT-201 | 子进程启动与握手 | Python 子进程启动，Adapter 握手成功 |
| T-IT-202 | stdin 写入请求 | JSON Lines 请求被 Python 接收 |
| T-IT-203 | stdout 返回响应 | JSON Lines 响应被 Adapter 解析 |
| T-IT-204 | stderr 仅日志 | stderr 输出日志，不参与协议（D27） |
| T-IT-205 | 子进程崩溃恢复 | Python 进程崩溃 → Adapter 重启或报错 |
| T-IT-206 | 大数据量传输 | 15397 行快照查询不超时（< 500ms） |
| T-IT-207 | 子进程内存隔离 | Python 内存不泄漏到 Electron 主进程 |
| T-IT-208 | 子进程环境变量隔离 | PYTHONPYCACHEPREFIX 独立（D26） |
| T-IT-209 | 子进程不引入外部依赖 | 不引入 numpy/pandas（D1/D16） |
| T-IT-210 | 子进程退出码处理 | 退出码 0 正常，非 0 报错 |
| T-IT-211 | MALF 引擎零依赖保持 | 子进程仅 stdlib + malf-engine |
| T-IT-212 | Adapter 不修改 rule_versions | 透传不重写（D29） |
| T-IT-213 | Adapter 不修改 lineage_hash | 透传不重写（D29） |
| T-IT-214 | lineage_hash 跨进程一致 | Python 计算的 hash 与 TS 透传一致（D4） |
| T-IT-215 | 子进程通信确定性 | 相同输入 → 相同响应（D23） |

### 4.4 DuckDB 只读访问集成

**目标**：验证只读 Viewer 访问 DuckDB 生产库的连接池与查询超时。

**测试范围**（对应 [03-架构设计 §4.2](./03-架构设计-Architecture-Design.md) DuckDB 只读访问层）：

| 测试 ID | 测试名（中文描述） | 断言 |
|---|---|---|
| T-IT-301 | 只读连接打开成功 | `read_only=True` 连接生产库 |
| T-IT-302 | 连接池单例 | 多次查询复用同一连接 |
| T-IT-303 | 查询超时 30 秒 | 超时查询返回固定编码 |
| T-IT-304 | 崩溃不拖垮桌面 | DuckDB 异常 → Adapter 报错，桌面存活 |
| T-IT-305 | SELECT 通过 | 查询 snapshots/signals 成功 |
| T-IT-306 | INSERT 被拒绝 | 写入操作被拒绝（D28） |
| T-IT-307 | UPDATE 被拒绝 | 修改操作被拒绝（D28） |
| T-IT-308 | DELETE 被拒绝 | 删除操作被拒绝（D28） |
| T-IT-309 | 路径经 _guard 防护 | 查询路径在 DATA_ROOT 子树内（S16-S17） |
| T-IT-310 | DuckDB 内存 4GB | `SET memory_limit='4GB'` 生效 |
| T-IT-311 | DuckDB 线程 2 | `SET threads=2` 生效 |
| T-IT-312 | 磁盘空间检查 | 磁盘 < 2GB 时拒绝连接 |
| T-IT-313 | CHECKPOINT 前置 | 连接前 CHECKPOINT 通过 |
| T-IT-314 | 查询响应 < 500ms | MALF 查询响应达标 |
| T-IT-315 | 3 标的查询 < 5 分钟 | 全链路达标 |

---

## §5 系统冒烟测试

### 5.1 MALF 查询冒烟

**目标**：验证 MALF 查询工具在系统环境下端到端可用。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-001 | query_snapshot 冒烟 | 查询 sh510050/day 返回 44 字段 |
| T-SM-002 | query_signals 冒烟 | 查询事件流返回 4 事件码 |
| T-SM-003 | query_symbol_list 冒烟 | 返回 3 标的（sh510050/sh510300/sz159915） |
| T-SM-004 | query_timeframes 冒烟 | 返回 day/week/month |
| T-SM-005 | 数据用途 research_only | 查询结果 usage=research_only/stale_research_only |

### 5.2 风险声明冒烟

**目标**：验证风险声明工具端到端可用。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-011 | declare_risk 冒烟 | 创建声明成功，用户主权 |
| T-SM-012 | list_risk_declarations 冒烟 | 列出声明，按 created_at 排序 |
| T-SM-013 | check_risk_contradiction 冒烟 | 检测矛盾，只提醒不修改 |
| T-SM-014 | AI 不可修改 user_text | AI 调用不修改用户声明（S33） |
| T-SM-015 | ai_interpretation 标注 | ai_interpretation_marked=true |

### 5.3 AI 解读冒烟

**目标**：验证 AI 解读工具端到端可用且标注合规。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-021 | ai_interpret_snapshot 冒烟 | mock provider 返回解读，标注"AI 解读" |
| T-SM-022 | ai_interpret_backtest 冒烟 | mock provider 返回报告解读 |
| T-SM-023 | AI 解读标注"AI 解读" | 所有 AI 产物明确标注（AI-05） |
| T-SM-024 | AI 失败不阻塞 | AI 异常 → 降级，规则继续（AI-06） |
| T-SM-025 | AI 不修改 MALF/RISK 层 | AI 只解释，不修改确定性计算（S34/S35） |

### 5.4 回测报告冒烟

**目标**：验证回测报告工具端到端可用且边界合规。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-031 | run_backtest_report 冒烟 | 运行 T4 确定性规则验证 |
| T-SM-032 | read_backtest_report 冒烟 | 读取报告，HTML 预览 |
| T-SM-033 | 不输出收益类指标 | 无夏普/最大回撤/胜率/盈亏比/年化（D19） |
| T-SM-034 | 只读副本库 | 验证只读 runtime/tmp 副本库（D28） |
| T-SM-035 | HTML 预览独立 CSP | 预览窗口独立 session（INV-06） |

### 5.5 备份恢复冒烟

**目标**：验证备份恢复联锁端到端可用。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-041 | backup 冒烟 | CHECKPOINT + EXPORT DATABASE Parquet |
| T-SM-042 | restore 冒烟 | .duckdb 副本 / Parquet IMPORT 恢复 |
| T-SM-043 | 生产目标默认拒绝 | 须 -AllowProductionWrite 才写入生产（D25） |
| T-SM-044 | 备份恢复联锁 | 恢复前必须备份，备份后可恢复 |
| T-SM-045 | lineage_hash 一致 | 恢复后 lineage_hash 与原一致（D4/D8） |

### 5.6 path-guard 冒烟

**目标**：验证路径穿透防护在系统环境下生效。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-051 | ../ 逃逸被拒绝 | `../` 路径被 _guard 拒绝（S16） |
| T-SM-052 | 绝对路径被拒绝 | 硬编码绝对路径被拒绝（S17） |
| T-SM-053 | 查询路径在 DATA_ROOT 子树内 | 所有路径经 paths.py 推导（S17） |
| T-SM-054 | export_csv 路径防护 | 导出路径在子树内 |
| T-SM-055 | TDX 数据只读 | `Z:\new_tdx64` 永不写入（S12） |

### 5.7 credential-vault 冒烟

**目标**：验证 safeStorage 加密在系统环境下生效。

| 测试 ID | 测试名 | 断言 |
|---|---|---|
| T-SM-061 | safeStorage 加密密钥 | 密钥 Windows DPAPI 加密（INV-04） |
| T-SM-062 | 明文不入日志 | .env/auth.json 不入日志（S7-S8） |
| T-SM-063 | 错误返回固定编码 | AI 错误返回固定编码，不暴露 Key/URL（S9） |
| T-SM-064 | .env 不入 git | .gitignore 排除 .env（S6） |
| T-SM-065 | 键名匹配正则 | `modelProvider:*` / `riskbench:*` 格式 |

### 5.8 安全不变量脚本（check-desktop-security.mjs）

**目标**：执行六条硬断言 INV-01~06，合并 master 前必须全绿。

**脚本**：`scripts/check-desktop-security.mjs`（✅ 已创建，design 阶段 graceful skip，M0 后启用完整校验）

> 断言列与脚本可执行条件严格一致（P0-3/N-2 修复，对齐 01-TRD §5.5 + 03-Arch §7 + 04-Todo §5.2 + AGENTS.md §9.6 四处统一）。

**六条硬断言**：

| 编号 | 不变量 | 断言（脚本可执行条件） | 实现位置 | task-id | 失败后果 |
|---|---|---|---|---|---|
| INV-01 | renderer 沙箱 | `sandbox:true`（webPreferences） | Electron BrowserWindow 配置 | T-M0-006 | 立即停止 |
| INV-02 | 严格 CSP | `default-src 'self'` + `script-src 'self'` | Electron session 配置 | T-M0-006 | 立即停止 |
| INV-03 | preload 受控桥接 | 仅 `exposeInMainWorld('piBridge')`，不暴露 Node API | preload.ts contextBridge 白名单 | T-M0-002 | 立即停止 |
| INV-04 | credential-vault safeStorage | `safeStorage` Windows DPAPI 加密 | credential-vault.ts | T-M0-007 | 立即停止 |
| INV-05 | Host RPC 契约化 | `api.ts` 完整接口，22 RPC 方法（六路由组 malf/risk/ai/bench/viewer/system） | contract.ts + ipcMain 白名单 | T-M0-005 | 立即停止 |
| INV-06 | HTML 预览独立 CSP | `form-action 'none'`（HTML_PREVIEW_CSP） | 预览窗口独立 session | T-M2-009 | 立即停止 |

**执行方式**：
```bash
node scripts/check-desktop-security.mjs
# 输出：六条断言逐条 PASS/FAIL
# 任一 FAIL → 退出码非 0，阻止合并 master
```

### 5.9 确定性验证脚本

**目标**：执行 lineage_hash 一致性与触发序列逐字节一致验证。

**脚本**：`scripts/verify-determinism.mjs` + `scripts/verify-trigger-sequence.py`（待创建，v0.01 已有同义脚本可继承）

**验证项**：

| 测试 ID | 测试名 | 断言 | 约束 |
|---|---|---|---|
| T-DET-001 | lineage_hash 一致性 | 相同输入 → 相同 64 字符 hex | D4 |
| T-DET-002 | 触发序列逐字节一致 | 两次运行报告逐字节一致 | D24 |
| T-DET-003 | 整数价格全链路 | 全链路禁止 float | D2 |
| T-DET-004 | 严格不等式 | 相等不触发任何事件 | D3 |
| T-DET-005 | runtime_fingerprint 排除 | 不参与 lineage_hash | D5 |
| T-DET-006 | 每次 ingest 验证 lineage_hash | 两次运行 hash 一致才写入 | D8 |
| T-DET-007 | MALF Adapter JSON Lines | stdin/stdout JSON Lines，stderr 仅日志 | D27 |
| T-DET-008 | Viewer 只读不修改 | 不修改 snapshots/signals | D28 |
| T-DET-009 | pi 扩展不修改 rule_versions | rule_versions 只读 | D29 |
| T-DET-010 | pi 扩展不修改 lineage_hash | lineage_hash 只读 | D29 |

**确定性验证纪律**（继承 v0.01 trd §3）：
- 每次 ingest 必须跑两步验证（run_1 == run_2）
- 违反 → 停止写入，报告给用户
- 跨机器可重现（Python 3.10+ json.dumps + hashlib.sha256）

---

## §6 系统 E2E 测试（vitest + Electron，非 Playwright）

### 6.1 E2E 框架选型

**选型**：vitest + Electron（继承 pi-studybuddy 08-Test v0.1.2 §6 范式）

**不用 Playwright 的理由**：
- pi-studybuddy 范式已验证 vitest + Electron 可行
- Electron 启动真实窗口，更接近真实用户环境
- 127.0.0.1 TCP 通信，不依赖浏览器驱动
- 与项目技术栈一致（vitest + TypeScript）

**E2E 框架结构**：
```
tests/e2e/
├── fixtures/              ← E2E 夹具（合成数据 + DuckDB 副本）
├── helpers/
│   ├── electron-launch.ts ← Electron 启动助手
│   ├── tcp-client.ts      ← 127.0.0.1 TCP 通信助手
│   └── mock-provider.ts   ← AI provider mock
├── data-viewer.e2e.test.ts        ← §6.1 数据查看主路径
├── risk-declare.e2e.test.ts       ← §6.2 风险声明主路径
├── ai-dialog.e2e.test.ts          ← §6.3 AI 对话主路径
├── backtest-report.e2e.test.ts    ← §6.4 回测报告主路径
└── backup-restore.e2e.test.ts     ← §6.5 备份恢复 E2E
```

### 6.2 数据查看主路径

**目标**：启动 → 选标的 → 查看快照 → 查看事件流。

| 测试 ID | 测试名 | 步骤 | 断言 |
|---|---|---|---|
| T-E2E-001 | 启动 Electron 窗口 | 启动 main 进程 | 窗口可见，启动 < 3 秒 |
| T-E2E-002 | 三栏布局渲染 | 渲染 renderer | 左/中/右三栏可见 |
| T-E2E-003 | 选标的 sh510050 | 点击标的列表 | 中栏加载该标的数据 |
| T-E2E-004 | 查看 day 快照 | 选 day 周期 | 显示 44 字段快照 |
| T-E2E-005 | 查看事件流 | 切换事件流 Tab | 显示 4 事件码事件流 |
| T-E2E-006 | 切换 week/month | 选 week/month | 显示对应周期快照 |

### 6.3 风险声明主路径

**目标**：创建声明 → AI 检测矛盾 → AI 解读标注。

| 测试 ID | 测试名 | 步骤 | 断言 |
|---|---|---|---|
| T-E2E-011 | 创建风险声明 | 用户输入声明文本 | 声明记录创建，用户主权 |
| T-E2E-012 | AI 检测矛盾 | 触发 check_risk_contradiction | 只提醒不修改（S33） |
| T-E2E-013 | AI 解读标注 | 触发 ai_interpret_snapshot | 标注"AI 解读"（AI-05） |
| T-E2E-014 | AI 不可修改 user_text | AI 调用后 user_text 不变 | 用户主权（S33） |
| T-E2E-015 | 声明列表排序 | list_risk_declarations | 按 created_at 排序 |

### 6.4 AI 对话主路径

**目标**：提问 → 流式回复 → 工具调用 → 标注"AI 解读"。

| 测试 ID | 测试名 | 步骤 | 断言 |
|---|---|---|---|
| T-E2E-021 | 用户提问 | 输入问题 | session 接收 |
| T-E2E-022 | 流式回复 | mock provider stream | 流式输出可见 |
| T-E2E-023 | 工具调用 query_snapshot | AI 调用工具 | 工具返回 44 字段 |
| T-E2E-024 | AI 解读标注 | 回复含"AI 解读" | 明确标注（AI-05） |
| T-E2E-025 | AI 失败降级 | mock provider 抛错 | 降级不阻塞（AI-06） |
| T-E2E-026 | AI 不修改 MALF 引擎 | AI 调用后 rule_versions 不变 | 只读（D29） |

### 6.5 回测报告主路径

**目标**：运行 T4 → 读取报告 → HTML 预览。

| 测试 ID | 测试名 | 步骤 | 断言 |
|---|---|---|---|
| T-E2E-031 | 运行 T4 验证 | run_backtest_report | 触发序列验证完成 |
| T-E2E-032 | 读取报告 | read_backtest_report | 报告内容返回 |
| T-E2E-033 | HTML 预览 | 打开预览窗口 | 独立 session CSP（INV-06） |
| T-E2E-034 | 无收益类指标 | 检查报告内容 | 无夏普/回撤/胜率（D19） |
| T-E2E-035 | 只读副本库 | 检查生产库未修改 | D28 |

### 6.6 备份恢复 E2E

**目标**：备份 → 恢复 → 一致性验证。

| 测试 ID | 测试名 | 步骤 | 断言 |
|---|---|---|---|
| T-E2E-041 | 备份生产库 | backup（沙箱副本） | Parquet 导出成功 |
| T-E2E-042 | 恢复到副本 | restore（沙箱副本） | IMPORT 成功 |
| T-E2E-043 | 恢复后 lineage_hash 一致 | 对比原 hash | 一致（D4/D8） |
| T-E2E-044 | 生产目标默认拒绝 | 无 -AllowProductionWrite | 拒绝写入生产（D25） |
| T-E2E-045 | 备份恢复联锁 | 恢复前必须备份 | 联锁生效 |
| T-E2E-046 | 恢复后数据完整 | 行数与字段一致 | 15397 行 / 44 字段 |
| T-E2E-047 | signals 恢复一致 | 事件流行数一致 | 2835 事件 |
| T-E2E-048 | usage 保持 research_only | 恢复后用途不变 | research_only（S30） |

---

## §7 关键断言矩阵

### 7.1 确定性断言

| 断言 | 测试 ID | 约束 | 出处 |
|---|---|---|---|
| lineage_hash 一致性 | T-DET-001 | 相同输入 → 相同 64 字符 hex | D4 / v0.01 trd §3.6 |
| 触发序列逐字节一致 | T-DET-002 | 两次运行报告逐字节一致 | D24 / v0.01 kiro-design §4.2 |
| 整数价格 | T-DET-003 | 全链路禁止 float | D2 / v0.01 trd §3 |
| 严格不等式 | T-DET-004 | 相等不触发任何事件 | D3 / v0.01 trd §3 |
| runtime_fingerprint 排除 | T-DET-005 | 不参与 lineage_hash | D5 / v0.01 trd §3 |
| 每次 ingest 验证 lineage_hash | T-DET-006 | 两次运行 hash 一致才写入 | D8 / v0.01 trd §3 |
| MALF Adapter JSON Lines | T-DET-007 | stdin/stdout JSON Lines，stderr 仅日志 | D27 / v0.02 DECISION-v02-004 |
| Viewer 只读不修改 | T-DET-008 | 不修改 snapshots/signals | D28 / v0.02 DECISION-v02-005 |
| pi 扩展不修改 rule_versions | T-DET-009 | rule_versions 只读 | D29 / v0.02 安全约束 |
| pi 扩展不修改 lineage_hash | T-DET-010 | lineage_hash 只读 | D29 / v0.02 安全约束 |

### 7.2 安全断言

| 断言 | 测试 ID | 约束 | 出处 |
|---|---|---|---|
| renderer 沙箱 sandbox:true | T-SM-INV-01 | INV-01 | 03-Arch §7 |
| 严格 CSP | T-SM-INV-02 | INV-02 script-src/connect-src 限制 | 03-Arch §7 |
| preload 受控桥接 | T-SM-INV-03 | INV-03 不暴露 Node API | 03-Arch §7 |
| credential-vault safeStorage | T-SM-INV-04 | INV-04 Windows DPAPI 加密 | 03-Arch §7 |
| Host RPC 契约 | T-SM-INV-05 | INV-05 所有跨进程通信走 contract | 03-Arch §7 |
| HTML 预览独立 CSP | T-SM-INV-06 | INV-06 回测报告/Markdown 渲染隔离 | 03-Arch §7 |
| 单机本地 127.0.0.1 | T-SM-SEC-01 | S1-S5 只监听本地 | 01-TRD §5.1 |
| .env 不入 git | T-SM-SEC-02 | S6 .gitignore 排除 | 01-TRD §5.2 |
| 密钥不入日志 | T-SM-SEC-03 | S7-S8 脱敏 | 01-TRD §5.2 |
| 错误固定编码 | T-SM-SEC-04 | S9 不暴露 Key/URL/路径/堆栈 | 01-TRD §5.2 |
| TDX 数据只读 | T-SM-SEC-05 | S12 Z:\new_tdx64 永不写入 | 01-TRD §5.3 |
| 路径穿透防护 | T-SM-SEC-06 | S16 _guard 拒绝 ../ 逃逸 | 01-TRD §5.3 |
| 禁止硬编码绝对路径 | T-SM-SEC-07 | S17 经 paths.py 推导 | 01-TRD §5.3 |

### 7.3 防泄露断言

| 断言 | 测试 ID | 约束 | 出处 |
|---|---|---|---|
| runtime_fingerprint 不暴露 | T-SM-LEAK-01 | D5 不入日志，不参与 hash | v0.01 trd §3 |
| AI 解读标注 | T-SM-LEAK-02 | AI-05 明确标注"AI 解读" | 02-PRD §2.3 |
| 错误固定编码 | T-SM-LEAK-03 | S9 不暴露 Key/URL/路径/堆栈 | 01-TRD §5.2 |
| 日志脱敏 | T-SM-LEAK-04 | 只记 provider name + tokens + sanitized error code | T-IT-102/103 |
| AI 不修改 MALF/RISK 层 | T-SM-LEAK-05 | S34/S35 只解释不修改 | 01-TRD §5.4 |
| AI 不修改用户声明 | T-SM-LEAK-06 | S33 用户主权 | 02-PRD §6.3 |

### 7.4 用途分级断言

| 断言 | 测试 ID | 约束 | 出处 |
|---|---|---|---|
| usage 四档 | T-SM-USAGE-01 | rejected/research_only/verification_only/operational | 01-TRD §5.4 |
| operational 禁用 | T-SM-USAGE-02 | v0.1 硬编码禁用 | 01-TRD §5.4 S29 |
| research_only 边界 | T-SM-USAGE-03 | 当前数据固定 research_only/stale_research_only | 01-TRD §5.4 S30 |
| 不得称"当前风险状态" | T-SM-USAGE-04 | S30 不得升级 operational | 01-TRD §5.4 |
| 回测 research_only | T-SM-USAGE-05 | S31 绩效指标属研究验证范畴 | 01-TRD §5.4 |

---

## §8 状态机测试矩阵

### 8.1 数据管道状态机

**状态机**（对应 [07-工作流](./07-工作流-Workflow.md) 数据管道）：

```
UNINITIALIZED → INGESTING → VERIFYING → PUBLISHED → STALE
                                                      ↑
                                                   数据过期触发
```

| 测试 ID | 测试名 | 覆盖转换 | 断言 |
|---|---|---|---|
| T-UT-500 | UNINITIALIZED → INGESTING | 首次 ingest 启动 | 状态机正确进入 |
| T-UT-501 | INGESTING → VERIFYING | ingest 完成进入验证 | lineage_hash 验证（D8） |
| T-UT-502 | VERIFYING → PUBLISHED | 验证通过发布 | 不可变 snapshot 发布 |
| T-UT-503 | PUBLISHED → STALE | 数据过期 | freshness=stale |
| T-UT-504 | INGESTING → VERIFYING 失败回退 | lineage_hash 不一致 | 停止写入（D8） |
| T-UT-505 | 中断恢复 replay 前缀 | 从 current.json 续算 | S-01 中断恢复 |
| T-UT-506 | STALE → INGESTING | 重新 ingest | 状态重置 |
| T-UT-507 | G0 rejected 整只拒绝 | 输入完整性失败 | usage=rejected（G0） |

### 8.2 风险声明状态机

**状态机**（对应 [07-工作流](./07-工作流-Workflow.md) 风险声明）：

```
draft → declared → contradicted → archived
```

| 测试 ID | 测试名 | 覆盖转换 | 断言 |
|---|---|---|---|
| T-UT-511 | draft → declared | 用户发布声明 | 用户主权（S33） |
| T-UT-512 | declared → contradicted | AI 检测矛盾 | 只提醒不修改（S33） |
| T-UT-513 | contradicted → archived | 用户归档 | 用户主权 |
| T-UT-514 | declared → archived（直接归档） | 用户无矛盾归档 | 用户主权 |
| T-UT-515 | AI 不可修改状态机 | AI 调用不改变状态 | S33/S34 |
| T-UT-516 | ai_interpretation_marked 标注 | AI 解读后标记 | AI-05 |

### 8.3 AI 解读状态机

**状态机**（对应 [07-工作流](./07-工作流-Workflow.md) AI 解读）：

```
pending → streaming → completed
                    └→ failed
```

| 测试 ID | 测试名 | 覆盖转换 | 断言 |
|---|---|---|---|
| T-UT-521 | pending → streaming | AI 调用开始 | 流式输出 |
| T-UT-522 | streaming → completed | AI 调用完成 | 标注"AI 解读"（AI-05） |
| T-UT-523 | streaming → failed | AI 调用失败 | 降级不阻塞（AI-06） |
| T-UT-524 | failed → pending（重试） | 用户重试 | 状态重置 |
| T-UT-525 | completed 不修改确定性规则 | AI 完成后规则不变 | S34/S35 |

### 8.4 备份恢复状态机

**状态机**（对应 [07-工作流](./07-工作流-Workflow.md) 备份恢复）：

```
idle → backing_up → verifying → restoring → done
                                  └→ failed
```

| 测试 ID | 测试名 | 覆盖转换 | 断言 |
|---|---|---|---|
| T-UT-531 | idle → backing_up | 备份启动 | CHECKPOINT + EXPORT |
| T-UT-532 | backing_up → verifying | 备份完成进入验证 | 产物验证 |
| T-UT-533 | verifying → restoring | 验证通过恢复 | IMPORT DATABASE |
| T-UT-534 | restoring → done | 恢复完成 | lineage_hash 一致（D4） |
| T-UT-535 | restoring → failed | 恢复失败 | 报错不污染原库 |
| T-UT-536 | 恢复前必须备份 | 联锁生效 | 联锁 |
| T-UT-537 | 生产目标默认拒绝 | 无 -AllowProductionWrite | D25 fail-closed |
| T-UT-538 | done → idle | 完成后重置 | 状态机复位 |

---

## §9 测试夹具

### 9.1 Golden fixture 原则

继承 v0.01 workflow.md §5 + AGENTS §9：

| # | 原则 | 含义 |
|---|------|------|
| 1 | 人肉推导预期输出 | 不是代码生成，不是待测实现自动产出 |
| 2 | 放在 tests/fixtures/ 目录 | 统一管理 |
| 3 | fixture 结构 | `{ "description": "场景说明", "input": {...}, "expected": {...} }` |
| 4 | 绝对不改 fixture 让测试通过 | fixture 是人肉推导的正确答案 |
| 5 | fixture 不通过时先查 spec | spec 与代码不一致修代码；spec 模糊记录到 task |

### 9.2 合成 bars 夹具

**来源**：malf-engine 已有合成 bars 夹具（v0.01 继承）

**用途**：
- 单件测试：MALF Adapter 桥接测试用合成 bars 触发各状态转换
- 确定性验证：合成 bars 两次运行 lineage_hash 一致
- 状态机测试：合成 bars 覆盖 UNINITIALIZED → UP_ALIVE/DOWN_ALIVE → TRANSITION

**夹具位置**：
- v0.01 继承：`Z:\ai-malf-riskbench-components\malf-engine\tests\fixtures\`
- v0.02 新增：`Z:\pi-malf-riskbench-v0.02\tests\fixtures\bars\`

### 9.3 DuckDB 测试副本

**位置**：`Z:\ai-malf-riskbench--runtime\tmp\`（v0.01 继承）

**用途**：
- 系统冒烟：查询副本库不污染生产库
- E2E：备份恢复 E2E 用副本库
- 确定性验证：lineage_hash 在副本库验证

**副本生成**：
```bash
# 从生产库生成副本（只读源）
cp Z:\ai-malf-riskbench-data\riskbench.duckdb Z:\ai-malf-riskbench--runtime\tmp\test.duckdb
```

**纪律**：
- 副本库可随时清空
- 副本库不进 Git
- 副本库写入必须经测试夹具，不直接操作

### 9.4 v0.02 测试夹具新增

| 夹具名 | 路径 | 用途 |
|---|---|---|
| 合成 bars | `tests/fixtures/bars/` | MALF Adapter 桥接测试 |
| 合成 snapshots | `tests/fixtures/snapshots/` | Viewer 只读测试 |
| 合成 signals | `tests/fixtures/signals/` | 事件流查询测试 |
| 合成风险声明 | `tests/fixtures/declarations/` | 风险声明工具测试 |
| mock AI provider | `tests/fixtures/mock-provider/` | AI 解读测试（不连真实服务） |
| Electron 启动夹具 | `tests/e2e/fixtures/` | E2E 真实窗口启动 |

---

## §10 测试命名规范

### 10.1 命名原则

**铁律 6**：测试名用中文描述被验证行为，不写 `test_1` `test_func` 等无意义名。

### 10.2 测试 ID 段规范

| 段 | 含义 | 示例 |
|---|---|---|
| `T-UT-XXX` | 单件测试（Unit Test） | T-UT-001 |
| `T-UT-XXX[a-z]` | 单件测试子项（同一测试的多场景拆分） | T-UT-327a / T-UT-327b |
| `T-IT-XXX` | 集成测试（Integration Test） | T-IT-001 |
| `T-SM-XXX` | 系统冒烟（Smoke） | T-SM-001 |
| `T-E2E-XXX` | 系统 E2E | T-E2E-001 |
| `T-DET-XXX` | 确定性验证（Determinism） | T-DET-001 |
| `T-INH-XXX-YYY` | v0.01 继承复验（Inherit） | T-INH-ENG-001 |
| `T-SM-INV-XX` | 安全不变量（INVARIANT） | T-SM-INV-01 |
| `T-SM-SEC-XX` | 安全断言（SECURITY） | T-SM-SEC-01 |
| `T-SM-LEAK-XX` | 防泄露断言（LEAK） | T-SM-LEAK-01 |
| `T-SM-USAGE-XX` | 用途分级断言（USAGE） | T-SM-USAGE-01 |

> **子项后缀规则**：同一测试 ID 需拆分多个场景（如"3 次重启阈值"拆为"重启 + 超阈值 + 在途请求"）时，使用小写字母后缀 `[a-z]`。子项共享主 ID 的测试主题，断言独立。

### 10.3 测试名格式

**vitest（TS）**：
```typescript
describe('query_snapshot 工具', () => {
  it('正常输入返回 44 字段快照形状', async () => {
    // T-UT-001
    const result = await querySnapshot.execute({ symbol: 'sh510050', timeframe: 'day', bar_dt: '20260804' });
    expect(result.content).toBeDefined();
    // 断言 44 字段
  });

  it('缺失 symbol 抛 VALIDATION_ERROR', async () => {
    // T-UT-002
    await expect(querySnapshot.execute({ timeframe: 'day' })).rejects.toThrow(/VALIDATION_ERROR/);
  });
});
```

**pytest（Python）**：
```python
def test_查询快照返回44字段形状():
    """T-UT-001: query_snapshot 正常输入返回 44 字段快照形状"""
    result = query_snapshot(symbol='sh510050', timeframe='day', bar_dt='20260804')
    assert len(result) == 44

def test_缺失symbol抛VALIDATION_ERROR():
    """T-UT-002: 缺失 symbol 抛 VALIDATION_ERROR"""
    with pytest.raises(ValidationError, match='VALIDATION_ERROR'):
        query_snapshot(timeframe='day')
```

### 10.4 命名禁令

| 禁令 | 示例 | 理由 |
|---|---|---|
| 禁止无意义名 | `test_1` `test_func` `test_a` | 不描述行为 |
| 禁止纯英文若中文更清晰 | `test_query_snapshot_returns_fields` | 中文描述被验证行为更清晰 |
| 禁止只描述输入不描述预期 | `test_query_snapshot` | 应含预期行为 |
| 禁止与权威条款无关 | 无对应 spec 的测试 | 测试必须对应权威条款 |

---

## §11 测试通过门槛

### 11.1 合并 master 门槛

合并 master 前必须**五项全绿**：

| # | 门槛 | 判定标准 | 验证方式 |
|---|------|---------|---------|
| 1 | 五阶段全绿 | 单件 + 集成 + 系统组装 + 冒烟 + E2E 全部通过 | `pnpm test` + `pytest` |
| 2 | 安全不变量六条 | INV-01~06 全部 PASS | `node scripts/check-desktop-security.mjs` |
| 3 | 确定性验证 | D1-D29 全部通过 | `node scripts/verify-determinism.mjs` + `python scripts/verify-trigger-sequence.py` |
| 4 | v0.01 继承复验 | 290 passed 全部通过 | 各组件仓 `pytest` |
| 5 | 文档治理检查 | 00-索引登记表与实际一致 + 04-Todo 状态与 .plan 一致 + 06-API 与代码一致 | `node scripts/check-docs-governance.mjs` |

**门槛纪律**：
- 任一门槛失败 → 不合并 master
- 安全不变量失败 → 立即停止，不可妥协
- 确定性验证失败 → 立即停止，不可妥协

### 11.2 退回机制

| 场景 | 退回到 | 处理 |
|---|---|---|
| 单件测试失败 | 阶段 2 | 修正实现或测试（TDD 纪律） |
| 集成测试失败 | 阶段 2 | 修正单件实现，重新走阶段 2-3 |
| 系统组装失败 | 阶段 3 | 修正集成实现，重新走阶段 3-4 |
| 冒烟/E2E 失败 | 阶段 4 | 修正组装实现，重新走阶段 4-5 |
| 安全不变量失败 | 立即停止 | 修复后才继续 |
| 确定性验证失败 | 立即停止 | 修复后才继续 |
| v0.01 继承复验失败 | 检查 Adapter 桥接 | 不修改继承测试 |
| 文档治理检查失败 | 步骤 13（更新文档） | 修正文档后重新检查 |

### 11.3 修复证据（FR-<序号> 模板）

测试失败修复必须记录修复证据：

```markdown
## 修复证据 FR-<序号>

### 失败测试
- 测试 ID：T-UT-XXX
- 测试名：<中文描述>
- 失败现象：<实际输出>

### 根因分析
- 根因：<具体原因>
- 权威条款：<对应 spec 条款>

### 修复方案
- 修复内容：<修改了什么>
- 修复依据：<为什么这样修>
- 是否修改 fixture：否（fixture 绝对不改）

### 验证结果
- 修复后测试输出：<通过>
- 关联测试：<是否影响其他测试>
- 安全不变量复查：<INV-01~06 仍全绿>
- 确定性验证复查：<D1-D29 仍全绿>
```

### 11.4 交叉审查元纪律

| # | 纪律 | 含义 |
|---|------|------|
| 1 | 独立审查 | 步骤 12 独立审查修复，diff 检查通过 |
| 2 | 偏差记录 | 计划与实际不符之处记录到 .record |
| 3 | 安全复查 | 确认无密钥泄漏、无日志明文、无路径逃逸、无 v0.01 继承代码被修改 |
| 4 | 测试对应权威条款 | 每个测试必须对应权威条款，不是凭空臆造 |
| 5 | 不改 fixture 让测试通过 | fixture 绝对不改 |
| 6 | 不用覆盖率百分比验收 | 覆盖率高不等于测试有效 |

---

## §12 G0-G3 数据用途分级门禁

继承 v0.01 AGENTS §7 + 02-PRD §4.3：

### 12.1 G0：输入完整性失败 → rejected

| 字段 | 内容 |
|---|---|
| 触发条件 | 输入完整性失败（如 TDX .day 32B 解析失败、坏记录、乱序日期） |
| 用途 | `usage=rejected` |
| 处理 | 整只标的拒绝，不跳过坏 bar |
| 测试 | T-UT-507 G0 rejected 整只拒绝 |
| 出处 | v0.01 AGENTS §7 / 01-TRD §5.4 S28 |

### 12.2 G1：数据合同与新鲜度降级 → research_only

| 字段 | 内容 |
|---|---|
| 触发条件 | 数据合同与新鲜度降级（如数据过期、approved_as_of_date 过期） |
| 用途 | `usage=research_only`（或 `stale_research_only`） |
| 处理 | 降级为研究用途，不得称"当前风险状态" |
| 测试 | T-SM-USAGE-03 research_only 边界 |
| 当前状态 | 生产库 usage 全 research_only / stale_research_only |
| 出处 | v0.01 AGENTS §7 / 01-TRD §5.4 S30 |

### 12.3 G2：模型不完整 → None + reason_codes

| 字段 | 内容 |
|---|---|
| 触发条件 | 模型不完整（如 peer_sample<30、无前波、方向对端样本缺失） |
| 处理 | 字段为 `None + reason_codes`（honest degradation） |
| reason_codes | 11 枚举（uninitialized/transition_active/wave_alive/input_integrity_failure/data_stale/peer_sample_insufficient/same_dir_peers_absent/cross_dir_peers_absent/no_prior_wave/range_alive/operational_disabled） |
| 原则 | None 就是 None，不补零不估计不降级替代 |
| 测试 | T-UT-217 reason_codes JSON 数组 |
| 出处 | v0.01 AGENTS §7 / MALF v2.1 Service §8 |

### 12.4 G3：lineage 不完整 → 禁止发布

| 字段 | 内容 |
|---|---|
| 触发条件 | lineage、规则版本或审计不完整 |
| 处理 | 禁止发布（不可变 snapshot 不发布） |
| 验证 | 每次 ingest 必须验证 lineage_hash（D8） |
| rule_versions | 7 个版本键必须完整（pivot_rule/price_domain/adapter/core_version/range_version/lifespan_version/structural_position_version/signal_version） |
| 测试 | T-DET-001 lineage_hash 一致性 / T-UT-215 rule_versions JSON 非空 |
| 出处 | v0.01 AGENTS §7 / MALF v2.1 Service §5 |

### 12.5 v0.1 用途边界

| 用途 | v0.1 状态 | 说明 |
|---|---|---|
| rejected | ✅ 允许 | G0 输入完整性失败 |
| research_only | ✅ 允许 | G1 数据合同与新鲜度降级（当前数据固定） |
| verification_only | ✅ 允许 | 确定性规则验证（T4 已实现） |
| operational | ❌ 禁用 | v0.1 硬编码禁用，需未来独立审批 |

---

## §13 性能基准

继承 v0.01 trd §6 + 01-TRD §9：

| 指标 | 基准 | 出处 | 测试 |
|---|---|---|---|
| 单 bar 处理 | < 50ms | v0.01 trd §7 | T-IT-314 范围 |
| 3 标的全链路 | < 5 分钟 | v0.01 trd §7 / kiro-require §7.1 | T-IT-315 |
| DuckDB 内存 | 4GB | v0.01 trd §7 | T-IT-310 |
| DuckDB 线程 | 2 | v0.01 trd §7 | T-IT-311 |
| 磁盘空间 | ≥ 2GB | v0.01 trd §7 | T-IT-312 |
| Electron 启动 | < 3 秒 | 01-TRD §9（v0.02 新增） | T-E2E-001 |
| MALF 查询响应 | < 500ms | 01-TRD §9（v0.02 新增） | T-IT-314 |

**性能基准纪律**：
- 性能基准为设计目标，非正式验收条件（继承 v0.01）
- 性能不达标记录到 .record，不阻塞合并 master（除非用户明确要求）
- 安全不变量与确定性验证优先于性能基准

---

## §14 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：测试金字塔四层 + 关键断言矩阵 + 状态机测试矩阵 + 测试夹具 + 命名规范 + 合并 master 门槛 + G0-G3 门禁 + 性能基准 |
| v0.1.1 | 2026-08-10 | 任务边界与容错审计 P0+P1 修复 + 第四轮交叉审查：§3.1 新增 quantify_risk 测试段 T-UT-136~145（P0-B）；§3.3 新增 T-UT-327/327a/327b Adapter 子进程崩溃恢复（P0-A，3 次重启 + 第 4 次 MALF_ENGINE_ERROR + 在途请求）；§3.3 新增 T-UT-331~337 quantify_risk 边界断言（P0-B）；§3.3 新增 T-UT-346/347 错误码边界区分（表不存在 DUCKDB_ERROR vs 行不存在 NOT_FOUND）；§5.8 INV-05 21→22 RPC 方法（P0-1，第四轮交叉审查）；§8.1 T-SM-001 重复 → T-UT-500（P0-3，第四轮交叉审查）。 |

---

**文档维护**：测试策略变更时更新，重大变更需用户批准
**最后更新**：2026-08-10
