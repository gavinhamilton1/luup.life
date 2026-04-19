import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NicknameStep } from './Nickname.jsx';
import { QRStep } from './QR.jsx';
import { createSession } from '../lib/api.js';
import { saveSession } from '../lib/db.js';
import { useStore } from '../lib/store.js';

export function CreateFlow() {
  const { type } = useParams();
  const nav = useNavigate();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const showToast = useStore((s) => s.showToast);

  if (type !== 'chat' && type !== 'photo') {
    nav('/', { replace: true });
    return null;
  }

  async function handleCreate(nick) {
    setNickname(nick);
    setError(null);
    setLoading(true);
    try {
      const result = await createSession({ type, nickname: nick });
      await saveSession({
        session_id: result.session_id,
        token: result.token,
        nickname: result.nickname,
        type: result.type,
        expires_at: result.expires_at,
        created_at: Math.floor(Date.now() / 1000),
        is_creator: true,
        join_url: result.join_url,
      });
      setCreated(result);
    } catch (e) {
      setError(e.message || 'Failed to create');
      showToast('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <QRStep
        session={created}
        onBack={() => nav('/')}
        onEnter={() => nav(`/s/${created.session_id}`)}
      />
    );
  }

  return (
    <NicknameStep
      mode="create"
      type={type}
      onBack={() => nav('/')}
      onSubmit={handleCreate}
      error={error}
      loading={loading}
      initialValue={nickname}
    />
  );
}
