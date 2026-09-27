import { useEffect, useMemo, useState } from 'react';
import { MOOD_SEARCHING, SEARCHING, moodInfo, pick } from '../copy.js';

/** Radar-style "searching" animation with rotating fun copy. */
export function Searching({ compact = false, mood = 'any' }) {
  // Mood-specific lines first, then the general ones.
  const lines = useMemo(() => [...(MOOD_SEARCHING[mood] || []), ...SEARCHING], [mood]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2200);
    return () => clearInterval(t);
  }, [lines]);
  const m = moodInfo(mood);

  return (
    <div className={`stage ${compact ? 'compact' : ''}`}>
      <div className="radar" aria-hidden>
        <span />
        <span />
        <span />
        <div className="radar-core">{mood !== 'any' ? m.emoji : '🔎'}</div>
      </div>
      <p key={i} className="stage-text fade-swap">{lines[i % lines.length]}</p>
      {mood !== 'any' && <span className={`mood-pill mood-${mood}`}>Your mood: {m.emoji} {m.label}</span>}
      <p className="stage-sub">Tip: press <kbd>Esc</kbd> anytime to skip</p>
    </div>
  );
}

/** Shown after a chat ends — the user taps to find someone new. */
export function Ended({ message, onNew, compact = false }) {
  const emoji = useMemo(() => pick(['🛸', '🌈', '🎈', '🚀', '🍀', '🦋']), []);
  return (
    <div className={`stage ${compact ? 'compact' : ''}`}>
      <div className="stage-emoji bounce-in" aria-hidden>{emoji}</div>
      <p className="stage-text">{message || 'Chat ended 👋'}</p>
      <button className="btn btn-primary btn-big pulse" onClick={onNew} autoFocus>
        ✨ Find someone new
      </button>
      <p className="stage-sub">or press <kbd>Esc</kbd></p>
    </div>
  );
}

export function Connecting({ label = 'Connecting…' }) {
  return (
    <div className="stage compact">
      <div className="dots-loader" aria-hidden><span /><span /><span /></div>
      <p className="stage-text">{label}</p>
    </div>
  );
}

const COLORS = ['#ff4ecd', '#7c5cff', '#00d4ff', '#ffd23f', '#3ddc97', '#ff7a45'];

/** Lightweight CSS confetti burst (no library). Re-mount with a new key to replay. */
export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: 50 + (Math.random() - 0.5) * 30,
        dx: (Math.random() - 0.5) * 520,
        dy: -(160 + Math.random() * 260),
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.12,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.6,
      })),
    []
  );
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1800);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <i
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
