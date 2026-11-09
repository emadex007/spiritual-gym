-- Sermon notes: members write notes in church (or anywhere) and come back to them later.
-- Scripture written in a note (even short forms like "Jn 3:16" or "Rom 8 vs 28") is found on the phone and opens the verse.
CREATE TABLE IF NOT EXISTS sermon_notes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  preacher   TEXT NOT NULL DEFAULT '',
  place      TEXT NOT NULL DEFAULT '',
  note_date  TEXT NOT NULL DEFAULT (date('now')),
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_user ON sermon_notes (user_id, updated_at);
