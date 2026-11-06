-- The app is now called TheRenewGym (formerly SpiritualGym). Updates names stored in the database:
-- the site name, and any site text (privacy, terms, guidelines, support text…) that still says SpiritualGym.
UPDATE settings SET value = REPLACE(value, 'SpiritualGym', 'TheRenewGym'), updated_at = datetime('now') WHERE value LIKE '%SpiritualGym%';
UPDATE prayer_groups SET description = REPLACE(description, 'SpiritualGym', 'TheRenewGym') WHERE description LIKE '%SpiritualGym%';
UPDATE prayer_groups SET name = REPLACE(name, 'SpiritualGym', 'TheRenewGym') WHERE name LIKE '%SpiritualGym%';
UPDATE devotions SET reflection = REPLACE(reflection, 'SpiritualGym', 'TheRenewGym') WHERE reflection LIKE '%SpiritualGym%';
UPDATE journeys SET subtitle = REPLACE(subtitle, 'SpiritualGym', 'TheRenewGym') WHERE subtitle LIKE '%SpiritualGym%';
