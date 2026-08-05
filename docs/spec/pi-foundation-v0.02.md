# Pi 底座与装配设计 — pi-malf-riskbench-v0.02

## 1. 装配目标

不是把 Pi 当作现成开发环境，而是从 Pi Agent Runtime 装配一个 MALF 专属 Agent：

```text
Pi Agent Runtime
    + MALF system identity
    + MALF tools
    + MALF Skills
    + MALF policy
    + MALF audit
    + RiskBench workflows
    = MALF Pi
```

## 2. 代码边界草案

```text
malf-pi/
├── apps/
│   └── malf-pi-cli/              # 用户交互入口
├── packages/
│   ├── malf-agent/               # Agent 创建、上下文和会话
│   ├── malf-provider/            # 多 Provider 配置
│   ├── malf-tools/               # RiskBench 工具白名单
│   ├── malf-policy/              # 权限、确认、路径和状态门
│   ├── malf-audit/               # 模型、工具、工作流审计
│   ├── malf-state/               # revision、lock、backup
│   └── malf-workflows/            # 固定工作流入口
├── skills/
└── tests/
```

## 3. Agent 创建合同

```python
class MalfAgentFactory:
    """创建带有 MALF 固定身份和 RiskBench 工具白名单的 Agent。"""

    def create(self, session_id: str):
        """创建会话；不得把未登记工具和外部路径注入 Agent。"""
        raise NotImplementedError
```

## 4. 生命周期钩子

所有工具调用必须经过：

```text
请求进入
    → 输入 schema 校验
    → policy 检查
    → 用户确认（如需要）
    → 工具执行
    → 输出 schema 校验
    → 审计记录
    → 返回 Agent
```

失败统一返回固定 reason code，不把 Key、绝对路径、堆栈和秘密写入模型上下文或日志。

## 5. Provider 设计

业务层依赖统一接口，不依赖单一供应商：

```python
class ModelProvider:
    """统一模型供应商接口；API Key 只存在配置和进程环境中。"""

    def generate(self, request: dict) -> dict:
        """返回可审计的模型响应，不修改 RiskBench 事实。"""
        raise NotImplementedError
```

Provider 配置至少记录：

- provider name；
- model name；
- request id；
- token usage；
- sanitized error code。

不记录 API Key、完整 URL、用户秘密和本地敏感路径。

## 6. 不直接继承 Pi 的默认权限

MALF Pi 必须在 Pi 工具层之上增加：

- 目录白名单；
- 外部只读目录守卫；
- state 写入 revision；
- 工具副作用分级；
- 用户确认；
- 进程和网络白名单；
- 审计和回放。

## 7. 上游策略待裁决

候选方案：

| 方案 | 优点 | 风险 |
|---|---|---|
| 固定版本依赖 | 易升级、差异小 | 上游接口变化影响运行 |
| 独立 fork | 改造自由、可打补丁 | 维护成本高 |
| 固定源码镜像 | 可审计、可控 | 同步上游复杂 |
| 混合方案 | runtime 依赖 + MALF 自有层 | 需要清晰版本合同 |

当前建议：先采用**固定版本 runtime + MALF 自有适配层**，当核心扩展确实需要修改 Pi 时，再建立 fork 决策。
