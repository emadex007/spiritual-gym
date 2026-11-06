-- TheRenewGym brand: the new tagline (only if the old default is still in place).
-- Brand colours and the logo mark live in settings (brand_navy, brand_gold, brand_bg_light, brand_bg_dark,
-- brand_mark, brand_mark_dark) and are set in Admin → Branding; until then the logo colours are used.
UPDATE settings SET value = 'Train Your Faith. Grow in Grace. Walk Together.', updated_at = datetime('now')
 WHERE key = 'tagline' AND value IN ('Train your walk. Grow in grace. Walk together.', '');
