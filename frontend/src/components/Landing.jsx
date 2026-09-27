import { useEffect, useState } from 'react';
import InterestInput from './InterestInput.jsx';
import { MOODS, QUICK_INTERESTS, TAGLINES } from '../copy.js';

export default function Landing({ onStart, initialInterests = [], initialMood = 'any' }) {
  const [interests, setInterests] = useState(initialInterests);
  const [mood, setMood] = useState(initialMood);
  const [agreed, setAgreed] = useState(false);
  const [tagline, setTagline] = useState(0);

  // Rotate the tagline every few seconds.
  useEffect(() => {
    const t = setInterval(() => setTagline((i) => (i + 1) % TAGLINES.length), 3200);
    return () => clearInterval(t);
  }, []);

  const toggle = (label) =>
    setInterests((cur) =>
      cur.includes(label) ? cur.filter((t) => t !== label) : cur.length < 10 ? [...cur, label] : cur
    );

  return (
    <main className="landing">
      <div className="landing-card pop-in">
        <div className="logo-row">
          <span className="logo-bubble" aria-hidden>👋</span>
          <h1 className="brand">Strangr</h1>
        </div>

        <h2 className="hero">
          Talk to <span className="gradient-text">anyone</span>.<br />
          Make it <span className="gradient-text alt">fun</span>.
        </h2>
        <p key={tagline} className="tagline fade-swap">{TAGLINES[tagline]}</p>

        <p className="field-label" id="mood-label">How are you feeling rn?</p>
        <div className="mood-grid" role="radiogroup" aria-labelledby="mood-label">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={mood === m.key}
              className={`mood-card ${mood === m.key ? 'on' : ''} mood-${m.key}`}
              onClick={() => setMood(m.key)}
            >
              <span className="mood-emoji" aria-hidden>{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
              <span className="mood-desc">{m.desc}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          {mood === 'vent' ? 'We’ll match you with someone who picked 👂 Here to listen 💜'
            : mood === 'listen' ? 'We’ll match you with someone who needs a kind ear 🫂'
            : mood === 'any' ? 'No pressure — you’ll meet any vibe 🌈'
            : 'We’ll find someone whose mood matches yours ✨'}
        </p>

        <label className="field-label" htmlFor="interest-input">
          Pick your interests <span className="muted">(optional)</span>
        </label>
        <div className="chip-grid">
          {QUICK_INTERESTS.map(({ emoji, label }) => (
            <button
              key={label}
              type="button"
              className={`chip ${interests.includes(label) ? 'on' : ''}`}
              onClick={() => toggle(label)}
              aria-pressed={interests.includes(label)}
            >
              <span aria-hidden>{emoji}</span> {label}
            </button>
          ))}
        </div>
        <InterestInput value={interests} onChange={setInterests} />
        <p className="hint">We'll find someone who shares your vibe first, then anyone awesome 🌈</p>

        <label className={`agree ${agreed ? 'checked' : ''}`}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span className="check" aria-hidden>{agreed ? '✓' : ''}</span>
          <span>
            I'm <b>18+</b>, I'll keep it kind 💜 and I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Terms</a> &{' '}
            <a href="/privacy" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
            No nudity, hate, bullying or spam — rule-breakers get banned.
          </span>
        </label>

        <div className="start-buttons">
          <button className="btn btn-primary btn-big" disabled={!agreed} onClick={() => onStart(interests, { video: true, mood })}>
            🎥 Start video chat
          </button>
          <button className="btn btn-secondary btn-big" disabled={!agreed} onClick={() => onStart(interests, { video: false, mood })}>
            💬 Text only
          </button>
        </div>
        {!agreed && <p className="nudge">Tick the box above to unlock the fun 🔓</p>}

        <p className="fineprint">🔒 Chats are peer-to-peer and never recorded. Don't share personal info with strangers.</p>
        <p className="fineprint links">
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
        </p>
      </div>
    </main>
  );
}
