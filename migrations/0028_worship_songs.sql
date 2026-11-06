-- TheRenewGym — "My worship songs": songs each person saves to sing along with in the Worship step of a workout.
-- A song can be a YouTube (or other) link, an audio file they upload, and/or the lyrics.
CREATE TABLE worship_songs (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  artist     TEXT,
  link       TEXT,
  lyrics     TEXT,
  media_key  TEXT,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_worship_songs_user ON worship_songs(user_id, sort, created_at);
