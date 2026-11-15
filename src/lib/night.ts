// Night mode content (client-safe): bedtime Scriptures (KJV text comes from the database), evening prompts, prayers.
// One reading and one prayer a night, chosen by the day of the year, so they change every night.

export const NIGHT_READINGS = [
  'Psalm 4:8', 'Psalm 3:3-6', 'Psalm 23:1-6', 'Psalm 91:1-6', 'Psalm 121:1-8', 'Psalm 127:1-2', 'Proverbs 3:24-26',
  'Matthew 11:28-30', 'John 14:27', 'Philippians 4:6-7', 'Isaiah 26:3-4', 'Psalm 46:1-3', 'Psalm 63:6-8', 'Psalm 16:7-9',
  'Psalm 139:11-12', 'Lamentations 3:22-24', 'Isaiah 40:28-31', '1 Peter 5:6-7', 'Psalm 62:5-8', 'Psalm 116:7-9',
  'Psalm 103:1-5', 'Romans 8:38-39', 'Psalm 42:8', 'Psalm 131:1-3', 'Zephaniah 3:17', 'Deuteronomy 33:27',
  'Psalm 34:4-8', 'Psalm 30:4-5', 'Matthew 6:31-34', '2 Corinthians 4:16-18', 'Isaiah 43:1-2',
] as const

export const BLESSING_REF = 'Numbers 6:24-26'

export const SETTLE =
  'Welcome. The day is done. Let your shoulders drop, and breathe slowly. In through your nose, and out through your mouth. Again. You are in God’s hands tonight.'

/** A gentle look back over the day (each one is followed by a quiet pause) */
export const LOOK_BACK = [
  'Think of one good thing from today, however small. Thank God for it.',
  'Is there anything you need to say sorry for? Tell Him simply, and receive His forgiveness.',
  'What are you carrying into tomorrow? Picture yourself placing it in His hands.',
]

export const NIGHT_PRAYERS = [
  'Father, thank You for carrying me through this day. I give You everything that went well and everything that did not. Watch over me and the people I love tonight. Give me sweet sleep, and wake me refreshed to walk with You tomorrow. In Jesus’ name, Amen.',
  'Lord Jesus, I come to You weary, and You promised rest. I lay down my worries, my unfinished tasks and my fears. Fill this room with Your peace. Let me sleep safely, because You never slumber. Amen.',
  'Holy Spirit, quiet my mind. Where my thoughts are racing, bring stillness. Where my heart is heavy, bring comfort. Speak to me even as I sleep, and let me rise with a song of praise. In Jesus’ name, Amen.',
  'Faithful God, Your mercies are new every morning, and Your faithfulness is great. Forgive me for today’s mistakes, and wash me clean. I rest in Your love tonight. Amen.',
  'Father, I commit my family into Your hands tonight. Cover our home with Your protection. Keep away every fear and every danger. Let Your angels keep watch over us until morning. In Jesus’ name, Amen.',
  'Lord, You are my shepherd; I shall not want. Lead me beside still waters as I sleep. Restore my soul. Thank You that goodness and mercy will follow me tomorrow too. Amen.',
  'Jesus, You calmed the storm with a word. Speak peace to every storm in my life tonight. I trust You with what I cannot control. Let me sleep like You slept in the boat, safe in the Father’s care. Amen.',
  'Father, thank You for the gift of this day. For breath, for food, for the people around me, for Your word. Teach me to number my days and to love You more. Give me rest tonight. In Jesus’ name, Amen.',
  'Lord, I forgive the people who hurt me today, as You have forgiven me. I release them into Your hands. Heal what was wounded in me, and let no bitterness follow me into sleep. Amen.',
  'Mighty God, You are my refuge and my fortress. Under Your wings I am safe. I will not be afraid of the terror by night. I lie down in peace and sleep, for You alone make me dwell in safety. Amen.',
  'Lord, I bring You my body tonight. Where there is pain, bring healing. Where there is tiredness, bring renewal. Where there is sickness, let Your power work while I rest. In Jesus’ name, Amen.',
  'Father, I place tomorrow in Your hands: my work, my plans, my needs. Go before me and make the crooked places straight. Tonight I choose to rest instead of worry. Amen.',
  'Jesus, Light of the world, the darkness is not dark to You. Shine in every dark place in my heart and in my home. Let me sleep in Your light, and wake to Your joy. Amen.',
  'Father, thank You that nothing can separate me from Your love. Not tonight, not tomorrow, not ever. Hold me close as I sleep. In Jesus’ name, Amen.',
]

/** The day of the year (1–366), for choosing tonight's reading. Late at night still counts as "tonight". */
export function nightIndex(d = new Date()) {
  const t = new Date(d.getTime() - 4 * 3600_000) // 1am belongs to the night before
  const start = Date.UTC(t.getFullYear(), 0, 0)
  return Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - start) / 86_400_000)
}

/** Evening (7pm–4am): when Home shows "Wind down with God" */
export const isEvening = (d = new Date()) => d.getHours() >= 19 || d.getHours() < 4

export const SLEEP_TIMERS = [15, 30, 45, 60] as const
