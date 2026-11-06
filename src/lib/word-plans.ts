// The Word step of a workout gets its own devotion: a theme with Scriptures that fill the step's time.
// A 1-minute step gets a verse or two; 3–4 minutes a passage; 7 minutes about a chapter; 15 minutes two or three chapters.
// This is separate from "Today's word" on Home (that one is for Home and sharing).
// Readings are listed from short to long: the key verse first, then passages, then whole chapters.
// Server-only (reads the Bible from D1).
import { db } from '~/lib/env'
import { formatReference, parseReference } from '~/lib/bible'

export type WordPlan = { key: string; title: string; focus: string; declaration: string; prayer: string; readings: string[] }

export const WORD_PLANS: WordPlan[] = [
  {
    key: 'shepherd',
    title: 'The Lord is my Shepherd',
    focus: 'You are led, fed and kept by a good Shepherd.',
    declaration: 'The Lord is my Shepherd. I lack nothing, and goodness and mercy follow me today.',
    prayer: 'Lord, lead me beside still waters today. Restore my soul and guide my steps.',
    readings: ['Psalm 23:1-3', 'Psalm 23', 'John 10:7-18', 'John 10', 'Ezekiel 34:11-16', 'Isaiah 40'],
  },
  {
    key: 'trust',
    title: 'Trust in the Lord',
    focus: 'Lean your whole weight on God, not on your own understanding.',
    declaration: 'I trust the Lord with all my heart. He directs my paths.',
    prayer: 'Father, I give You what I cannot understand. Make my path straight today.',
    readings: ['Proverbs 3:5-6', 'Proverbs 3:1-12', 'Psalm 37:1-11', 'Psalm 37', 'Jeremiah 17:5-10', 'Proverbs 3'],
  },
  {
    key: 'peace',
    title: 'Perfect peace',
    focus: 'Peace is not the absence of trouble; it is the presence of God.',
    declaration: 'My mind is stayed on God, and He keeps me in perfect peace.',
    prayer: 'Prince of Peace, quiet every storm in me. Guard my heart and my mind.',
    readings: ['Isaiah 26:3-4', 'Philippians 4:4-9', 'John 14:23-31', 'John 14', 'Isaiah 26', 'Philippians 4'],
  },
  {
    key: 'anxiety',
    title: 'Do not worry',
    focus: 'Your Father knows what you need before you ask.',
    declaration: 'I cast all my care on Him, because He cares for me.',
    prayer: 'Lord, I hand You every worry. Help me seek Your kingdom first today.',
    readings: ['1 Peter 5:6-7', 'Matthew 6:25-34', 'Luke 12:22-34', 'Matthew 6', 'Psalm 55', 'Luke 12'],
  },
  {
    key: 'strength',
    title: 'Strength for the weary',
    focus: 'Those who wait on the Lord exchange their weakness for His strength.',
    declaration: 'I wait on the Lord. I mount up with wings as an eagle; I run and I am not weary.',
    prayer: 'Lord, renew my strength. Where I am tired, be my power today.',
    readings: ['Isaiah 40:29-31', 'Isaiah 40:25-31', '2 Corinthians 12:7-10', 'Isaiah 40', '2 Corinthians 4', 'Psalm 18'],
  },
  {
    key: 'love-of-god',
    title: 'Nothing can separate you',
    focus: 'God’s love for you is stronger than anything you will face.',
    declaration: 'Nothing can separate me from the love of God in Christ Jesus my Lord.',
    prayer: 'Father, let me know Your love deeply today, and live from it.',
    readings: ['Romans 8:38-39', 'Romans 8:31-39', 'Ephesians 3:14-21', 'Romans 8', '1 John 4', 'Ephesians 3'],
  },
  {
    key: 'new-creation',
    title: 'A new creation',
    focus: 'In Christ, the old has gone and the new has come.',
    declaration: 'I am a new creation in Christ. Old things are passed away; all things are new.',
    prayer: 'Lord, help me live today as the new person You have made me.',
    readings: ['2 Corinthians 5:17', '2 Corinthians 5:14-21', 'Ephesians 2:1-10', '2 Corinthians 5', 'Ephesians 2', 'Colossians 3'],
  },
  {
    key: 'grace',
    title: 'Saved by grace',
    focus: 'You did not earn God’s love, and you cannot lose it by your weakness.',
    declaration: 'By grace I am saved through faith. It is the gift of God.',
    prayer: 'Thank You, Jesus, for grace I could never earn. Teach me to walk in it.',
    readings: ['Ephesians 2:8-10', 'Titus 3:3-8', 'Romans 5:1-11', 'Ephesians 2', 'Romans 5', 'Titus 2'],
  },
  {
    key: 'forgiveness',
    title: 'Forgiven and clean',
    focus: 'Confess, receive His forgiveness, and walk free.',
    declaration: 'He is faithful and just to forgive me and to cleanse me from all unrighteousness.',
    prayer: 'Create in me a clean heart, O God, and renew a right spirit within me.',
    readings: ['1 John 1:8-9', 'Psalm 51:1-12', 'Psalm 32', 'Psalm 51', '1 John 1', 'Luke 15'],
  },
  {
    key: 'forgive-others',
    title: 'Forgive as you are forgiven',
    focus: 'Letting go of an offence sets you free too.',
    declaration: 'I forgive as Christ forgave me. I walk in love, not bitterness.',
    prayer: 'Lord, give me grace to release those who hurt me, and heal my heart.',
    readings: ['Colossians 3:12-13', 'Matthew 18:21-35', 'Ephesians 4:25-32', 'Matthew 18', 'Ephesians 4', 'Genesis 50'],
  },
  {
    key: 'faith',
    title: 'Faith that pleases God',
    focus: 'Faith is trusting God before you see the answer.',
    declaration: 'I live by faith, not by sight. My God rewards those who seek Him.',
    prayer: 'Lord, increase my faith. Help me believe You today.',
    readings: ['Hebrews 11:6', 'Hebrews 11:1-12', 'Mark 11:20-26', 'Hebrews 11', 'Mark 11', 'Romans 4'],
  },
  {
    key: 'prayer',
    title: 'Ask, seek, knock',
    focus: 'God loves to hear you and answer you.',
    declaration: 'I ask and I receive; I seek and I find; I knock and doors are opened to me.',
    prayer: 'Father, teach me to pray, and to keep praying until I see Your answer.',
    readings: ['Matthew 7:7-8', 'Matthew 7:7-12', 'Luke 11:1-13', 'Luke 18:1-8', 'Matthew 6:5-15', 'Luke 11'],
  },
  {
    key: 'presence',
    title: 'In His presence',
    focus: 'There is fullness of joy where God is.',
    declaration: 'In His presence is fullness of joy; at His right hand are pleasures for evermore.',
    prayer: 'Lord, draw me close. I want Your presence more than anything today.',
    readings: ['Psalm 16:11', 'Psalm 16', 'Psalm 84', 'Exodus 33:12-23', 'Psalm 27', 'Psalm 63'],
  },
  {
    key: 'secret-place',
    title: 'The secret place',
    focus: 'Dwell close to God, and you will find shelter.',
    declaration: 'I dwell in the secret place of the Most High. He is my refuge and my fortress.',
    prayer: 'Lord, cover me under Your wings today. Be my hiding place.',
    readings: ['Psalm 91:1-2', 'Psalm 91:1-10', 'Psalm 91', 'Psalm 121', 'Psalm 46', 'Psalm 61'],
  },
  {
    key: 'fear-not',
    title: 'Fear not',
    focus: 'God is with you, so you do not have to be afraid.',
    declaration: 'I will not fear, for God is with me. He strengthens me and holds me up.',
    prayer: 'Lord, where I am afraid, let me hear You say, “Fear not, I am with you.”',
    readings: ['Isaiah 41:10', 'Isaiah 41:8-13', 'Isaiah 43:1-7', 'Isaiah 41', 'Isaiah 43', 'Psalm 27'],
  },
  {
    key: 'joy',
    title: 'The joy of the Lord',
    focus: 'Joy is strength that comes from God, not from circumstances.',
    declaration: 'The joy of the Lord is my strength. I rejoice in Him always.',
    prayer: 'Lord, fill me with Your joy today, whatever the day brings.',
    readings: ['Nehemiah 8:10', 'Habakkuk 3:17-19', 'Philippians 4:4-7', 'John 15:9-17', 'Psalm 126', 'Philippians 1'],
  },
  {
    key: 'thanks',
    title: 'Give thanks',
    focus: 'Thanksgiving opens the gates of God’s presence.',
    declaration: 'I enter His gates with thanksgiving. In everything I give thanks.',
    prayer: 'Thank You, Lord, for Your goodness to me. Make me a thankful person.',
    readings: ['1 Thessalonians 5:16-18', 'Psalm 100', 'Psalm 103:1-14', 'Psalm 103', 'Psalm 136', 'Luke 17:11-19'],
  },
  {
    key: 'praise',
    title: 'Let everything praise the Lord',
    focus: 'Praise lifts your eyes from the problem to the God who is bigger.',
    declaration: 'I will bless the Lord at all times; His praise shall continually be in my mouth.',
    prayer: 'Lord, I praise You for who You are, not only for what You do.',
    readings: ['Psalm 34:1-3', 'Psalm 34:1-10', 'Psalm 145:1-13', 'Psalm 34', 'Psalm 145', 'Psalm 150'],
  },
  {
    key: 'word',
    title: 'A lamp to my feet',
    focus: 'God’s Word shows you the next step.',
    declaration: 'Your Word is a lamp to my feet and a light to my path.',
    prayer: 'Lord, open my eyes to see wonderful things in Your Word.',
    readings: ['Psalm 119:105', 'Psalm 119:9-16', 'Psalm 119:97-112', 'Psalm 1', 'Psalm 19', 'Joshua 1'],
  },
  {
    key: 'abide',
    title: 'Abide in the Vine',
    focus: 'Fruit grows from staying close to Jesus, not from striving.',
    declaration: 'I abide in Christ and His words abide in me. I bear much fruit.',
    prayer: 'Jesus, keep me connected to You. Prune what needs to go.',
    readings: ['John 15:4-5', 'John 15:1-11', 'John 15', 'Galatians 5:16-26', 'Psalm 1', 'John 17'],
  },
  {
    key: 'holy-spirit',
    title: 'The Holy Spirit, our Helper',
    focus: 'You are not alone; the Spirit of God lives in you.',
    declaration: 'The Spirit of God dwells in me. He helps me, teaches me and leads me.',
    prayer: 'Holy Spirit, fill me afresh. Lead me and help me today.',
    readings: ['John 14:16-17', 'John 16:7-15', 'Acts 2:1-21', 'Romans 8:1-17', 'Acts 2', 'Galatians 5'],
  },
  {
    key: 'fruit',
    title: 'The fruit of the Spirit',
    focus: 'Love, joy and peace grow in a heart that walks with the Spirit.',
    declaration: 'The fruit of the Spirit grows in me: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness and self-control.',
    prayer: 'Holy Spirit, grow Your fruit in me where people need it most.',
    readings: ['Galatians 5:22-23', 'Galatians 5:16-26', 'Colossians 3:12-17', 'Galatians 5', 'Colossians 3', '2 Peter 1'],
  },
  {
    key: 'love',
    title: 'Love is patient',
    focus: 'The greatest gift is love.',
    declaration: 'I walk in love. Love never fails.',
    prayer: 'Lord, love others through me today, especially the difficult ones.',
    readings: ['1 Corinthians 13:4-7', '1 Corinthians 13', '1 John 4:7-21', 'Romans 12:9-21', '1 John 4', 'John 13'],
  },
  {
    key: 'armour',
    title: 'The armour of God',
    focus: 'Stand firm; the battle is the Lord’s, and He has equipped you.',
    declaration: 'I put on the whole armour of God. I stand, and I am not moved.',
    prayer: 'Lord, clothe me with truth, righteousness, peace and faith today.',
    readings: ['Ephesians 6:10-11', 'Ephesians 6:10-18', 'Ephesians 6', '2 Corinthians 10:3-6', 'Psalm 144', '2 Chronicles 20'],
  },
  {
    key: 'victory',
    title: 'More than a conqueror',
    focus: 'In Christ, you face life from victory, not for victory.',
    declaration: 'I am more than a conqueror through Him who loved me.',
    prayer: 'Lord, help me walk in the victory You have already won.',
    readings: ['1 John 5:4-5', '1 Corinthians 15:54-58', 'Romans 8:28-39', '2 Chronicles 20:1-22', '1 Corinthians 15', '2 Chronicles 20'],
  },
  {
    key: 'provision',
    title: 'My God shall supply',
    focus: 'God is your Provider; He knows what you need.',
    declaration: 'My God supplies all my needs according to His riches in glory by Christ Jesus.',
    prayer: 'Father, I trust You for today’s needs. Make me generous with what You give.',
    readings: ['Philippians 4:19', 'Matthew 6:25-33', '1 Kings 17:8-16', '2 Corinthians 9:6-15', '1 Kings 17', 'Psalm 34'],
  },
  {
    key: 'healing',
    title: 'The Lord who heals',
    focus: 'Jesus still has compassion on the sick and the broken.',
    declaration: 'By His stripes I am healed. The Lord is my Healer.',
    prayer: 'Lord Jesus, touch every part of me that needs healing: body, mind and heart.',
    readings: ['Isaiah 53:4-5', 'Isaiah 53', 'Mark 5:21-43', 'Psalm 103:1-5', 'James 5:13-18', 'Mark 5'],
  },
  {
    key: 'waiting',
    title: 'Wait on the Lord',
    focus: 'Waiting is not wasted when you wait on God.',
    declaration: 'I wait on the Lord and I am of good courage. He strengthens my heart.',
    prayer: 'Lord, give me patience in the waiting, and hope while I wait.',
    readings: ['Psalm 27:14', 'Lamentations 3:21-26', 'Psalm 40:1-5', 'Psalm 27', 'Psalm 40', 'Lamentations 3'],
  },
  {
    key: 'mercies',
    title: 'New every morning',
    focus: 'Yesterday does not decide today; His mercies are new.',
    declaration: 'His mercies are new every morning. Great is His faithfulness.',
    prayer: 'Lord, thank You for a fresh start today. I receive Your mercy.',
    readings: ['Lamentations 3:22-23', 'Lamentations 3:19-33', 'Psalm 103:8-14', 'Lamentations 3', 'Psalm 103', 'Micah 7'],
  },
  {
    key: 'guidance',
    title: 'He will guide you',
    focus: 'God leads those who ask Him for direction.',
    declaration: 'The Lord guides me with His eye. My steps are ordered by Him.',
    prayer: 'Lord, show me the way I should walk. I lift my soul to You.',
    readings: ['Psalm 32:8', 'Psalm 25:1-10', 'Isaiah 30:18-21', 'Psalm 25', 'Psalm 32', 'Isaiah 58'],
  },
  {
    key: 'wisdom',
    title: 'Ask for wisdom',
    focus: 'God gives wisdom generously to anyone who asks.',
    declaration: 'I ask God for wisdom and He gives it to me generously.',
    prayer: 'Father, give me wisdom for the decisions in front of me.',
    readings: ['James 1:5-6', 'Proverbs 2:1-11', 'James 3:13-18', 'Proverbs 2', 'James 1', 'Proverbs 8'],
  },
  {
    key: 'trials',
    title: 'Joy in trials',
    focus: 'God uses the hard seasons to make you strong and whole.',
    declaration: 'The testing of my faith produces patience. I will come out complete, lacking nothing.',
    prayer: 'Lord, in this trial, make me more like Jesus.',
    readings: ['James 1:2-4', 'James 1:2-12', '1 Peter 1:3-9', 'Romans 5:1-5', 'James 1', '1 Peter 1'],
  },
  {
    key: 'all-things',
    title: 'All things work together',
    focus: 'God weaves even the painful parts into His good purpose.',
    declaration: 'All things work together for good for me, because I love God and am called by Him.',
    prayer: 'Lord, I trust You with the parts of my story I do not understand.',
    readings: ['Romans 8:28', 'Romans 8:18-30', 'Genesis 50:15-21', 'Romans 8', 'Genesis 45', 'Genesis 50'],
  },
  {
    key: 'purpose',
    title: 'Plans to give you hope',
    focus: 'God has good plans for your life.',
    declaration: 'God’s thoughts toward me are peace and not evil, to give me a future and a hope.',
    prayer: 'Lord, align my plans with Yours. Lead me into my purpose.',
    readings: ['Jeremiah 29:11-13', 'Jeremiah 29:10-14', 'Psalm 139:13-18', 'Ephesians 1:3-14', 'Psalm 139', 'Ephesians 1'],
  },
  {
    key: 'known',
    title: 'Fearfully and wonderfully made',
    focus: 'God made you on purpose and knows you completely.',
    declaration: 'I am fearfully and wonderfully made. God knows me and loves me.',
    prayer: 'Lord, help me see myself the way You see me.',
    readings: ['Psalm 139:13-14', 'Psalm 139:1-12', 'Psalm 139', 'Isaiah 49:13-16', 'Psalm 8', 'Isaiah 49'],
  },
  {
    key: 'rest',
    title: 'Come and rest',
    focus: 'Jesus invites the tired to come to Him.',
    declaration: 'I come to Jesus and He gives me rest. His yoke is easy and His burden is light.',
    prayer: 'Jesus, I bring You my tiredness. Give me rest for my soul.',
    readings: ['Matthew 11:28-30', 'Psalm 62:1-8', 'Hebrews 4:9-16', 'Psalm 62', 'Hebrews 4', 'Psalm 131'],
  },
  {
    key: 'be-still',
    title: 'Be still and know',
    focus: 'Stop striving, and know that He is God.',
    declaration: 'I am still, and I know that He is God. The Lord of hosts is with me.',
    prayer: 'Lord, quiet my heart so I can hear You.',
    readings: ['Psalm 46:10-11', 'Psalm 46', '1 Kings 19:9-18', 'Psalm 131', '1 Kings 19', 'Isaiah 30'],
  },
  {
    key: 'humility',
    title: 'The mind of Christ',
    focus: 'Jesus humbled Himself; the way up is down.',
    declaration: 'I humble myself under God’s mighty hand, and He lifts me up in due time.',
    prayer: 'Lord, give me the mind of Christ: humble, kind and obedient.',
    readings: ['Philippians 2:5-8', 'Philippians 2:1-11', 'John 13:1-17', 'Philippians 2', 'James 4', 'John 13'],
  },
  {
    key: 'obedience',
    title: 'Doers of the Word',
    focus: 'Hearing is the start; doing is where life changes.',
    declaration: 'I am a doer of the Word, not a hearer only. I build my life on the rock.',
    prayer: 'Lord, show me one thing to obey today, and give me grace to do it.',
    readings: ['James 1:22-25', 'Matthew 7:21-29', 'Luke 6:43-49', 'James 1', 'Matthew 7', 'Deuteronomy 28'],
  },
  {
    key: 'courage',
    title: 'Be strong and courageous',
    focus: 'God goes with you into every new place.',
    declaration: 'I am strong and of good courage. The Lord my God is with me wherever I go.',
    prayer: 'Lord, give me courage for what is ahead of me today.',
    readings: ['Joshua 1:9', 'Joshua 1:1-9', 'Deuteronomy 31:1-8', 'Joshua 1', 'Deuteronomy 31', 'Psalm 31'],
  },
  {
    key: 'light',
    title: 'You are the light of the world',
    focus: 'Your life can point people to God.',
    declaration: 'I am the light of the world. My good works bring glory to my Father.',
    prayer: 'Lord, let my life shine for You today at home, at work and everywhere.',
    readings: ['Matthew 5:14-16', 'Matthew 5:1-16', 'Ephesians 5:1-17', 'Matthew 5', 'Ephesians 5', 'Isaiah 60'],
  },
  {
    key: 'great-commission',
    title: 'Go and make disciples',
    focus: 'Jesus sends you with His authority and His presence.',
    declaration: 'All authority belongs to Jesus, and He is with me always as I share Him.',
    prayer: 'Lord, give me boldness and love to share You with someone today.',
    readings: ['Matthew 28:18-20', 'Acts 1:1-11', 'Romans 10:8-17', 'Acts 1', 'Romans 10', 'Acts 4'],
  },
  {
    key: 'cross',
    title: 'The love of the cross',
    focus: 'At the cross, Jesus took your place.',
    declaration: 'Christ died for me while I was still a sinner. I am loved and redeemed.',
    prayer: 'Jesus, thank You for the cross. Let me never forget what You did for me.',
    readings: ['Romans 5:8', 'Isaiah 53:3-7', 'John 19:16-30', 'Isaiah 53', 'John 19', 'Luke 23'],
  },
  {
    key: 'resurrection',
    title: 'He is risen',
    focus: 'Because Jesus lives, you have living hope.',
    declaration: 'Jesus is alive. The Spirit who raised Him from the dead lives in me.',
    prayer: 'Risen Lord, raise up hope in me where things feel dead.',
    readings: ['1 Peter 1:3', 'John 11:20-27', 'John 20:1-18', 'Luke 24:1-35', 'John 20', '1 Corinthians 15'],
  },
  {
    key: 'hope',
    title: 'The God of hope',
    focus: 'Hope in God is an anchor for your soul.',
    declaration: 'The God of hope fills me with all joy and peace in believing.',
    prayer: 'God of hope, fill me to overflowing with hope today.',
    readings: ['Romans 15:13', 'Hebrews 6:13-20', 'Psalm 42', 'Romans 15:1-13', 'Psalm 43', 'Hebrews 6'],
  },
  {
    key: 'refuge',
    title: 'God is our refuge',
    focus: 'When the ground shakes, God does not.',
    declaration: 'God is my refuge and strength, a very present help in trouble.',
    prayer: 'Lord, be my refuge today. I run to You.',
    readings: ['Psalm 46:1-3', 'Psalm 46', 'Psalm 18:1-19', 'Nahum 1:7', 'Psalm 18', 'Psalm 62'],
  },
  {
    key: 'blessing',
    title: 'The Lord bless you',
    focus: 'God’s face is turned toward you with favour.',
    declaration: 'The Lord blesses me and keeps me. His face shines on me, and He gives me peace.',
    prayer: 'Father, let Your favour rest on me and on my family today.',
    readings: ['Numbers 6:24-26', 'Psalm 67', 'Psalm 128', 'Deuteronomy 28:1-14', 'Psalm 112', 'Ephesians 1'],
  },
  {
    key: 'family',
    title: 'As for me and my house',
    focus: 'Your home can be a place where God is served.',
    declaration: 'As for me and my house, we will serve the Lord.',
    prayer: 'Lord, bless my home. Let love, peace and Your Word fill it.',
    readings: ['Joshua 24:15', 'Psalm 127', 'Deuteronomy 6:4-9', 'Ephesians 5:21-33', 'Joshua 24', 'Ephesians 6:1-4'],
  },
  {
    key: 'renewed-mind',
    title: 'A renewed mind',
    focus: 'Change starts in how you think.',
    declaration: 'I am transformed by the renewing of my mind. I think on what is true and lovely.',
    prayer: 'Lord, renew my thoughts. Take every thought captive to Christ.',
    readings: ['Romans 12:1-2', 'Philippians 4:6-9', 'Colossians 3:1-17', 'Romans 12', 'Colossians 3', '2 Corinthians 10'],
  },
  {
    key: 'seek-first',
    title: 'Seek first the kingdom',
    focus: 'Put God first, and He takes care of the rest.',
    declaration: 'I seek first the kingdom of God and His righteousness, and all I need is added to me.',
    prayer: 'Lord, be first in my day, my money, my time and my heart.',
    readings: ['Matthew 6:33', 'Matthew 6:19-34', 'Psalm 27:4-8', 'Matthew 6', 'Psalm 27', 'Haggai 1'],
  },
  {
    key: 'faithfulness',
    title: 'God is faithful',
    focus: 'He has never failed, and He will not start now.',
    declaration: 'Faithful is He who called me, and He will do it.',
    prayer: 'Lord, thank You that You keep every promise. Help me to be faithful too.',
    readings: ['1 Thessalonians 5:23-24', 'Deuteronomy 7:6-9', 'Psalm 89:1-18', 'Psalm 89', 'Hebrews 10:19-25', 'Psalm 36'],
  },
  {
    key: 'generosity',
    title: 'A cheerful giver',
    focus: 'Generosity is how a grateful heart lives.',
    declaration: 'I give cheerfully, and God makes all grace abound toward me.',
    prayer: 'Lord, make me generous like You. Show me whom to bless today.',
    readings: ['2 Corinthians 9:6-8', '2 Corinthians 9', 'Malachi 3:6-12', 'Luke 6:27-38', 'Acts 20:32-35', 'Malachi 3'],
  },
  {
    key: 'unity',
    title: 'Good and pleasant',
    focus: 'God commands blessing where His people live in unity.',
    declaration: 'I keep the unity of the Spirit in the bond of peace.',
    prayer: 'Lord, make me a peacemaker in my church, family and friendships.',
    readings: ['Psalm 133', 'Ephesians 4:1-6', 'John 17:20-26', '1 Corinthians 12:12-27', 'Ephesians 4', '1 Corinthians 12'],
  },
  {
    key: 'heaven',
    title: 'A place prepared for you',
    focus: 'This life is not the end of the story.',
    declaration: 'Jesus has prepared a place for me, and one day I will be with Him for ever.',
    prayer: 'Lord, set my heart on eternity, and help me live today with heaven in view.',
    readings: ['John 14:1-3', 'Revelation 21:1-7', '2 Corinthians 4:16-5:1', 'Revelation 21', 'Revelation 22', '1 Thessalonians 4'],
  },
]

export type WordSection = { reference: string; bookId: number; chapter: number; verses: { verse: number; text: string }[]; key: number[] }
export type StepWord = { key: string; title: string; focus: string; declaration: string; prayer: string; sections: WordSection[]; words: number; minutes: number }

/** About how many words to read for a step of this length. Devotional reading is slow (~120 words a minute),
 *  and some of the time is for meditating and declaring, so the reading fills about 75% of the step. */
export const wordsFor = (seconds: number) => Math.max(40, Math.round(seconds * 1.5))

const count = (t: string) => t.split(/\s+/).filter(Boolean).length

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Which devotion a workout gets on a day. Different workouts on the same day get different devotions,
 *  and the same workout moves on to the next devotion each day. */
export function planFor(day: string, workoutSlug: string, step = 0, avoid?: string | null) {
  const n = Math.floor(Date.parse(day + 'T12:00:00Z') / 86400000)
  let i = (n + hash(workoutSlug) + step * 17) % WORD_PLANS.length
  if (avoid && WORD_PLANS[i].readings.some((r) => r.replace(/:.*/, '') === avoid.replace(/:.*/, ''))) i = (i + 1) % WORD_PLANS.length
  return WORD_PLANS[i]
}

type Chapter = Map<number, string>
/** Fill the step: take readings in order (short to long) until there is enough to read for this many seconds.
 *  A reading that covers a chapter already started grows that section instead of repeating it. */
export async function buildWord(plan: WordPlan, seconds: number): Promise<StepWord> {
  const target = wordsFor(seconds)
  const cache = new Map<string, Chapter>()
  async function chapter(bookId: number, ch: number) {
    const k = `${bookId}:${ch}`
    if (!cache.has(k)) {
      const { results } = await db().prepare('SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? ORDER BY verse').bind(bookId, ch).all<{ verse: number; text: string }>()
      cache.set(k, new Map(results.map((v) => [v.verse, v.text])))
    }
    return cache.get(k)!
  }
  // Parse a reading into one or more chapter ranges (handles "2 Corinthians 4:16-5:1")
  async function ranges(ref: string) {
    const cross = ref.match(/^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/)
    if (cross) {
      const a = parseReference(`${cross[1]} ${cross[2]}:${cross[3]}`)
      if (!a) return []
      const first = await chapter(a.bookId, a.chapter)
      return [
        { bookId: a.bookId, chapter: a.chapter, from: Number(cross[3]), to: Math.max(...first.keys()) },
        { bookId: a.bookId, chapter: Number(cross[4]), from: 1, to: Number(cross[5]) },
      ]
    }
    const p = parseReference(ref)
    if (!p) return []
    const ch = await chapter(p.bookId, p.chapter)
    if (!ch.size) return []
    return [{ bookId: p.bookId, chapter: p.chapter, from: p.verseStart ?? 1, to: p.verseEnd ?? (p.verseStart ? p.verseStart : Math.max(...ch.keys())) }]
  }

  const sections: { bookId: number; chapter: number; set: Set<number>; key: Set<number> }[] = []
  let total = 0
  const seen = new Set<string>()
  const add = async (ref: string, isKey: boolean, force: boolean) => {
    const rs = await ranges(ref)
    if (!rs.length) return false
    let fresh = 0
    for (const r of rs) {
      const ch = await chapter(r.bookId, r.chapter)
      for (let v = r.from; v <= r.to; v++) if (ch.has(v) && !seen.has(`${r.bookId}:${r.chapter}:${v}`)) fresh += count(ch.get(v)!)
    }
    if (!fresh) return false
    // Don't go far past the time (the key verse is always read)
    if (!force && total + fresh > target * 1.35) return false
    for (const r of rs) {
      const ch = await chapter(r.bookId, r.chapter)
      let s = sections.find((x) => x.bookId === r.bookId && x.chapter === r.chapter)
      if (!s) sections.push((s = { bookId: r.bookId, chapter: r.chapter, set: new Set(), key: new Set() }))
      for (let v = r.from; v <= r.to; v++) {
        if (!ch.has(v)) continue
        s.set.add(v)
        if (isKey) s.key.add(v)
        seen.add(`${r.bookId}:${r.chapter}:${v}`)
      }
    }
    total += fresh
    return true
  }

  for (let i = 0; i < plan.readings.length; i++) {
    if (total >= target * 0.85) break
    await add(plan.readings[i], i === 0, i === 0)
  }
  // Still short of the time? Read on from the key verse: the rest of its chapter, then the next chapter
  if (sections.length) {
    let base = sections[0]
    const done = new Set<string>()
    for (let guard = 0; guard < 400 && total < target * 0.85; guard++) {
      const ch = cache.get(`${base.bookId}:${base.chapter}`)!
      const after = Math.max(...base.set) + 1
      let v: number | null = null
      for (let x = after; x <= Math.max(...ch.keys()); x++) if (!seen.has(`${base.bookId}:${base.chapter}:${x}`)) { v = x; break }
      if (v == null) {
        const nextCh = await chapter(base.bookId, base.chapter + 1)
        if (!nextCh.size) {
          // End of the book: read on from another reading instead
          done.add(`${base.bookId}`)
          const other = sections.find((x) => !done.has(`${x.bookId}`))
          if (!other) break
          base = other
          continue
        }
        let s2 = sections.find((x) => x.bookId === base.bookId && x.chapter === base.chapter + 1)
        if (!s2) sections.push((s2 = { bookId: base.bookId, chapter: base.chapter + 1, set: new Set(), key: new Set() }))
        if (!s2.set.size) {
          const first = Math.min(...nextCh.keys())
          s2.set.add(first)
          seen.add(`${s2.bookId}:${s2.chapter}:${first}`)
          total += count(nextCh.get(first)!)
        }
        base = s2
        continue
      }
      const w = count(ch.get(v)!)
      if (total + w > target * 1.35) break
      base.set.add(v)
      seen.add(`${base.bookId}:${base.chapter}:${v}`)
      total += w
    }
  }

  const out: WordSection[] = sections.map((s) => {
    const ch = cache.get(`${s.bookId}:${s.chapter}`)!
    const vs = [...s.set].sort((a, b) => a - b)
    const whole = vs.length === ch.size
    return {
      reference: whole ? formatReference(s.bookId, s.chapter) : rangeLabel(s.bookId, s.chapter, vs),
      bookId: s.bookId,
      chapter: s.chapter,
      verses: vs.map((v) => ({ verse: v, text: ch.get(v)! })),
      key: [...s.key].sort((a, b) => a - b),
    }
  })
  return { key: plan.key, title: plan.title, focus: plan.focus, declaration: plan.declaration, prayer: plan.prayer, sections: out, words: total, minutes: Math.max(1, Math.round(total / 120)) }
}

/** "Psalm 23:1-6", or "John 3:16, 18-21" when there are gaps */
export function rangeLabel(bookId: number, chapter: number, verses: number[]) {
  const parts: string[] = []
  for (let i = 0; i < verses.length; i++) {
    let j = i
    while (j + 1 < verses.length && verses[j + 1] === verses[j] + 1) j++
    parts.push(i === j ? String(verses[i]) : `${verses[i]}-${verses[j]}`)
    i = j
  }
  return `${formatReference(bookId, chapter)}:${parts.join(', ')}`
}
