# .plan/ — 任务计划目录

**用途**：存放 pi-malf-riskbench-v0.02 开发任务的详细执行计划。同一时刻只允许存在一个**正在执行**的计划。

## 单一执行任务门禁（AGENTS.md §4.4）

创建新计划的三项前置条件（必须同时满足）：

1. 上一项任务已完成并在 [docs/04-任务清单](../docs/04-任务清单-Todo-List.md) 记录
2. 用户已明确选择该任务并批准开工
3. 该任务即将进入实施

**任一未满足 → 拒绝创建计划**

**未选任务**只能在 `.plan/00-当前任务.md` 作为候选名称出现，**不得**预写文件清单、命令、预期输出或实现步骤。

## 文件结构

```
.plan/
├── 00-当前任务.md                       # 当前执行中任务指针（无任务时为"⚪ 无执行中任务"）
├── T-M<里程碑>-<三位序号>-<scope>.md    # 任务计划（10 章节模板，见 .pi/prompts/plan.md）
└── README.md                            # 本文件
```

## task-id 命名规范（AGENTS.md §4.2）

```
T-M<里程碑>-<三位序号>
里程碑：M0（骨架）/ M1（核心闭环）/ M2（完整闭环）/ M3（打磨）/ M4（业务接线+打包部署）
示例：T-M0-001、T-M1-042

规则：
- task-id 一经分配不可重用，即使废弃也保留占位（状态 cancelled）
- 跨里程碑任务不得复用 id，新里程碑从 001 重新计数
- 修复记录使用 FR-<四位序号> 前缀，不占用 task-id 序号空间
```

运行数据隔离依赖此 id：`Z:\pi-malf-riskbench-v0.02-runtime\runs\<task-id>\`（12-目录治理 §5）。

## 创建流程

1. 用户明确选择任务并批准 → 调用 `/plan <task-id>` 工作流模板（[.pi/prompts/plan.md](../.pi/prompts/plan.md)）
2. 前置门禁检查通过 → 创建 `T-M*-NNN-<scope>.md`
3. 更新 `00-当前任务.md` 指向该计划
4. 更新 [docs/04-任务清单](../docs/04-任务清单-Todo-List.md) 任务状态为 `in_progress`
5. 用户审查并批准计划（步骤 5）→ 进入实施

## 收尾流程

任务完成后调用 `/wr` 工作流模板（[.pi/prompts/wr.md](../.pi/prompts/wr.md)）：

1. 复验测试（含 v0.01 290 passed 继承复验，如涉及）
2. 更新 04-Todo
3. 创建 [.record/](../.record/) 实施记录（8 章节，AGENTS.md §7.1）
4. 标记计划文件"完成记录"章节（**不删除**，保留作为历史证据）
5. 复位 `00-当前任务.md` 为"⚪ 无执行中任务"状态
6. 运行 `scripts/check-docs-governance.mjs` 文档治理检查

## 当前状态

**⚪ 无执行中任务**

v0.02 处于设计阶段闭环 + 治理体系建立阶段，待 13 份设计文档审查批准后启动 M0 骨架阶段首个任务 T-M0-001（Electron 五件骨架）。

详见 [docs/04-任务清单 §M0](../docs/04-任务清单-Todo-List.md)。

## 参考

- [AGENTS.md §4.4](../AGENTS.md) 单一执行任务门禁
- [AGENTS.md §4.2](../AGENTS.md) task-id 全局唯一
- [AGENTS.md §5.3](../AGENTS.md) 测试运行数据隔离
- [docs/10-开发规范](../docs/10-开发规范-Dev-Rules.md) 步骤 3（编写 .plan/ 计划）
- [docs/04-任务清单](../docs/04-任务清单-Todo-List.md) task-id 注册表
- [.pi/prompts/plan.md](../.pi/prompts/plan.md) 计划模板
- [.pi/prompts/wr.md](../.pi/prompts/wr.md) 收尾模板
- [.pi/skills/riskbench-task-complete/SKILL.md](../.pi/skills/riskbench-task-complete/SKILL.md) 受控收尾 Skill
- ai-malf-riskbench `.plan/` 计划规范（v0.01 范式来源）
- pi-studybuddy `.plan/` 13 文档治理范式
