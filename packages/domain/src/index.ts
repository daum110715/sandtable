export const systemIdentity = {
  name: "sandtable",
  protocolVersion: "v1",
} as const;

export interface WorkerStatus {
  readonly name: string;
  readonly status: "ready" | "degraded" | "stopping";
  readonly protocolVersion: typeof systemIdentity.protocolVersion;
}

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
} from "./ids.js";

// DEV-001 世界状态 schema
export type {
  Person,
  Faction,
  Resource,
  Location,
  Relation,
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
  assertCausalChain,
  assertDeepEqual,
} from "./invariants.js";

// 闭环 helper
export type { BuildEventArgs } from "./m1-loop.js";
export { applyStateChange, applyStateChanges, appendEvent, replay, buildEvent } from "./m1-loop.js";

// DEV-005 场景与内存桩
export { chibiInitialState, chibiRewrites, chibiWorldlineId, chibiInitialTime } from "./scenarios/chibi.js";
export { StubActorAgent, stubActorAgentId } from "./stubs/stub-actor.js";
export { StubRecorderAgent, stubRecorderAgentId } from "./stubs/stub-recorder.js";
