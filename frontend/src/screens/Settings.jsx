import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon, BellIcon, TrashIcon } from '../components/Icon.jsx';
import { Button } from '../components/Button.jsx';
import { Dialog } from '../components/Sheet.jsx';
import { getThemePreference, setThemePreference } from '../lib/theme.js';
import {
  currentPermission,
  disableNotifications,
  enableNotifications,
  hasActiveSubscription,
  supportsWebPush,
} from '../lib/notifications.js';
import { wipeAllLocalData } from '../lib/db.js';
import { useStore } from '../lib/store.js';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const nav = useNavigate();
  const showToast = useStore((s) => s.showToast);
  const [theme, setThemeState] = useState(() => getThemePreference());
  const [permission, setPermission] = useState(() => currentPermission());
  const [subscribed, setSubscribed] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    hasActiveSubscription().then(setSubscribed);
  }, []);

  function pickTheme(value) {
    setThemePreference(value);
    setThemeState(value);
  }

  async function handleEnablePush() {
    const res = await enableNotifications();
    setPermission(currentPermission());
    setSubscribed(await hasActiveSubscription());
    if (res.ok) showToast('Notifications on');
    else if (res.reason === 'denied') showToast('Blocked by your browser');
    else if (res.reason === 'default') showToast('Permission needed');
    else if (res.reason === 'unsupported') showToast('Not supported here');
  }

  async function handleDisablePush() {
    await disableNotifications();
    setSubscribed(await hasActiveSubscription());
    showToast('Notifications off');
  }

  async function handleWipe() {
    setConfirmWipe(false);
    await wipeAllLocalData();
    showToast('Local data cleared');
  }

  const pushSupported = supportsWebPush();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '16px 14px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          position: 'sticky',
          top: 0,
          background: 'var(--bg)',
          zIndex: 2,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          onClick={() => nav(-1)}
          aria-label="Back"
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BackIcon size={22} />
        </button>
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '-0.4px',
            color: 'var(--ink)',
          }}
        >
          Settings
        </div>
      </div>

      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <div
          style={{
            padding: 4,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
            background: 'var(--bg-sunk)',
            borderRadius: 14,
          }}
        >
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => pickTheme(opt.value)}
              style={{
                height: 38,
                border: 'none',
                borderRadius: 11,
                background: theme === opt.value ? 'var(--bg-elev)' : 'transparent',
                color: theme === opt.value ? 'var(--ink)' : 'var(--muted)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow:
                  theme === opt.value
                    ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--line)'
                    : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <SectionLabel>Notifications</SectionLabel>
      <Card>
        <Row
          icon={<BellIcon size={18} color="var(--ink-soft)" />}
          title="Push notifications"
          body={
            !pushSupported
              ? 'Your browser does not support push notifications.'
              : permission === 'denied'
              ? 'Blocked in your browser. Unblock via the site settings to enable.'
              : subscribed
              ? 'On. You’ll be pinged when someone posts in a luup while you are away.'
              : 'Off. Turn on to get pinged when someone posts while you are away.'
          }
          trailing={
            pushSupported && permission !== 'denied' ? (
              subscribed ? (
                <Button variant="ghost" size="sm" onClick={handleDisablePush}>
                  Turn off
                </Button>
              ) : (
                <Button variant="accent" size="sm" onClick={handleEnablePush}>
                  Turn on
                </Button>
              )
            ) : null
          }
        />
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card>
        <Row
          icon={<TrashIcon size={18} color="var(--danger)" />}
          title="Clear local data"
          body="Removes all your saved sessions, tokens, and cached photos from this device. The sessions themselves keep running on the server."
          trailing={
            <Button
              size="sm"
              onClick={() => setConfirmWipe(true)}
              style={{
                background: 'transparent',
                color: 'var(--danger)',
                border: '1.5px solid var(--line)',
              }}
            >
              Clear
            </Button>
          }
        />
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card>
        <Row
          title="Terms"
          body="How LUUP handles data and what you agree to by using it."
          trailing={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => nav('/terms')}
            >
              Open
            </Button>
          }
        />
      </Card>

      <div
        style={{
          padding: '24px 22px 32px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        luup.life · ephemeral by design
      </div>

      <Dialog open={confirmWipe} onClose={() => setConfirmWipe(false)}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: 'var(--ink)',
            letterSpacing: '-0.3px',
          }}
        >
          Clear all local data?
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 14,
            color: 'var(--ink-soft)',
            lineHeight: 1.4,
          }}
        >
          Every session on this device gets forgotten. You will lose access to any luups you haven't re-joined elsewhere.
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="md" fullWidth onClick={() => setConfirmWipe(false)}>
            Cancel
          </Button>
          <Button
            size="md"
            fullWidth
            onClick={handleWipe}
            style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
          >
            Clear
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        padding: '22px 22px 8px',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '1.4px',
        color: 'var(--muted)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        margin: '0 16px',
        padding: 14,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 18,
      }}
    >
      {children}
    </div>
  );
}

function Row({ icon, title, body, trailing }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'var(--bg-sunk)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--ink)',
            letterSpacing: '-0.15px',
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: 'var(--ink-soft)',
              lineHeight: 1.45,
            }}
          >
            {body}
          </div>
        )}
      </div>
      {trailing && <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{trailing}</div>}
    </div>
  );
}
