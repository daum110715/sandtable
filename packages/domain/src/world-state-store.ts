// DEV-006 内存世界状态数据库：持有当前世界状态权威快照，按要素查询，按 StateChange 更新。
// 写回路径由推演编排在记录员产出后调用；演员 Agent 不持有本 store 的写引用。

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

export class InMemoryWorldStateStore {
  #state: WorldState;

  constructor(initial: WorldState) {
    this.#state = initial;
  }

  /** 当前权威快照（只读视图）。 */
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

  /** 整体替换（场景加载 / 测试夹具）；不是推演写回路径。 */
  replace(state: WorldState): void {
    this.#state = state;
  }
}
