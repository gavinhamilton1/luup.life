// Primitives: logo, QR, icons, phone frame, avatars

// ─────────── LUUP wordmark (recreated from provided SVG paths) ───────────
function LuupLogo({ size = 36, color, dotColor, showLife = true }) {
  // ratio: viewBox 552x217 → aspect 2.544
  const w = size * 2.544;
  const c = color || '#0ea5e9';
  return (
    <svg width={w} height={size} viewBox="0 0 552.28 217.24" style={{ display: 'block' }}>
      <g fill={c}>
        {/* L */}
        <path d="M108.7,167.14h-30.32c-16.57,0-30-13.43-30-30V35.1c0-8.28-6.72-15-15-15h0c-8.28,0-15,6.72-15,15v102.04c0,33.14,26.86,60,60,60h30.32c8.28,0,15-6.72,15-15h0c0-8.28-6.72-15-15-15Z"/>
        {/* U (loop) — simplified from paths */}
        <path d="M236.05,41.37l2.54,14.4c.4,2.27,1.59,4.32,3.32,5.83,10.66,9.32,18.09,22.47,19.92,37.79,3.59,30.08-16.39,58.37-45.94,65.05-33.35,7.54-65.97-14.44-71.84-47.73-2.45-13.87.14-27.48,6.45-38.95,1.12-2.04,1.56-4.38,1.15-6.68l-2.54-14.38c-1.51-8.56-12.53-11.3-17.78-4.36-14.86,19.63-21.65,45.28-16.49,71.41,9.13,46.26,53.18,77.74,99.9,71.36,50.55-6.91,84.91-54.5,76.14-104.28-4.5-25.51-19.44-46.59-39.65-59.65-7.29-4.71-16.69,1.65-15.18,10.2Z"/>
        <path d="M382.14,60.1c-.09-.15-.19-.3-.29-.44-.71-1.12-1.44-2.22-2.2-3.3-.18-.26-.36-.51-.55-.76-.7-.98-1.42-1.96-2.17-2.91-.2-.26-.41-.52-.62-.77-.77-.96-1.55-1.91-2.35-2.84-.16-.18-.31-.36-.47-.54-.9-1.03-1.83-2.03-2.77-3.02-.03-.03-.07-.07-.1-.1-.34-.35-.68-.71-1.03-1.05-.22-.22-.45-.42-.68-.62-8.11-7.92-17.6-14.22-27.93-18.58-8-3.37-16.15,4.52-13.18,12.68l5,13.74c.79,2.17,2.31,3.97,4.29,5.17,6.76,4.09,12.73,9.52,17.47,16.09.1.13.19.27.28.4.44.61.86,1.24,1.27,1.87.07.11.14.22.21.33.44.69.87,1.38,1.29,2.09.03.05.05.09.08.14,2.3,3.95,4.18,8.24,5.57,12.83,4.91,16.27,2.42,33.26-5.64,47.13-.07.12-.15.25-.22.37-.31.52-.63,1.03-.95,1.54-.35.54-.7,1.08-1.06,1.61-.06.08-.11.16-.17.24-10.72,15.44-28.51,25.56-48.36,25.75-34.19.32-61.43-28.07-60.12-61.84.03-.84.08-1.67.15-2.5.05-.58.11-1.16.18-1.74.02-.19.04-.39.06-.58.5-4.08,1.42-8.08,2.74-11.94.09-.28.18-.55.25-.83,1.25-3.53,2.84-6.9,4.7-10.08-3.38-6.11-7.77-11.52-12.92-16.02-1.74-1.52-2.92-3.56-3.32-5.83l-.98-5.58c-11.37,13.57-18.83,30.57-20.52,49.32-.03.35-.06.69-.09,1.04-.02.3-.05.61-.07.91-.05.67-.09,1.35-.12,2.02,0,.02,0,.04,0,.05-.57,12.07,1.3,24.46,5.95,36.48,7.21,18.62,20.14,33.53,36.05,43.45.19.12.38.24.57.36.78.48,1.57.94,2.36,1.39.57.33,1.14.66,1.72.97.44.24.88.47,1.33.7.9.48,1.81.94,2.74,1.39.15.07.3.14.46.21,6.03,2.87,12.43,5.1,19.12,6.56.41.09.83.17,1.24.25.87.18,1.74.36,2.62.51,13.83,2.44,28.4,1.66,42.57-2.88,20.71-6.64,37.23-20.05,48.04-36.93,0-.01.02-.03.03-.04.32-.51.65-1.02.96-1.53,7.82-12.68,12.57-27.48,13.19-43.39.72-18.65-4.35-36.21-13.6-50.94Z"/>
        {/* P */}
        <path d="M407.6,182.14c0,8.28,6.72,15,15,15s15-6.72,15-15v-43.3c8.25,4.58,17.73,7.2,27.82,7.2h10.97c31.71,0,57.51-25.8,57.51-57.51v-10.97c0-31.71-25.8-57.51-57.51-57.51h-10.97c-31.71,0-57.77,25.8-57.77,57.51M503.9,88.53c0,15.17-12.34,27.51-27.51,27.51h-10.97c-15.17,0-27.51-12.34-27.51-27.51v-10.97c0-15.17,12.34-27.51,27.51-27.51h10.97c15.17,0,27.51,12.34,27.51,27.51v10.97Z"/>
      </g>
      {showLife && (
        <text x="446" y="192" fontFamily="Nunito, system-ui, sans-serif" fontSize="32" fontWeight="700" fill={c} letterSpacing="-0.5">.life</text>
      )}
    </svg>
  );
}

// Compact glyph (just the L + loop) for favicon / small badges
function LuupMark({ size = 40, color = '#0ea5e9', dot }) {
  return (
    <svg width={size * 2.54} height={size} viewBox="0 0 552.28 217.24" style={{ display: 'block' }}>
      <g fill={color}>
        <path d="M108.7,167.14h-30.32c-16.57,0-30-13.43-30-30V35.1c0-8.28-6.72-15-15-15h0c-8.28,0-15,6.72-15,15v102.04c0,33.14,26.86,60,60,60h30.32c8.28,0,15-6.72,15-15h0c0-8.28-6.72-15-15-15Z"/>
        <path d="M236.05,41.37l2.54,14.4c.4,2.27,1.59,4.32,3.32,5.83,10.66,9.32,18.09,22.47,19.92,37.79,3.59,30.08-16.39,58.37-45.94,65.05-33.35,7.54-65.97-14.44-71.84-47.73-2.45-13.87.14-27.48,6.45-38.95,1.12-2.04,1.56-4.38,1.15-6.68l-2.54-14.38c-1.51-8.56-12.53-11.3-17.78-4.36-14.86,19.63-21.65,45.28-16.49,71.41,9.13,46.26,53.18,77.74,99.9,71.36,50.55-6.91,84.91-54.5,76.14-104.28-4.5-25.51-19.44-46.59-39.65-59.65-7.29-4.71-16.69,1.65-15.18,10.2Z"/>
      </g>
      <circle cx="252.6" cy="156" r="15" fill={dot}/>
    </svg>
  );
}

// ─────────── Faux QR code (deterministic, from seed) ───────────
function FauxQR({ size = 260, cells = 33, fg = '#111', bg = '#fff', seed = 'luup', centerLogo = true }) {
  // Deterministic pseudo-random from string
  const rnd = React.useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967295; };
  }, [seed]);

  const cell = size / cells;
  const squares = [];
  const isFinder = (r, c) => {
    const inBL = r < 7 && c < 7;
    const inBR = r < 7 && c >= cells - 7;
    const inTL = r >= cells - 7 && c < 7;
    return inBL || inBR || inTL;
  };
  const isCenter = (r, c) => centerLogo && r >= (cells/2 - 3) && r < (cells/2 + 3) && c >= (cells/2 - 3) && c < (cells/2 + 3);

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isFinder(r, c) || isCenter(r, c)) continue;
      if (rnd() > 0.5) {
        squares.push(<rect key={`${r}-${c}`} x={c*cell} y={r*cell} width={cell} height={cell} fill={fg} rx={cell*0.18} />);
      }
    }
  }

  const Finder = ({ x, y }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width={cell*7} height={cell*7} rx={cell*1.8} fill={fg}/>
      <rect x={cell} y={cell} width={cell*5} height={cell*5} rx={cell*1.2} fill={bg}/>
      <rect x={cell*2} y={cell*2} width={cell*3} height={cell*3} rx={cell*0.8} fill={fg}/>
    </g>
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <rect width={size} height={size} fill={bg}/>
      {squares}
      <Finder x={0} y={0}/>
      <Finder x={size - cell*7} y={0}/>
      <Finder x={0} y={size - cell*7}/>
      {centerLogo && (
        <g transform={`translate(${size/2 - cell*2.5} ${size/2 - cell*2.5})`}>
          <rect width={cell*5} height={cell*5} rx={cell*1} fill={bg}/>
          <g transform={`translate(${cell*0.5} ${cell*0.5}) scale(${cell*4/320})`}>
            <g fill={fg}>
              <path d="M108.7,167.14h-30.32c-16.57,0-30-13.43-30-30V35.1c0-8.28-6.72-15-15-15h0c-8.28,0-15,6.72-15,15v102.04c0,33.14,26.86,60,60,60h30.32c8.28,0,15-6.72,15-15h0c0-8.28-6.72-15-15-15Z"/>
              <path d="M236.05,41.37l2.54,14.4c.4,2.27,1.59,4.32,3.32,5.83,10.66,9.32,18.09,22.47,19.92,37.79,3.59,30.08-16.39,58.37-45.94,65.05-33.35,7.54-65.97-14.44-71.84-47.73-2.45-13.87.14-27.48,6.45-38.95,1.12-2.04,1.56-4.38,1.15-6.68l-2.54-14.38c-1.51-8.56-12.53-11.3-17.78-4.36-14.86,19.63-21.65,45.28-16.49,71.41,9.13,46.26,53.18,77.74,99.9,71.36,50.55-6.91,84.91-54.5,76.14-104.28-4.5-25.51-19.44-46.59-39.65-59.65-7.29-4.71-16.69,1.65-15.18,10.2Z"/>
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}

// ─────────── Avatar blob (nickname initial in colored round) ───────────
function NickBlob({ name, size = 32, dark = false }) {
  const palette = dark
    ? ['#ff5d7a','#ff9f5c','#8b7dff','#2ecc8b','#f5a623','#38bdf8','#e879f9']
    : ['#0ea5e9','#ff8a3d','#6b5cff','#0a8f5a','#d97706','#ff4d6d','#c026d3'];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const color = palette[h % palette.length];
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontWeight: 800, fontSize: size * 0.44, flexShrink: 0,
    }}>{initial}</div>
  );
}

// ─────────── Icon set (stroke-based, friendly) ───────────
const Icon = {
  chat: (s=20,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  camera: (s=20,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  plus: (s=20,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  share: (s=20,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M20 14v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6"/></svg>,
  copy: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  send: (s=20,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l14-8-5 16-3-7-6-1z"/></svg>,
  users: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  clock: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  more: (s=20,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>,
  back: (s=22,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  check: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  close: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  wifi_off: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.58 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><path d="M12 20h.01"/></svg>,
  download: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>,
  trash: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  logout: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>,
  alert: (s=18,c='currentColor') => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
};

Object.assign(window, { LuupLogo, LuupMark, FauxQR, NickBlob, Icon });
