import React from 'react';

const LIGHT = ['#0ea5e9', '#ff8a3d', '#6b5cff', '#0a8f5a', '#d97706', '#ff4d6d', '#c026d3'];

export function colorFor(name) {
  let h = 0;
  const s = name || '?';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return LIGHT[h % LIGHT.length];
}

export function NickBlob({ name, size = 32 }) {
  const color = colorFor(name);
  const initial = ((name || '?').trim()[0] || '?').toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.44,
        flexShrink: 0,
      }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
