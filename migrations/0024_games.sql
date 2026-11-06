-- TheRenewGym — Bible games: daily quiz, chapter quizzes, memory games (scramble, match)
CREATE TABLE game_results (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,          -- daily | chapter | scramble | match
  ref        TEXT,                   -- quiz day, chapter ("John 15") or verse
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  day        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_game_results_user ON game_results(user_id, kind, day);
CREATE INDEX idx_game_results_day ON game_results(day, kind);

-- AI chapter quizzes, written once per chapter and shared by everyone
CREATE TABLE quiz_cache (
  reference  TEXT PRIMARY KEY,
  questions  TEXT NOT NULL,          -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
