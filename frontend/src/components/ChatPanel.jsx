import { useEffect, useRef, useState } from 'react';
import { pickIcebreakers } from '../copy.js';

const EMOJIS = ['😂', '😍', '🔥', '👋', '😎', '🥹', '💀', '🙌', '✨', '🤝', '😭', '👀'];

export default function ChatPanel({ messages, status, strangerTyping, onSend, onTyping, onNext, stage, confetti }) {
  const [draft, setDraft] = useState('');
  const [icebreakers, setIcebreakers] = useState(() => pickIcebreakers());
  const [emojiOpen, setEmojiOpen] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const canChat = status === 'chatting';
  const hasConversation = messages.some((m) => m.from !== 'system');

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, strangerTyping]);

  useEffect(() => {
    if (canChat) {
      inputRef.current?.focus();
      setIcebreakers(pickIcebreakers());
    } else {
      setEmojiOpen(false);
      setDraft('');
      clearTimeout(typingTimer.current);
      isTyping.current = false;
    }
  }, [canChat]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      onTyping(false);
    }
  };

  const onChange = (e) => {
    setDraft(e.target.value);
    if (!canChat) return;
    if (!isTyping.current) {
      isTyping.current = true;
      onTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  const submit = (e) => {
    e.preventDefault();
    if (onSend(draft)) {
      setDraft('');
      setEmojiOpen(false);
      stopTyping();
    }
  };

  const addEmoji = (emo) => {
    setDraft((d) => d + emo);
    inputRef.current?.focus();
  };

  const nextBtn =
    status === 'chatting' ? { label: 'Next', emoji: '⏭️', cls: '' }
    : status === 'ended' ? { label: 'New', emoji: '✨', cls: 'glow' }
    : { label: 'Skip', emoji: '⏭️', cls: '' };

  return (
    <section className="chat-panel">
      <div className="chat-log" ref={logRef} aria-live="polite">
        {confetti}
        {messages.map((m) =>
          m.from === 'system' ? (
            <div key={m.id} className={`sys-msg ${m.kind || ''}`}>{m.text}</div>
          ) : (
            <div key={m.id} className={`bubble-row ${m.from}`}>
              <div className={`bubble ${m.from}`}>{m.text}</div>
            </div>
          )
        )}

        {stage && <div className="stage-inline">{stage}</div>}

        {canChat && !hasConversation && (
          <div className="icebreakers">
            <p className="icebreakers-title">🧊 Need an icebreaker? Tap one:</p>
            {icebreakers.map((q) => (
              <button key={q} className="icebreaker" onClick={() => onSend(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        {strangerTyping && (
          <div className="bubble-row stranger">
            <div className="bubble stranger typing-bubble" aria-label="Stranger is typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={submit}>
        <button type="button" className={`btn btn-next ${nextBtn.cls}`} onClick={onNext} title="Shortcut: Esc">
          <span aria-hidden>{nextBtn.emoji}</span> {nextBtn.label}
        </button>

        <div className="input-wrap">
          <input
            ref={inputRef}
            value={draft}
            onChange={onChange}
            maxLength={1000}
            disabled={!canChat}
            placeholder={canChat ? 'Say something fun… 💬' : status === 'ended' ? 'Chat ended — find someone new ✨' : 'Waiting for a stranger… ⏳'}
            aria-label="Message"
          />
          <button
            type="button"
            className="emoji-toggle"
            disabled={!canChat}
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Emoji"
          >
            😊
          </button>
          {emojiOpen && (
            <div className="emoji-pop pop-in">
              {EMOJIS.map((e) => (
                <button type="button" key={e} onClick={() => addEmoji(e)}>{e}</button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-send" disabled={!canChat || !draft.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg>
        </button>
      </form>
    </section>
  );
}
