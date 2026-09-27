import { useState } from 'react';
import { QUICK_INTERESTS, interestEmoji } from '../copy.js';

const MAX = 10;
const QUICK = new Set(QUICK_INTERESTS.map((i) => i.label));

/** Tag-style input for custom interests: type and press Enter or comma. Quick-pick chips are shown separately. */
export default function InterestInput({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const custom = value.filter((t) => !QUICK.has(t));

  const add = (raw) => {
    const tag = raw.trim().toLowerCase().slice(0, 30);
    if (!tag || value.includes(tag) || value.length >= MAX) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && custom.length) {
      const last = custom[custom.length - 1];
      onChange(value.filter((t) => t !== last));
    }
  };

  return (
    <div className="interest-input" onClick={() => document.getElementById('interest-input')?.focus()}>
      {custom.map((tag) => (
        <span key={tag} className="tag pop-in">
          {interestEmoji(tag)} {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((t) => t !== tag));
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id="interest-input"
        value={draft}
        placeholder={custom.length ? '' : '✍️ Add your own… (press Enter)'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          add(draft);
          setDraft('');
        }}
        disabled={value.length >= MAX}
      />
    </div>
  );
}
