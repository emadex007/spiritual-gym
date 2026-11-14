-- Events (and groups) keep what happened: who attended the live event, an overview leaders write afterwards, and
-- recordings the host saved to the page (stored in R2, played and downloaded from the page)
CREATE TABLE group_attendance (
  group_id  TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE group_recordings (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  media_key  TEXT NOT NULL,
  type       TEXT NOT NULL,
  seconds    INTEGER NOT NULL DEFAULT 0,
  size       INTEGER NOT NULL DEFAULT 0,
  title      TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_group_recordings ON group_recordings(group_id, created_at);
ALTER TABLE prayer_groups ADD COLUMN overview TEXT;
ALTER TABLE prayer_groups ADD COLUMN overview_at TEXT;
