-- First-time welcome tour: shown once on Home to people who join from now on
ALTER TABLE profiles ADD COLUMN tour_seen_at TEXT;
-- Everyone already using the app has found their way around, so they don't see it
UPDATE profiles SET tour_seen_at = datetime('now') WHERE onboarded_at IS NOT NULL;
