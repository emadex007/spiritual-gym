-- The Word step now has its own devotion sized to the step (not Today's word), so its guidance no longer mentions Today's word
UPDATE workout_steps SET guidance = 'Read slowly, twice. Tap a verse that speaks to you to save it.' WHERE id = 'w-moment-5-3';
UPDATE workout_steps SET guidance = 'Read slowly, then speak the declaration aloud. Tap a verse to save it or add a note.' WHERE id = 'w-morning-15-3';
UPDATE workout_steps SET guidance = 'Read without hurry and meditate on what speaks to you. Then speak the declaration aloud.' WHERE id = 'w-deepen-30-3';
UPDATE workout_steps SET guidance = 'Read slowly; meditate on what speaks to you, and read it again. Then speak the declaration aloud.' WHERE id = 'w-secret-60-3';
UPDATE workout_steps SET guidance = 'Read slowly and let the Word stir your faith.' WHERE id = 'w-spirit-20-3';
