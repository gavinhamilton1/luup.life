import React, { useState } from 'react';
import { BackIcon, AlertIcon } from '../components/Icon.jsx';
import { Button } from '../components/Button.jsx';
import { NickBlob } from '../components/NickBlob.jsx';

const SUGGESTIONS = ['maple', 'cocoa', 'pippin', 'river', 'sage', 'mochi'];

export function NicknameStep({
  onBack,
  onSubmit,
  mode = 'create',
  type = 'chat',
  submitLabel,
  error,
  initialValue = '',
  loading,
}) {
  const [name, setName] = useState(initialValue);
  const max = 20;
  const cleaned = name.trim();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {onBack && (
        <div style={{ padding: '12px 8px 0' }}>
          <button
            onClick={onBack}
            aria-label="Back"
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
            <BackIcon size={22} />
          </button>
        </div>
      )}
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: '-0.8px', color: 'var(--ink)' }}>
          {mode === 'create' ? 'What should we call you?' : 'Pick a name for here.'}
        </div>
        <div style={{ marginTop: 6, fontSize: 15, color: 'var(--muted)', lineHeight: 1.4 }}>
          Just for this {type === 'chat' ? 'chat' : 'photo drop'}. Nobody else will see it after the session ends.
        </div>
      </div>

      <div style={{ padding: '26px 22px 0' }}>
        <div
          style={{
            borderRadius: 22,
            padding: '18px 20px',
            background: 'var(--bg-elev)',
            border: `2px solid ${error ? 'var(--danger)' : 'var(--line)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'border-color 160ms ease',
          }}
        >
          <NickBlob name={cleaned || '?'} size={40} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, max))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && cleaned) onSubmit?.(cleaned);
            }}
            placeholder="your nickname"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.3px',
              minWidth: 0,
            }}
          />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
            {name.length}/{max}
          </div>
        </div>
        {error && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: 'var(--danger)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertIcon size={14} color="var(--danger)" /> {error}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            try one
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setName(s)}
                style={{
                  borderRadius: 999,
                  padding: '6px 12px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                  color: 'var(--ink-soft)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 22px 0' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '1.4px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          The agreement
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
          }}
        >
          <li>
            <b>Short-lived, then poof.</b> Everything shared here disappears when the session ends.
          </li>
          <li>
            <b>No accounts.</b> Stored on this device only.
          </li>
          <li>
            <b>Be kind.</b> Anyone can remove anything.
          </li>
        </ul>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 24px' }}>
        <Button
          variant="accent"
          size="lg"
          disabled={!cleaned || loading}
          onClick={() => onSubmit?.(cleaned)}
          fullWidth
        >
          {submitLabel || (mode === 'create' ? 'Create the luup' : 'Join')}
        </Button>
        <div
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.4,
          }}
        >
          By continuing you agree to the{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            terms
          </a>
          .
        </div>
      </div>
    </div>
  );
}
