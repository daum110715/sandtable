import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrate, schemaVersion } from "./migrate.js";
import { SCHEMA_VERSION } from "./schema.js";

describe("migrate", () => {
  it("applies v1 schema on empty database", () => {
    const db = new DatabaseSync(":memory:");
    expect(schemaVersion(db)).toBe(0);
    migrate(db);
    expect(schemaVersion(db)).toBe(SCHEMA_VERSION);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('world_states', 'events') ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).toEqual(["events", "world_states"]);
    db.close();
  });

  it("is idempotent", () => {
    const db = new DatabaseSync(":memory:");
    migrate(db);
    migrate(db);
    expect(schemaVersion(db)).toBe(SCHEMA_VERSION);
    db.close();
  });
});
