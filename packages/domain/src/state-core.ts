// 状态应用内核：不可变 StateChange 应用、仅追加事件日志与按序回溯。
// Store / EventLog / Orchestrator 复用同一内核。

import { DomainError } from "./errors.js";
import type {
  CommandId,
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
  WorldState,
} from "./world-state.js";
import type {
  DeductionEvent,
  Narrative,
  Rewrite,
  StateChange,
} from "./events.js";

const setEntity = <K extends string, V extends { id: K }>(
  coll: Readonly<Record<K, V>>,
  value: V,
): Readonly<Record<K, V>> => ({ ...coll, [value.id]: value });

const removeEntity = <K extends string, V>(
  coll: Readonly<Record<K, V>>,
  id: K,
): Readonly<Record<K, V>> => {
  const next: Record<K, V> = { ...coll };
  delete next[id];
  return next;
};

const updateEntity = <K extends string, V>(
  coll: Readonly<Record<K, V>>,
  id: K,
  patch: Readonly<Record<string, unknown>>,
): Readonly<Record<K, V>> => {
  const existing = coll[id];
  if (!existing) {
    throw new DomainError(
      "not_found",
      `entity ${String(id)} not found for update`,
    );
  }
  return { ...coll, [id]: { ...existing, ...patch } as V };
};

const applyPerson = (
  persons: Readonly<Record<PersonId, Person>>,
  change: StateChange,
): Readonly<Record<PersonId, Person>> => {
  if (change.op === "create") return setEntity(persons, change.value as Person);
  if (change.op === "delete")
    return removeEntity(persons, change.id as PersonId);
  return updateEntity(persons, change.id as PersonId, change.patch);
};

const applyFaction = (
  factions: Readonly<Record<FactionId, Faction>>,
  change: StateChange,
): Readonly<Record<FactionId, Faction>> => {
  if (change.op === "create")
    return setEntity(factions, change.value as Faction);
  if (change.op === "delete")
    return removeEntity(factions, change.id as FactionId);
  return updateEntity(factions, change.id as FactionId, change.patch);
};

const applyResource = (
  resources: Readonly<Record<ResourceId, Resource>>,
  change: StateChange,
): Readonly<Record<ResourceId, Resource>> => {
  if (change.op === "create")
    return setEntity(resources, change.value as Resource);
  if (change.op === "delete")
    return removeEntity(resources, change.id as ResourceId);
  return updateEntity(resources, change.id as ResourceId, change.patch);
};

const applyLocation = (
  locations: Readonly<Record<LocationId, Location>>,
  change: StateChange,
): Readonly<Record<LocationId, Location>> => {
  if (change.op === "create")
    return setEntity(locations, change.value as Location);
  if (change.op === "delete")
    return removeEntity(locations, change.id as LocationId);
  return updateEntity(locations, change.id as LocationId, change.patch);
};

const applyRelation = (
  relations: Readonly<Record<RelationId, Relation>>,
  change: StateChange,
): Readonly<Record<RelationId, Relation>> => {
  if (change.op === "create")
    return setEntity(relations, change.value as Relation);
  if (change.op === "delete")
    return removeEntity(relations, change.id as RelationId);
  return updateEntity(relations, change.id as RelationId, change.patch);
};

export const applyStateChange = (
  state: WorldState,
  change: StateChange,
): WorldState => {
  switch (change.entity) {
    case "person":
      return { ...state, persons: applyPerson(state.persons, change) };
    case "faction":
      return { ...state, factions: applyFaction(state.factions, change) };
    case "resource":
      return { ...state, resources: applyResource(state.resources, change) };
    case "location":
      return { ...state, locations: applyLocation(state.locations, change) };
    case "relation":
      return { ...state, relations: applyRelation(state.relations, change) };
  }
};

export const applyStateChanges = (
  state: WorldState,
  changes: readonly StateChange[],
): WorldState =>
  changes.reduce<WorldState>((s, change) => applyStateChange(s, change), state);

export const appendEvent = (
  log: readonly DeductionEvent[],
  event: DeductionEvent,
): readonly DeductionEvent[] => [...log, event];

/** 按事件日志顺序重放状态变更，验证回溯。 */
export const replay = (
  initialState: WorldState,
  log: readonly DeductionEvent[],
): WorldState =>
  log.reduce<WorldState>(
    (state, ev) => applyStateChanges(state, ev.stateChanges),
    initialState,
  );

export interface BuildEventArgs {
  readonly id: EventId;
  readonly worldlineId: WorldlineId;
  readonly simulationTime: SimulationTime;
  readonly rewrite: Rewrite;
  readonly narrative: Narrative;
  readonly stateChanges: readonly StateChange[];
  readonly previousEventId?: EventId;
  readonly sessionId?: SessionId;
  readonly commandId?: CommandId;
  readonly agentVersion?: string;
  readonly recordedAt?: string;
}

/** 构造 DeductionEvent，正确处理可选字段（exactOptionalPropertyTypes）。 */
export const buildEvent = (args: BuildEventArgs): DeductionEvent => ({
  id: args.id,
  worldlineId: args.worldlineId,
  simulationTime: args.simulationTime,
  recordedAt: args.recordedAt ?? "1970-01-01T00:00:00.000Z",
  rewrite: args.rewrite,
  narrative: args.narrative,
  stateChanges: args.stateChanges,
  causal:
    args.previousEventId !== undefined
      ? { previousEventId: args.previousEventId, rewrite: args.rewrite }
      : { rewrite: args.rewrite },
  ...(args.sessionId !== undefined ? { sessionId: args.sessionId } : {}),
  ...(args.commandId !== undefined ? { commandId: args.commandId } : {}),
  ...(args.agentVersion !== undefined
    ? { agentVersion: args.agentVersion }
    : {}),
});
