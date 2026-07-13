import type { DatabaseSync, StatementSync } from "node:sqlite";
import {
  DomainError,
  applyStateChanges,
  type FactionId,
  type LocationId,
  type PersonId,
  type RelationId,
  type ResourceId,
  type WorldState,
  type WorldStateStore,
  type StateChange,
  type Faction,
  type Location,
  type Person,
  type Relation,
  type Resource,
} from "@sandtable/domain";

type StoredWorldState = Omit<WorldState, "setting"> & {
  readonly setting?: WorldState["setting"];
};

const normalizeStoredState = (state: StoredWorldState): WorldState => {
  const normalized =
    state.setting !== undefined
      ? (state as WorldState)
      : {
          ...state,
          setting: {
            title: "未命名世界",
            description: "此世界由旧版本创建，未保存世界设定。",
          },
        };
  return normalized;
};

/**
 * SQLite 世界状态数据库。读写均以 DB 为准，避免事务回滚后内存缓存脏读。
 */
export class SqliteWorldStateStore implements WorldStateStore {
  readonly #db: DatabaseSync;
  readonly #getByWorldlineStmt: StatementSync;
  readonly #getAnyStmt: StatementSync;
  readonly #upsertStmt: StatementSync;
  #worldlineId: string | undefined;

  constructor(db: DatabaseSync, initialIfEmpty?: WorldState) {
    this.#db = db;
    this.#getByWorldlineStmt = db.prepare(
      "SELECT payload FROM world_states WHERE worldline_id = ? LIMIT 1",
    );
    this.#getAnyStmt = db.prepare(
      "SELECT worldline_id, payload FROM world_states LIMIT 1",
    );
    this.#upsertStmt = db.prepare(`
      INSERT INTO world_states (worldline_id, simulation_time, payload, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(worldline_id) DO UPDATE SET
        simulation_time = excluded.simulation_time,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `);

    if (initialIfEmpty !== undefined) {
      const existing = this.#getByWorldlineStmt.get(
        initialIfEmpty.worldlineId,
      ) as { payload: string } | undefined;
      if (existing === undefined) {
        this.replace(initialIfEmpty);
      }
      this.#worldlineId = initialIfEmpty.worldlineId;
    }
  }

  #load(): WorldState {
    if (this.#worldlineId !== undefined) {
      const row = this.#getByWorldlineStmt.get(this.#worldlineId) as
        { payload: string } | undefined;
      if (row !== undefined) {
        return normalizeStoredState(
          JSON.parse(row.payload) as StoredWorldState,
        );
      }
    }
    const any = this.#getAnyStmt.get() as
      { worldline_id: string; payload: string } | undefined;
    if (any === undefined) {
      throw new DomainError(
        "invalid_state",
        "world state store is empty; seed with initial WorldState",
      );
    }
    this.#worldlineId = any.worldline_id;
    return normalizeStoredState(JSON.parse(any.payload) as StoredWorldState);
  }

  getState(): WorldState {
    return this.#load();
  }

  getPerson(id: PersonId): Person | undefined {
    return this.getState().persons[id];
  }

  getFaction(id: FactionId): Faction | undefined {
    return this.getState().factions[id];
  }

  getResource(id: ResourceId): Resource | undefined {
    return this.getState().resources[id];
  }

  getLocation(id: LocationId): Location | undefined {
    return this.getState().locations[id];
  }

  getRelation(id: RelationId): Relation | undefined {
    return this.getState().relations[id];
  }

  apply(changes: readonly StateChange[]): WorldState {
    const current = this.getState();
    const next = applyStateChanges(current, changes);
    this.replace(next);
    return next;
  }

  replace(state: WorldState): void {
    this.#upsertStmt.run(
      state.worldlineId,
      state.simulationTime,
      JSON.stringify(state),
      new Date().toISOString(),
    );
    this.#worldlineId = state.worldlineId;
  }
}
