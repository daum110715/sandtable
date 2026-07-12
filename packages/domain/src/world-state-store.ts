// DEV-006 世界状态数据库端口 + 内存实现。
// 写回路径由推演编排在记录员产出后调用；演员 Agent 不持有 store 的写引用。

import type {
  FactionId,
  LocationId,
  PersonId,
  RelationId,
  ResourceId,
} from "./ids.js";
import type { StateChange } from "./events.js";
import type {
  Faction,
  Location,
  Person,
  Relation,
  Resource,
  WorldState,
} from "./world-state.js";
import { applyStateChanges } from "./m1-loop.js";

/** 世界状态数据库端口（M2 内存 / M3 SQLite 等实现）。 */
export interface WorldStateStore {
  getState(): WorldState;
  getPerson(id: PersonId): Person | undefined;
  getFaction(id: FactionId): Faction | undefined;
  getResource(id: ResourceId): Resource | undefined;
  getLocation(id: LocationId): Location | undefined;
  getRelation(id: RelationId): Relation | undefined;
  apply(changes: readonly StateChange[]): WorldState;
  replace(state: WorldState): void;
}

export class InMemoryWorldStateStore implements WorldStateStore {
  #state: WorldState;

  constructor(initial: WorldState) {
    this.#state = initial;
  }

  getState(): WorldState {
    return this.#state;
  }

  getPerson(id: PersonId): Person | undefined {
    return this.#state.persons[id];
  }

  getFaction(id: FactionId): Faction | undefined {
    return this.#state.factions[id];
  }

  getResource(id: ResourceId): Resource | undefined {
    return this.#state.resources[id];
  }

  getLocation(id: LocationId): Location | undefined {
    return this.#state.locations[id];
  }

  getRelation(id: RelationId): Relation | undefined {
    return this.#state.relations[id];
  }

  /**
   * 应用一组变更。在副本上 reduce，成功后才替换内部引用；
   * 任一变更失败则抛错且不修改当前权威状态。
   */
  apply(changes: readonly StateChange[]): WorldState {
    const next = applyStateChanges(this.#state, changes);
    this.#state = next;
    return next;
  }

  /** 整体替换（场景加载 / 推演写回 / 测试夹具）。 */
  replace(state: WorldState): void {
    this.#state = state;
  }
}
