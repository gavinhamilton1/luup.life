import React from 'react';
import { ChatIcon, CameraIcon, PlusIcon, MoreIcon, ClockIcon, UsersIcon, BackIcon } from './Icon.jsx';
import { formatRemaining, isExpiring } from '../lib/time.js';
import { useNow } from '../hooks/useNow.js';

export function SessionHeader({
  type,
  name,
  accent = 'var(--accent)',
  expiresAt,
  participantCount,
  onBack,
  onMenu,
  onAddPeople,
  onParticipants,
}) {
  useNow(30_000);
  const timeLeft = formatRemaining(expiresAt);
  const warning = isExpiring(expiresAt);
  const TypeIcon = type === 'chat' ? ChatIcon : CameraIcon;

  return (
    <div
      style={{
        padding: '10px 14px 12px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
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
      )}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <TypeIcon size={20} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: '-0.2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--ink)',
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 2,
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          <button
            onClick={onParticipants}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: onParticipants ? 'pointer' : 'default',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
          >
            <UsersIcon size={12} />
            {participantCount}
          </button>
          <span>·</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: warning ? 'var(--warning)' : 'var(--muted)',
              fontWeight: warning ? 700 : 400,
            }}
          >
            <ClockIcon size={12} />
            {timeLeft}
          </span>
        </div>
      </div>
      {onAddPeople && (
        <button
          onClick={onAddPeople}
          aria-label="Add people"
          style={{
            height: 40,
            padding: '0 12px',
            borderRadius: 14,
            border: '1.5px solid var(--line)',
            background: 'var(--bg-elev)',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '-0.1px',
            flexShrink: 0,
          }}
        >
          <PlusIcon size={16} />
          Invite
        </button>
      )}
      <button
        onClick={onMenu}
        aria-label="Menu"
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          border: '1.5px solid var(--line)',
          background: 'var(--bg-elev)',
          color: 'var(--ink)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MoreIcon size={18} />
      </button>
    </div>
  );
}
