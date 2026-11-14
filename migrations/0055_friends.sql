-- Friends: add people by sharing your friend link/code (works for people not on the app yet), or by asking people you
-- read or pray with. One row each way per friendship.
CREATE TABLE IF NOT EXISTS friends (
  user_id    TEXT NOT NULL,
  friend_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, friend_id)
);
CREATE TABLE IF NOT EXISTS friend_requests (
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests (to_id);
-- Each person's friend code (made the first time they open Friends)
ALTER TABLE users ADD COLUMN friend_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_friend_code ON users (friend_code);
-- Invitations to read a plan or book together (so the same friend isn't invited twice to the same circle)
CREATE TABLE IF NOT EXISTS read_invites (
  circle_id  TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  from_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (circle_id, to_id)
);
