-- schema.sql — run once with:
-- wrangler d1 execute <your-db-name> --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  layer TEXT NOT NULL,
  ts INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  prolific_pid TEXT,
  study_id TEXT,
  prolific_session_id TEXT,
  level_id TEXT,
  attempt_id TEXT,
  attempt_number INTEGER,
  turn INTEGER,
  app_version TEXT,
  payload TEXT,
  ms_since_last_event INTEGER,
  ms_since_last_same_event INTEGER,
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_prolific ON events(prolific_pid);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_attempt ON events(attempt_id);