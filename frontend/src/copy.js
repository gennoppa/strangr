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

export const pickIcebreakers = (n = 3) => [...ICEBREAKERS].sort(() => Math.random() - 0.5).slice(0, n);

export const ENDED_TITLES = ['They left the chat 💨', 'Chat ended 👋', 'That’s a wrap 🎬'];
