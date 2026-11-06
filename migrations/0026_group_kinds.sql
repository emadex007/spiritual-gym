-- TheRenewGym — community groups for every kind of program, not only prayer:
-- Bible study, fellowship/cell, worship & choir, youth, students, women, men, marriage, singles, discipleship, evangelism, workers.
-- Existing groups stay prayer groups. Prayer groups keep their prayer topic in "purpose".
ALTER TABLE prayer_groups ADD COLUMN kind TEXT NOT NULL DEFAULT 'prayer';
CREATE INDEX idx_prayer_groups_kind ON prayer_groups(kind);
