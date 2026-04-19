import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CloseIcon, CopyIcon, CheckIcon, ShareIcon, ClockIcon } from '../components/Icon.jsx';
import { Button } from '../components/Button.jsx';
import { LoopBorder } from '../components/LoopBorder.jsx';
import { NickBlob } from '../components/NickBlob.jsx';
import { LuupLogo } from '../components/Logo.jsx';
import { wsUrl } from '../lib/api.js';
import { copyText, shareLink } from '../lib/share.js';
import { useNow } from '../hooks/useNow.js';
import { formatRemaining } from '../lib/time.js';
import { useStore } from '../lib/store.js';
import { useWebSocket } from '../hooks/useWebSocket.js';

export function QRStep({ session, onBack, onEnter }) {
  const [copied, setCopied] = useState(false);
  const storeParticipants = useStore((s) => s.participants);
  const showToast = useStore((s) => s.showToast);
  useNow(30_000);

  // Connect the WebSocket so we can watch participants arrive live.
  useWebSocket({
    sessionId: session.session_id,
    token: session.token,
    enabled: true,
  });

  const participants = storeParticipants.length ? storeParticipants : [session.nickname];

  const url = session.join_url;
  const shortUrl = url.replace(/^https?:\/\//, '');

  async function doCopy() {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      showToast('Copied');
      setTimeout(() => setCopied(false), 1600);
    }
  }

  async function doShare() {
    const result = await shareLink({
      title: 'Join my luup',
      text: 'Scan or tap to join.',
      url,
    });
    if (result === 'copied') showToast('Link copied');
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '16px 8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Close"
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink)',
          }}
        >
          <CloseIcon size={20} />
        </button>
        <div
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-soft)',
            letterSpacing: '0.6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 7,
              background: 'var(--success)',
              display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(10, 143, 90, 0.15)',
              animation: 'luup-pulse 2s ease-in-out infinite',
            }}
          />
          LIVE
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: '6px 22px 0', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.6px', color: 'var(--ink)' }}>
          Point & scan to join
        </div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--muted)' }}>
          or tap Share to send the link
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <div style={{ position: 'relative', width: 296, height: 296 }}>
          <div
            style={{
              position: 'absolute',
              inset: 12,
              borderRadius: 28,
              background: '#fff',
              padding: 16,
              boxSizing: 'border-box',
              boxShadow: '0 10px 30px rgba(17, 17, 17, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <QRCodeSVG
                value={url}
                size={240}
                level="H"
                bgColor="#ffffff"
                fgColor="#111111"
                includeMargin={false}
                style={{ width: '100%', height: '100%' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#fff',
                  padding: '8px 10px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LuupLogo size={22} color="var(--accent)" />
              </div>
            </div>
          </div>
          <LoopBorder size={296} color="var(--accent)" speed={9} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14, padding: '0 22px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            maxWidth: '100%',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 240,
            }}
          >
            {shortUrl}
          </span>
          <button
            onClick={doCopy}
            style={{
              border: 'none',
              background: 'transparent',
              color: copied ? 'var(--success)' : 'var(--accent)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {copied ? <CheckIcon size={14} color="var(--success)" /> : <CopyIcon size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 22px 0' }}>
        <div
          style={{
            borderRadius: 22,
            padding: '14px 16px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--muted)',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
              }}
            >
              In the luup · {participants.length}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ClockIcon size={12} /> {formatRemaining(session.expires_at)} left
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex' }}>
              {participants.map((p, i) => (
                <div
                  key={`${p}-${i}`}
                  style={{
                    marginLeft: i === 0 ? 0 : -8,
                    outline: '2px solid var(--bg-elev)',
                    borderRadius: 999,
                  }}
                >
                  <NickBlob name={p} size={30} />
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 10, fontSize: 13, color: 'var(--ink-soft)' }}>
              {participants.length > 1 ? (
                <>
                  <b style={{ color: 'var(--ink)' }}>{participants[participants.length - 1]}</b>{' '}
                  just joined
                </>
              ) : (
                <>Waiting for friends to scan…</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '20px 22px 0', display: 'flex', gap: 10 }}>
        <Button
          variant="ghost"
          size="lg"
          onClick={doCopy}
          fullWidth
          leading={copied ? <CheckIcon size={16} color="var(--success)" /> : <CopyIcon size={16} />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="accent"
          size="lg"
          onClick={doShare}
          style={{ flex: 1.2 }}
          leading={<ShareIcon size={16} color="#fff" />}
        >
          Share link
        </Button>
      </div>
      <div style={{ padding: '16px 22px 24px' }}>
        <button
          onClick={onEnter}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 18,
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Enter the luup →
        </button>
      </div>
    </div>
  );
}
