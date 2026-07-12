# M3 计划：持久化（SQLite）

> 状态：已实现（分支 `feature/m3-sqlite-persistence`，2026-07-13）。制定日期：2026-07-13。  
> 依据：`docs/development-plan.md` M3、`docs/data.md`、ADR-0007（D016 = SQLite）、M2 交付。

## 1. 决策闸门

| ID | 结论 |
|---|---|
| D016 | **SQLite**（项目内文件 + `node:sqlite`），见 [ADR-0007](adr/0007-sqlite-for-1-0-persistence.md) |

不触碰 D007/D014/D015；不接真实模型。

## 2. 目标与退出条件

| # | 条件 | 验证 |
|---|---|---|
| E1 | API/进程重启不丢已确认事件 | 写事件 → 关闭 DB → 重开 → 状态与日志一致 |
| E2 | 重复投递不重复推进世界状态 | 同 `commandId` 再提交 → 一条事件 |
| E3 | 状态写入与事件追加同事务 | 中途失败两者均不提交（SQLite transaction） |
| E4 | 无外部服务时基础测试仍可运行 | `:memory:` / 临时文件；`npm run check` |
| E5 | 健康与就绪分离 | `/health` 存活；`/ready` 探测存储 |

## 3. 架构

```
packages/domain          # 端口 WorldStateStore / EventLog；InMemory*；Orchestrator(+runInTransaction)
packages/persistence     # SQLite 实现、migrate、open、ready 探测
apps/api                 # /health /ready + 最小 deduce 写入路径（内存桩 Agent）
```

出现第二 adapter 后固定 seam：编排只依赖接口，不依赖 SQLite 类型。

## 4. Schema（最小）

```sql
schema_migrations(version INTEGER PRIMARY KEY);
world_states(
  worldline_id TEXT PRIMARY KEY,
  simulation_time TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON WorldState
  updated_at TEXT NOT NULL
);
events(
  id TEXT PRIMARY KEY,
  worldline_id TEXT NOT NULL,
  command_id TEXT,
  seq INTEGER NOT NULL,
  payload TEXT NOT NULL,   -- JSON DeductionEvent
  recorded_at TEXT NOT NULL,
  UNIQUE(worldline_id, seq)
);
CREATE UNIQUE INDEX events_command_id_uidx ON events(command_id) WHERE command_id IS NOT NULL;
```

## 5. 任务切片

| 序 | 任务 | 交付 |
|---|---|---|
| S1 | 领域端口 | `WorldStateStore` / `EventLog`；Orchestrator 依赖接口 + `runInTransaction` |
| S2 | DEV-012 | migrate + schema |
| S3 | DEV-011/013 | Sqlite store/log + 同事务 commit |
| S4 | DEV-014 | ready 探测；API `/health` vs `/ready` |
| S5 | 重启/幂等验收 | 集成测试；API 最小 deduce（桩 Agent） |
| S6 | 文档 | handover、decision-register、data/technology |

## 6. 明确不做

- 不部署云端 Postgres/Redis
- 不规范化拆人物/势力多表（JSON 快照足够 1.0）
- 不接真实模型；Worker 可不接完整推演
