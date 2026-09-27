import { useEffect, useState } from 'react';
import InterestInput from './InterestInput.jsx';
import { QUICK_INTERESTS, TAGLINES } from '../copy.js';

const AGREED_KEY = 'strangr.agreed';

// Remember the 18+ agreement for this browser tab's session (cleared when the tab closes).
const readAgreed = () => {
  try { return sessionStorage.getItem(AGREED_KEY) === '1'; } catch { return false; }
};
const saveAgreed = (v) => {
  try { v ? sessionStorage.setItem(AGREED_KEY, '1') : sessionStorage.removeItem(AGREED_KEY); } catch { /* storage unavailable */ }
};

export default function Landing({ onStart, initialInterests = [] }) {
  const [interests, setInterests] = useState(initialInterests);
  const [agreed, setAgreedState] = useState(readAgreed);
  const setAgreed = (v) => {
    setAgreedState(v);
    saveAgreed(v);
  };
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

        <label className="field-label" htmlFor="interest-input">
          Pick your vibes <span className="muted">(optional)</span>
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
            I'm <b>18+</b> and I'll keep it kind 💜 No nudity, hate, bullying or spam — rule-breakers get banned.
          </span>
        </label>

        <div className="start-buttons">
          <button className="btn btn-primary btn-big" disabled={!agreed} onClick={() => onStart(interests, { video: true })}>
            🎥 Start video chat
          </button>
          <button className="btn btn-secondary btn-big" disabled={!agreed} onClick={() => onStart(interests, { video: false })}>
            💬 Text only
          </button>
        </div>
        {!agreed && <p className="nudge">Tick the box above to unlock the fun 🔓</p>}

        <p className="fineprint">🔒 Chats are peer-to-peer and never recorded. Don't share personal info with strangers.</p>
      </div>
    </main>
  );
}
