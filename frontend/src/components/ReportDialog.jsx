import { useState } from 'react';

const REASONS = [
  { emoji: '🔞', label: 'Nudity or sexual content' },
  { emoji: '😠', label: 'Harassment or bullying' },
  { emoji: '🤬', label: 'Hate speech' },
  { emoji: '🧒', label: 'Seems under 18' },
  { emoji: '🤖', label: 'Spam, bot or scam' },
  { emoji: '🤔', label: 'Something else' },
];

export default function ReportDialog({ onSubmit, onCancel }) {
  const [reason, setReason] = useState(REASONS[0].label);

  return (
    <div className="modal-backdrop fade-in" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={onCancel}>
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-emoji" aria-hidden>🛡️</div>
        <h2 id="report-title">What went wrong?</h2>
        <p className="muted">We'll end the chat and you'll never see them again. You're doing the right thing 💜</p>
        <div className="reason-list">
          {REASONS.map(({ emoji, label }) => (
            <label key={label} className={`reason ${reason === label ? 'selected' : ''}`}>
              <input type="radio" name="reason" value={label} checked={reason === label} onChange={() => setReason(label)} />
              <span aria-hidden>{emoji}</span> {label}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Never mind</button>
          <button className="btn btn-danger" onClick={() => onSubmit(reason)}>🚩 Report & block</button>
        </div>
      </div>
    </div>
  );
}
