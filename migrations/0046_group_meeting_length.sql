-- Group meetings: how long each live meeting lasts (minutes; 0 = no set time). Chosen when the group is created,
-- and changeable by a leader before starting. The meeting gets a 5-minute warning and can be extended.
ALTER TABLE prayer_groups ADD COLUMN live_minutes INTEGER NOT NULL DEFAULT 0;
