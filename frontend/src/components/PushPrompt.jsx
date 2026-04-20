import React from 'react';
import { CloseIcon } from './Icon.jsx';

export function PushPrompt({ onEnable, onDismiss }) {
  return (
    <div
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent-ink)',
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid var(--line)',
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.35 }}>
        Want a ping when someone else posts? Enable notifications.
      </span>
      <button
        onClick={onEnable}
        style={{
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontFamily: 'inherit',
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '-0.1px',
          padding: '6px 12px',
          borderRadius: 999,
          cursor: 'pointer',
        }}
      >
        Turn on
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
