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

  it("no-ops when already at current version", () => {
    const db = new DatabaseSync(":memory:");
    migrate(db);
    const versionBefore = schemaVersion(db);
    migrate(db);
    const versionAfter = schemaVersion(db);
    expect(versionAfter).toBe(versionBefore);
    db.close();
  });
});

describe("schemaVersion", () => {
  it("returns 0 for fresh database without migrations", () => {
    const db = new DatabaseSync(":memory:");
    expect(schemaVersion(db)).toBe(0);
    db.close();
  });

  it("returns 0 on error (no migration table)", () => {
    const db = new DatabaseSync(":memory:");
    // Drop the table if it exists to simulate error
    db.exec("DROP TABLE IF EXISTS schema_migrations");
    expect(schemaVersion(db)).toBe(0);
    db.close();
  });
});
