-- Retreats: a member starts one (7 days of fasting and prayer, a retreat with the Word…) and gets their own day-by-day plan.
-- The retreat content lives in src/lib/retreats.ts; these tables hold each member's progress.
CREATE TABLE IF NOT EXISTS user_retreats (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  retreat_key TEXT NOT NULL,
  start_date  TEXT NOT NULL,                 -- YYYY-MM-DD (day 1)
  status      TEXT NOT NULL DEFAULT 'active', -- active | completed | stopped
  intention   TEXT NOT NULL DEFAULT '',      -- what they're seeking God for (private)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_retreats ON user_retreats (user_id, status);

CREATE TABLE IF NOT EXISTS retreat_days_done (
  user_retreat_id TEXT NOT NULL REFERENCES user_retreats(id) ON DELETE CASCADE,
  day             INTEGER NOT NULL,
  note            TEXT NOT NULL DEFAULT '',  -- what God showed them (private)
  done_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_retreat_id, day)
);
