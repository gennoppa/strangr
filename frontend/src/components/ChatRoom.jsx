import { useEffect, useRef, useState } from 'react';
import VideoTile from './VideoTile.jsx';
import ChatPanel from './ChatPanel.jsx';
import { Confetti, Connecting, Ended, Searching } from './Stage.jsx';
import { interestEmoji, moodInfo } from '../copy.js';

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

/** What to show while video is off: explains mutual consent and offers the button. */
function gateCopy({ myVideoOk, partnerVideoOk, partnerHasCam, hasCamera }) {
  if (myVideoOk && !partnerVideoOk) {
    return {
      emoji: '⏳', title: 'Waiting for the stranger…',
      sub: 'Video starts only when they agree too.', action: 'cancel',
    };
  }
  if (!partnerHasCam) {
    if (myVideoOk && partnerVideoOk) {
      return { emoji: '📷', title: 'Stranger has no camera', sub: 'They can see you 👀 — you can’t see them. Tap “Stop video” anytime.' };
    }
    return {
      emoji: '📷', title: 'Stranger has no camera',
      sub: hasCamera ? 'If you turn on video, they’ll see you — you won’t see them.' : 'You’re both on text. Enjoy the chat 💬',
      action: hasCamera ? 'on' : null,
    };
  }
  if (partnerVideoOk) {
    return {
      emoji: '🎥', title: 'Stranger is ready for video',
      sub: 'Only if you’re comfortable 💜 Their video stays blurred until you reveal.', action: 'on', pulse: true,
    };
  }
  return {
    emoji: '🛡️', title: 'Text first',
    sub: 'Video turns on only when you BOTH tap the button.', action: 'on',
  };
}

function VideoGate({ chat, compact = false }) {
  const g = gateCopy(chat);
  return (
    <div className={`video-gate ${compact ? 'compact' : ''}`}>
      <div className="gate-emoji" aria-hidden>{g.emoji}</div>
      <div className="gate-text">
        <b>{g.title}</b>
        <span>{g.sub}</span>
      </div>
      {g.action === 'on' && (
        <button className={`btn btn-primary ${g.pulse ? 'pulse' : ''}`} onClick={() => chat.setVideoConsent(true)}>
          🎥 Turn on video
        </button>
      )}
      {g.action === 'cancel' && (
        <button className="btn btn-ghost" onClick={() => chat.setVideoConsent(false)}>Cancel</button>
      )}
    </div>
  );
}

export default function ChatRoom({ chat, video }) {
  const [matchCount, setMatchCount] = useState(0);
  const prevStatus = useRef(null);
  const {
    status, messages, strangerTyping, commonInterests, myMood, partnerMood, localStream, remoteStream,
    micOn, camOn, connectionIssue, next, sendChat, setTyping, report, block, toggleMic, toggleCam,
    videoActive, partnerHasCam, revealed, reveal, hide, setVideoConsent, hasCamera,
  } = chat;

  // Fire confetti each time a new match starts.
  useEffect(() => {
    if (status === 'chatting' && prevStatus.current !== 'chatting') setMatchCount((n) => n + 1);
    prevStatus.current = status;
  }, [status]);

  // Esc = next stranger.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && ['chatting', 'waiting', 'ended'].includes(status)) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, status]);

  const chatting = status === 'chatting';
  const lastSystem = [...messages].reverse().find((m) => m.from === 'system' && m.kind === 'left')?.text;
  // Text-only users get the video area only once video is actually on.
  const showVideo = video || (chatting && videoActive && !!remoteStream && partnerHasCam);
  const s = STATUS[status] || { label: status, emoji: '•' };

  const stage =
    status === 'waiting' || status === 'connecting' ? <Searching compact={!showVideo} mood={myMood} />
    : status === 'ended' ? <Ended message={lastSystem} onNew={next} compact={!showVideo} />
    : null;

  // What covers the stranger's video right now.
  let remoteOverlay = null;
  if (stage) remoteOverlay = stage;
  else if (chatting && !videoActive) remoteOverlay = <VideoGate chat={chat} />;
  else if (chatting && !partnerHasCam) remoteOverlay = <VideoGate chat={chat} />;
  else if (chatting && !remoteStream) remoteOverlay = <Connecting label="Connecting video… 📡" />;

  const showRemoteVideo = chatting && videoActive && partnerHasCam && !!remoteStream;
  const blurred = showRemoteVideo && !revealed;

  // Text-only layout: a compact consent bar above the message box (unless neither side has a camera).
  const videoBar =
    !showVideo && chatting && (hasCamera || partnerHasCam) && !videoActive ? <VideoGate chat={chat} compact /> : null;

  return (
    <div className={`room ${showVideo ? 'with-video' : 'text-only'}`}>
      <header className="room-header">
        <span className="brand small">
          <span className="logo-bubble sm" aria-hidden>👋</span> Strangr
        </span>

        <div className={`status-pill ${status}`}>
          <span className="pill-dot" />
          <span className="status-label">{s.label}</span>
          {chatting && partnerMood && partnerMood !== 'any' && (
            <span className={`mood-pill mood-${partnerMood}`} title={`Stranger ${moodInfo(partnerMood).partner}`}>
              {moodInfo(partnerMood).emoji} <span className="mood-pill-text">{moodInfo(partnerMood).label}</span>
            </span>
          )}
          {chatting && commonInterests.length > 0 && (
            <span className="common">
              {commonInterests.slice(0, 3).map((i) => (
                <span key={i} className="tag small">{interestEmoji(i)} {i}</span>
              ))}
            </span>
          )}
        </div>

        <div className="room-actions">
          {chatting && videoActive && (
            <button className="btn btn-ghost" onClick={() => setVideoConsent(false)} title="Stop video for both of you">
              📴 <span className="btn-text">Stop video</span>
            </button>
          )}
          <button className="btn btn-ghost" disabled={!chatting} onClick={block} title="Never match with this stranger again">
            🚫 <span className="btn-text">Block</span>
          </button>
          <button
            className="btn btn-report"
            disabled={!chatting}
            onClick={() => report('Quick report')}
            title="Instantly leave, report and block this stranger"
          >
            🚨 <span className="btn-text">Leave & Report</span>
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
          <VideoTile
            stream={showRemoteVideo ? remoteStream : null}
            muted={!showRemoteVideo}
            className={`remote ${showRemoteVideo ? 'live' : ''} ${blurred ? 'blurred' : ''}`}
          >
            {remoteOverlay && <div className="overlay">{remoteOverlay}</div>}
            {blurred && (
              <div className="overlay reveal-overlay">
                <div className="reveal-card pop-in">
                  <span className="gate-emoji" aria-hidden>🎭</span>
                  <b>Blurred for your safety</b>
                  <span>Reveal only when you’re comfortable.</span>
                  <button className="btn btn-primary" onClick={reveal}>👀 Reveal</button>
                </div>
              </div>
            )}
            {showRemoteVideo && !blurred && (
              <button className="blur-btn" onClick={hide} title="Blur the stranger’s video again">🙈 Blur</button>
            )}
            {showRemoteVideo && <span className="stranger-badge">👤 Stranger</span>}
            {connectionIssue && <div className="banner">{connectionIssue}</div>}
            {matchCount > 0 && chatting && <Confetti key={matchCount} />}
          </VideoTile>

          {localStream && (
            <VideoTile stream={localStream} muted mirrored className="local">
              <span className={`you-badge ${chatting && videoActive ? 'sharing' : ''}`}>
                {chatting && videoActive ? '🔴 Sharing' : <>🙈 Only you<span className="hide-mobile"> see this</span></>}
              </span>
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
        myMood={myMood}
        partnerMood={partnerMood || 'any'}
        videoBar={videoBar}
        stage={showVideo ? null : stage}
        confetti={!showVideo && matchCount > 0 && chatting ? <Confetti key={matchCount} /> : null}
      />
    </div>
  );
}
