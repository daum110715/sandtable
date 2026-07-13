import type { DatabaseSync, StatementSync } from "node:sqlite";
import {
  DomainError,
  type CommandId,
  type DeductionEvent,
  type EventLog,
} from "@sandtable/domain";

export class SqliteEventLog implements EventLog {
  readonly #db: DatabaseSync;
  readonly #insertStmt: StatementSync;
  readonly #byCommandStmt: StatementSync;
  readonly #lastStmt: StatementSync;
  readonly #allStmt: StatementSync;
  readonly #countStmt: StatementSync;
  readonly #atStmt: StatementSync;
  readonly #maxSeqStmt: StatementSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
    this.#insertStmt = db.prepare(`
      INSERT INTO events (id, worldline_id, command_id, seq, payload, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.#byCommandStmt = db.prepare(
      "SELECT payload FROM events WHERE command_id = ? LIMIT 1",
    );
    this.#lastStmt = db.prepare(
      "SELECT payload FROM events ORDER BY seq DESC LIMIT 1",
    );
    this.#allStmt = db.prepare("SELECT payload FROM events ORDER BY seq ASC");
    this.#countStmt = db.prepare("SELECT COUNT(*) AS c FROM events");
    this.#atStmt = db.prepare(
      "SELECT payload FROM events ORDER BY seq ASC LIMIT 1 OFFSET ?",
    );
    this.#maxSeqStmt = db.prepare(
      "SELECT COALESCE(MAX(seq), 0) AS m FROM events",
    );
  }

  append(event: DeductionEvent): void {
    if (event.commandId !== undefined) {
      const existing = this.findByCommandId(event.commandId);
      if (existing !== undefined) {
        throw new DomainError(
          "duplicate",
          `duplicate commandId in event log: ${event.commandId}`,
        );
      }
    }
    const maxRow = this.#maxSeqStmt.get() as { m: number };
    const seq = maxRow.m + 1;
    this.#insertStmt.run(
      event.id,
      event.worldlineId,
      event.commandId ?? null,
      seq,
      JSON.stringify(event),
      event.recordedAt,
    );
  }

  all(): readonly DeductionEvent[] {
    const rows = this.#allStmt.all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as DeductionEvent);
  }

  at(index: number): DeductionEvent | undefined {
    if (index < 0) return undefined;
    const row = this.#atStmt.get(index) as { payload: string } | undefined;
    return row === undefined
      ? undefined
      : (JSON.parse(row.payload) as DeductionEvent);
  }

  last(): DeductionEvent | undefined {
    const row = this.#lastStmt.get() as { payload: string } | undefined;
    return row === undefined
      ? undefined
      : (JSON.parse(row.payload) as DeductionEvent);
  }

  get length(): number {
    const row = this.#countStmt.get() as { c: number };
    return row.c;
  }

  findByCommandId(commandId: CommandId): DeductionEvent | undefined {
    const row = this.#byCommandStmt.get(commandId) as
      { payload: string } | undefined;
    return row === undefined
      ? undefined
      : (JSON.parse(row.payload) as DeductionEvent);
  }
}
