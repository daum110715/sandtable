# Sandtable 文档总览

本目录是项目文档中心。基线决策已由项目所有者授权确认；后续参与者可以补充背景、候选项、影响和验证方法，但不能擅自改动已确认结论。

## 状态标记

- `事实`：已经由项目所有者明确给出的信息。
- `待填写`：新问题尚未讨论，保留空位。
- `候选`：后续变更时用于比较的方案，不代表项目决定。
- `已确认`：项目所有者已填写结论和确认日期。
- `已废弃`：曾经确认，后来被新的决策替代。

## 推荐填写顺序

1. [项目章程](project-charter.md)
2. [产品愿景](product-vision.md)
3. [用户与体验](user-experience.md)
4. [历史内容策略](historical-content.md)
5. [MVP 范围](mvp.md)
6. [系统架构](architecture.md)
7. [世界时间与事件模型](world-model.md)
8. [技术基线](technology.md)
9. [AI 治理](ai-governance.md)
10. [数据与存储](data.md)
11. [安全、隐私与内容治理](security-and-safety.md)
12. [质量与验收](quality.md)
13. [运行与发布](operations.md)
14. [路线图](roadmap.md)
15. [本地开发](development.md)
16. [MVP 开发计划](development-plan.md)

## 决策管理

- 所有已确认与后续待定事项集中在 [决策清单](decision-register.md)。
- 高代价、难逆转且存在真实取舍的结论再写入 `docs/adr/`。
- ADR 的 `Status` 只有项目所有者可以改为 `Accepted`。
- 文档正文引用决策编号，不重复制造互相矛盾的结论。

## 模板

- [ADR 模板](templates/adr.md)
- [功能规格模板](templates/feature-spec.md)
- [历史切片模板](templates/historical-scenario.md)
- [评估场景模板](templates/evaluation-scenario.md)
