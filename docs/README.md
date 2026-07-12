# 文档总览

本目录是项目文档中心。1.0 方向（历史模拟推演AI：自由改写 → AI 实时推演 → 状态一致性）已由项目所有者于 2026-07-12 确认；与 1.0 冲突的旧决策已标记为已废弃或待定，未冲突的保留。后续参与者可补充背景、候选项、影响与验证方法，但不能擅自改动已确认结论。

## 状态标记

- `事实`：已经由项目所有者明确给出的信息。
- `待填写`：新问题尚未讨论，保留空位。
- `候选`：后续变更时用于比较的方案，不代表项目决定。
- `已确认`：项目所有者已填写结论和确认日期。
- `待定`：需项目所有者决策，正文写为 `决策：________`，可列候选项与影响，不得代填答案。
- `后续迭代`：1.0 不做、原则保留。
- `已废弃`：曾经确认，后来被新的决策替代。

## 推荐填写顺序

1. [项目章程](project-charter.md)
2. [产品愿景](product-vision.md)
3. [用户与体验](user-experience.md)
4. [1.0 范围](mvp.md)
5. [系统架构](architecture.md)
6. [世界状态与事件模型](world-model.md)
7. [技术基线](technology.md)
8. [AI 治理](ai-governance.md)
9. [数据与存储](data.md)
10. [安全、隐私与内容治理](security-and-safety.md)
11. [质量与验收](quality.md)
12. [运行与发布](operations.md)
13. [路线图](roadmap.md)
14. [本地开发](development.md)
15. [1.0 开发计划](development-plan.md)
16. [历史内容策略](historical-content.md)

## 决策管理

- 所有已确认、待定与后续迭代事项集中在 [决策清单](decision-register.md)。
- 高代价、难逆转且存在真实取舍的结论再写入 `docs/adr/`。
- ADR 的 `Status` 只有项目所有者可以改为 `Accepted`；被替代的 ADR 标记为 `Superseded` 并保留历史记录。
- 文档正文引用决策编号，不重复制造互相矛盾的结论。

## 模板

- [ADR 模板](templates/adr.md)
- [功能规格模板](templates/feature-spec.md)
- [历史切片模板](templates/historical-scenario.md)
- [评估场景模板](templates/evaluation-scenario.md)
