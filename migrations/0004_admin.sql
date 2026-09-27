-- SpiritualGym — Admin portal: editable site settings + audit log

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO settings (key, value) VALUES
 ('site_name', 'SpiritualGym'),
 ('tagline', 'Train your walk. Grow in grace. Walk together.'),
 ('hero_title', 'Your spiritual life doesn’t need perfection. It needs intentionality.'),
 ('hero_subtitle', 'Gentle, guided time with God in prayer, Scripture, worship and reflection. Start with five minutes and begin again whenever you need to.'),
 ('hero_image', ''),
 ('announcement', ''),
 ('home_message', ''),
 ('support_text', 'If you are in danger or thinking of harming yourself, please contact local emergency services or someone you trust right away.'),
 ('footer_text', 'One prayer. One Scripture. One day at a time.');

CREATE TABLE audit_log (
  id         TEXT PRIMARY KEY,
  admin_id   TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  action     TEXT NOT NULL,          -- e.g. settings.update, workout.save, user.role
  target     TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
