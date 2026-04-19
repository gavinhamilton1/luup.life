import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SessionHeader } from '../components/SessionHeader.jsx';
import { NickBlob } from '../components/NickBlob.jsx';
import { SendIcon, WifiOffIcon } from '../components/Icon.jsx';
import { Sheet, Dialog } from '../components/Sheet.jsx';
import { Button } from '../components/Button.jsx';
import { EdgeScreen } from './Edge.jsx';
import { useStore } from '../lib/store.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import {
  formatTimeOfDay,
  isExpiring,
  shouldShowSeparator,
} from '../lib/time.js';
import { terminateSession, leaveSession, extendSession } from '../lib/api.js';
import { deleteSession } from '../lib/db.js';
import { copyText, shareLink } from '../lib/share.js';

export function ChatSession({ onEnded, endedReason }) {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const session = useStore((s) => s.session);
  const participants = useStore((s) => s.participants);
  const messages = useStore((s) => s.messages);
  const connection = useStore((s) => s.connection);
  const showToast = useStore((s) => s.showToast);
  const scrollRef = useRef();

  const [menuOpen, setMenuOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [draft, setDraft] = useState('');
  const [terminated, setTerminated] = useState(endedReason);

  const { sendMessage } = useWebSocket({
    sessionId,
    token: session.token,
    enabled: !!session.token,
    onTerminated: (ev) => {
      setTerminated({ by: ev.by || 'host' });
      onEnded?.({ by: ev.by });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const ok = sendMessage(text);
    if (!ok) {
      showToast('Not connected — try again');
      return;
    }
    setDraft('');
  }

  async function handleLeave() {
    try {
      await leaveSession(sessionId, session.token);
    } catch {
      // swallow
    }
    await deleteSession(sessionId);
    nav('/');
  }

  async function handleEnd() {
    try {
      await terminateSession(sessionId, session.token);
      await deleteSession(sessionId);
      nav('/');
    } catch (e) {
      showToast(e.message || 'Could not end session');
    }
  }

  async function handleExtend() {
    try {
      await extendSession(sessionId, session.token);
      showToast('Session extended');
    } catch (e) {
      showToast(e.message || 'Could not extend');
    }
  }

  function handleShare() {
    const url = `${location.origin}/j/${sessionId}`;
    shareLink({ title: 'Join my luup', text: 'Scan or tap to join.', url });
  }

  if (terminated) {
    return (
      <EdgeScreen
        tone="neutral"
        icon="logout"
        title={`${terminated.by} ended the luup.`}
        body="Everyone has been disconnected. The messages are gone."
        primary="Back home"
        onPrimary={async () => {
          await deleteSession(sessionId);
          nav('/');
        }}
      />
    );
  }

  const warning = isExpiring(session.expiresAt);

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}
    >
      <SessionHeader
        type="chat"
        name={`Chat with ${participants.length} ${participants.length === 1 ? 'person' : 'people'}`}
        expiresAt={session.expiresAt}
        participantCount={participants.length}
        onBack={() => nav('/')}
        onMenu={() => setMenuOpen(true)}
        onAddPeople={() => setAddOpen(true)}
        onParticipants={() => setPeopleOpen(true)}
      />

      {connection.status !== 'connected' && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
            color: 'var(--warning)',
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <WifiOffIcon size={14} color="var(--warning)" />
          {connection.status === 'connecting' ? 'Reconnecting…' : 'Offline — messages will sync when you reconnect'}
        </div>
      )}

      {warning && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
            color: 'var(--warning)',
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            borderBottom: '1px solid var(--line)',
          }}
        >
          Ending soon — save anything you want to keep.
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 0 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '0 22px 14px',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--ink-soft)', fontSize: 13 }}>
            This luup is temporary
          </div>
          <div style={{ marginTop: 2 }}>Everything here vanishes after.</div>
        </div>

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showSep = shouldShowSeparator(prev?.timestamp, m.timestamp);
          const stackWithPrev =
            prev && prev.nickname === m.nickname && !prev.system && !m.system && !showSep;
          return (
            <React.Fragment key={`${m.timestamp}-${i}`}>
              {showSep && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '8px 22px',
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  {formatTimeOfDay(m.timestamp)}
                </div>
              )}
              <ChatBubble
                msg={m}
                me={session.nickname}
                stackWithPrev={stackWithPrev}
              />
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          padding: '8px 12px calc(10px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'var(--bg-elev)',
            borderRadius: 22,
            border: '1px solid var(--line)',
            padding: '10px 14px',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Say something…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 15,
              color: 'var(--ink)',
              minWidth: 0,
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            border: 'none',
            background: draft.trim() ? 'var(--accent)' : 'var(--bg-sunk)',
            color: draft.trim() ? '#fff' : 'var(--muted)',
            cursor: draft.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
            flexShrink: 0,
          }}
        >
          <SendIcon size={18} color={draft.trim() ? '#fff' : 'var(--muted)'} />
        </button>
      </div>

      <Sheet open={peopleOpen} onClose={() => setPeopleOpen(false)}>
        <div
          style={{
            padding: '0 22px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.4px' }}>
            {participants.length} in the luup
          </div>
          <button
            onClick={() => setPeopleOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Done
          </button>
        </div>
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {participants.map((p, i) => (
            <div
              key={p}
              style={{
                padding: '12px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: i === participants.length - 1 ? 'none' : '1px solid var(--line)',
              }}
            >
              <NickBlob name={p} size={34} />
              <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                {p}
                {p === session.nickname && (
                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · you</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <MenuList
          isCreator={session.isCreator}
          onAction={(id) => {
            setMenuOpen(false);
            if (id === 'addpeople') setAddOpen(true);
            else if (id === 'extend') handleExtend();
            else if (id === 'leave') setConfirm({ kind: 'leave' });
            else if (id === 'end') setConfirm({ kind: 'end' });
          }}
        />
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <AddPeople sessionId={sessionId} onClose={() => setAddOpen(false)} onShare={handleShare} />
      </Sheet>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <ConfirmBody
          confirm={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const c = confirm;
            setConfirm(null);
            if (c.kind === 'leave') await handleLeave();
            else if (c.kind === 'end') await handleEnd();
          }}
        />
      </Dialog>
    </div>
  );
}

function ChatBubble({ msg, me, stackWithPrev }) {
  if (msg.system) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '8px 22px',
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        {msg.text}
      </div>
    );
  }
  const isMe = msg.nickname === me;
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '3px 14px',
        flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
      }}
    >
      {!isMe && !stackWithPrev && <NickBlob name={msg.nickname} size={28} />}
      {!isMe && stackWithPrev && <div style={{ width: 28 }} />}
      <div style={{ maxWidth: '78%' }}>
        {!stackWithPrev && !isMe && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 3,
              padding: '0 14px',
            }}
          >
            {msg.nickname}
          </div>
        )}
        <div
          style={{
            background: isMe ? 'var(--accent)' : 'var(--bg-elev)',
            color: isMe ? '#fff' : 'var(--ink)',
            borderRadius: 22,
            borderTopLeftRadius: isMe ? 22 : stackWithPrev ? 10 : 22,
            borderTopRightRadius: isMe ? (stackWithPrev ? 10 : 22) : 22,
            borderBottomLeftRadius: isMe ? 22 : 10,
            borderBottomRightRadius: isMe ? 10 : 22,
            padding: '10px 14px',
            border: isMe ? 'none' : '1px solid var(--line)',
            fontSize: 15,
            lineHeight: 1.35,
            letterSpacing: '-0.1px',
            wordBreak: 'break-word',
          }}
        >
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function MenuList({ isCreator, onAction }) {
  const items = [
    { id: 'addpeople', label: 'Add people' },
    isCreator && { id: 'extend', label: 'Extend session' },
    isCreator && { id: 'end', label: 'End session for everyone', danger: true },
    { id: 'leave', label: 'Leave luup', danger: true },
  ].filter(Boolean);
  return (
    <div style={{ padding: '0 14px 14px' }}>
      {items.map((it, i) => (
        <button
          key={it.id}
          onClick={() => onAction(it.id)}
          style={{
            width: '100%',
            padding: '16px 10px',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 16,
            fontWeight: 700,
            color: it.danger ? 'var(--danger)' : 'var(--ink)',
            textAlign: 'left',
            borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line)',
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function AddPeople({ sessionId, onClose, onShare }) {
  const url = `${location.origin}/j/${sessionId}`;
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>
        Add people
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>
        Share this link or show the QR on your create screen.
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          padding: '12px 14px',
          borderRadius: 14,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          marginBottom: 14,
          wordBreak: 'break-all',
        }}
      >
        {url}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={async () => {
            if (await copyText(url)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button variant="accent" size="md" fullWidth onClick={onShare}>
          Share…
        </Button>
      </div>
    </div>
  );
}

function ConfirmBody({ confirm, onCancel, onConfirm }) {
  if (!confirm) return null;
  const copy =
    confirm.kind === 'end'
      ? {
          title: 'End the luup for everyone?',
          body: 'All messages and photos will disappear immediately.',
          label: 'End it',
        }
      : {
          title: 'Leave the luup?',
          body: 'You can rejoin if you still have the link.',
          label: 'Leave',
        };
  return (
    <>
      <div
        style={{
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--ink)',
          letterSpacing: '-0.3px',
        }}
      >
        {copy.title}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
        {copy.body}
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <Button variant="ghost" size="md" onClick={onCancel} fullWidth>
          Cancel
        </Button>
        <Button
          size="md"
          onClick={onConfirm}
          style={{
            background: 'var(--danger)',
            color: '#fff',
            border: 'none',
          }}
          fullWidth
        >
          {copy.label}
        </Button>
      </div>
    </>
  );
}
