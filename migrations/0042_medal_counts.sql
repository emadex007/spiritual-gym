-- Medals you can earn again (finish another plan, another fast, a new 7-day streak…) keep a count: shown as ×2, ×3 on the medal.
ALTER TABLE user_awards ADD COLUMN times INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_awards ADD COLUMN last_at TEXT;
