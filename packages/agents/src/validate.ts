// DEV-018 最小状态一致性：写回前检查 StateChange 相对当前世界状态可应用。

import type { StateChange, WorldState } from "@sandtable/domain";
import { AgentError } from "./errors.js";

const entityCollection = (
  state: WorldState,
  entity: StateChange["entity"],
): Readonly<Record<string, unknown>> => {
  switch (entity) {
    case "person":
      return state.persons;
    case "faction":
      return state.factions;
    case "resource":
      return state.resources;
    case "location":
      return state.locations;
    case "relation":
      return state.relations;
  }
};

/**
 * 校验变更可应用；不修改状态。
 * - create：id 不得已存在
 * - update/delete：id 必须存在
 * - create.value 必须含 id
 */
export const assertStateChangesConsistent = (
  state: WorldState,
  changes: readonly StateChange[],
): void => {
  // 顺序模拟：同一批内 create 后可 update
  const shadows: Record<string, Set<string>> = {
    person: new Set(Object.keys(state.persons)),
    faction: new Set(Object.keys(state.factions)),
    resource: new Set(Object.keys(state.resources)),
    location: new Set(Object.keys(state.locations)),
    relation: new Set(Object.keys(state.relations)),
  };

  for (const c of changes) {
    const set = shadows[c.entity]!;
    if (c.op === "create") {
      const value = c.value as { id?: string };
      if (typeof value?.id !== "string" || value.id.length === 0) {
        throw new AgentError("invalid_output", `create ${c.entity} missing value.id`);
      }
      if (set.has(value.id)) {
        throw new AgentError(
          "invalid_output",
          `create ${c.entity} id already exists: ${value.id}`,
        );
      }
      set.add(value.id);
    } else if (c.op === "update" || c.op === "delete") {
      const id = String(c.id);
      if (!set.has(id)) {
        throw new AgentError(
          "invalid_output",
          `${c.op} ${c.entity} id not found: ${id}`,
        );
      }
      // 确认权威状态中也存在（shadow 可能来自本批 create）
      const coll = entityCollection(state, c.entity);
      if (!(id in coll) && !set.has(id)) {
        throw new AgentError("invalid_output", `${c.op} target missing: ${id}`);
      }
      if (c.op === "delete") {
        set.delete(id);
      }
    } else {
      throw new AgentError("invalid_output", `unknown state change op`);
    }
  }
};
