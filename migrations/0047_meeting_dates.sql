-- Every meeting has a date: one date, every week, or once a month
-- Group meeting times: 'weekly' (chosen weekdays, as before), 'monthly' (the nth weekday: nth = 1–4, or -1 for the last)
-- or 'once' (on_date = 'YYYY-MM-DD')
ALTER TABLE prayer_schedules ADD COLUMN repeats TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE prayer_schedules ADD COLUMN on_date TEXT;
ALTER TABLE prayer_schedules ADD COLUMN nth INTEGER;
-- Church meetings: 'once', 'weekly' or 'monthly' (same weekday of the month, e.g. the first Friday). When one ends,
-- the next date in the series is added by itself (next_made marks the one that has done that).
ALTER TABLE church_meetings ADD COLUMN repeats TEXT NOT NULL DEFAULT 'once';
ALTER TABLE church_meetings ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Africa/Lagos';
ALTER TABLE church_meetings ADD COLUMN next_made INTEGER NOT NULL DEFAULT 0;
