// LUUP design tokens
const LUUP_TOKENS = {
  light: {
    bg: '#fafaf7',
    bgElev: '#ffffff',
    bgSunk: '#f1efe9',
    ink: '#111111',
    inkSoft: '#3a3a3a',
    muted: '#8a8a85',
    line: '#e8e5dd',
    lineStrong: '#d9d6ce',
    pink: '#0ea5e9',
    pinkSoft: '#e0f2fe',
    pinkInk: '#0369a1',
    ok: '#0a8f5a',
    warn: '#d97706',
    danger: '#dc2626',
    // per-session warm accents
    sessions: ['#0ea5e9', '#6b5cff', '#0a8f5a', '#ff8a3d', '#d97706', '#c026d3'],
  },
  dark: {
    bg: '#0e0e0d',
    bgElev: '#1a1a18',
    bgSunk: '#070706',
    ink: '#f6f5f1',
    inkSoft: '#d0cfc9',
    muted: '#8a8a85',
    line: '#2a2a27',
    lineStrong: '#3a3a35',
    pink: '#38bdf8',
    pinkSoft: '#0c3a55',
    pinkInk: '#7dd3fc',
    ok: '#2ecc8b',
    warn: '#f5a623',
    danger: '#ef4444',
    sessions: ['#ff5d7a', '#ff9f5c', '#8b7dff', '#2ecc8b', '#f5a623', '#38bdf8'],
  },
};

window.LUUP_TOKENS = LUUP_TOKENS;

// Useful helpers
window.luupT = (dark) => dark ? LUUP_TOKENS.dark : LUUP_TOKENS.light;
