-- SpiritualGym — Walk With Me prayer requests: partners share requests, pray for each other daily, and celebrate answers
CREATE TABLE walk_requests (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pair_id     TEXT REFERENCES walk_pairs(id) ON DELETE CASCADE,   -- NULL = shared with all my walk partners
  title       TEXT NOT NULL,
  details     TEXT,
  status      TEXT NOT NULL DEFAULT 'open',                       -- open | answered
  answer_note TEXT,
  answered_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_walk_requests_user ON walk_requests(user_id, status);

CREATE TABLE walk_prayed (
  request_id TEXT NOT NULL REFERENCES walk_requests(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (request_id, user_id, day)
);

-- Midday reminder to pray for partners' requests (NULL = off)
ALTER TABLE profiles ADD COLUMN walk_pray_time TEXT DEFAULT '12:00';
ALTER TABLE profiles ADD COLUMN last_walk_day TEXT;
