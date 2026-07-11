# 使用 Pi 作为 Agent 地基

Sandtable 采用 `earendil-works/pi` 的统一模型接入、Agent 循环、工具调用和会话扩展能力作为 AI 地基，以减少重复建设并保留多模型选择；历史知识、行动意图、裁决、事件账本和世界状态仍由 Sandtable 拥有，避免产品领域被 Pi 或特定模型供应商定义。

## Status

Accepted

## Consequences

- 优先依赖 Pi 的公开 interface，不复制其 Agent 循环。
- 所有模型输出必须先转换为 Sandtable 的行动意图。
- Pi 升级需要通过行动协议、权限和重放兼容性验证。
- Pi 不被视为权限沙盒，危险能力仍需独立治理。

