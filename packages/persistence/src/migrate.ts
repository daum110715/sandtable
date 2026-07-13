import type { DatabaseSync } from "node:sqlite";
import { MIGRATION_SQL_V1, SCHEMA_VERSION } from "./schema.js";

export const migrate = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_migrations")
    .get() as { v: number | null } | undefined;
  const current = row?.v ?? 0;

  if (current < 1) {
    db.exec(MIGRATION_SQL_V1);
    db.prepare(
      "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    ).run(SCHEMA_VERSION, new Date().toISOString());
  }
};

export const schemaVersion = (db: DatabaseSync): number => {
  try {
    const row = db
      .prepare("SELECT MAX(version) AS v FROM schema_migrations")
      .get() as { v: number | null } | undefined;
    return row?.v ?? 0;
  } catch {
    return 0;
  }
};
