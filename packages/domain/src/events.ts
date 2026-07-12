// DEV-002 事件日志最小 schema。
// 每次改写与推演结果作为独立事件追加记录，不可原地修改，支持按顺序回溯。
// 事件语义对齐 docs/world-model.md：身份/会话、模拟时刻+记录时刻、改写文本+推演叙事、
// 结构化状态变更、因果、模型与 Agent 版本。

import type {
  AgentId,
  EventId,
  FactionId,
  LocationId,
  PersonId,
  RelationId,
  ResourceId,
  SessionId,
  SimulationTime,
  WorldlineId,
} from "./ids.js";
import type {
  Faction,
  Location,
  Person,
  Relation,
  Resource,
} from "./world-state.js";

export interface Rewrite {
  readonly text: string;
  readonly submittedAt: string;
}

export interface Narrative {
  readonly text: string;
  readonly actorAgentId?: AgentId;
}

export type EntityKind = "person" | "faction" | "resource" | "location" | "relation";

// 结构化状态变更：可应用的判别式联合，M2 内存数据库消费。
export interface CreateChange {
  readonly op: "create";
  readonly entity: EntityKind;
  readonly value: Person | Faction | Resource | Location | Relation;
}
export interface UpdateChange {
  readonly op: "update";
  readonly entity: EntityKind;
  readonly id: PersonId | FactionId | ResourceId | LocationId | RelationId;
  readonly patch: Readonly<Record<string, unknown>>;
}
export interface DeleteChange {
  readonly op: "delete";
  readonly entity: EntityKind;
  readonly id: PersonId | FactionId | ResourceId | LocationId | RelationId;
}
export type StateChange = CreateChange | UpdateChange | DeleteChange;

// 因果引用：引发本次推演的改写，以及前置事件（首事件无前置）。
export interface CausalRef {
  readonly previousEventId?: EventId;
  readonly rewrite: Rewrite;
}

export interface DeductionEvent {
  readonly id: EventId;
  readonly worldlineId: WorldlineId;
  readonly sessionId?: SessionId;
  readonly simulationTime: SimulationTime;
  readonly recordedAt: string;
  readonly rewrite: Rewrite;
  readonly narrative: Narrative;
  readonly stateChanges: readonly StateChange[];
  readonly causal: CausalRef;
  readonly agentVersion?: string;
}
