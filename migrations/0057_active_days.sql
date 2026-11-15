-- Days with God: one row per person per day they did something (workout, Bible/topic plan day, book reading, retreat day,
-- daily quiz, Night mode). The streak (with one grace day a week) is worked out from these rows.
CREATE TABLE IF NOT EXISTS active_days (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,           -- YYYY-MM-DD (Nigeria time, like every other "day" in the app)
  kinds   TEXT NOT NULL DEFAULT '', -- e.g. "workout,book"
  PRIMARY KEY (user_id, day)
);
-- Start from what we already know happened on which day
INSERT OR IGNORE INTO active_days (user_id, day, kinds) SELECT DISTINCT user_id, day, 'workout' FROM workout_sessions;
INSERT OR IGNORE INTO active_days (user_id, day, kinds) SELECT DISTINCT user_id, day, 'quiz' FROM game_results WHERE kind = 'daily';
