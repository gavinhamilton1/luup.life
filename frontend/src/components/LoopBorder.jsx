import React, { useId } from 'react';

export function LoopBorder({ size, color = 'var(--accent)', speed = 9, dark = false }) {
  const id = useId();
  const r = size / 2 - 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id={`loop-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="60%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
        strokeWidth="1.5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#loop-${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${r * 1.4} ${r * 6.5}`}
        style={{ transformOrigin: 'center', animation: `luup-spin ${speed}s linear infinite` }}
      />
      <circle
        cx={size / 2 + r}
        cy={size / 2}
        r="5"
        fill={color}
        style={{
          transformOrigin: `${size / 2}px ${size / 2}px`,
          animation: `luup-spin ${speed}s linear infinite`,
        }}
      />
    </svg>
  );
}
