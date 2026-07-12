# 1.0 持久化采用 SQLite

1.0 世界状态数据库与事件日志使用 **SQLite**（项目目录内单文件，Node 内置 `node:sqlite`），不引入外部 PostgreSQL/Redis 服务。满足 M3 事务、幂等与重启不丢事件；后期可再评估迁移到 PostgreSQL。

## Status

Accepted — 2026-07-13

## Context

M3 需要将 M2 内存世界状态数据库与事件日志持久化。D016 候选包括 PostgreSQL + Redis、SQLite 起步、其他。1.0 单人单会话、不做过度设计；协作规则要求依赖与数据位于项目目录内，且默认不创建云端资源。

## Candidates

1. **SQLite 起步**：零外部服务、文件在项目内、测试可用 `:memory:` 或临时文件。
2. **PostgreSQL（可选无 Redis）**：成熟关系库与事务；需本机/容器服务。
3. **PostgreSQL + Redis**：文档完整候选；1.0 复杂度偏高。

## Decision

- 采用 **SQLite** 作为 1.0 世界状态与事件日志存储（D016）。
- 运行时使用 Node.js 内置 `node:sqlite`（`DatabaseSync`），不增加原生第三方绑定依赖。
- 数据库文件默认位于项目目录（如 `data/sandtable.sqlite`），路径可通过环境变量覆盖。
- 世界状态以结构化 JSON 快照持久化；事件日志为只追加行，含幂等键 `command_id`。
- 世界状态写入与事件追加在同一 SQLite 事务内提交。
- 内存实现保留，作为测试 double 与无库路径；存储 seam 以领域接口固定。

## Reason

最短路径满足 M3 退出条件（重启不丢、事务一致、幂等、无外部服务可测），符合 1.0「不做过度设计」与本地优先约束。PostgreSQL 可在容量或运维需要出现时再迁，不阻塞当前闭环。

## Consequences

- 正面：零外部服务、CI/本地简单、与 M2 编排语义对齐快。
- 负面：多实例写扩展弱；复杂查询与规范化表结构需后续演进；若迁 PostgreSQL 需迁移路径。
- 后续工作：表结构规范化、备份/导出、若需要再评估 D016 修订为 PostgreSQL（另开 ADR）。

## Confirmation

- 确认人：项目所有者
- 确认日期：2026-07-13
