export const systemIdentity = {
  name: "sandtable",
  protocolVersion: "v1",
} as const;

export interface WorkerStatus {
  readonly name: string;
  readonly status: "ready" | "degraded" | "stopping";
  readonly protocolVersion: typeof systemIdentity.protocolVersion;
}

// 结构化错误
export type { DomainErrorCode } from "./errors.js";
export { DomainError, isDomainError } from "./errors.js";

// 品牌化标识类型与构造助手
export type {
  WorldlineId,
  PersonId,
  FactionId,
  ResourceId,
  LocationId,
  RelationId,
  EventId,
  SessionId,
  AgentId,
  SimulationTime,
  CommandId,
  ActorId,
} from "./ids.js";
export {
  asWorldlineId,
  asPersonId,
  asFactionId,
  asResourceId,
  asLocationId,
  asRelationId,
  asEventId,
  asSessionId,
  asAgentId,
  asSimulationTime,
  asCommandId,
} from "./ids.js";

// DEV-001 世界状态 schema
export type {
  Person,
  Faction,
  Resource,
  Location,
  Relation,
  WorldSetting,
  WorldState,
  ResourceOwner,
  RelationEndpoint,
} from "./world-state.js";

// DEV-002 事件日志 schema
export type {
  Rewrite,
  Narrative,
  EntityKind,
  CreateChange,
  UpdateChange,
  DeleteChange,
  StateChange,
  CausalRef,
  DeductionEvent,
} from "./events.js";

// DEV-003 / DEV-004 Agent 协议
export type {
  ActorInput,
  IntendedChange,
  ActorOutput,
  ActorAgent,
  RecorderInput,
  RecorderOutput,
  RecorderAgent,
} from "./agents.js";

// 核心不变量断言
export {
  assertActorOutputIsStateless,
  assertAppendOnly,
  assertStateChangesAreValid,
  assertStateChangesCanApply,
  assertCausalChain,
  assertDeepEqual,
} from "./invariants.js";

// 状态应用内核（StateChange 应用、事件日志追加、按序回溯）
export type { BuildEventArgs } from "./state-core.js";
export {
  applyStateChange,
  applyStateChanges,
  appendEvent,
  replay,
  buildEvent,
} from "./state-core.js";

// 世界状态数据库 / 事件日志端口 + 内存实现 / 推演编排
export type { WorldStateStore } from "./world-state-store.js";
export { InMemoryWorldStateStore } from "./world-state-store.js";
export type { EventLog } from "./event-log.js";
export { InMemoryEventLog } from "./event-log.js";
export type {
  DeduceCommand,
  DeduceResult,
  DeductionOrchestratorOptions,
} from "./orchestrator.js";
export { DeductionOrchestrator } from "./orchestrator.js";

// DEV-005 通用自定义起点与内存桩
export {
  createCustomInitialState,
  sampleRewrites,
} from "./scenarios/custom.js";
export { StubActorAgent, stubActorAgentId } from "./stubs/stub-actor.js";
export {
  StubRecorderAgent,
  stubRecorderAgentId,
} from "./stubs/stub-recorder.js";
