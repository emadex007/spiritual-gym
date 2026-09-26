-- SpiritualGym — Phase 1 schema
-- Private data (check-ins, journal, prayers) is only ever read with user_id = current session user.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',        -- member | companion | admin
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,                          -- random token (stored hashed)
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- One row per user: onboarding answers + preferences
CREATE TABLE profiles (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spiritual_state  TEXT,                                -- doing_well | consistency | distracted | tired | out_of_routine | deeper | not_sure
  goals            TEXT NOT NULL DEFAULT '[]',          -- JSON array of goal keys
  daily_minutes    INTEGER NOT NULL DEFAULT 10,
  level            TEXT NOT NULL DEFAULT 'build',       -- recovery | build | deepen | intensive
  favorite_verse   TEXT,
  onboarded_at     TEXT,
  last_active_date TEXT,                                -- YYYY-MM-DD, drives Recovery Mode
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE checkins (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,                             -- YYYY-MM-DD (Africa/Lagos by default)
  mood       TEXT NOT NULL,                             -- dry | tired | okay | encouraged | hungry | strong
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, day)
);

-- Workout templates (admin-managed later)
CREATE TABLE workouts (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  level       TEXT NOT NULL,                            -- recovery | build | deepen | intensive
  minutes     INTEGER NOT NULL,
  is_recovery INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE workout_steps (
  id          TEXT PRIMARY KEY,
  workout_id  TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  kind        TEXT NOT NULL,                            -- stillness | scripture | prayer | worship | reflection | thanksgiving | breathe
  label       TEXT NOT NULL,
  seconds     INTEGER NOT NULL,
  guidance    TEXT
);
CREATE INDEX idx_steps_workout ON workout_steps(workout_id, position);

CREATE TABLE workout_sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id   TEXT REFERENCES workouts(id),
  journey_id   TEXT,
  day          TEXT NOT NULL,
  minutes      INTEGER NOT NULL,
  kinds        TEXT NOT NULL DEFAULT '{}',              -- JSON object: step kind -> seconds completed
  reflection   TEXT,                                    -- "What did you receive from this time?" (private)
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_wsessions_user ON workout_sessions(user_id, day);

-- Journeys (prebuilt + custom later)
CREATE TABLE journeys (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  focus       TEXT NOT NULL,                            -- prayer | bible | worship | memory | fasting | gratitude | consistency | growth
  days        INTEGER NOT NULL,
  start_minutes INTEGER NOT NULL DEFAULT 10,
  end_minutes   INTEGER NOT NULL DEFAULT 10,
  is_recovery INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE journey_days (
  id         TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title      TEXT NOT NULL,
  scripture  TEXT,                                      -- reference only, e.g. "Psalm 23:1-3"
  prompt     TEXT,
  minutes    INTEGER NOT NULL,
  UNIQUE (journey_id, day_number)
);

CREATE TABLE user_journeys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journey_id   TEXT NOT NULL REFERENCES journeys(id),
  status       TEXT NOT NULL DEFAULT 'active',          -- active | paused | completed
  current_day  INTEGER NOT NULL DEFAULT 1,
  started_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX idx_ujourneys_user ON user_journeys(user_id, status);

CREATE TABLE journey_progress (
  user_journey_id TEXT NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  day_number      INTEGER NOT NULL,
  completed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_journey_id, day_number)
);

-- Phase 3 tables created now so the schema is stable
CREATE TABLE journal_entries (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt     TEXT,
  body       TEXT NOT NULL,
  scripture  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_journal_user ON journal_entries(user_id, created_at);

CREATE TABLE prayer_items (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL DEFAULT 'personal',       -- family | church | career | finances | personal | people | global
  title         TEXT NOT NULL,
  notes         TEXT,
  is_answered   INTEGER NOT NULL DEFAULT 0,
  answered_at   TEXT,
  what_happened TEXT,
  my_response   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_prayer_user ON prayer_items(user_id, is_answered);

CREATE TABLE scripture_memory (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference     TEXT NOT NULL,
  text          TEXT NOT NULL,
  translation   TEXT NOT NULL DEFAULT 'KJV',
  practice_count INTEGER NOT NULL DEFAULT 0,
  last_practiced TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_memory_user ON scripture_memory(user_id);

-- Verse of the day (public-domain KJV/WEB text only)
CREATE TABLE verses (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL,
  text        TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT 'KJV'
);
