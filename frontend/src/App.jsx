import { useState } from 'react';
import Landing from './components/Landing.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import { useStrangerChat } from './hooks/useStrangerChat.js';

function Background() {
  return (
    <div className="bg" aria-hidden>
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
    </div>
  );
}

function Screen({ emoji, title, children }) {
  return (
    <main className="landing">
      <div className="landing-card center pop-in">
        <div className="stage-emoji bounce-in" aria-hidden>{emoji}</div>
        <h2 className="screen-title">{title}</h2>
        {children}
      </div>
    </main>
  );
}

export default function App() {
  const chat = useStrangerChat();
  const [video, setVideo] = useState(true);
  const [interests, setInterests] = useState([]);
  const [mood, setMood] = useState('any');

  const start = (tags, opts) => {
    setInterests(tags);
    setVideo(opts.video);
    setMood(opts.mood || 'any');
    chat.start(tags, opts);
  };

  let content;
  if (chat.status === 'banned') {
    content = (
      <Screen emoji="⛔" title="Whoa, you're on a timeout">
        <p className="muted">
          A few people reported you, so you're taking a little break.
          {chat.banUntil && <> Come back after <b>{new Date(chat.banUntil).toLocaleString()}</b>.</>}
        </p>
        <p className="muted">Keep it kind next time 💜</p>
      </Screen>
    );
  } else if (chat.status === 'disconnected') {
    content = (
      <Screen emoji="📡" title="Oops, we lost the signal">
        <p className="muted">Looks like your connection dropped. Let's get you back in!</p>
        <button className="btn btn-primary btn-big" onClick={() => chat.start(interests, { video, mood })}>
          🔄 Reconnect
        </button>
      </Screen>
    );
  } else if (chat.status === 'idle') {
    content = <Landing onStart={start} initialInterests={interests} initialMood={mood} />;
  } else {
    content = <ChatRoom chat={chat} video={video} />;
  }

  return (
    <>
      <Background />
      {content}
    </>
  );
}
