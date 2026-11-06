-- TheRenewGym — church meetings (prayer meetings, Bible studies, workers' meetings) with voice, video and recording.
-- Voice and video go directly between the people in the meeting (peer-to-peer); the server only passes on the "connect" messages.
CREATE TABLE church_meetings (
  id           TEXT PRIMARY KEY,
  church_id    TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'prayer',     -- prayer | bible_study | workers | service | youth | other
  description  TEXT,
  starts_at    TEXT NOT NULL,                      -- ISO time (UTC)
  duration_min INTEGER NOT NULL DEFAULT 60,
  status       TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | live | ended
  live_count   INTEGER NOT NULL DEFAULT 0,
  reminded     INTEGER NOT NULL DEFAULT 0,
  created_by   TEXT,
  started_at   TEXT,
  ended_at     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_church_meetings ON church_meetings(church_id, starts_at);
CREATE INDEX idx_church_meetings_time ON church_meetings(status, starts_at);
