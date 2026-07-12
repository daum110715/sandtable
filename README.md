# Sandtable

Sandtable 是一个 AI 驱动的历史沙盒：玩家从有出处的历史起点出发，通过人物、组织与制度之间的行动，观察一条可解释、可回放的架空世界线如何形成。

项目处于**技术原型阶段**。移动 PWA、Fastify API、Pi Worker 与共享领域协议框架已建立；历史业务规则尚未实现。

## 核心承诺

- 历史事实与模拟推演明确分离，不把模型生成内容伪装成史实。
- 用户拥有世界线 Root 权限，可下达改写指令；系统创建分支并模拟后果。
- AI 历史行动者只提出行动意图，不能获得 Root 权限或直接改写世界状态。
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
- [本地开发](docs/development.md)
- [MVP 开发计划](docs/development-plan.md)

## 工作区

- `apps/web`：React + Vite 移动 PWA。
- `apps/api`：Fastify HTTP API。
- `apps/worker`：Pi Agent 与后台任务入口。
- `packages/domain`：共享领域协议。

## 验证

使用 `npm run check` 依次执行类型检查、测试和生产构建。Windows PowerShell 若禁止 `npm.ps1`，使用 `npm.cmd run check`。

## 当前阶段

当前允许搭建技术框架、测试和文档；新增历史业务行为必须先有领域与验收依据。部署和外部资源仍需项目所有者明确授权。

产品与架构基线已于 2026-07-12 按“移动端优先、Web UI、综合最优”原则确认；正式结论以 `docs/decision-register.md` 为准。

