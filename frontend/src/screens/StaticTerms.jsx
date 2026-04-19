import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon } from '../components/Icon.jsx';

export function StaticTerms() {
  const nav = useNavigate();
  return (
    <div style={{ flex: 1, padding: '16px 8px 40px' }}>
      <button
        onClick={() => nav(-1)}
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
      <div style={{ padding: '10px 16px 0' }}>
        <h1
          style={{
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: '-0.8px',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          Terms
        </h1>
        <div style={{ marginTop: 12, color: 'var(--ink-soft)', lineHeight: 1.55, fontSize: 15 }}>
          <p>
            LUUP is an ephemeral communication tool. Sessions and all their contents — messages,
            photos, nicknames — are deleted when the session's lifetime expires, or immediately
            when a creator ends a session. The current session lifetime is displayed on the share
            screen and in each session header.
          </p>
          <p>
            We do not run accounts. We do not profile users. You provide a nickname for each
            session; that nickname is discarded with the session.
          </p>
          <p>
            <strong>Do not</strong> use LUUP to harass, share illegal content, publish anyone else
            without consent, or circumvent safety measures. Any participant can remove any photo.
          </p>
          <p>
            Photos are temporarily processed and stored on Cloudflare R2 with a bucket lifecycle
            policy that auto-deletes objects shortly after the session expires.
          </p>
          <p>
            LUUP is provided without warranty. Use at your own risk. By using LUUP you agree to
            these terms.
          </p>
        </div>
      </div>
    </div>
  );
}
