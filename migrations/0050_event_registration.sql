-- Event reminders: phone/in-app notices sent once per event date ('day' = the day before, 'hour' = one hour before),
-- and who has had the day-before email (sent within the daily email allowance, over several runs if needed)
CREATE TABLE event_notices (
  group_id   TEXT NOT NULL,
  kind       TEXT NOT NULL,
  occurrence TEXT NOT NULL,
  sent_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, kind, occurrence)
);
CREATE TABLE event_mail (
  group_id TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  kind     TEXT NOT NULL,
  sent_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id, kind)
);
