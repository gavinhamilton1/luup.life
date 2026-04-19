import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './Button.jsx';
import { LuupLogo } from './Logo.jsx';
import { copyText } from '../lib/share.js';

export function AddPeople({ sessionId, onShare }) {
  const url = `${location.origin}/j/${sessionId}`;
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
        Add people
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>
        Show the QR, or share the link.
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            padding: 12,
            borderRadius: 20,
            background: '#fff',
            border: '1px solid var(--line)',
            boxShadow: '0 8px 24px rgba(17, 17, 17, 0.06)',
            position: 'relative',
          }}
        >
          <QRCodeSVG
            value={url}
            size={196}
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
              padding: '6px 8px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuupLogo size={16} color="var(--accent)" />
          </div>
        </div>
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
          textAlign: 'center',
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
