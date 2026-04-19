import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionPublic, joinSession } from '../lib/api.js';
import { saveSession, loadSession } from '../lib/db.js';
import { NicknameStep } from './Nickname.jsx';
import { EdgeScreen } from './Edge.jsx';

export function JoinFlow() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [sessionPublic, setSessionPublic] = useState(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If we already have a token for this session, jump straight in.
      const existing = await loadSession(sessionId);
      if (existing && existing.token) {
        nav(`/s/${sessionId}`, { replace: true });
        return;
      }
      try {
        const data = await getSessionPublic(sessionId);
        if (cancelled) return;
        if (data.status !== 'active') {
          setPhase('notfound');
          return;
        }
        setSessionPublic(data);
        setPhase('nickname');
      } catch (e) {
        if (cancelled) return;
        setPhase('notfound');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, nav]);

  async function handleJoin(nick) {
    setError(null);
    setLoading(true);
    try {
      const res = await joinSession(sessionId, nick);
      await saveSession({
        session_id: res.session_id,
        token: res.token,
        nickname: res.nickname,
        type: res.type,
        expires_at: res.expires_at,
        created_at: Math.floor(Date.now() / 1000),
        is_creator: false,
        join_url: `${location.origin}/j/${res.session_id}`,
      });
      nav(`/s/${sessionId}`, { replace: true });
    } catch (e) {
      if (e.status === 409) {
        setError('That name is taken in this session, try another');
      } else if (e.status === 404 || e.status === 410) {
        setPhase('notfound');
      } else {
        setError(e.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

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
        Finding the luup…
      </div>
    );
  }
  if (phase === 'notfound') {
    return (
      <EdgeScreen
        tone="warn"
        title="This luup isn't here."
        body="The link may have expired or been ended. Ask whoever shared it for a new one."
        primary="Start a new luup"
        onPrimary={() => nav('/')}
      />
    );
  }
  if (phase === 'nickname') {
    return (
      <NicknameStep
        mode="join"
        type={sessionPublic?.type}
        initialValue={nickname}
        onBack={() => nav('/')}
        onSubmit={(nick) => {
          setNickname(nick);
          handleJoin(nick);
        }}
        error={error}
        loading={loading}
        submitLabel="Join the luup"
      />
    );
  }
  return null;
}
