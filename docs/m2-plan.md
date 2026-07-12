# M2 计划：状态与事件核心

> 状态：已实现（分支 `feature/m2-state-event-core`，2026-07-13）。制定日期：2026-07-13。  
> 依据：`docs/development-plan.md`（M2 / DEV-006–010）、`docs/architecture.md`、`docs/data.md`、`docs/handover.md`、`packages/domain` M1 交付。  
> 范围：内存世界状态数据库 + 事件日志 + 推演编排 + 幂等 + 回溯；**不接真实模型 / 不接持久化 / 不触 D007/D014/D015/D016**。

## 1. 目标与退出条件

### 目标

把 M1 的示例级闭环（`m1-loop.ts` + 测试内手写编排）升级为**可复用、有事务与幂等保证**的内存实现，完整跑通：

**改写 →（桩）演员推演 →（桩）记录员写回 → 世界状态更新 + 事件追加 → 按日志回溯。**

### 退出条件（对照 development-plan）

| # | 条件 | 验证方式 |
|---|---|---|
| E1 | 内存中可完整运行改写-推演-写回-回溯链路 | 集成测试（赤壁场景至少 2 轮） |
| E2 | 世界状态写入与事件追加位于同一逻辑事务 | 编排失败时状态与日志均不前进；成功则两者同步 |
| E3 | 重复命令不产生重复事件 | 同 `commandId` 再提交 → 返回原结果，日志长度不变 |
| E4 | 单元测试覆盖核心不变量 | 沿用 M1 六条不变量 + 事务/幂等专项 |

### 明确不做（防范围膨胀）

- 不新建 `packages/core`（见 §3 放置决策）。
- 不抽「存储 Port / Repository 接口」公共 seam（执行规则：第二个真实 adapter 再固定 seam；M3 再做）。
- 不接 D016 持久化、不接真实模型、不改 API/Web/Worker 业务路径。
- 不启用裁判 Agent；不做世界线分支、确定性重放、并发冲突。
- 不代填 D007/D014/D015/D016。

## 2. 现状与缺口

| M1 已有 | M2 缺口 |
|---|---|
| `WorldState` / `StateChange` / `DeductionEvent` schema | 无「当前状态」权威容器（只有裸对象） |
| `applyStateChange` / `appendEvent` / `replay` / `buildEvent` | 无封装、无事务边界、无查询 API |
| `ActorAgent` / `RecorderAgent` 接口 + 内存桩 | 无统一推演编排入口 |
| 测试内手写闭环 | 无幂等键、无重复提交保护 |
| 不变量断言 | 未覆盖「编排层」提交语义 |

`m1-loop.ts` 的纯函数继续保留为**状态应用内核**（apply / replay / buildEvent），由 M2 的 store / orchestrator 调用，避免重写已测逻辑。

## 3. 放置与命名（技术选择，非待定产品决策）

| 项 | 选择 | 理由 |
|---|---|---|
| 包位置 | 继续 `packages/domain` | 仍是纯内存领域核心；无第二 adapter，拆 `core` 无收益 |
| 世界状态数据库 | `InMemoryWorldStateStore` | 对应术语「世界状态数据库」；M3 再加持久化实现 |
| 事件日志 | `InMemoryEventLog` | 只追加、按序读；术语对齐 |
| 推演编排 | `DeductionOrchestrator` | 架构图「推演编排」模块；依赖 Agent 接口，不依赖供应商 |
| 幂等键 | `CommandId`（品牌化 ID） | `docs/data.md`：提交改写使用幂等键；网络重试不重复事件 |

文件建议（均在 `packages/domain/src/`）：

```
src/
  command-id.ts          # asCommandId + 类型（或并入 ids.ts）
  world-state-store.ts   # DEV-006
  event-log.ts           # DEV-007
  orchestrator.ts        # DEV-008 + DEV-009 入口
  m1-loop.ts             # 保留：apply / replay / buildEvent（标注为内核）
  *.test.ts              # 各模块单测
  m2-integration.test.ts # DEV-010 + 全链路
```

导出：`index.ts` 增加 M2 公共 API；M1 导出保持兼容（现有测试不破）。

## 4. 组件设计

### 4.1 DEV-006 `InMemoryWorldStateStore`（世界状态数据库）

**职责**：持有当前世界状态权威快照；按要素查询与按 `StateChange` 更新。

**建议 API**（形状可微调，语义固定）：

```ts
class InMemoryWorldStateStore {
  constructor(initial: WorldState);

  /** 当前权威快照（只读视图） */
  getState(): WorldState;

  getPerson(id: PersonId): Person | undefined;
  getFaction(id: FactionId): Faction | undefined;
  // resource / location / relation 同理

  /** 应用一组变更，返回新快照；失败抛错且不修改内部状态 */
  apply(changes: readonly StateChange[]): WorldState;

  /** 整体替换（仅用于 load 场景 / 测试夹具，不作为推演写回路径） */
  replace(state: WorldState): void;
}
```

**约束**：

- 内部状态不可变更新（沿用 `applyStateChanges`）。
- `apply` 要么全成要么全不成（单次调用内对副本 reduce，成功后再替换引用）。
- **不**暴露给演员 Agent 的写路径；写回只由编排层在记录员产出后调用。

### 4.2 DEV-007 `InMemoryEventLog`（事件日志）

**职责**：只追加、不可原地修改、按顺序读取；支持按 `commandId` 查已提交事件。

**建议 API**：

```ts
class InMemoryEventLog {
  /** 追加；若同 commandId 已存在则拒绝或由编排层短路（见 §4.4） */
  append(event: DeductionEvent): void;

  all(): readonly DeductionEvent[];
  at(index: number): DeductionEvent | undefined;
  last(): DeductionEvent | undefined;
  length: number;

  findByCommandId(commandId: CommandId): DeductionEvent | undefined;
}
```

**约束**：

- 追加后返回的数组视图对外只读；禁止 `update`/`delete` API。
- 可用 `assertAppendOnly` 在测试中验证引用稳定性（追加前缀不变）。
- 因果链字段仍由 `buildEvent` 填充；日志本身不做因果修复。

### 4.3 Schema 小演进：`commandId` 与 `DeductionEvent`

`docs/data.md` 要求幂等键。M1 的 `DeductionEvent` 尚无此字段。

**提议**（实现时落地，并在 `decision-register` 记一条「schema 演进」备注，非新待定决策）：

```ts
// DeductionEvent 增加：
readonly commandId?: CommandId;
```

- M2 编排路径**必须**携带 `commandId`（幂等入口强制）。
- 可选字段保持对 M1 测试与历史形状兼容。
- `CommandId` 放 `ids.ts`：`string & { readonly __brand: "CommandId" }` + `asCommandId`。

### 4.4 DEV-008 + DEV-009 `DeductionOrchestrator`

**职责**：一次改写-推演的唯一入口；协调只读演员 → 记录员 → **同一逻辑事务**写状态 + 追加事件；幂等。

**输入**（建议）：

```ts
interface DeduceCommand {
  readonly commandId: CommandId;
  readonly rewrite: Rewrite;
  /** 缺省用当前 store 的 simulationTime；记录员可返回 nextSimulationTime */
  readonly simulationTime?: SimulationTime;
  readonly sessionId?: SessionId;
}
```

**输出**（建议）：

```ts
interface DeduceResult {
  readonly outcome: "applied" | "duplicate";
  readonly event: DeductionEvent;
  readonly worldState: WorldState;
  readonly actorOutput: ActorOutput;
  readonly recorderOutput: RecorderOutput;
}
```

**成功路径**（逻辑事务）：

```
1. 若 eventLog.findByCommandId(commandId) 存在
     → return { outcome: "duplicate", event: 已有, worldState: 当前, ... 可从 event 还原最小字段 }
2. state0 = store.getState()
3. actorOutput = await actor.deduce({ worldState: state0, rewrite })
   assertActorOutputIsStateless(actorOutput)
4. recorderOutput = await recorder.record({ worldState: state0, rewrite, actorOutput, simulationTime })
   assertStateChangesAreValid(recorderOutput.stateChanges)
5. 在「暂存」上计算：
     nextState = applyStateChanges(state0, stateChanges)
     event = buildEvent({ id, commandId, previousEventId: log.last()?.id, ... })
6. 仅当 5 成功：store 提交 nextState；log.append(event)
   （失败：两者都不改 → 逻辑事务回滚）
7. return { outcome: "applied", ... }
```

**失败语义**（M2 最小）：

| 失败点 | 行为 |
|---|---|
| 演员 / 记录员抛错 | 不写状态、不追加事件；错误上抛 |
| `apply` 抛错（如 update 不存在 id） | 不写状态、不追加事件；错误上剖 |
| 重复 `commandId` | 不二次推演（可选：也不二次调 Agent）；返回 `duplicate` |

**ID 生成**：`EventId` 由编排器生成（简单递增 `event-${n}` 或注入 `IdGenerator` 便于测试）。M2 不引入外部 UUID 依赖亦可。

**依赖注入**：

```ts
new DeductionOrchestrator({
  store: InMemoryWorldStateStore,
  eventLog: InMemoryEventLog,
  actor: ActorAgent,      // 默认测桩
  recorder: RecorderAgent,
  // 可选 clock / id 生成
})
```

演员 Agent **只通过** `getState()` 读快照进入 `deduce`；编排器不把 store 引用交给演员。

### 4.5 DEV-010 回溯

复用 `replay(initialState, eventLog.all())`：

- 集成测试：N 次 `deduce` 后，`assertDeepEqual(replay(initial, log), store.getState())`。
- 因果链：`assertCausalChain(log.all())`。
- 多轮赤壁：`chibiRewrites.fine` → 再 `medium`/`coarse` 或第二次 fine（注意幂等键必须不同）。

可选：在 `InMemoryEventLog` 或编排器旁提供：

```ts
replayFrom(initial: WorldState, log: InMemoryEventLog): WorldState
```

薄封装即可，不强制。

## 5. 逻辑事务实现要点

内存无 DB 事务，用**提交点延迟**模拟：

1. 计算阶段只读 `store` / `log`，写到局部变量。
2. 校验全部通过后，**连续两步**提交：`store.replace/apply` + `log.append`。
3. 两步之间若第二步理论上失败：M2 可先 `append` 再依赖测试保证；更稳妥顺序是：
   - **先**把 nextState 算好；
   - 构造 immutable event；
   - `store` 提交；
   - `log.append`；
   - 若需严格双写原子：用 orchestrator 私有 `commit(nextState, event)` 同步赋值（单线程 JS 无交错）。

1.0 单人单会话顺序处理（D012），M2 **不做**锁与并发队列；若未来同进程并发调用，视为误用。

## 6. 幂等语义（DEV-009）细则

| 规则 | 说明 |
|---|---|
| 键 | 调用方提供 `CommandId`，不是 rewrite 文本哈希 |
| 相同键 | 返回首次 `DeductionEvent` 与**当前**世界状态；`outcome: "duplicate"`；**不**再次调用 Agent |
| 不同键、相同 rewrite 文本 | 视为两次独立改写（允许）；与「确定性重放」无关（1.0 不做） |
| 键作用域 | M2 单 `EventLog` 实例内全局唯一即可；会话级隔离留给 M3/M5 |

不把「相同文本」当幂等键，避免合法的「再次下达相同改写」被吞掉。

## 7. 任务切片与实施顺序

按可演示纵向切片，每片保持 `npm run check` 绿：

| 序 | 任务 | 交付 | 测试焦点 |
|---|---|---|---|
| S1 | DEV-006 | `InMemoryWorldStateStore` + 单测 | 查询；create/update/delete；失败不污染状态 |
| S2 | DEV-007 + commandId | `InMemoryEventLog`；`CommandId`；`DeductionEvent.commandId?` | 只追加；按序；`findByCommandId` |
| S3 | DEV-008 | `DeductionOrchestrator` 成功路径 | 赤壁一轮：状态变更 + 一条事件 + 因果 |
| S4 | DEV-009 | 幂等短路 | 同 commandId 两次 → 一条事件；Agent 调用次数 = 1（可用计数包装桩） |
| S5 | DEV-010 + 事务 | 多轮 + 失败回滚 + replay | 两轮链路；Agent 抛错后 length 与 state 不变；replay 一致 |
| S6 | 收尾 | `index` 导出；`m1-integration` 仍绿；更新 `handover.md` 进度 | `npm run check` |

建议：**S1→S2 可同 PR 或连续两 commit；S3–S5 为编排核心，优先同一切片测透。**

### 与 M1 测试关系

- `m1-loop*.test.ts` / `m1-integration.test.ts`：**保留**，证明内核与协议未回退。
- 新增 `m2-integration.test.ts`：以 Orchestrator 为入口的正式验收。
- 不删除 M1 测试；注释标明 M1=协议/内核，M2=编排/事务/幂等。

## 8. 测试清单（验收对照）

### 单元

- Store：对 person/faction/resource/location/relation 各至少一种 op；update 缺失 id 抛错且 getState 不变。
- EventLog：append 后 `assertAppendOnly`；无 mutate API；commandId 查找。
- Orchestrator：桩演员/记录员注入；成功路径字段完整（rewrite/narrative/stateChanges/causal/commandId）。

### 集成 / 不变量

- [ ] 不变量 1：演员输出无 StateChange 字段  
- [ ] 不变量 2：日志仅追加  
- [ ] 不变量 3：StateChange 来自记录员  
- [ ] 不变量 4：因果链  
- [ ] 不变量 5/6：权威状态 = replay(initial, log)  
- [ ] 逻辑事务：record 抛错 → 无新事件、状态字节级不变  
- [ ] 幂等：duplicate 不增事件、不二次 deduce  
- [ ] 赤壁 fine + 另一 command 的第二次改写，日志长度 2，replay 一致  

### 回归

```bash
npm run check
# 或
npm --workspace @sandtable/domain run typecheck
npm --workspace @sandtable/domain run test
```

## 9. 风险与可演进

| 风险 | 缓解 |
|---|---|
| `StateChange.value/patch` 与 entity 仍靠运行时 cast | M2 不强制条件类型；store 沿用 m1-loop；handover 已记 |
| `SimulationTime` 推进策略模糊 | 编排优先 `recorderOutput.nextSimulationTime`，否则保持；桩可不推进 |
| 过早抽象 Port | 本里程碑**禁止**为「将来 D016」预建空接口；M3 出现第二实现再抽 |
| `duplicate` 是否重放 actorOutput | M2 结果可只保证 `event` + `worldState`；actor/recorder 输出在 duplicate 时从 event 投影或标可选，测试以事件与状态为准 |
| 与 M3 衔接 | M3 adapter 将复用同一 `StateChange`/`DeductionEvent` 与编排语义；内存实现可作参考或测试 double |

## 10. 文档同步（实现完成时）

- [ ] `docs/handover.md`：进度改为 M2 完成；交付清单补 M2 文件表  
- [ ] `docs/development-plan.md`：当前基线勾选 M2（若维护状态段）  
- [ ] `docs/decision-register.md`：可选记「M2 事件增加 commandId 幂等键」为已确认演进（依据 data.md，非 D016）  
- [ ] 本文件状态改为「已完成」并填合入 commit  

## 11. 依赖关系（本里程碑无阻塞）

```
M1 (done) ──► M2（本计划）──► M3 (需 D016)
                    └──► M4 (需 D007/D014/D015；可用内存桩先联调)
```

M2 **零待定决策依赖**，可立即开工。

## 12. 建议开工命令（批准本计划后）

1. 从 `main` 建分支 `feature/m2-state-event-core`。  
2. 按 §7 S1 起实现；每步可运行 domain 测试。  
3. 全部退出条件满足后 `npm run check`，更新 handover，交项目所有者 review / push。

---

**计划结论**：M2 在 `packages/domain` 内交付三个具体类（Store / EventLog / Orchestrator），复用 M1 纯函数内核，用 `CommandId` 做幂等，用延迟双写做逻辑事务；不碰模型、持久化与待定决策。
