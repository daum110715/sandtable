import { DatabaseSync } from "node:sqlite";
import type { WorldState } from "@sandtable/domain";
import { migrate } from "./migrate.js";
import { SqliteEventLog } from "./sqlite-event-log.js";
import { SqliteWorldStateStore } from "./sqlite-world-state-store.js";

export interface OpenSqliteOptions {
  /** 文件路径或 `:memory:` */
  readonly path: string;
  /** 库为空时写入的初始世界状态 */
  readonly initialState?: WorldState;
}

export interface SqlitePersistence {
  readonly db: DatabaseSync;
  readonly store: SqliteWorldStateStore;
  readonly eventLog: SqliteEventLog;
  runInTransaction: <T>(fn: () => T) => T;
  close: () => void;
  /** 存储可用性探测（就绪检查）。 */
  ping: () => boolean;
}

export const openSqlitePersistence = (options: OpenSqliteOptions): SqlitePersistence => {
  const db = new DatabaseSync(options.path);
  db.exec("PRAGMA foreign_keys = ON;");
  // 文件库启用 WAL 便于崩溃恢复；内存库忽略失败即可
  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch {
    // ignore
  }

  migrate(db);

  const store = new SqliteWorldStateStore(db, options.initialState);
  const eventLog = new SqliteEventLog(db);

  // node:sqlite DatabaseSync 无 transaction() 助手；用显式 BEGIN/COMMIT/ROLLBACK。
  const runInTransaction = <T>(fn: () => T): T => {
    if (db.isTransaction) {
      return fn();
    }
    db.exec("BEGIN");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
      throw error;
    }
  };

  return {
    db,
    store,
    eventLog,
    runInTransaction,
    close: () => db.close(),
    ping: () => {
      try {
        const row = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
        return row?.ok === 1;
      } catch {
        return false;
      }
    },
  };
};
