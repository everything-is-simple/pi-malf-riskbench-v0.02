# 11-组件装配-Component-Assembly

**版本**：v0.1.1
**日期**：2026-08-09
**状态**：📝 草案（待用户审查批准）
**上游**：AGENTS.md §6、[01-TRD](./01-TRD-技术需求-Technical-Requirements.md) §2/§6、[03-架构设计](./03-架构设计-Architecture-Design.md) §3/§8、[04-任务清单](./04-任务清单-Todo-List.md) §3.3/§4
**下游**：无
**用途**：v0.02 "先分解，再组合" SoT + 6 步装配 + MALF Adapter 试炼场门禁

---

## §1 概述

### 1.1 核心原则：先分解，再组合

v0.02 装配遵循 **"先分解，再组合"** 原则（继承 pi-studybuddy §6 + v0.01 装配.md）：

- **先分解**：把系统拆成最小可独立验证的组件，每个组件先在隔离环境（试炼场）单独跑通，再沉淀能力卡。
- **再组合**：单件验证通过的组件才允许进入主仓 `src/` 装配，装配时走 contract RPC + 统一信封，不接受"直接 import 试炼场样例"的捷径。
- **不可跳越**：阶段 3→4 的前置条件是"无能力卡不装配"，阶段 4→5 的前置条件是"四项门禁全绿"。

> 铁律：禁止"先整体跑通再补测试"，禁止"先组装再补能力卡"。任一阶段失败退回上一阶段，不进 master。

### 1.2 三层架构边界（桌面壳 / pi 扩展 / 数据与引擎）

装配边界与 [03-架构设计 §1.1](./03-架构设计-Architecture-Design.md) 四层架构对齐，按装配视角归并为三层：

| 装配层 | 对应架构层 | 组件来源 | 装配方式 |
|---|---|---|---|
| 桌面壳 | Layer 4 | Electron + React + preload + agent-host + contract + 安全沙箱 + credential-vault | 套组件配薄胶水（继承 pi-desktop 范式） |
| pi 扩展 | Layer 3 | registerTool 工具集 + pi.on 钩子 + pi-ai provider + 技能 | 主要自研但薄（扩展层薄胶水） |
| 数据与引擎 | Layer 1 + Layer 2 | v0.01 五组件 + DuckDB 生产库 + MALF Adapter + 只读访问层 | 直接继承 + Adapter 桥接 |

**装配边界约束**：
- 桌面壳不直连数据与引擎层（须经 pi 扩展层 + Adapter）
- pi 扩展层不修改 pi 内核、不修改 MALF 引擎领域语义
- 数据与引擎层写入路径仍由 v0.01 run_pipeline.ps1 独占（受 ops.md SOP 约束），v0.02 Viewer 只读

### 1.3 与其他文档关系

| 关系 | 文档 | 引用章节 | 用途 |
|---|---|---|---|
| 上游 | AGENTS.md（已创建 v0.1.7） | §6 | 任务铁律与安全约束 |
| 上游 | 01-TRD | §2 技术底座 / §6 组件治理 | 决定装配的技术栈与五阶段总览 |
| 上游 | 03-架构设计 | §3 pi 扩展层 / §8 装配纪律 | 决定装配的架构边界与三批顺序 |
| 上游 | 04-任务清单 | §3.3 任务拆解 / §4 治理看板 | 决定装配的 task-id 与状态看板 |
| 下游 | — | — | 本文档为装配流程 SoT，无下游设计文档 |

---

## §2 组件识别

### 2.1 组件清单：参考仓库 + v0.01 继承 + v0.02 自建

v0.02 组件来源三类：

#### 2.1.1 参考仓库（仅参考，不构成权威，不直接 import）

| 仓库 | 路径 | 装配用途 |
|---|---|---|
| pi | `H:\pi-references\pi` | AI 底座 + extensions/skills 规范 |
| pi-skills | `H:\pi-references\pi-skills` | 技能供给 + SKILL.md 格式 |
| pi-desktop | `H:\pi-references\pi-desktop` | 桌面壳五件骨架 + contract + verify.mjs 范式 |
| inno-agent | `H:\pi-references\inno-agent` | 业务化范本 + 工作区级治理 |
| pi-studybuddy | `H:\pi-studybuddy` | 13 文档结构模板 + 装配纪律范式 |

#### 2.1.2 v0.01 继承组件（直接继承，290 passed）

来自 [03-架构设计 §5.1](./03-架构设计-Architecture-Design.md)：

| 组件 | 路径 | 测试数 | 角色 |
|---|---|:--:|---|
| malf-engine | `Z:\ai-malf-riskbench-components\malf-engine` | 115 | 五层领域模块（Core/Range/Lifespan/Structural Position/Service） |
| malf-data | `Z:\ai-malf-riskbench-components\malf-data` | 46 | TDX 接入 + DuckDB 持久化 + 三周期聚合 |
| riskbench-shared | `Z:\ai-malf-riskbench-components\riskbench-shared` | 10 | 集中配置 + 路径推导 |
| malf-signal | `Z:\ai-malf-riskbench-components\malf-signal` | 37 | 方向 C 四事件码事件流 |
| malf-backtest | `Z:\ai-malf-riskbench-components\malf-backtest` | 31 | T4 确定性规则验证 |
| 主仓编排 | `Z:\ai-malf-riskbench\scripts` | 51 | run_pipeline + 备份恢复 |
| **合计** | — | **290** | — |

> v0.01 继承组件不再走"试炼场 + 能力卡"流程（已沉淀），直接进入装配门禁的"组件测试全绿"校验。

#### 2.1.3 v0.02 自建组件（须走完整 6 步装配）

| 组件 | 分类 | 子系统 | 五阶段 |
|---|---|---|---|
| Electron 桌面壳 | 套组件配薄胶水 | 壳层 | M0 |
| MALF Adapter | 主要自研但薄 | 公用零件 | M0-M1 |
| DuckDB 只读访问层 | 套组件配薄胶水 | 公用零件 | M0-M1 |
| pi 扩展层 | 主要自研但薄 | 公用零件 | M0-M1 |
| MALF 查询工具 | 主要自研但薄 | 业务模块 | M1 |
| RISK 风险声明 | 主要自研但薄 | 业务模块 | M1-M2 |
| AI 解读层 | 主要自研但薄 | 业务模块 | M2-M3 |
| 回测报告 Viewer | 套组件配薄胶水 | 业务模块 | M2-M3 |
| 只读 Viewer | 套组件配薄胶水 | 业务模块 | M2-M3 |

### 2.2 组件粒度原则（继承 pi-studybuddy §6.4）

v0.02 组件按以下四档粒度划分，装配前须明确每个组件所属档位：

| 粒度 | 含义 | 判定标准 | v0.02 示例 |
|---|---|---|---|
| **直接套库** | 成熟开源组件直接用，不写 Adapter | 库 API 稳定、文档完善、无需桥接 | Electron、DuckDB、pi-coding-agent |
| **套组件配薄胶水** | 开源组件 + 薄 Adapter 桥接 | 需要少量类型转换/配置注入/错误码归一 | MALF Python 引擎 + Adapter、DuckDB 只读访问层、回测报告 Viewer |
| **主要自研但薄** | 业务逻辑自研但保持精简 | 业务语义独特，无可直接复用的库 | RISK 风险声明、AI 解读层、pi 扩展层、MALF 查询工具 |
| **禁止过度工程化** | 不为"将来可能需要"的功能提前设计 | 无明确任务驱动、无验收标准 | — |

**粒度纪律**：
- 自研组件保持"薄"：单文件优先，不提前拆包，不为 imagined future 抽象接口。
- 胶水代码聚焦"类型转换 + 错误码归一 + 日志脱敏"，不夹带业务逻辑。
- 任何"看起来需要框架"的需求先回到 04-Todo 登记 task-id，由用户裁决是否升级粒度。

---

## §3 试炼场（Z:\pi-malf-riskbench-v0.02-composer）

### 3.1 定位：MALF Adapter 试炼场

试炼场是 v0.02 装配的隔离实验区，定位为 **"MALF Adapter 先调通"** 的沙箱：

| 属性 | 值 |
|---|---|
| 路径 | `Z:\pi-malf-riskbench-v0.02-composer\` |
| 唯一职责 | 先调通 MALF Python 引擎 ↔ pi TS 扩展的 Adapter |
| 是否进 Git | ❌ 不进 |
| 是否存真实数据 | ❌ 不存（运行数据可随时清空） |
| 与主仓关系 | 物理隔离，代码不互 import |
| 触发阶段 | 步骤 2（试炼场单件）专属场地 |

试炼场存在的唯一理由：让"Python 引擎 ↔ TypeScript 扩展"的桥接在隔离环境先跑通，验证协议、错误码、超时、崩溃恢复，再进入主仓独立重新实现。

### 3.2 规则六条

| 编号 | 规则 | 说明 |
|---|---|---|
| R1 | **试炼场代码不得被主仓 import** | 主仓 `src/` 不允许出现 `from '../../composer/...'` 或等价引用 |
| R2 | **主仓不复制试炼场样例** | 主仓必须在 `src/` 独立重新实现 Adapter，试炼场样例仅作能力参考 |
| R3 | **试炼场不变成主系统** | 试炼场不实现完整业务闭环，不替代主仓装配 |
| R4 | **运行数据不进 Git** | 试炼场产生的 DuckDB 临时库、JSONL 样例、日志一律 .gitignore |
| R5 | **备份不反向污染** | 试炼场备份/快照不写回主仓、不写回业务数据根、不写回 v0.01 |
| R6 | **能力卡沉淀** | 试炼场调通后必须产出 `COMPONENT-CARD.md`，无能力卡不进入步骤 4 |

### 3.3 创建时机

试炼场在 **步骤 2（试炼场单件）** 启动时创建，时机判定如下：

- ✅ 已完成步骤 1（组件识别）：组件清单 + 粒度档位已登记
- ✅ 目标组件属于"主要自研但薄"或"套组件配薄胶水"且涉及跨语言/跨进程桥接
- ✅ 主仓壳层（批次 1）已就绪或同步推进（壳层未就绪时试炼场可先跑纯 Adapter 协议验证）

**创建动作**（由 04-Todo 登记 task-id 驱动）：
1. 在 `Z:\pi-malf-riskbench-v0.02-composer\` 建立最小目录结构（`adapter/` + `fixtures/` + `README.md`）
2. 配置独立 venv / node_modules，不共享主仓依赖
3. 运行数据落 `composer/.runtime/`（.gitignore 覆盖）
4. 调通后产出 `composer/<component>/COMPONENT-CARD.md`

---

## §4 能力卡（COMPONENT-CARD.md）

### 4.1 定位：组件能力与边界记录

能力卡是 v0.02 自建组件的 **能力与边界唯一记录**，存放在试炼场对应组件目录下，装配时作为主仓独立重新实现的契约输入。

| 属性 | 值 |
|---|---|
| 文件名 | `COMPONENT-CARD.md` |
| 存放位置 | `Z:\pi-malf-riskbench-v0.02-composer\<component>\COMPONENT-CARD.md` |
| 触发阶段 | 步骤 3（能力卡沉淀）产出，步骤 4（Adapter 封装）消费 |
| 是否进 Git | 试炼场不进 Git，但主仓 `src/<component>/CARD.md` 镜像可进 Git |

### 4.2 格式七章节

每张能力卡必须包含以下七章：

```markdown
# COMPONENT-CARD: <组件名>

## 1. 基本信息
- 组件名：
- 分类（粒度档位）：
- 子系统（壳层/公用零件/业务模块）：
- 五阶段目标（M0/M1/...）：
- task-id（对齐 04-Todo）：

## 2. 能力描述
- 职责一句话：
- 输入：
- 输出：
- 不做什么（边界）：

## 3. 公开 API
| 方法 | 参数 | 返回 | 错误码 |

## 4. 冒烟测试
- 独立冒烟用例清单（合成夹具，不依赖生产库）

## 5. 五阶段状态
| 阶段1 下载 | 阶段2 单件 | 阶段3 集成 | 阶段4 组装 | 阶段5 冒烟E2E |
| ✅/⏳/❌/— | ... | ... | ... | ... |

## 6. 装配记录
- 主仓装配路径：src/<...>
- contract RPC 方法名：
- 装配门禁结果：

## 7. 许可证
- 来源许可证（若套库）：
- v0.02 自研许可证：
```

### 4.3 触发条件：阶段 3→4 的前置条件

**无能力卡不装配** 是 v0.02 装配的硬门禁：

- 步骤 3（能力卡沉淀）未产出 `COMPONENT-CARD.md` → 步骤 4（Adapter 封装）禁止启动
- 能力卡缺少"公开 API"或"冒烟测试"章节 → 视为无效，退回步骤 2
- 主仓装配时若发现实现与能力卡契约偏离 → 退回步骤 3 修订能力卡，再回步骤 4

> v0.01 继承组件（290 passed）已具备既定 API 与测试，不强制走能力卡流程；若 v0.02 需为其新增 Adapter，则 Adapter 部分须走能力卡。

---

## §5 Adapter 封装

### 5.1 定位：主仓 src/ 独立重新实现

Adapter 封装是步骤 4 的核心动作：**在主仓 `src/` 独立重新实现** Adapter，不复制试炼场样例代码。

| 属性 | 值 |
|---|---|
| 实现位置 | `Z:\pi-malf-riskbench-v0.02\src\<adapter>\` |
| 契约输入 | 试炼场 `COMPONENT-CARD.md` |
| 与试炼场关系 | 参考能力卡契约，独立重写实现 |
| 进入条件 | 能力卡已沉淀（步骤 3 完成） |

### 5.2 封装规则五条

| 编号 | 规则 | 说明 |
|---|---|---|
| A1 | **契约优先** | Adapter 必须先实现与 pi 扩展层/调用方约定的契约（方法名、参数、返回、错误码），再填实现 |
| A2 | **类型安全** | 全部 TypeScript，禁止 `any`（除非有显式 `// @ts-expect-error` 注释说明理由） |
| A3 | **错误码统一** | 对外错误码归一为 INTERNAL_ERROR / MALF_ENGINE_ERROR / DUCKDB_ERROR / VALIDATION_ERROR，不泄露内部堆栈 |
| A4 | **日志脱敏** | 日志不输出密钥/URL/绝对路径（S7-S8），只记 sanitized error code + 方法名 + 耗时 |
| A5 | **不复制试炼场代码** | 主仓 `src/` 不得从 `composer/` 粘贴代码，须按能力卡契约独立实现 |

### 5.3 MALF Adapter 特殊规则

MALF Adapter 桥接 Python MALF 引擎与 TypeScript pi 扩展层，除 §5.2 五条外，额外遵守：

| 编号 | 规则 | 说明 |
|---|---|---|
| MA1 | **子进程隔离** | Python MALF 引擎以子进程方式启动，不嵌入 Electron 主进程；崩溃不拖垮桌面（DECISION-v02-004） |
| MA2 | **JSON Lines 协议** | stdin/stdout 走 JSON Lines，stderr 仅日志；请求 `{id, method, params}` / 响应 `{id, result}` 或 `{id, error}`（D27） |
| MA3 | **路径只来自配置** | Adapter 不硬编码任何绝对路径（S17），所有路径经 riskbench-shared paths.py + `_guard` 获取（S16） |
| MA4 | **受控输入** | 调用 MALF 引擎的参数（symbol/timeframe/bar_dt）经白名单校验，拒绝越权查询 |
| MA5 | **只读调用** | Adapter 不调用任何写路径（不写 snapshots/signals 表，D28），写入仍由 v0.01 run_pipeline.ps1 独占 |

**Adapter 方法映射**（对齐 [03-架构设计 §4.1](./03-架构设计-Architecture-Design.md)，共 6 个，与 06-API §4.2 一致）：

| Adapter 方法 | 对应 v0.01 API | 用途 |
|---|---|---|
| `querySnapshot(symbol, timeframe, bar_dt)` | DuckDB SELECT | 查询单个 snapshot |
| `querySnapshotRange(symbol, timeframe, start_dt, end_dt)` | DuckDB SELECT | 查询 snapshot 范围 |
| `querySignals(symbol, timeframe, start_dt, end_dt)` | SignalStore.read_events | 查询事件流 |
| `runBacktestVerification(symbol, timeframe)` | run_full_verification | 运行 T4 验证 |
| `getSymbolList()` | DuckDB SELECT DISTINCT | 获取标的列表 |
| `getTimeframes(symbol)` | DuckDB SELECT DISTINCT | 获取周期列表 |

> **Adapter 签名包装责任**（P0-10 修复，与 03-Arch §4.1 / 06-API §4.3 一致）：Adapter 方法签名（TS 侧）与 v0.01 Python API 签名可能不完全一致，Adapter 负责参数名/类型转换、返回值归一（DTO + D5 过滤）、错误码映射（→ 4 码）、`lineage_hash`/`rule_versions` 原样透传（D29）。能力卡 §3 公开 API 须记录两侧签名映射关系。

### 5.4 DuckDB 只读访问层规则

DuckDB 只读访问层为 v0.02 只读 Viewer 提供数据访问，遵守：

| 编号 | 规则 | 说明 |
|---|---|---|
| DA1 | **只读访问** | 仅 SELECT，不修改 snapshots/signals 表（D28） |
| DA2 | **路径防护** | 访问路径经 paths.py + `_guard` 防护（S16-S17），拒绝 `../` 逃逸 |
| DA3 | **连接池单例** | 单例连接池，崩溃不拖垮桌面 |
| DA4 | **查询超时** | 查询超时 30 秒，超时返回 DUCKDB_ERROR |
| DA5 | **不共享写句柄** | 与 v0.01 run_pipeline.ps1 的写句柄物理隔离，避免锁竞争 |

---

## §6 主仓装配

### 6.1 装配方式：contract RPC（MessagePort + 统一信封）

主仓装配采用 **contract RPC**，所有跨进程/跨层通信走统一信封，不接受直接函数调用绕过契约（INV-05）。

**信封格式**：

```typescript
// 伪代码，实现时以代码为准
interface ContractEnvelope<T = unknown> {
  id: string;            // 请求 UUID
  method: string;        // 契约方法名（如 "malf.querySnapshot"）
  params: T;             // 类型化参数
  // 响应时附加：
  result?: unknown;
  error?: { code: string; message: string };
}
```

**装配通道**：

| 通道 | 用途 | 实现 |
|---|---|---|
| MessagePort（main ↔ renderer） | UI 与主进程 RPC | Electron MessagePort + ipcMain 白名单 |
| MessagePort（main ↔ agent-host） | 主进程与 pi 会话 RPC | pi-coding-agent SDK + MessagePort |
| 子进程 stdin/stdout（agent-host ↔ MALF） | TS ↔ Python 桥接 | JSON Lines（见 §5.3） |
| ipcMain 白名单 | 受控原生能力 | preload 白名单 API（INV-03） |

### 6.2 装配契约校验 AST（check-contract-coverage.mjs）

装配时须通过 `scripts/check-contract-coverage.mjs`（✅ 已创建，design 阶段 graceful skip，M0 后启用完整校验）AST 校验：

| 校验项 | 说明 |
|---|---|
| 所有 `ipcMain.handle` 调用方法名在 contract 白名单内 | 防止未登记的 RPC 通道 |
| 所有 `registerTool` 工具名在 06-API 契约登记表内 | 防止未登记的工具 |
| 主仓 `src/` 不出现 `from '../../composer/...'` 引用 | 强制 R1（试炼场不互 import） |
| 主仓 `src/` 不出现硬编码绝对路径（`Z:\` / `H:\` 字面量） | 强制 S17（路径只来自配置） |
| preload 不暴露 Node API（`require`/`process`/`fs` 等） | 强制 INV-03 |

> 校验脚本在步骤 4（系统组装）与步骤 6（装配门禁）各运行一次，失败退回对应阶段。

---

## §7 装配门禁

### 7.1 四项门禁（AG1~AG4）

> **编号说明**：装配门禁使用 `AG1~AG4`（Assembly Gate）前缀，与 08-测试验收 §12 数据用途分级 `G0~G3` 区分，避免编号冲突（P0-12 修复）。

装配门禁（步骤 6）四项全绿才允许进入 master，继承 v0.01 装配.md + pi-studybuddy 范式：

| 编号 | 门禁 | 校验方式 | 失败处理 |
|---|---|---|---|
| AG1 | **组件测试全绿** | `pnpm test` + `pytest` 全 passed | 退回步骤 2/4 修复 |
| AG2 | **组件仓工作区干净** | `git status` 无未提交变更 | 提交或 stash 后重测 |
| AG3 | **公开 API 有文档** | 能力卡"公开 API"章节 + 06-API 契约登记表一致 | 退回步骤 3 补能力卡 |
| AG4 | **无越权行为** | `check-contract-coverage.mjs` + `check-desktop-security.mjs` 全绿 | 退回步骤 4 修复 |

### 7.2 失败处理

| 失败门禁 | 退回阶段 | 动作 |
|---|---|---|
| AG1 组件测试 | 步骤 2（试炼场单件）或步骤 4（Adapter 封装） | 修复测试 → 重跑单件 → 重进装配 |
| AG2 工作区不干净 | — | 提交/stash 后重跑门禁，不退回阶段 |
| AG3 公开 API 无文档 | 步骤 3（能力卡沉淀） | 补全能力卡 → 重新对齐契约 → 重进步骤 4 |
| AG4 越权行为 | 步骤 4（Adapter 封装） | 修复越权（硬编码路径/未登记 RPC/暴露 Node）→ 重跑 AST 校验 |

**铁律**：任一门禁失败不进 master，不"先合并再修"。

### 7.3 装配记录

每次通过装配门禁须在能力卡"§6 装配记录"章节追加：

- 装配日期
- task-id（对齐 04-Todo）
- contract RPC 方法名
- 四项门禁结果（AG1~AG4 各 ✅/数值）
- 装配人/agent 标识

---

## §8 组件化装配流程（完整 6 步）

v0.02 自建组件必须走完以下 6 步，任一步失败退回上一步，不进 master：

```
步骤 1：组件识别
   │  登记组件名 + 粒度档位 + 子系统 + 五阶段目标（对齐 04-Todo task-id）
   │
步骤 2：试炼场单件
   │  在 Z:\pi-malf-riskbench-v0.02-composer\ 隔离环境调通单件
   │  （独立 venv/node_modules，运行数据不进 Git）
   │
步骤 3：能力卡沉淀
   │  产出 COMPONENT-CARD.md（七章节齐全）
   │  ← 阶段 3→4 前置条件：无能力卡不装配
   │
步骤 4：Adapter 封装
   │  在主仓 src/ 独立重新实现（不复制试炼场代码）
   │  契约优先 + 类型安全 + 错误码统一 + 日志脱敏
   │
步骤 5：主仓装配
   │  contract RPC + 统一信封接入
   │  check-contract-coverage.mjs AST 校验
   │
步骤 6：装配门禁
   │  AG1 测试全绿 + AG2 工作区干净 + AG3 API 有文档 + AG4 无越权
   │  通过 → 进 master，追加装配记录
```

### 步骤 1：组件识别

- 输入：04-Todo task-id + 03-架构设计组件清单
- 动作：登记组件名、粒度档位（§2.2）、子系统、五阶段目标
- 产出：组件清单行（对齐 04-Todo §3.3）
- 退回条件：粒度档位无法判定 / 无对应 task-id

### 步骤 2：试炼场单件

- 输入：组件清单行
- 动作：在 `Z:\pi-malf-riskbench-v0.02-composer\` 建立最小目录，调通单件冒烟（合成夹具，不依赖生产库）
- 产出：试炼场可运行单件 + 冒烟通过证据
- 退回条件：协议跑不通 / 崩溃恢复失败 / 超时不可控

### 步骤 3：能力卡沉淀

- 输入：试炼场单件 + 冒烟证据
- 动作：按 §4.2 七章节产出 `COMPONENT-CARD.md`
- 产出：有效能力卡（公开 API + 冒烟测试齐全）
- 退回条件：章节缺失 / API 与试炼场实现不一致

### 步骤 4：Adapter 封装

- 输入：能力卡
- 动作：在主仓 `src/` 独立重新实现 Adapter，遵守 §5.2 五条 + 领域特殊规则
- 产出：主仓 Adapter 代码 + 类型检查 + lint 通过
- 退回条件：偏离能力卡契约 / 触发越权（硬编码路径等）

### 步骤 5：主仓装配

- 输入：主仓 Adapter 代码
- 动作：contract RPC + 统一信封接入对应层，运行 `check-contract-coverage.mjs`
- 产出：装配完成 + AST 校验通过
- 退回条件：AST 校验失败 / RPC 通道未登记

### 步骤 6：装配门禁

- 输入：装配完成代码
- 动作：运行四项门禁（§7.1）
- 产出：门禁全绿 → 进 master + 追加装配记录
- 退回条件：任一门禁失败（按 §7.2 退回对应阶段）

---

## §9 组件治理状态看板（对齐 04-Todo §4）

看板对齐 [04-任务清单 §4](./04-任务清单-Todo-List.md) 治理看板，标记 v0.02 自建组件五阶段进度。

**标记说明**：

| 标记 | 含义 |
|---|---|
| ✅ | 该阶段通过 |
| ⏳ | 该阶段进行中 |
| ❌ | 该阶段失败，已退回 |
| — | 该阶段不适用（如直接套库无试炼场） |
| ⏭️ | 该阶段跳过（v0.01 继承组件已沉淀） |

**v0.02 自建组件看板**：

| 组件 | 阶段1 下载 | 阶段2 单件 | 阶段3 集成 | 阶段4 组装 | 阶段5 冒烟E2E | 状态 |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Electron 桌面壳 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| MALF Adapter | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| DuckDB 只读访问层 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| pi 扩展层 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| MALF 查询工具 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| RISK 风险声明 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| AI 解读层 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| 回测报告 Viewer | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |
| 只读 Viewer | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | 待启动 |

**v0.01 继承组件看板**（已沉淀，仅校验测试全绿）：

| 组件 | 阶段1 下载 | 阶段2 单件 | 阶段3 集成 | 阶段4 组装 | 阶段5 冒烟E2E | 状态 |
|---|:--:|:--:|:--:|:--:|:--:|---|
| malf-engine | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ✅ 可继承（115 passed） |
| malf-data | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ✅ 可继承（46 passed） |
| riskbench-shared | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ✅ 可继承（10 passed） |
| malf-signal | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ✅ 可继承（37 passed） |
| malf-backtest | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ✅ 可继承（31 passed） |
| 主仓编排 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ✅ 可继承（51 passed） |

> 看板状态与 04-Todo §4 同步更新，本文档为装配视角 SoT，04-Todo 为任务视角 SoT。

---

## §10 装配顺序（三批）

装配顺序继承 [01-TRD §6.2](./01-TRD-技术需求-Technical-Requirements.md) 与 [03-架构设计 §8.2](./03-架构设计-Architecture-Design.md)，分三批推进：

| 批次 | 里程碑 | 组件 | 前置 | 铁律 |
|---|---|---|---|---|
| 1 壳层 | M0 | Electron main + preload + renderer + agent-host + contract + 安全沙箱 + credential-vault | 无 | **禁止壳层未就绪时开发业务模块** |
| 2 公用零件 | M0-M1 | MALF Adapter + DuckDB 只读访问层 + pi 扩展空壳 + 配置层 | 壳层就绪 | Adapter 试炼场先行 |
| 3 业务模块 | M1-M3 | MALF 查询工具 + 风险声明 + AI 解读 + 回测报告 + 只读 Viewer | 公用零件就绪 | 五阶段不可跳越 |

### 批次 1 壳层（M0）

- 组件：Electron main + preload + renderer + agent-host + contract + 安全沙箱 + credential-vault
- 粒度：套组件配薄胶水（继承 pi-desktop 范式）
- 前置：无
- 产出：可启动的空壳 + 安全不变量五条（INV-01~05）校验通过 + INV-06 占位（HTML 预览 CSP 实现在 T-M2-009，M0 仅 constants 占位，全量断言移至 M2 退出门槛，P2-2 修复）
- 铁律：壳层未就绪前，批次 2/3 不得启动

### 批次 2 公用零件（M0-M1）

- 组件：MALF Adapter + DuckDB 只读访问层 + pi 扩展空壳 + 配置层
- 粒度：MALF Adapter 主要自研但薄；DuckDB 只读访问层套组件配薄胶水；pi 扩展空壳主要自研但薄
- 前置：壳层就绪
- 产出：Adapter 试炼场调通 + 能力卡沉淀 + 主仓 Adapter 装配通过门禁
- 铁律：MALF Adapter 必须先走试炼场（步骤 2），无能力卡不装配

### 批次 3 业务模块（M1-M3）

- 组件：MALF 查询工具 + RISK 风险声明 + AI 解读 + 回测报告 + 只读 Viewer
- 粒度：查询/声明/解读主要自研但薄；Viewer 套组件配薄胶水
- 前置：公用零件就绪
- 产出：业务工具 registerTool 注册完成 + E2E 通过
- 铁律：五阶段不可跳越，每个业务模块独立走 6 步装配

### 铁律：禁止壳层未就绪时开发业务模块

壳层（批次 1）是所有业务模块的运行载体，未就绪时开发业务模块会导致：
- contract RPC 通道不存在，业务模块无法装配验证
- 安全不变量六条无法断言，业务模块可能引入越权
- preload 白名单未定，业务模块可能绕过受控桥接

**强制措施**：批次 1 未通过装配门禁前，04-Todo 不得为批次 2/3 任务分配 in_progress 状态。

---

## §11 组件安全

### 11.1 检查清单

组件装配前须过以下安全检查清单（对齐 [01-TRD §5](./01-TRD-技术需求-Technical-Requirements.md) + [03-架构设计 §7](./03-架构设计-Architecture-Design.md)）：

| 检查项 | 对应约束 | 校验脚本 | 适用组件 |
|---|---|---|---|
| renderer 沙箱 sandbox:true | INV-01 | check-desktop-security.mjs | Electron 桌面壳 |
| 严格 CSP | INV-02 | check-desktop-security.mjs | Electron 桌面壳 |
| preload 不暴露 Node API | INV-03 | check-desktop-security.mjs | preload |
| credential-vault safeStorage | INV-04 | check-desktop-security.mjs | credential-vault |
| Host RPC 契约 + ipcMain 白名单 | INV-05 | check-contract-coverage.mjs | contract + agent-host |
| HTML 预览独立 CSP | INV-06 | check-desktop-security.mjs | 回测报告 Viewer / 只读 Viewer |
| 密钥不入日志 | S7-S8 | 代码审查 + 日志采样 | 全部 |
| 路径不硬编码 | S17 | check-contract-coverage.mjs | 全部 |
| 路径穿透防护 | S16 | 代码审查 | Adapter + DuckDB 访问层 |
| 只读访问 DuckDB | D28 | 代码审查 | DuckDB 只读访问层 + Viewer |
| 子进程 JSON Lines 协议 | D27 | 代码审查 | MALF Adapter |
| 不修改 MALF rule_versions / lineage_hash | D29 | 代码审查 | pi 扩展层 |

### 11.2 越权检测

越权行为（AG4 门禁失败）包括但不限于：

| 越权类型 | 表现 | 检测方式 |
|---|---|---|
| 路径硬编码 | `src/` 出现 `Z:\` / `H:\` 字面量 | check-contract-coverage.mjs AST |
| 未登记 RPC | `ipcMain.handle` 方法名不在 contract 白名单 | check-contract-coverage.mjs AST |
| 未登记工具 | `registerTool` 工具名不在 06-API 登记表 | check-contract-coverage.mjs AST |
| 试炼场引用 | 主仓 `from '../../composer/...'` | check-contract-coverage.mjs AST |
| 暴露 Node API | preload 出现 `require`/`process`/`fs` | check-desktop-security.mjs |
| 写入生产库 | Viewer/Adapter 调用 INSERT/UPDATE/DELETE | 代码审查 + DuckDB 只读连接 |
| AI 修改确定性计算 | pi 扩展层调用 MALF 引擎写方法 | 代码审查 |
| 公网绑定 | 监听非 127.0.0.1 地址 | check-desktop-security.mjs |

**越权处理**：检测到越权行为立即退回步骤 4（Adapter 封装），修复后重跑 AG4 门禁，不进 master。

---

## §12 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | 2026-08-09 | 初始草案：先分解再组合原则 + 三层装配边界 + v0.01 继承/v0.02 自建组件清单 + 试炼场规则六条 + 能力卡七章节 + Adapter 封装规则 + contract RPC 装配 + 四项门禁 + 6 步流程 + 治理看板 + 三批顺序 + 组件安全清单 |
| v0.1.1 | 2026-08-09 | P0 审计修复：① §5.3 Adapter 方法映射标注"共 6 个"并新增签名包装责任说明（P0-10）；② §7.1 四项门禁编号由 G1~G4 改为 AG1~AG4（Assembly Gate），与 08-测试验收 §5 数据用途分级 G0~G3 区分，避免编号冲突（P0-12）；③ §7.2/§7.3/§8 步骤 6/§11.2 全部 G 引用同步改为 AG；④ 上游 AGENTS.md 由"待创建"改为"已创建"（治理体系就绪）。审计洞集见 .record/ 实施记录。 |

---

**文档维护**：装配流程变更时更新，重大变更需用户批准
**最后更新**：2026-08-09
