# .record/ — 实施记录目录

**用途**：存放 pi-malf-riskbench-v0.02 每个开发任务的实施记录，作为该任务"做了什么、如何做、证据是什么"的唯一历史证据。

## 文件结构

```
.record/
├── T-M<里程碑>-<三位序号>-实施记录.md   # 每个任务一份
└── README.md                            # 本文件
```

## 命名规范（AGENTS.md §4.2 + §7.1）

- 文件名：`T-M<里程碑>-<三位序号>-实施记录.md`（如 `T-M0-001-实施记录.md`）
- 一个 task-id 对应一份实施记录，**不拆分不覆盖**
- 修复记录使用 `FR-<四位序号>-实施记录.md` 前缀，不占用 task-id 序号空间

## 8 章节模板（AGENTS.md §7.1）

```markdown
# 实施记录：<task-id> <任务标题>

**任务 ID**：<task-id>
**日期**：YYYY-MM-DD
**计划文件**：.plan/<plan-file>.md

## 1. 任务裁决与范围
（做什么、不做什么、依据哪份设计文档）

## 2. 实际交付
（实际产出的文件/模块/测试）

## 3. 偏差
（与计划的差异，如有）

## 4. 问题及根因
（开发中遇到的问题及根因分析）

## 5. 关键决定及依据
（开发中的关键决策及权威依据）

## 6. 测试证据
（测试通过日志/截图/断言结果）
- 单件测试：✅ 通过（N 条）
- 集成测试：✅ 通过（N 条）/ — 不涉及
- 系统冒烟：✅ 通过 / — 不涉及
- E2E：✅ 通过（E2E-XX）/ — 不涉及
- 安全不变量六条：✅ 全过 / — 不涉及
- v0.01 继承复验：✅ 290 passed 不回退 / — 不涉及

## 7. Git 证据
（提交哈希/分支名/合并记录/推送状态）

## 8. 未解决事项/下一步约束
（遗留问题、技术债、下一步约束）
```

## 创建时机

任务收尾时由 `riskbench-task-complete` Skill（[.pi/skills/riskbench-task-complete/SKILL.md](../.pi/skills/riskbench-task-complete/SKILL.md)）步骤 3 创建。

**禁止**：
- 未完成任务前预创建
- 用聊天记录代替实施记录
- 删除已完成的实施记录
- 一任务拆分多份实施记录

## 当前状态

**⚪ 无实施记录**

v0.02 处于设计阶段闭环 + 治理体系建立阶段，尚无任务进入实施。首份实施记录将在 T-M0-001（Electron 五件骨架）收尾时创建。

## 与 04-Todo 的关系

- [docs/04-任务清单](../docs/04-任务清单-Todo-List.md) 是任务注册表（一行一任务的状态）
- `.record/` 是任务详细实施证据（每任务一份完整记录）
- 04-Todo §7 任务行的"证据"字段引用本目录的实施记录路径

## 与 .plan/ 的关系

- [.plan/](../.plan/) 是任务计划（开工前创建，10 章节模板）
- `.record/` 是任务实施记录（收尾时创建，8 章节模板）
- 计划原件在收尾时**不删除**，作为历史范围与验收证据
- 实施记录路径在计划文件"完成记录"章节登记

## 参考

- [AGENTS.md §7](../AGENTS.md) 受控收尾流程
- [AGENTS.md §7.1](../AGENTS.md) 实施记录 8 章节
- [AGENTS.md §4.2](../AGENTS.md) task-id 全局唯一
- [docs/10-开发规范](../docs/10-开发规范-Dev-Rules.md) 步骤 13（更新 04-Todo + 文档）
- [.pi/skills/riskbench-task-complete/SKILL.md](../.pi/skills/riskbench-task-complete/SKILL.md) 收尾 Skill
- [.pi/prompts/wr.md](../.pi/prompts/wr.md) 收尾模板
- ai-malf-riskbench `.record/` 实施记录规范（v0.01 范式来源）
- pi-studybuddy `.record/` 13 文档治理范式
