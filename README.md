# Sandtable

Sandtable 是一个 AI 驱动的历史沙盒：玩家从有出处的历史起点出发，通过人物、组织与制度之间的行动，观察一条可解释、可回放的架空世界线如何形成。

项目处于**架构与文档初始化阶段**。当前仓库不包含业务实现；在实现开始前，领域语言、世界演化规则、AI 权限和最小验证范围必须先稳定下来。

## 核心承诺

- 历史事实与模拟推演明确分离，不把模型生成内容伪装成史实。
- AI 提出意图，确定性的世界规则裁决结果；模型不能直接改写世界状态。
- 每次状态变化都有来源、原因和事件记录，可回放、可审计、可分支。
- Pi 是 Agent 地基，Sandtable 保有历史领域、模拟规则和世界状态的所有权。
- 先验证小而完整的历史切片，再扩大年代、地域和角色数量。

## 文档入口

- [文档总览与填写顺序](docs/README.md)
- [决策清单](docs/decision-register.md)
- [产品愿景](docs/product-vision.md)
- [领域语言](CONTEXT.md)
- [系统架构](docs/architecture.md)
- [技术基线](docs/technology.md)
- [世界时间与事件](docs/world-model.md)
- [AI 治理](docs/ai-governance.md)
- [MVP 范围](docs/mvp.md)
- [路线图](docs/roadmap.md)
- [架构决策](docs/adr/)

## 当前阶段

当前只允许完善架构、领域模型、决策记录和项目文档。任何具体代码实现都需要项目所有者明确解除该限制，并先有对应的文档依据。

产品与架构基线已于 2026-07-12 按“移动端优先、Web UI、综合最优”原则确认；正式结论以 `docs/decision-register.md` 为准。

