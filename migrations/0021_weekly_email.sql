-- SpiritualGym — the Sunday-evening weekly email ("Your week with God")
ALTER TABLE profiles ADD COLUMN weekly_email INTEGER NOT NULL DEFAULT 1;  -- 0 = unsubscribed
ALTER TABLE profiles ADD COLUMN last_weekly TEXT;                          -- the Sunday (local date) it was last sent
ALTER TABLE profiles ADD COLUMN email_token TEXT;                          -- random token for the one-click unsubscribe link
