-- SpiritualGym: Pastor Mode (for ministers and church workers). Everything here is private to the minister.
ALTER TABLE profiles ADD COLUMN pastor_mode INTEGER NOT NULL DEFAULT 0;

CREATE TABLE sermons (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  scripture  TEXT,                     -- main text, e.g. "John 15:1-8"
  preach_on  TEXT,                     -- YYYY-MM-DD
  venue      TEXT,                     -- e.g. Sunday service, midweek, youth
  status     TEXT NOT NULL DEFAULT 'idea', -- idea | drafting | ready | preached
  big_idea   TEXT,
  outline    TEXT,                     -- the sermon notes/outline
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sermons_user ON sermons(user_id, preach_on);

CREATE TABLE intercessions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,         -- a person, family, group or need
  need           TEXT,
  group_name     TEXT NOT NULL DEFAULT 'Church family',
  prayed_count   INTEGER NOT NULL DEFAULT 0,
  last_prayed_at TEXT,
  answered_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_intercessions_user ON intercessions(user_id, answered_at);

CREATE TABLE ministry_tasks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'other', -- visit | call | counsel | meeting | admin | other
  title      TEXT NOT NULL,
  person     TEXT,
  due_on     TEXT,
  notes      TEXT,
  done_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_user ON ministry_tasks(user_id, done_at, due_on);

CREATE TABLE mentees (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT,                  -- e.g. youth leader, usher, cell leader
  focus        TEXT,                  -- what they're growing in
  notes        TEXT,
  next_meet_on TEXT,
  last_met_on  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mentees_user ON mentees(user_id);

-- Every ministry action (a sermon edited, someone prayed for, a task done, a mentoring meeting)
-- is counted per day, so the app can gently tell ministry apart from personal time with God
CREATE TABLE ministry_log (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  kind       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ministry_log ON ministry_log(user_id, day);
