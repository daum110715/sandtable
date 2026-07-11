# Sandtable 协作规则

## 当前阶段

- 本仓库处于架构与文档阶段。
- 禁止创建业务代码、脚手架、依赖清单、构建配置或可执行原型，除非项目所有者明确要求进入实现阶段。
- 允许修改 Markdown 文档、图示、ADR 和仓库协作说明。
- 不安装依赖，不执行部署，不创建外部资源，除非项目所有者明确授权。

## 架构纪律

- 开始工作前先读 `CONTEXT.md`、`docs/architecture.md` 和相关 ADR。
- 使用 `CONTEXT.md` 中定义的领域术语，不自行引入同义词。
- 除“项目是 AI 驱动的历史沙盒、以 Pi 为地基、当前只做文档”外，不得替项目所有者确认产品或架构决策。
- 所有未确认选择必须写为 `决策：________`，可列候选项及影响，但不得代填答案。
- `docs/decision-register.md` 是未决事项的统一索引；新增决策点时必须同步登记。
- 新的长期、高代价或反直觉决策必须记录到 `docs/adr/`。
- 文档中的未决事项要明确标记为“待定”，不得伪装成已确认结论。

## Agent skills

### Issue tracker

事项与 PRD 使用 GitHub Issues 管理。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五个默认状态标签。详见 `docs/agents/triage-labels.md`。

### Domain docs

本仓库采用单一领域上下文：根目录 `CONTEXT.md` 与 `docs/adr/`。详见 `docs/agents/domain.md`。
