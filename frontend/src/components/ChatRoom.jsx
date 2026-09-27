import { useEffect, useRef, useState } from 'react';
import VideoTile from './VideoTile.jsx';
import ChatPanel from './ChatPanel.jsx';
import ReportDialog from './ReportDialog.jsx';
import { Confetti, Connecting, Ended, Searching } from './Stage.jsx';
import { interestEmoji } from '../copy.js';

const Icon = {
  mic: (on) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      {!on && <path d="M4 4l16 16" />}
    </svg>
  ),
  cam: (on) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
      {!on && <path d="M3 3l18 18" />}
    </svg>
  ),
};

const STATUS = {
  chatting: { label: 'Live', emoji: '🟢' },
  waiting: { label: 'Searching', emoji: '🔎' },
  connecting: { label: 'Connecting', emoji: '⚡' },
  ended: { label: 'Chat ended', emoji: '💤' },
};

export default function ChatRoom({ chat, video }) {
  const [reporting, setReporting] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const prevStatus = useRef(null);
  const {
    status, messages, strangerTyping, commonInterests, localStream, remoteStream,
    micOn, camOn, connectionIssue, next, sendChat, setTyping, report, block, toggleMic, toggleCam,
  } = chat;

  // Fire confetti each time a new match starts.
  useEffect(() => {
    if (status === 'chatting' && prevStatus.current !== 'chatting') setMatchCount((n) => n + 1);
    prevStatus.current = status;
  }, [status]);

  // Esc = next stranger; closes the report dialog first if open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (reporting) setReporting(false);
      else if (['chatting', 'waiting', 'ended'].includes(status)) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, reporting, status]);

  const lastSystem = [...messages].reverse().find((m) => m.from === 'system' && m.kind === 'left')?.text;
  const showVideo = video || remoteStream;
  const s = STATUS[status] || { label: status, emoji: '•' };

  const stage =
    status === 'waiting' || status === 'connecting' ? <Searching compact={!showVideo} />
    : status === 'ended' ? <Ended message={lastSystem} onNew={next} compact={!showVideo} />
    : null;

  return (
    <div className={`room ${showVideo ? 'with-video' : 'text-only'}`}>
      <header className="room-header">
        <span className="brand small">
          <span className="logo-bubble sm" aria-hidden>👋</span> Strangr
        </span>

        <div className={`status-pill ${status}`}>
          <span className="pill-dot" />
          <span className="status-label">{s.label}</span>
          {status === 'chatting' && commonInterests.length > 0 && (
            <span className="common">
              {commonInterests.slice(0, 3).map((i) => (
                <span key={i} className="tag small">{interestEmoji(i)} {i}</span>
              ))}
            </span>
          )}
        </div>

        <div className="room-actions">
          <button className="btn btn-ghost" disabled={status !== 'chatting'} onClick={block} title="Never match with this stranger again">
            🚫 <span className="btn-text">Block</span>
          </button>
          <button className="btn btn-ghost danger" disabled={status !== 'chatting'} onClick={() => setReporting(true)} title="Report">
            🚩 <span className="btn-text">Report</span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={next}
            disabled={!['chatting', 'waiting', 'ended'].includes(status)}
            title="Leave this stranger and meet someone new"
          >
            🚪 <span className="btn-text">Leave</span>
          </button>
        </div>
      </header>

      {showVideo && (
        <section className="videos">
          <VideoTile stream={remoteStream} className={`remote ${status === 'chatting' && remoteStream ? 'live' : ''}`}>
            {stage && <div className="overlay">{stage}</div>}
            {status === 'chatting' && !remoteStream && (
              <div className="overlay"><Connecting label="Connecting video… 📡" /></div>
            )}
            {status === 'chatting' && remoteStream && <span className="stranger-badge">👤 Stranger</span>}
            {connectionIssue && <div className="banner">{connectionIssue}</div>}
            {matchCount > 0 && status === 'chatting' && <Confetti key={matchCount} />}
          </VideoTile>

          {localStream && (
            <VideoTile stream={localStream} muted mirrored className="local">
              <span className="you-badge">You</span>
              <div className="media-controls">
                <button className={`round ${micOn ? '' : 'off'}`} onClick={toggleMic} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}>
                  {Icon.mic(micOn)}
                </button>
                <button className={`round ${camOn ? '' : 'off'}`} onClick={toggleCam} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}>
                  {Icon.cam(camOn)}
                </button>
              </div>
            </VideoTile>
          )}
        </section>
      )}

      <ChatPanel
        messages={messages}
        status={status}
        strangerTyping={strangerTyping}
        onSend={sendChat}
        onTyping={setTyping}
        onNext={next}
        stage={showVideo ? null : stage}
        confetti={!showVideo && matchCount > 0 && status === 'chatting' ? <Confetti key={matchCount} /> : null}
      />

      {reporting && (
        <ReportDialog
          onCancel={() => setReporting(false)}
          onSubmit={(reason) => {
            report(reason);
            setReporting(false);
          }}
        />
      )}
    </div>
  );
}
