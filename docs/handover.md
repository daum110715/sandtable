# 交接文档

> 最后更新：2026-07-13。M2（状态与事件核心）已在分支 `feature/m2-state-event-core` 实现，待合入 main。本文档供下一阶段接手者快速上手。

## 一句话定位

**历史模拟推演AI**（产品暂定名，工程代号 Sandtable）：用户自由改写历史事件，AI 实时推演后续走向，结构化世界状态 + 事件日志保证可追溯与一致。

1.0 只跑通：**自由输入改写 -> AI 合理推演 -> 状态一致性有保障**，不做过度设计。

## 当前状态

- **1.0 方向**：2026-07-12 由项目所有者确认，见 [ADR-0006](adr/0006-ai-realtime-deduction-with-structured-state.md)（取代旧 ADR-0001 Pi 地基、ADR-0003 规则裁决）。
- **架构**：演员 Agent 读世界状态生成推演 -> 记录员 Agent 拆解为结构化状态变更写回世界状态数据库 -> 每次改写与推演追加进事件日志。裁判 Agent 可选，1.0 不启用。
- **进度**：M1 已完成（领域协议冻结，main `03eca42`）。M2 已实现（内存世界状态数据库 + 事件日志 + 推演编排 + 幂等 + 回溯）。M3–M6 待开始。
- **里程碑**：见 [development-plan.md](development-plan.md)。M3 依赖 D016，M4 依赖 D007/D014/D015。
- **M2 计划**：见 [m2-plan.md](m2-plan.md)。

## 必读约束（违反会破坏项目纪律）

1. **`AGENTS.md`**：允许搭建框架/构建配置/测试/最小纵向切片；新增业务行为须有文档或决策依据；**不得替项目所有者代填待定决策**；不执行部署、不创建云端资源（除非明确授权）；所有依赖/缓存/构建产物在项目目录内。
2. **待定决策（不可代填，保留 `决策：________` 形式）**：
   - D007 Agent 框架与地基（候选：沿用 Pi / 自研轻量编排 / 其他）
   - D014 模型供应商与路由
   - D015 Agent 接入方式（同进程 SDK / 独立 Worker）
   - D016 数据存储技术（候选：PostgreSQL+Redis / SQLite / 其他）
3. **`CONTEXT.md` 术语**：场景、世界状态、世界状态数据库、事件日志、改写者、改写、推演、演员 Agent、记录员 Agent、裁判 Agent、上帝面板。**不自行引入同义词**。
4. **不接真实模型/数据库/部署**（除非项目所有者明确授权）。M1-M2 全用内存桩/内存对象。
5. **TypeScript 严格约定**（`tsconfig.base.json`）：`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax` + `isolatedModules`。ESM，import 路径带 `.js`。品牌化 ID（`string & { readonly __brand: "XxxId" }`）。

## M1 交付清单（全部在 `packages/domain`）

纯领域层，不碰模型/数据库/API/前端。

| 文件 | 职责 |
|---|---|
| `src/ids.ts` | 品牌化 ID（含 M2 的 `CommandId`）+ `asXxxId` 构造助手 |
| `src/world-state.ts` | DEV-001 世界状态 schema |
| `src/events.ts` | DEV-002 事件日志 schema（含可选 `commandId`） |
| `src/agents.ts` | DEV-003/004 Agent 协议；`ActorOutput` 不含 `StateChange` |
| `src/invariants.ts` | 核心不变量断言 |
| `src/m1-loop.ts` | 状态应用内核：`applyStateChange`/`appendEvent`/`replay`/`buildEvent` |
| `src/scenarios/chibi.ts` | DEV-005 赤壁场景 |
| `src/stubs/*` | 内存桩演员/记录员 Agent |
| `src/index.ts` | 统一 re-export |

## M2 交付清单（`packages/domain`，DEV-006 ~ DEV-010）

| 文件 | 职责 |
|---|---|
| `src/world-state-store.ts` | DEV-006 `InMemoryWorldStateStore`：权威快照、按要素查询、`apply`/`replace` |
| `src/event-log.ts` | DEV-007 `InMemoryEventLog`：只追加、按序读、`findByCommandId` |
| `src/orchestrator.ts` | DEV-008/009 `DeductionOrchestrator`：改写入口、逻辑事务双写、幂等短路 |
| `src/m2-integration.test.ts` | DEV-010 全链路验收（事务/幂等/不变量/replay） |
| `src/*-store|event-log|orchestrator.test.ts` | 单元测试 |

**M2 退出条件对照**：内存完整链路 ✅；状态写入与事件追加同一逻辑事务 ✅；重复 `commandId` 不重复事件 ✅；不变量测试 ✅。

## 代码地图

```
sandtable/
├── packages/domain/          # 共享领域协议 + M1/M2 内存核心
│   └── src/
│       ├── ids.ts            # 品牌化 ID（含 CommandId）
│       ├── world-state.ts    # 世界状态 schema
│       ├── events.ts         # 事件日志 schema
│       ├── agents.ts         # Agent 协议（接口）
│       ├── invariants.ts     # 不变量断言
│       ├── m1-loop.ts        # 状态应用内核
│       ├── world-state-store.ts  # M2 内存世界状态数据库
│       ├── event-log.ts      # M2 内存事件日志
│       ├── orchestrator.ts   # M2 推演编排
│       ├── scenarios/chibi.ts
│       ├── stubs/            # 内存桩 Agent（M4 由真实模型替代）
│       └── index.ts
├── apps/web/                 # React+Vite 前端（M5 才接）
├── apps/api/                 # Fastify API（M5 才接）
├── apps/worker/              # Worker（M4 才接真实模型）
└── docs/                     # 项目文档
```

## 验证方式

```bash
npm run check        # typecheck + test + build（所有工作区）
# 或只验 domain：
npm --workspace @sandtable/domain run typecheck
npm --workspace @sandtable/domain run test
```

当前基线（M2）：domain 53 测试 + api/web/worker 各 1；typecheck/build 以 `npm run check` 为准。

## 工作流约定

- 每次只实现一个可演示的纵向切片，保持 `main` 可构建。
- 在默认分支上先建 feature 分支再 commit；本地 ff 合 main；push 由项目所有者执行。
- 领域核心先用内存 adapter 测试；出现第二个真实 adapter 后再固定公共 seam。
- 单元测试不得依赖网络或付费模型。
- 每个里程碑结束跑 `npm run check` + 对照 `development-plan.md` 退出条件。

## M3 下一步（依赖 D016）

目标：按 D016 落地持久化；状态写入与事件追加同事务；API/Worker 重启不丢已确认事件。

| 任务 | 交付 |
|---|---|
| DEV-011 | 存储落地：世界状态数据库与事件日志持久化 adapter |
| DEV-012 | 数据 schema 与迁移 |
| DEV-013 | 事务一致 |
| DEV-014 | 健康与就绪检查 |

**入手前**：请项目所有者确认 **D016 数据存储技术**。M2 的 `InMemory*` 与 `DeductionOrchestrator` 语义可作参考；出现第二实现后再抽公共 seam。

**可并行**：M4（需 D007/D014/D015）可先用内存桩联调编排。

## 已踩的坑（接手者注意）

1. **`exactOptionalPropertyTypes`**：可选属性不能赋 `undefined`。构造带可选字段的对象用条件 spread（见 `m1-loop.ts` 的 `buildEvent`），不要 `previousEventId: maybeUndefined`。
2. **`verbatimModuleSyntax`**：类型导入用 `import type`；re-export 类型用 `export type { ... } from`，值用 `export { ... } from`。
3. **品牌化 ID 的 import 来源**：`PersonId`/`FactionId`/`CommandId` 等在 `ids.ts`，不在 `world-state.ts`。
4. **`ActorAgent.deduce` 返回 `Promise<ActorOutput> | ActorOutput`**：调用后访问属性前要 `await`。
5. **`StateChange` 是判别联合**：访问 `id` 前需 narrow `op`（`CreateChange` 无 `id`）。
6. **`attributes` 类型**：`Readonly<Record<string, string | number | boolean>>`（布尔值合法）。
7. **ID 构造**：场景/测试用 `asPersonId("p1")` 等助手打品牌，不要裸字符串。
8. **幂等键是 `CommandId`**，不是改写文本哈希；相同文案 + 不同 commandId 会产生两条事件。
9. **逻辑事务**：编排器先算 nextState + event，成功后再 `store.replace` + `log.append`；Agent/`apply` 失败则两者都不动。

## 待定决策状态

| ID | 主题 | 状态 | 何时需要 |
|---|---|---|---|
| D007 | Agent 框架 | 待定 | M4 |
| D014 | 模型路由 | 待定 | M4 |
| D015 | Agent 接入方式 | 待定 | M4 |
| D016 | 数据存储 | 待定 | M3 |

M1/M2 用内存桩与内存对象绕开这四个决策。推进 M3/M4 前需项目所有者确认对应决策。

## 风险与可演进项

- **schema 颗粒度**：契约形状已冻结，字段可演进；变更记入 `decision-register.md`，难逆转的加 ADR。
- **`StateChange` 类型安全**：`value`/`patch` 与 `entity` 仍靠运行时 cast；可后续加强。
- **`SimulationTime` 表示粒度**：M1/M2 用 branded string；编排优先 `recorderOutput.nextSimulationTime`。
- **存储 seam**：M2 未抽 Port；M3 第二实现出现后再固定公共接口。

## 关键文件索引

- 项目协作规则：`AGENTS.md`
- 领域术语：`CONTEXT.md`
- 架构：`docs/architecture.md`
- 1.0 范围：`docs/mvp.md`
- 开发计划：`docs/development-plan.md`
- M2 计划：`docs/m2-plan.md`
- 决策清单：`docs/decision-register.md`
- 路线图：`docs/roadmap.md`
- ADR：`docs/adr/`（0006 是当前 1.0 方向，0001/0003 已被取代）
