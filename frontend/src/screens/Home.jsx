import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuupLogo } from '../components/Logo.jsx';
import {
  ChatIcon,
  CameraIcon,
  ClockIcon,
  ChevronRightIcon,
  TrashIcon,
} from '../components/Icon.jsx';
import { listSessions, purgeExpiredSessions, deleteSession } from '../lib/db.js';
import { formatRemaining, isExpired, isExpiring } from '../lib/time.js';
import { useNow } from '../hooks/useNow.js';
import { toggleTheme } from '../lib/theme.js';
import { useStore } from '../lib/store.js';

export function HomeScreen() {
  const nav = useNavigate();
  const [sessions, setSessions] = useState([]);
  const showToast = useStore((s) => s.showToast);
  useNow(30_000);

  async function refresh() {
    await purgeExpiredSessions();
    const list = await listSessions();
    setSessions(list.filter((s) => !isExpired(s.expires_at)));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRemove(sessionId) {
    await deleteSession(sessionId);
    await refresh();
    showToast('Removed');
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 260,
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          opacity: 0.33,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          padding: '22px 22px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <LuupLogo size={30} color="var(--accent)" />
        <button
          onClick={toggleTheme}
          style={{
            border: 'none',
            background: 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: 0.5,
            cursor: 'pointer',
          }}
          aria-label="Toggle theme"
        >
          luup.life
        </button>
      </div>

      <div style={{ padding: '34px 22px 0' }}>
        <h1
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 36,
            lineHeight: 1.02,
            letterSpacing: '-1.2px',
            color: 'var(--ink)',
          }}
        >
          Share the moment.<br />
          Keep your <span style={{ color: 'var(--accent)' }}>privacy</span>.
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 15,
            color: 'var(--ink-soft)',
            lineHeight: 1.4,
            maxWidth: 320,
          }}
        >
          Chat or share photos with whoever's here. No accounts, no numbers. Gone when the session ends.
        </p>
      </div>

      <div style={{ padding: '28px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => nav('/create/chat')}
          style={{
            height: 88,
            borderRadius: 26,
            border: '1.5px solid var(--accent)',
            cursor: 'pointer',
            background: 'var(--accent-soft)',
            color: 'var(--ink)',
            textAlign: 'left',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChatIcon size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>Start a chat</div>
            <div style={{ fontSize: 13, color: 'var(--accent-ink)', marginTop: 2 }}>
              Messages that disappear
            </div>
          </div>
          <div style={{ fontSize: 22, color: 'var(--accent-ink)', opacity: 0.7 }}>→</div>
        </button>
        <button
          onClick={() => nav('/create/photo')}
          style={{
            height: 88,
            borderRadius: 26,
            border: '1.5px solid var(--line)',
            cursor: 'pointer',
            background: 'var(--bg-elev)',
            color: 'var(--ink)',
            textAlign: 'left',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ff8a3d, var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CameraIcon size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Start a photo drop
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              Everyone's shots in one place
            </div>
          </div>
          <div style={{ fontSize: 22, color: 'var(--muted)' }}>→</div>
        </button>
      </div>

      {sessions.length > 0 && (
        <div style={{ padding: '26px 22px 0' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.4px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Your luups
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map((s) => {
              const warning = isExpiring(s.expires_at);
              return (
                <div
                  key={s.session_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => nav(`/s/${s.session_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      nav(`/s/${s.session_id}`);
                    }
                  }}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'var(--bg-elev)',
                    borderRadius: 18,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    color: 'var(--ink)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {s.type === 'chat' ? (
                      <ChatIcon size={16} color="#fff" />
                    ) : (
                      <CameraIcon size={16} color="#fff" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: 'var(--ink)',
                        letterSpacing: '-0.15px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.type === 'chat' ? 'Chat' : 'Photo drop'} · {s.nickname}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        marginTop: 1,
                        fontSize: 12,
                        color: warning ? 'var(--warning)' : 'var(--muted)',
                        fontWeight: warning ? 700 : 400,
                        alignItems: 'center',
                      }}
                    >
                      <ClockIcon size={12} />
                      <span>{formatRemaining(s.expires_at)} left</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(s.session_id);
                    }}
                    aria-label="Remove from your list"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: '1px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <TrashIcon size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/s/${s.session_id}`);
                    }}
                    aria-label="Open session"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronRightIcon size={18} color="#fff" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div
        style={{
          textAlign: 'center',
          padding: '24px 22px',
          fontSize: 12,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}
      >
        Sessions auto-expire.
        <br />
        No accounts ever.
      </div>
    </div>
  );
}
