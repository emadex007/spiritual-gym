-- SpiritualGym — "Understand any verse": a small log so each person can open up to 20 new explanations a day
-- (explanations already saved in verse_insights are free and unlimited)
CREATE TABLE insight_log (
  user_id    TEXT NOT NULL,
  day        TEXT NOT NULL,
  reference  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_insight_log_user_day ON insight_log(user_id, day);
