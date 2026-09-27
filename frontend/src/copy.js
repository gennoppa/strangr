// All the fun, user-facing copy lives here so it's easy to tweak or translate.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const TAGLINES = [
  'Meet someone new in seconds ⚡',
  'Your next favourite convo is one click away 💬',
  'Random people. Real vibes. ✨',
  'Swap stories with someone across the world 🌍',
  'Zero sign-up. Just vibes. 😎',
];

export const QUICK_INTERESTS = [
  { emoji: '🎮', label: 'gaming' },
  { emoji: '🎵', label: 'music' },
  { emoji: '🎬', label: 'movies' },
  { emoji: '📺', label: 'anime' },
  { emoji: '⚽', label: 'sports' },
  { emoji: '😂', label: 'memes' },
  { emoji: '✈️', label: 'travel' },
  { emoji: '🎨', label: 'art' },
  { emoji: '💻', label: 'coding' },
  { emoji: '🍕', label: 'food' },
  { emoji: '🐶', label: 'pets' },
  { emoji: '📚', label: 'books' },
];

export const interestEmoji = (tag) => QUICK_INTERESTS.find((i) => i.label === tag)?.emoji || '✨';

export const SEARCHING = [
  'Spinning the globe for you… 🌍',
  'Finding your vibe match ✨',
  'Hold tight — someone cool is loading 🚀',
  'Shuffling the deck of strangers 🃏',
  'Scanning the multiverse 🪐',
  'Warming up the good vibes ☀️',
];

export const MATCHED = [
  "It's a match! 🎉 Say hi 👋",
  'A wild stranger appeared! 👾 Break the ice 🧊',
  "You're connected! ✨ Don't be shy 😄",
  'New friend unlocked 🔓 Say something fun!',
  'Boom 💥 you’re live with a stranger. Go!',
];

export const commonLine = (tags) =>
  `You both vibe with ${tags.map((t) => `${interestEmoji(t)} ${t}`).join(', ')} 🤝`;

export const PARTNER_LEFT = [
  'Poof! 💨 The stranger dipped.',
  'They bounced 🏀 — plenty more people out there!',
  'Stranger left the chat 👋 Their loss!',
  'And… they’re gone 🫥 Next adventure awaits!',
];

export const BLOCKED = "Blocked 🚫 You won't see them again.";
export const REPORTED = 'Reported & blocked 🛡️ Thanks for keeping Strangr safe!';
export const NO_CAMERA = 'No camera or mic? No stress — you’re in text mode 💬';
export const VIDEO_FAILED = 'Video couldn’t connect on this network 📡 — but you can still chat!';

export const ICEBREAKERS = [
  "What's your go-to song right now? 🎧",
  'Hot take: pineapple on pizza? 🍍🍕',
  'Where in the world are you vibing from? 🌎',
  "What's the last thing that made you laugh? 😂",
  'Dogs or cats? 🐶🐱',
  "What's a show you'd binge again? 📺",
  "If you could teleport anywhere right now, where? 🌀",
  "What's your hidden talent? 🎩",
  'Best snack of all time? 🍿',
  'Morning person or night owl? 🌞🦉',
];

const MOOD_ICEBREAKERS = {
  support: [
    "What's on your mind? I'm all ears 👂",
    'How has your day really been? 💭',
    "Want to talk about it? No judgment here 💜",
    'What would make today a little better? 🌤️',
    "I'm here to listen — take your time 🫂",
  ],
  deep: [
    "What's something you've changed your mind about? 🤔",
    'What would you do if you knew you couldn’t fail? 🚀',
    "What's a memory you'd relive? 🌙",
    'Do you believe in fate or coincidence? 🌌',
    'What does a perfect life look like to you? ✨',
  ],
  hyped: [
    "What's the most chaotic thing you've done? 😂",
    'Rate your current energy 1–10 ⚡',
    'Best party song ever? 🎶',
    "What's your go-to hype move? 🕺",
  ],
};

/** Icebreakers suited to the chat's mood (falls back to the general list). */
export const pickIcebreakers = (n = 3, myMood = 'any', partnerMood = 'any') => {
  const moods = [myMood, partnerMood];
  const pool = moods.includes('vent') || moods.includes('listen') ? MOOD_ICEBREAKERS.support
    : moods.includes('deep') ? MOOD_ICEBREAKERS.deep
    : moods.includes('hyped') ? [...MOOD_ICEBREAKERS.hyped, ...ICEBREAKERS]
    : ICEBREAKERS;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
};

export const ENDED_TITLES = ['They left the chat 💨', 'Chat ended 👋', 'That’s a wrap 🎬'];

// ---------------------------------------------------------------- mood match

export const MOODS = [
  { key: 'hyped', emoji: '🥳', label: 'Hyped', desc: 'fun & good energy', partner: 'is hyped' },
  { key: 'bored', emoji: '😴', label: 'Bored', desc: 'entertain me pls', partner: 'is bored' },
  { key: 'vent', emoji: '😮‍💨', label: 'Need to vent', desc: 'just need to talk', partner: 'needs to vent' },
  { key: 'listen', emoji: '👂', label: 'Here to listen', desc: 'happy to support', partner: 'is here to listen' },
  { key: 'deep', emoji: '🤔', label: 'Deep talks', desc: 'life, dreams, 3am thoughts', partner: 'wants deep talks' },
  { key: 'any', emoji: '🎲', label: 'Surprise me', desc: 'any vibe works', partner: 'is up for anything' },
];

export const moodInfo = (key) => MOODS.find((m) => m.key === key) || MOODS[MOODS.length - 1];

/** Rotating search lines tailored to the mood you picked. */
export const MOOD_SEARCHING = {
  hyped: ['Finding someone with matching energy ⚡', 'Loading a fellow hype machine 🥳', 'Turning the volume up 🔊'],
  bored: ['Hunting down some entertainment 🍿', 'Finding someone to kill boredom with 🎯', 'Boredom ends in 3… 2… 1… ⏳'],
  vent: ['Finding someone who’ll really listen 👂', 'A kind ear is on the way 💜', 'Hang in there — someone’s coming 🫂'],
  listen: ['Finding someone who needs a friend 💜', 'Someone out there needs you rn 🫂', 'Warming up your listening ears 👂'],
  deep: ['Finding a fellow overthinker 🌌', 'Searching for 3am-conversation energy 🌙', 'Diving into the deep end 🌊'],
};

/** System lines shown right after a match, based on both moods. */
export function moodMatchLines(my, partner, perfect) {
  const p = moodInfo(partner);
  if (my === 'listen' && partner === 'vent')
    return ['💜 They need to vent — you’re the listener. No judging, just vibes 🫂'];
  if (my === 'vent' && partner === 'listen')
    return ['👂 You got a good listener. Let it all out 💜'];
  if (perfect && my === partner) {
    const same = {
      hyped: '⚡ Double hype! Energy levels: dangerously high 🥳🥳',
      bored: '😴 Two bored souls united. Time to fix that 🎯',
      deep: '🌌 Two deep thinkers. Get philosophical 🤔',
    };
    if (same[my]) return [same[my]];
  }
  if (partner && partner !== 'any') return [`${p.emoji} Stranger ${p.partner}`];
  return [];
}
