import React from 'react';
import { Button } from '../components/Button.jsx';
import { ClockIcon, LogoutIcon, AlertIcon, WifiOffIcon } from '../components/Icon.jsx';

const ICONS = {
  clock: ClockIcon,
  logout: LogoutIcon,
  alert: AlertIcon,
  wifi: WifiOffIcon,
};

export function EdgeScreen({
  tone = 'neutral',
  icon = 'clock',
  title,
  body,
  primary,
  secondary,
  onPrimary,
  onSecondary,
}) {
  const color =
    tone === 'warn'
      ? 'var(--warning)'
      : tone === 'danger'
      ? 'var(--danger)'
      : 'var(--accent)';
  const IconCmp = ICONS[icon] || ClockIcon;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 24px 30px',
      }}
    >
      <div style={{ marginTop: 40 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          <IconCmp size={32} color={color} />
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 30,
            color: 'var(--ink)',
            letterSpacing: '-0.8px',
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 15,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          {body}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {primary && (
          <Button variant="accent" size="lg" onClick={onPrimary} fullWidth>
            {primary}
          </Button>
        )}
        {secondary && (
          <Button variant="ghost" size="lg" onClick={onSecondary} fullWidth>
            {secondary}
          </Button>
        )}
      </div>
    </div>
  );
}
