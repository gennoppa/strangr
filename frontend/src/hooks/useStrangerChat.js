import { useCallback, useEffect, useRef, useState } from 'react';
import { BLOCKED, MATCHED, NO_CAMERA, PARTNER_LEFT, REPORTED, VIDEO_FAILED, commonLine, moodMatchLines, pick } from '../copy.js';

/**
 * Owns the signaling WebSocket, the WebRTC peer connection and the chat state.
 *
 * status: 'idle' | 'connecting' | 'waiting' | 'chatting' | 'ended' | 'disconnected' | 'banned'
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

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceServersRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const signalQueueRef = useRef(Promise.resolve());
  const pingTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);

  const push = useCallback((from, text, kind) => {
    setMessages((m) => [...m, { id: ++msgSeq, from, text, kind }]);
  }, []);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

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
    setRemoteStream(null);
    setStrangerTyping(false);
  }, []);

  const addLocalTracks = (pc) => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      return true;
    }
    return false;
  };

  const createPeer = useCallback(
    async (initiator) => {
      closePeer();
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
        if (pc.connectionState === 'failed') {
          setConnectionIssue(VIDEO_FAILED);
        } else if (pc.connectionState === 'connected') {
          setConnectionIssue(null);
        }
      };

      if (initiator) {
        if (!addLocalTracks(pc)) {
          // Text-only user: still receive the stranger's audio/video.
          pc.addTransceiver('audio', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
        }
        const offer = await pc.createOffer();
        if (pcRef.current !== pc) return;
        await pc.setLocalDescription(offer);
        send({ type: 'signal', data: { sdp: pc.localDescription } });
      }
    },
    [closePeer, send]
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
          setMessages([]);
          setCommonInterests(msg.commonInterests || []);
          setConnectionIssue(null);
          push('system', pick(MATCHED), 'match');
          if (msg.commonInterests?.length) push('system', commonLine(msg.commonInterests), 'common');
          setPartnerMood(msg.partnerMood || 'any');
          moodMatchLines(msg.myMood, msg.partnerMood, msg.perfectMood).forEach((line) =>
            push('system', line, msg.perfectMood ? 'mood perfect' : 'mood')
          );
          setStatus('chatting');
          signalQueueRef.current = signalQueueRef.current.then(() => createPeer(msg.initiator)).catch(console.warn);
          break;
        }
        case 'signal':
          signalQueueRef.current = signalQueueRef.current.then(() => handleSignal(msg.data));
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
    [closePeer, createPeer, handleSignal, push]
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
    async (interests, { video, mood = 'any' }) => {
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
        if (err.message !== 'banned') {
          setStatus('disconnected');
        }
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
    localStreamRef.current = null;
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

  const setTyping = useCallback((typing) => send({ type: 'typing', typing }), [send]);
  const report = useCallback((reason) => send({ type: 'report', reason }), [send]);
  const block = useCallback(() => send({ type: 'block' }), [send]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  // Clean up everything on unmount.
  useEffect(
    () => () => {
      intentionalCloseRef.current = true;
      clearInterval(pingTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  return {
    status, messages, strangerTyping, commonInterests, myMood, partnerMood, localStream, remoteStream,
    micOn, camOn, banUntil, connectionIssue,
    start, next, leave, sendChat, setTyping, report, block, toggleMic, toggleCam,
  };
}
