import { useEffect, useRef } from 'react';
import { wsUrl } from '../lib/api.js';
import { useStore } from '../lib/store.js';

const BACKOFFS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useWebSocket({ sessionId, token, enabled, onInit, onTerminated }) {
  const wsRef = useRef(null);
  const closedRef = useRef(false);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const setConnection = useStore((s) => s.setConnection);
  const appendMessage = useStore((s) => s.appendMessage);
  const setMessages = useStore((s) => s.setMessages);
  const setParticipants = useStore((s) => s.setParticipants);
  const setPhotos = useStore((s) => s.setPhotos);
  const addPhoto = useStore((s) => s.addPhoto);
  const removePhoto = useStore((s) => s.removePhoto);
  const setSession = useStore((s) => s.setSession);

  useEffect(() => {
    if (!enabled || !sessionId || !token) return undefined;
    closedRef.current = false;
    // Defer the first connection by a tick. In React 18 StrictMode the effect
    // mounts → unmounts → re-mounts immediately; a deferred connect lets the
    // cleanup cancel the socket before it's ever constructed, avoiding the
    // noisy "WebSocket closed before connection established" browser warning.
    let openTimer = setTimeout(connect, 0);

    function connect() {
      if (closedRef.current) return;
      setConnection({ status: 'connecting', reconnectAttempt: attemptRef.current });
      const ws = new WebSocket(wsUrl(sessionId, token));
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setConnection({ status: 'connected', reconnectAttempt: 0 });
      };

      ws.onmessage = (ev) => {
        let data;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }
        const t = data.type;
        if (t === 'init') {
          setParticipants(data.participants || []);
          if (data.messages) setMessages(data.messages);
          if (data.photos) setPhotos(data.photos);
          onInit?.(data);
        } else if (t === 'message') {
          appendMessage({
            nickname: data.nickname,
            text: data.text,
            timestamp: data.timestamp,
          });
        } else if (t === 'participant_joined') {
          setParticipants(data.participants || []);
          appendMessage({
            system: true,
            text: `${data.nickname} joined`,
            timestamp: Math.floor(Date.now() / 1000),
          });
        } else if (t === 'participant_left') {
          setParticipants(data.participants || []);
          appendMessage({
            system: true,
            text: `${data.nickname} left`,
            timestamp: Math.floor(Date.now() / 1000),
          });
        } else if (t === 'photo_added') {
          if (data.photo) addPhoto(data.photo);
        } else if (t === 'photo_removed') {
          if (data.photo_id) removePhoto(data.photo_id);
        } else if (t === 'session_extended') {
          setSession({ expiresAt: data.expires_at });
        } else if (t === 'session_terminated') {
          onTerminated?.(data);
        } else if (t === 'ping') {
          try {
            ws.send(JSON.stringify({ type: 'pong' }));
          } catch {
            // swallow
          }
        }
      };

      ws.onclose = (ev) => {
        wsRef.current = null;
        if (closedRef.current) return;
        if (ev.code === 4001 || ev.code === 4004) {
          setConnection({ status: 'disconnected' });
          return;
        }
        setConnection({ status: 'disconnected', reconnectAttempt: attemptRef.current + 1 });
        const delay = BACKOFFS[Math.min(attemptRef.current, BACKOFFS.length - 1)];
        attemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      };
    }

    return () => {
      closedRef.current = true;
      clearTimeout(openTimer);
      clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      wsRef.current = null;
      setConnection({ status: 'disconnected', reconnectAttempt: 0 });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token, enabled]);

  function sendMessage(text) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: 'message', text }));
    return true;
  }

  return { sendMessage };
}
