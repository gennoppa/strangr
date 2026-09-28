import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BLOCKED, MATCHED, NO_CAMERA, PARTNER_LEFT, REPORTED, VIDEO_FAILED, SAFETY,
  commonLine, moodMatchLines, pick,
} from '../copy.js';

/**
 * Owns the signaling WebSocket, the WebRTC peer connection and the chat state.
 *
 * status: 'idle' | 'connecting' | 'waiting' | 'chatting' | 'ended' | 'disconnected' | 'banned'
 *
 * Safety model
 * ------------
 * • Mutual video consent ("text first"): each side sends {consent:{video}} over the signaling relay.
 *   Video+audio flow only while BOTH have consented. Enforced on both ends:
 *     – sender: the tracks we transmit are clones whose `enabled` flag stays false until both agree
 *       (disabled tracks send black frames / silence);
 *     – receiver: the stranger's video is hidden and muted until both agree.
 * • Blur-to-reveal: the stranger's video is blurred locally until you tap Reveal.
 */

const DEFAULT_ICE = [{ urls: ['stun:stun.l.google.com:19302'] }];
let msgSeq = 0;

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

export function useStrangerChat() {
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [commonInterests, setCommonInterests] = useState([]);
  const [myMood, setMyMood] = useState('any');
  const [partnerMood, setPartnerMood] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [banUntil, setBanUntil] = useState(null);
  const [connectionIssue, setConnectionIssue] = useState(null);

  // Safety state
  const [myVideoOk, setMyVideoOk] = useState(false);
  const [partnerVideoOk, setPartnerVideoOk] = useState(false);
  const [partnerHasCam, setPartnerHasCam] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const videoActive = myVideoOk && partnerVideoOk;

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null); // for your own preview
  const sendStreamRef = useRef(null); // cloned tracks actually sent to the stranger
  const iceServersRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const signalQueueRef = useRef(Promise.resolve());
  const pingTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const settingsRef = useRef({ blur: true, textFirst: true });
  const consentRef = useRef({ mine: false, partner: false, myAuto: false });
  const togglesRef = useRef({ mic: true, cam: true });

  const push = useCallback((from, text, kind) => {
    setMessages((m) => [...m, { id: ++msgSeq, from, text, kind }]);
  }, []);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  // ------------------------------------------------------------ media gating

  /** Enable the transmitted tracks only while both sides consent (and the user hasn't muted). */
  const applySendTracks = useCallback(() => {
    const stream = sendStreamRef.current;
    if (!stream) return;
    const active = consentRef.current.mine && consentRef.current.partner;
    stream.getVideoTracks().forEach((t) => { t.enabled = active && togglesRef.current.cam; });
    stream.getAudioTracks().forEach((t) => { t.enabled = active && togglesRef.current.mic; });
  }, []);

  const setConsent = useCallback((patch) => {
    consentRef.current = { ...consentRef.current, ...patch };
    if ('mine' in patch) setMyVideoOk(patch.mine);
    if ('partner' in patch) setPartnerVideoOk(patch.partner);
    applySendTracks();
  }, [applySendTracks]);

  const sendConsent = useCallback((ok, auto = false) => {
    send({ type: 'signal', data: { consent: { video: ok, cam: !!sendStreamRef.current, auto } } });
  }, [send]);

  // ------------------------------------------------------------ WebRTC

  const closePeer = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    // Never leave video/audio flowing between chats.
    consentRef.current = { mine: false, partner: false, myAuto: false };
    setMyVideoOk(false);
    setPartnerVideoOk(false);
    applySendTracks();
    setRemoteStream(null);
    setStrangerTyping(false);
  }, [applySendTracks]);

  const addLocalTracks = (pc) => {
    const stream = sendStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      return true;
    }
    return false;
  };

  const createPeer = useCallback(
    async (initiator) => {
      const prev = pcRef.current;
      if (prev) prev.close();
      pendingCandidatesRef.current = [];
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current || DEFAULT_ICE });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'signal', data: { candidate: e.candidate.toJSON() } });
      };
      pc.ontrack = (e) => {
        if (pcRef.current !== pc) return;
        setRemoteStream(e.streams[0] || new MediaStream([e.track]));
      };
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        if (pc.connectionState === 'failed') setConnectionIssue(VIDEO_FAILED);
        else if (pc.connectionState === 'connected') setConnectionIssue(null);
      };

      if (initiator) {
        if (!addLocalTracks(pc)) {
          // Text-only user: can still receive the stranger's audio/video (once both consent).
          pc.addTransceiver('audio', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
        }
        const offer = await pc.createOffer();
        if (pcRef.current !== pc) return;
        await pc.setLocalDescription(offer);
        send({ type: 'signal', data: { sdp: pc.localDescription } });
      }
    },
    [send]
  );

  const handleSignal = useCallback(
    async (data) => {
      const pc = pcRef.current;
      if (!pc || !data) return;
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(data.sdp);
          if (pcRef.current !== pc) return;
          if (data.sdp.type === 'offer') {
            addLocalTracks(pc); // reuses the transceivers created by the offer
            const answer = await pc.createAnswer();
            if (pcRef.current !== pc) return;
            await pc.setLocalDescription(answer);
            send({ type: 'signal', data: { sdp: pc.localDescription } });
          }
          const pending = pendingCandidatesRef.current;
          pendingCandidatesRef.current = [];
          for (const c of pending) await pc.addIceCandidate(c).catch(() => {});
        } else if (data.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
          else pendingCandidatesRef.current.push(data.candidate);
        }
      } catch (err) {
        console.warn('Signaling error', err);
      }
    },
    [send]
  );

  /** Stranger changed their video consent. */
  const handleConsent = useCallback(
    (c) => {
      const was = consentRef.current.partner;
      const now = !!c.video;
      setPartnerHasCam(c.cam !== false);
      setConsent({ partner: now });
      if (now && !was) {
        if (consentRef.current.mine) {
          if (!(c.auto && consentRef.current.myAuto)) push('system', SAFETY.bothOn, 'safe');
        } else {
          push('system', SAFETY.partnerReady, 'safe');
        }
      } else if (!now && was) {
        push('system', SAFETY.partnerOff, 'safe');
      }
    },
    [push, setConsent]
  );

  // ------------------------------------------------------------ WebSocket

  const handleServerMessage = useCallback(
    (msg) => {
      switch (msg.type) {
        case 'waiting':
          closePeer();
          setStatus('waiting');
          setCommonInterests([]);
          setPartnerMood(null);
          setConnectionIssue(null);
          break;
        case 'matched': {
          closePeer(); // resets consent → media stays off until both agree
          setMessages([]);
          setCommonInterests(msg.commonInterests || []);
          setConnectionIssue(null);
          push('system', pick(MATCHED), 'match');
          if (msg.commonInterests?.length) push('system', commonLine(msg.commonInterests), 'common');
          setPartnerMood(msg.partnerMood || 'any');
          moodMatchLines(msg.myMood, msg.partnerMood, msg.perfectMood).forEach((line) =>
            push('system', line, msg.perfectMood ? 'mood perfect' : 'mood')
          );

          // Safety defaults for this chat.
          const { blur, textFirst } = settingsRef.current;
          setRevealed(!blur);
          setPartnerHasCam(true);
          const autoOk = !textFirst;
          consentRef.current.myAuto = autoOk;
          setConsent({ mine: autoOk, partner: false });
          sendConsent(autoOk, autoOk);
          if (textFirst) push('system', SAFETY.textFirst, 'safe');

          setStatus('chatting');
          signalQueueRef.current = signalQueueRef.current.then(() => createPeer(msg.initiator)).catch(console.warn);
          break;
        }
        case 'signal':
          if (msg.data?.consent) handleConsent(msg.data.consent);
          else signalQueueRef.current = signalQueueRef.current.then(() => handleSignal(msg.data));
          break;
        case 'chat':
          setStrangerTyping(false);
          push('stranger', msg.text);
          break;
        case 'typing':
          setStrangerTyping(!!msg.typing);
          break;
        case 'partner_left':
          closePeer();
          push('system', pick(PARTNER_LEFT), 'left');
          setStatus('ended');
          break;
        case 'blocked':
          closePeer();
          push('system', BLOCKED, 'left');
          setStatus('ended');
          break;
        case 'reported':
          closePeer();
          push('system', REPORTED, 'left');
          setStatus('ended');
          break;
        case 'stopped':
          closePeer();
          setStatus('idle');
          break;
        case 'banned':
          closePeer();
          setBanUntil(msg.until);
          setStatus('banned');
          intentionalCloseRef.current = true;
          break;
        default:
          break;
      }
    },
    [closePeer, createPeer, handleConsent, handleSignal, push, sendConsent, setConsent]
  );

  const connect = useCallback(() => {
    return new Promise((resolve, reject) => {
      const existing = wsRef.current;
      if (existing && existing.readyState === WebSocket.OPEN) return resolve();

      intentionalCloseRef.current = false;
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      let greeted = false;

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === 'hello') {
          greeted = true;
          resolve();
          return;
        }
        if (msg.type === 'banned' && !greeted) {
          handleServerMessage(msg);
          reject(new Error('banned'));
          return;
        }
        handleServerMessage(msg);
      };
      ws.onclose = () => {
        clearInterval(pingTimerRef.current);
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        closePeer();
        if (!greeted) reject(new Error('Could not reach the server'));
        if (!intentionalCloseRef.current) setStatus((s) => (s === 'banned' ? s : 'disconnected'));
      };
      ws.onerror = () => { /* onclose follows */ };

      clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => send({ type: 'ping' }), 25_000);
    });
  }, [closePeer, handleServerMessage, send]);

  // ------------------------------------------------------------ public actions

  const start = useCallback(
    async (interests, { video, mood = 'any', blur = true, textFirst = true }) => {
      settingsRef.current = { blur, textFirst };
      setStatus('connecting');
      setMyMood(mood);
      setMessages([]);
      setConnectionIssue(null);

      if (video && !localStreamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          localStreamRef.current = stream;
          // Separate copies for sending, so gating them never blanks your own preview.
          const sendStream = new MediaStream(stream.getTracks().map((t) => t.clone()));
          sendStream.getTracks().forEach((t) => { t.enabled = false; });
          sendStreamRef.current = sendStream;
          togglesRef.current = { mic: true, cam: true };
          setLocalStream(stream);
          setMicOn(true);
          setCamOn(true);
        } catch (err) {
          console.warn('getUserMedia failed', err);
          push('system', NO_CAMERA, 'info');
        }
      }

      if (!iceServersRef.current) {
        try {
          const res = await fetch('/api/config');
          if (res.ok) iceServersRef.current = (await res.json()).iceServers;
        } catch { /* fall back to defaults */ }
      }

      try {
        await connect();
        send({ type: 'join', interests, mood });
      } catch (err) {
        if (err.message !== 'banned') setStatus('disconnected');
      }
    },
    [connect, push, send]
  );

  const next = useCallback(() => {
    closePeer();
    setMessages([]);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'next' });
      setStatus('waiting');
    } else {
      setStatus('disconnected');
    }
  }, [closePeer, send]);

  const leave = useCallback(() => {
    send({ type: 'stop' });
    closePeer();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    sendStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    sendStreamRef.current = null;
    setLocalStream(null);
    setMessages([]);
    setStatus('idle');
  }, [closePeer, send]);

  const sendChat = useCallback(
    (text) => {
      const t = text.trim();
      if (!t || status !== 'chatting') return false;
      send({ type: 'chat', text: t.slice(0, 1000) });
      push('me', t.slice(0, 1000));
      return true;
    },
    [push, send, status]
  );

  /** Turn your video consent on/off for the current chat. */
  const setVideoConsent = useCallback(
    (ok) => {
      if (status !== 'chatting' || consentRef.current.mine === ok) return;
      consentRef.current.myAuto = false;
      setConsent({ mine: ok });
      sendConsent(ok);
      if (!ok) push('system', SAFETY.youOff, 'safe');
      else if (consentRef.current.partner) push('system', SAFETY.bothOn, 'safe');
      else push('system', SAFETY.youWaiting, 'safe');
    },
    [push, sendConsent, setConsent, status]
  );

  const setTyping = useCallback((typing) => send({ type: 'typing', typing }), [send]);
  const report = useCallback((reason) => send({ type: 'report', reason }), [send]);
  const block = useCallback(() => send({ type: 'block' }), [send]);

  const toggleMic = useCallback(() => {
    if (!sendStreamRef.current) return;
    togglesRef.current.mic = !togglesRef.current.mic;
    setMicOn(togglesRef.current.mic);
    applySendTracks();
  }, [applySendTracks]);

  const toggleCam = useCallback(() => {
    if (!sendStreamRef.current) return;
    togglesRef.current.cam = !togglesRef.current.cam;
    setCamOn(togglesRef.current.cam);
    applySendTracks();
  }, [applySendTracks]);

  // Clean up everything on unmount.
  useEffect(
    () => () => {
      intentionalCloseRef.current = true;
      clearInterval(pingTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      sendStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  return {
    status, messages, strangerTyping, commonInterests, myMood, partnerMood, localStream, remoteStream,
    micOn, camOn, banUntil, connectionIssue,
    // safety
    myVideoOk, partnerVideoOk, videoActive, partnerHasCam, revealed, hasCamera: !!localStream,
    reveal: () => setRevealed(true), hide: () => setRevealed(false), setVideoConsent,
    start, next, leave, sendChat, setTyping, report, block, toggleMic, toggleCam,
  };
}
