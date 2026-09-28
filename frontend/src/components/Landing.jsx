import { useEffect, useState } from 'react';
import InterestInput from './InterestInput.jsx';
import { MOODS, QUICK_INTERESTS, TAGLINES } from '../copy.js';

// Safety preferences are remembered on this device (per-viewer convenience only).
function usePref(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v === '1';
    } catch { return fallback; }
  });
  const update = (v) => {
    setValue(v);
    try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* storage unavailable */ }
  };
  return [value, update];
}

function Toggle({ checked, onChange, emoji, title, desc }) {
  return (
    <label className={`safety-toggle ${checked ? 'on' : ''}`}>
      <span className="st-emoji" aria-hidden>{emoji}</span>
      <span className="st-text">
        <b>{title}</b>
        <span>{desc}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden><span className="knob" /></span>
    </label>
  );
}

export default function Landing({ onStart, initialInterests = [], initialMood = 'any' }) {
  const [interests, setInterests] = useState(initialInterests);
  const [mood, setMood] = useState(initialMood);
  const [agreed, setAgreed] = useState(false);
  const [blur, setBlur] = usePref('strangr.blur', true);
  const [textFirst, setTextFirst] = usePref('strangr.textFirst', true);
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

        <p className="field-label">Your safety, your rules 🛡️</p>
        <div className="safety-list">
          <Toggle
            checked={textFirst}
            onChange={setTextFirst}
            emoji="💬"
            title="Text first"
            desc="Video turns on only when you both agree"
          />
          <Toggle
            checked={blur}
            onChange={setBlur}
            emoji="🎭"
            title="Blur until I reveal"
            desc="Stranger's video stays blurred until you tap Reveal"
          />
        </div>
        <p className="hint">🔒 Always on: personal-info warnings, hidden links and one-tap 🚨 Leave &amp; Report.</p>

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
          <button className="btn btn-primary btn-big" disabled={!agreed} onClick={() => onStart(interests, { video: true, mood, blur, textFirst })}>
            🎥 Start video chat
          </button>
          <button className="btn btn-secondary btn-big" disabled={!agreed} onClick={() => onStart(interests, { video: false, mood, blur, textFirst })}>
            💬 Text only
          </button>
        </div>
        {!agreed && <p className="nudge">Tick the box above to unlock the fun 🔓</p>}

        <p className="fineprint links">
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
        </p>
      </div>
    </main>
  );
}
