-- TheRenewGym — simple per-person daily counters (e.g. how many caption lines were translated today), for fair-use limits
CREATE TABLE daily_counts (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,
  kind    TEXT NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
