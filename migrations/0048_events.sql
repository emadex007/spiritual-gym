-- Community: a group meets regularly; an event is one gathering on one date (e.g. a launch, a conference night).
-- Events are groups underneath (members, wall, live meeting, invite code) with is_event = 1 and one 'once' meeting time.
ALTER TABLE prayer_groups ADD COLUMN is_event INTEGER NOT NULL DEFAULT 0;
