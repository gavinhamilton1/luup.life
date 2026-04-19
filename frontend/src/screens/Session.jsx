import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadSession, deleteSession } from '../lib/db.js';
import { getSession } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { ChatSession } from './ChatSession.jsx';
import { PhotoSession } from './PhotoSession.jsx';
import { EdgeScreen } from './Edge.jsx';

export function SessionView() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [endedReason, setEndedReason] = useState(null);
  const session = useStore((s) => s.session);
  const setSession = useStore((s) => s.setSession);
  const resetSession = useStore((s) => s.resetSession);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession(sessionId);
      if (!stored || !stored.token) {
        nav(`/j/${sessionId}`, { replace: true });
        return;
      }
      try {
        const info = await getSession(sessionId, stored.token);
        if (cancelled) return;
        setSession({
          id: sessionId,
          type: info.type,
          token: stored.token,
          nickname: stored.nickname,
          isCreator: info.is_creator,
          expiresAt: info.expires_at,
          status: info.status,
        });
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        if (e.status === 404 || e.status === 410) {
          await deleteSession(sessionId);
          setPhase('gone');
        } else if (e.status === 401) {
          await deleteSession(sessionId);
          nav(`/j/${sessionId}`, { replace: true });
        } else {
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      resetSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (phase === 'loading') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
        }}
      >
        Loading…
      </div>
    );
  }
  if (phase === 'gone') {
    return (
      <EdgeScreen
        tone="neutral"
        icon="clock"
        title="That's a wrap — the luup is done."
        body="This session has expired or was ended. Photos you saved locally are still yours."
        primary="Back home"
        onPrimary={() => nav('/')}
      />
    );
  }
  if (phase === 'error') {
    return (
      <EdgeScreen
        tone="danger"
        icon="alert"
        title="Couldn't load the luup."
        body="Check your connection and try again."
        primary="Back home"
        onPrimary={() => nav('/')}
      />
    );
  }

  if (session.type === 'chat') return <ChatSession onEnded={(reason) => setEndedReason(reason)} endedReason={endedReason} />;
  if (session.type === 'photo') return <PhotoSession onEnded={(reason) => setEndedReason(reason)} endedReason={endedReason} />;
  return null;
}
