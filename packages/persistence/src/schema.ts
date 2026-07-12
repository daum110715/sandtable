// DEV-012 最小 schema 与迁移。世界状态 JSON 快照 + 只追加事件行。

/** 当前 schema 版本；递增时追加 migrate 步骤。 */
export const SCHEMA_VERSION = 1;

export const MIGRATION_SQL_V1 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS world_states (
  worldline_id TEXT PRIMARY KEY NOT NULL,
  simulation_time TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  worldline_id TEXT NOT NULL,
  command_id TEXT,
  seq INTEGER NOT NULL,
  payload TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  UNIQUE (worldline_id, seq)
);

CREATE UNIQUE INDEX IF NOT EXISTS events_command_id_uidx
  ON events(command_id)
  WHERE command_id IS NOT NULL;
`;
