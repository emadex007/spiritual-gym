// Retreats: a few set-apart days with God. Starting one makes the member's own day-by-day plan:
// each day has Scripture to read, a short reflection, a prayer to pray, and one thing to do.
// Client-safe (no server imports): used by the Retreats pages and by the server functions.

export type RetreatDay = {
  title: string
  /** Scripture references, read in order (KJV in the app) */
  readings: string[]
  /** A short reflection on the day's theme */
  reflect: string
  /** A prayer written out to pray, in the first person */
  prayer: string
  /** One thing to do today */
  practice: string
  /** Fasting retreats: what to do with today's fast */
  fast?: string
}

export type Retreat = {
  key: string
  title: string
  subtitle: string
  /** Shown on the card and the page */
  about: string
  kind: 'fasting' | 'word' | 'rest' | 'presence'
  icon: string
  /** Gradient for the cover */
  colors: [string, string]
  /** A short line on how to make room for it */
  rhythm: string
  /** Shown before starting (fasting retreats: health) */
  note?: string
  days: RetreatDay[]
}

const FAST_NOTE =
  'Fasting is between you and God, and it should never harm your body. Drink plenty of water. If you are pregnant or breastfeeding, have diabetes, take regular medicine, are under 18, or have ever struggled with eating, choose a partial fast (giving up one meal, sugar or social media) and speak to a doctor first. Stop and eat if you feel faint or unwell.'

export const RETREATS: Retreat[] = [
  {
    key: 'fasting-prayer-7',
    title: '7 Days of Fasting and Prayer',
    subtitle: 'Humble yourself, seek His face, and pray with faith',
    about:
      'Seven days set apart to seek God with fasting and prayer. Each day you read, pray a guided prayer, and keep the fast you chose. By the last day you will have prayed for yourself, your family, your church and your nation, and given thanks.',
    kind: 'fasting',
    icon: 'flame',
    colors: ['#3b1f5c', '#c8763a'],
    rhythm: 'Morning: read and pray. Midday: when you feel hungry, pray the day’s prayer again. Evening: thank God and break your fast gently.',
    note: FAST_NOTE,
    days: [
      {
        title: 'Humble yourself',
        readings: ['2 Chronicles 7:14', 'Joel 2:12-13', 'Matthew 6:16-18'],
        reflect:
          'Fasting begins with humility. God promises to hear people who humble themselves, pray, seek His face and turn from their wicked ways. Jesus says to fast quietly, for the Father who sees in secret. Today, come low before Him and be honest about where you need Him.',
        prayer:
          'Father, I come to You with a humble heart. I set these days apart for You. Forgive me where I have gone my own way. I turn back to You with all my heart. Hear me from heaven, heal what is broken in me, and draw me close. Let this fast be for You alone. In Jesus’ name, amen.',
        practice: 'Write down what you are fasting from and why. Keep it between you and God.',
        fast: 'Choose your fast for the week: one meal, sunrise to a set time, or a partial fast (no sugar, no social media). Start gently today.',
      },
      {
        title: 'The fast God chooses',
        readings: ['Isaiah 58:1-12'],
        reflect:
          'God is not impressed by empty religion. The fast He chooses loosens chains, feeds the hungry and lifts the oppressed. When we fast His way, His light breaks out and He answers when we call. Fasting is not only going without; it is turning towards God and towards people.',
        prayer:
          'Lord, make my fast the kind You choose. Loose every band of wickedness in my life. Open my eyes to the people around me who are hungry, lonely or burdened. Let Your light break forth in me, and let me hear You answer, “Here I am.” In Jesus’ name, amen.',
        practice: 'Do one quiet act of kindness today: give the money or food you saved to someone in need.',
        fast: 'When hunger comes, use it as a reminder to pray. Drink water and rest.',
      },
      {
        title: 'Hungry for God',
        readings: ['Psalm 42', 'Matthew 5:6', 'John 4:31-34'],
        reflect:
          'As the deer pants for water, so the soul longs for God. Jesus told His disciples He had food they did not know about: doing the will of His Father. The hunger in your body today can point you to a deeper hunger, for God Himself.',
        prayer:
          'God, my soul thirsts for You, the living God. When my body is hungry, let my spirit be hungrier still. Fill me with Your righteousness. Be my food and my strength today. Why am I cast down? I will hope in You and praise You again. In Jesus’ name, amen.',
        practice: 'Spend the time of one meal alone with God, reading Psalm 42 slowly out loud.',
        fast: 'Halfway there. If you feel weak, it is fine to change to a lighter fast. God sees your heart.',
      },
      {
        title: 'Pray with faith',
        readings: ['Mark 11:22-25', 'Hebrews 11:6', 'James 5:16'],
        reflect:
          'Jesus says, “Have faith in God.” Whoever comes to God must believe that He is, and that He rewards those who diligently seek Him. Faith also forgives: Jesus links prayer that moves mountains with forgiving others. The prayer of a righteous person is powerful and effective.',
        prayer:
          'Father, I believe You are, and that You reward those who seek You. I bring You the mountain in front of me: [name it]. I believe You hear me. I choose to forgive [name them] as You have forgiven me. Increase my faith. In Jesus’ name, amen.',
        practice: 'Write your one big prayer request on paper. Date it, and keep it to see how God answers.',
        fast: 'Keep praying through the hungry moments. Read Mark 11:22-25 again at midday.',
      },
      {
        title: 'Break every chain',
        readings: ['Isaiah 58:6', 'Acts 12:5-11', 'Mark 9:28-29'],
        reflect:
          'When Peter was in prison, the church prayed without ceasing, and God sent His angel to open the gates. Some things only move through prayer. Today, pray for freedom: from habits, fear, sickness, or anything that keeps you or the people you love bound.',
        prayer:
          'Lord Jesus, You came to set the captives free. I bring You every chain in my life and my family’s life: [name them]. As the church prayed for Peter, I pray now. Open the prison doors. Break every yoke. Let Your freedom be real in us. In Jesus’ name, amen.',
        practice: 'Pray out loud today, by name, for one person you know who needs to be set free.',
        fast: 'Two days to go. Rest when you can and keep drinking water.',
      },
      {
        title: 'Stand in the gap',
        readings: ['Nehemiah 1:4-11', '1 Timothy 2:1-4', 'Ezekiel 22:30'],
        reflect:
          'When Nehemiah heard about the broken walls of Jerusalem, he wept, fasted and prayed for days. God looks for people who will stand in the gap for others. Today, pray beyond yourself: for your family, your church, your leaders and your nation.',
        prayer:
          'God of heaven, I stand in the gap today. I pray for my family: [names]. I pray for my church and its leaders. I pray for our nation and everyone in authority, that we may live peaceful and godly lives. Have mercy on us, rebuild what is broken, and let many come to know You. In Jesus’ name, amen.',
        practice: 'Message one person and tell them you prayed for them today.',
        fast: 'Your last full day of fasting. Thank God for the strength He has given you.',
      },
      {
        title: 'Rejoice and give thanks',
        readings: ['Psalm 103', 'Philippians 4:4-7', 'Isaiah 58:8-9'],
        reflect:
          'End your retreat with thanksgiving. Bless the Lord, and forget not all His benefits. Whether or not you have seen the answers yet, His peace will guard your heart. Your light shall break forth, and when you call, He will answer.',
        prayer:
          'Bless the Lord, O my soul, and all that is within me, bless His holy name. Thank You for these seven days. Thank You for hearing every prayer. I leave every request with You and receive Your peace. Keep me close to You after this retreat ends. In Jesus’ name, amen.',
        practice: 'Write down three things God did or showed you this week. Share one as a testimony.',
        fast: 'Break your fast gently: start with water, fruit or something light, and eat slowly.',
      },
    ],
  },
  {
    key: 'word-7',
    title: 'A Retreat with the Word',
    subtitle: 'Seven days to hear God through Scripture',
    about:
      'Slow down and let the Word read you. Each day has a short passage to read slowly (more than once), a reflection, a prayer and one verse to carry with you.',
    kind: 'word',
    icon: 'bookOpen',
    colors: ['#0b2a4a', '#3f7cc0'],
    rhythm: 'Read the passage three times: once to understand, once to notice a word or phrase, once to listen for what God is saying to you.',
    days: [
      {
        title: 'The Word was God',
        readings: ['John 1:1-14'],
        reflect:
          'Before anything was made, the Word was. The Word became flesh and lived among us, full of grace and truth. Reading Scripture is not only learning facts. It is meeting Jesus, the living Word.',
        prayer:
          'Lord Jesus, You are the Word made flesh. As I open the Scriptures this week, I want to meet You, not only learn about You. Shine Your light on my heart. Let me see Your glory, full of grace and truth. Amen.',
        practice: 'Choose a quiet place and time for this retreat, and keep the same place each day.',
      },
      {
        title: 'A lamp to my feet',
        readings: ['Psalm 119:97-112'],
        reflect:
          'The psalmist loved God’s law and meditated on it all day. God’s Word is a lamp to our feet: it does not always show the whole road, but it shows the next step.',
        prayer:
          'O how I want to love Your Word, Lord. Be a lamp to my feet and a light to my path. Show me the next step I should take. I choose to keep Your Word in my heart. Amen.',
        practice: 'Write Psalm 119:105 on a card or your phone’s lock screen and read it whenever you see it.',
      },
      {
        title: 'Living and powerful',
        readings: ['Hebrews 4:12-16', '2 Timothy 3:14-17'],
        reflect:
          'God’s Word is alive. It reaches the thoughts and intentions of the heart. All Scripture is God-breathed and useful for teaching, correcting and training us, so that we are ready for every good work.',
        prayer:
          'Father, let Your Word search me today. Show me what needs to change and what needs to grow. Teach me, correct me and train me. Thank You that because of Jesus I can come boldly to Your throne of grace. Amen.',
        practice: 'Ask God, “What is one thing in me Your Word is pointing to today?” Write down what comes to mind.',
      },
      {
        title: 'The seed and the soil',
        readings: ['Mark 4:1-20'],
        reflect:
          'The same seed fell on four kinds of ground. The difference was the soil. Worries, riches and the desire for other things can choke the Word. Good soil hears, receives and bears fruit.',
        prayer:
          'Lord, make my heart good soil. Pull out the thorns of worry and distraction. Let Your Word go deep in me and bear fruit: thirty, sixty, a hundredfold. Amen.',
        practice: 'Notice what distracts you most when you read the Bible, and set it aside for tomorrow’s reading.',
      },
      {
        title: 'Doers of the Word',
        readings: ['James 1:19-27', 'Matthew 7:24-27'],
        reflect:
          'Hearing without doing is like looking in a mirror and forgetting what we saw. Jesus says the wise person hears His words and does them, building on the rock.',
        prayer:
          'Jesus, I don’t want to only hear Your Word. Help me to do it. Make me quick to listen, slow to speak and slow to anger. Build my life on the rock. Amen.',
        practice: 'Pick one clear instruction from today’s reading and do it before the day ends.',
      },
      {
        title: 'Meditate day and night',
        readings: ['Joshua 1:1-9', 'Psalm 1'],
        reflect:
          'God told Joshua to keep the Word in his mouth and meditate on it day and night. The blessed person is like a tree planted by rivers of water, bearing fruit in its season.',
        prayer:
          'Lord, plant me by Your rivers. Let Your Word be in my mouth and in my thoughts day and night. Make me strong and of good courage, because You are with me wherever I go. Amen.',
        practice: 'Say Joshua 1:9 out loud in the morning, at midday and at night.',
      },
      {
        title: 'Let the Word dwell in you',
        readings: ['Colossians 3:12-17', 'John 15:1-11'],
        reflect:
          'Let the word of Christ dwell in you richly. Jesus says, “If ye abide in me, and my words abide in you, ye shall ask what ye will.” The retreat ends, but the Word stays with you.',
        prayer:
          'Lord, let Your Word live in me richly. Help me abide in You every day, not only this week. Let Your words shape my prayers, my songs and my choices. Thank You for speaking to me. Amen.',
        practice: 'Choose one reading plan or Bible book to keep reading next week.',
      },
    ],
  },
  {
    key: 'rest-7',
    title: 'Rest for the Weary',
    subtitle: 'Seven days to lay down your burdens',
    about:
      'For when you are tired, worried or stretched thin. Each day invites you to come to Jesus, be still, and receive His rest and peace.',
    kind: 'rest',
    icon: 'moon',
    colors: ['#1d3b4f', '#6aa39a'],
    rhythm: 'Take ten quiet minutes each day, ideally at the same time. Put your phone on silent while you read and pray.',
    days: [
      {
        title: 'Come to Me',
        readings: ['Matthew 11:25-30'],
        reflect: 'Jesus does not say “try harder.” He says, “Come unto me, all ye that labour and are heavy laden, and I will give you rest.” His yoke is easy and His burden is light.',
        prayer: 'Jesus, I am tired. I come to You as I am. I give You what I have been carrying: [name it]. Teach me Your gentle and humble way, and give my soul rest. Amen.',
        practice: 'Write down everything weighing on you. Then pray over the list and hand it to God.',
      },
      {
        title: 'He restores my soul',
        readings: ['Psalm 23'],
        reflect: 'The Lord is a shepherd who makes us lie down, leads us beside still waters and restores our souls. Even in the darkest valley, He is with us.',
        prayer: 'Lord, You are my shepherd. I shall not want. Lead me beside still waters today. Restore my soul. Even in this valley, I will fear no evil, for You are with me. Amen.',
        practice: 'Take a slow walk or sit outside for ten minutes and pray Psalm 23 line by line.',
      },
      {
        title: 'Be still',
        readings: ['Psalm 46', 'Exodus 14:13-14'],
        reflect: '“Be still, and know that I am God.” At the Red Sea, Moses told the people, “The Lord shall fight for you, and ye shall hold your peace.” Some battles are won by trusting, not striving.',
        prayer: 'God, You are my refuge and strength, a very present help in trouble. I choose to be still and know that You are God. Fight for me in what I cannot fix. Amen.',
        practice: 'Sit in silence for three minutes. Each time your mind wanders, say, “Be still, and know that I am God.”',
      },
      {
        title: 'Cast your cares',
        readings: ['1 Peter 5:6-11', 'Philippians 4:6-7'],
        reflect: 'Cast all your care upon Him, for He cares for you. Instead of worrying, pray about everything with thanksgiving, and the peace of God will guard your heart and mind.',
        prayer: 'Father, I cast my cares on You because You care for me. I bring You [name the worry], and I thank You for what You have already done. Guard my heart and mind with Your peace. Amen.',
        practice: 'Every time a worry comes today, turn it into a one-sentence prayer.',
      },
      {
        title: 'Strength renewed',
        readings: ['Isaiah 40:25-31'],
        reflect: 'God never grows tired. He gives power to the faint. Those who wait on the Lord shall renew their strength; they shall run and not be weary, walk and not faint.',
        prayer: 'Everlasting God, You do not faint or grow weary. I am weak, but You give power to the faint. I wait on You. Renew my strength today. Amen.',
        practice: 'Go to bed a little earlier tonight. Rest is part of trusting God.',
      },
      {
        title: 'Sabbath rest',
        readings: ['Hebrews 4:1-11', 'Mark 6:30-32'],
        reflect: 'After a busy season of ministry, Jesus told His disciples, “Come ye yourselves apart into a desert place, and rest a while.” God built rest into creation, and there remains a rest for His people.',
        prayer: 'Lord, thank You that You invite me to rest. Help me stop and trust that the world is in Your hands, not mine. Show me how to make room for rest each week. Amen.',
        practice: 'Plan one restful thing for this week: a nap, a meal with someone you love, a walk, or worship music.',
      },
      {
        title: 'My peace I give you',
        readings: ['John 14:1-3', 'John 14:25-27', 'John 16:33'],
        reflect: 'Jesus gives a peace the world cannot give. “Let not your heart be troubled.” In the world we will have trouble, but He has overcome the world.',
        prayer: 'Jesus, I receive Your peace. Let not my heart be troubled or afraid. You have overcome the world. Keep me resting in You long after this week. Amen.',
        practice: 'Thank God for three moments of rest He gave you this week.',
      },
    ],
  },
  {
    key: 'draw-near-3',
    title: 'Draw Near: A Weekend Retreat',
    subtitle: 'Three days to come close to God',
    about: 'A short retreat for a weekend or three quiet evenings. Draw near to God, abide in Him, and go out renewed.',
    kind: 'presence',
    icon: 'sunrise',
    colors: ['#5a2a3a', '#d4a64a'],
    rhythm: 'Give each day about 30 minutes: 10 to read, 10 to pray, 10 to sit quietly or worship.',
    days: [
      {
        title: 'Draw near',
        readings: ['James 4:7-10', 'Hebrews 10:19-23'],
        reflect: 'Draw nigh to God, and He will draw nigh to you. Because of the blood of Jesus we can come boldly, with a true heart and full assurance of faith.',
        prayer: 'Father, I draw near to You through Jesus. Wash my heart and make it true. I humble myself before You. Thank You that as I come close, You come close to me. Amen.',
        practice: 'Play one worship song and give God your full attention while it plays.',
      },
      {
        title: 'Abide',
        readings: ['John 15:1-17'],
        reflect: 'Jesus is the vine; we are the branches. Without Him we can do nothing. Abiding means staying connected, day by day, in His Word and His love.',
        prayer: 'Jesus, I want to abide in You. Prune what does not bear fruit. Let Your words abide in me and Your joy be full in me. Help me love others as You love me. Amen.',
        practice: 'Choose one simple daily habit to stay connected to Jesus next week.',
      },
      {
        title: 'Sent out renewed',
        readings: ['Isaiah 6:1-8', 'Romans 12:1-2'],
        reflect: 'Isaiah saw the Lord, was cleansed, and then said, “Here am I; send me.” Encountering God changes us and sends us out. Offer yourself to Him as a living sacrifice, renewed in your mind.',
        prayer: 'Holy, holy, holy is the Lord. Thank You for meeting me this weekend. Renew my mind. I offer You my life as a living sacrifice. Here am I, Lord; send me. Amen.',
        practice: 'Ask God who He wants you to encourage this week, and reach out to them.',
      },
    ],
  },
]

export const retreatByKey = (key: string | null | undefined) => RETREATS.find((r) => r.key === key) ?? null
