-- Plans: members write topic plans (7 days on anxiety, 21 days on marriage…) that others read day by day.
-- A plan goes public only after an admin approves it. People read alone or together (a circle) and discuss each day.
-- Books gain a "who can read it" choice: only me, people I invite, or everyone (after approval).

CREATE TABLE IF NOT EXISTS topic_plans (
  id           TEXT PRIMARY KEY,
  author_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT '',
  topic        TEXT NOT NULL DEFAULT '',          -- Marriage, Anxiety, Hope… (see src/lib/topics.ts)
  summary      TEXT NOT NULL DEFAULT '',
  author_name  TEXT NOT NULL DEFAULT '',          -- as shown to readers (can be a ministry name)
  author_bio   TEXT NOT NULL DEFAULT '',
  cover_key    TEXT,                              -- featured picture (R2)
  days         INTEGER NOT NULL DEFAULT 7,
  status       TEXT NOT NULL DEFAULT 'draft',     -- draft | submitted | approved | declined
  review_note  TEXT,
  readers      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  approved_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_topic_plans_status ON topic_plans (status, approved_at);
CREATE INDEX IF NOT EXISTS idx_topic_plans_author ON topic_plans (author_id);

CREATE TABLE IF NOT EXISTS topic_plan_days (
  plan_id    TEXT NOT NULL REFERENCES topic_plans(id) ON DELETE CASCADE,
  day        INTEGER NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  scripture  TEXT NOT NULL DEFAULT '',            -- references, comma-separated (Jn 3:16, Ps 23)
  body       TEXT NOT NULL DEFAULT '',
  prayer     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (plan_id, day)
);

-- Reading together: a circle for one topic plan or one book, joined with a code or link
CREATE TABLE IF NOT EXISTS read_circles (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,                      -- topic | book
  target_id   TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE,
  days        INTEGER,                            -- books: everyone in the circle reads it over the same number of days
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_topic_plans (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     TEXT NOT NULL REFERENCES topic_plans(id) ON DELETE CASCADE,
  start_date  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',     -- active | completed | stopped
  circle_id   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_topic_plans ON user_topic_plans (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_topic_circle ON user_topic_plans (circle_id);

CREATE TABLE IF NOT EXISTS topic_days_done (
  user_plan_id TEXT NOT NULL REFERENCES user_topic_plans(id) ON DELETE CASCADE,
  day          INTEGER NOT NULL,
  done_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_plan_id, day)
);

-- Talking about a day's reading. circle_id set = only that circle sees it; NULL = everyone reading it.
CREATE TABLE IF NOT EXISTS read_comments (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,                       -- topic | book
  target_id  TEXT NOT NULL,
  day        INTEGER NOT NULL,
  circle_id  TEXT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  is_hidden  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_read_comments ON read_comments (kind, target_id, day, circle_id);

-- Books: who can read it. private = only me; invited = me + people I invite; public = everyone (share_status approved)
ALTER TABLE books ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
UPDATE books SET visibility = 'public' WHERE share_status = 'approved' OR owner_id IS NULL;
CREATE TABLE IF NOT EXISTS book_shares (
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (book_id, email)
);
ALTER TABLE user_books ADD COLUMN circle_id TEXT;
