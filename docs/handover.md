# 交接文档

> 最后更新：2026-07-13。M3（SQLite 持久化）已在分支 `feature/m3-sqlite-persistence` 实现，待合入 main。

## 一句话定位

**历史模拟推演AI**（工程代号 Sandtable）：用户自由改写历史事件，AI 实时推演后续；结构化世界状态 + 事件日志保证可追溯与一致。

1.0 只跑通：**自由输入改写 → AI 合理推演 → 状态一致性有保障**。

## 当前状态

- **1.0 方向**：ADR-0006。
- **进度**：M1 领域协议、M2 内存编排、**M3 SQLite 持久化**已完成（本分支）。M4–M6 待开始。
- **D016**：SQLite（ADR-0007）。**仍待定**：D007 / D014 / D015（M4 需要）。
- 计划：[m2-plan.md](m2-plan.md)、[m3-plan.md](m3-plan.md)。

## 必读约束

1. `AGENTS.md`：不代填待定决策；依赖/数据在项目内；不擅自部署/建云资源。
2. 术语以 `CONTEXT.md` 为准。
3. M4 前仍用内存桩 Agent；不接真实模型除非授权。
4. TS 严格约定见 `tsconfig.base.json`。

## M3 交付

| 位置 | 内容 |
|---|---|
| `packages/domain` | `WorldStateStore` / `EventLog` 端口；Orchestrator `runInTransaction` |
| `packages/persistence` | `openSqlitePersistence`、migrate、`SqliteWorldStateStore`、`SqliteEventLog` |
| `apps/api` | `/health`（存活）、`/ready`（存储）、`POST /api/v1/deduce`、`GET world-state/events` |
| 默认 DB | `SANDTABLE_DB_PATH` 或 `data/sandtable.sqlite`（已 gitignore） |

**退出条件**：文件库关闭重开不丢事件 ✅；同 commandId 幂等 ✅；BEGIN/COMMIT 同事务 ✅；`:memory:` 无外部服务可测 ✅。

## 验证

```bash
npm run check
```

## M4 下一步（依赖 D007 / D014 / D015）

真实演员/记录员模型接入、失败降级。持久化与编排可复用；密钥只在服务端。

## 已踩坑

1. `node:sqlite` 的 `DatabaseSync` **没有** `transaction()`，用 `BEGIN`/`COMMIT`/`ROLLBACK`。
2. SQLite store **不要**在事务外长期缓存 payload，否则回滚后脏读；以 DB 为准读。
3. `exactOptionalPropertyTypes` / `verbatimModuleSyntax` / 品牌化 ID 规则同 M1/M2。
4. 幂等键是 `CommandId`，不是改写文本哈希。

## 关键索引

- `AGENTS.md` · `CONTEXT.md` · `docs/architecture.md` · `docs/development-plan.md`
- ADR-0006（1.0 方向）· ADR-0007（SQLite）
