-- SpiritualGym — launch essentials: password resets + age

CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,           -- SHA-256 of the token in the link
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_by TEXT,                       -- NULL = requested by the user; admin id if an admin made the link
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_resets_user ON password_resets(user_id, created_at);

ALTER TABLE users ADD COLUMN birth_year INTEGER;
