# Issue tracker: GitHub

本仓库的事项和 PRD 存放在 [GitHub Issues](https://github.com/daum110715/sandtable/issues)，使用 `gh` CLI 操作。

## Conventions

- 创建、读取、评论、标记和关闭事项均针对 `daum110715/sandtable`。
- 架构讨论在形成结论后，应把长期决策写入仓库文档或 ADR；Issue 不是最终事实来源。
- 实现类事项在当前阶段不得标记为 `ready-for-agent`，除非项目所有者明确解除禁止代码实现的限制。
- PRD 以 GitHub Issue 发布，并链接相关 `CONTEXT.md`、架构文档和 ADR。

## Skill semantics

- “publish to the issue tracker”表示创建 GitHub Issue。
- “fetch the relevant ticket”表示读取对应 Issue 的正文、标签和评论。
- 仓库由当前目录的 `origin` 自动推断。
