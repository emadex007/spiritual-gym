-- SpiritualGym: sign-in protection (failed attempts per email, kept for a day)
CREATE TABLE login_failures (
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_login_failures ON login_failures(email, created_at);

-- AI spiritual coach: each person's private conversation (only they can see it; they can clear it any time)
CREATE TABLE coach_messages (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,          -- user | coach
  content    TEXT NOT NULL,
  flagged    INTEGER NOT NULL DEFAULT 0,  -- 1 = crisis guidance was shown
  verses     TEXT,                        -- JSON: exact KJV text for the references in the reply
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_coach_user ON coach_messages(user_id, created_at);
