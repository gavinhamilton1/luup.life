// Phone shell + flow navigator + shared chrome

const PHONE_W = 375;
const PHONE_H = 812;

function PhoneFrame({ children, dark = false, label, sub }) {
  const t = window.luupT(dark);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: PHONE_W + 16, height: PHONE_H + 16,
        borderRadius: 56, padding: 8,
        background: dark ? '#1a1a18' : '#2a2a26',
        boxShadow: dark
          ? '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 30px 60px rgba(20,20,20,0.18), 0 0 0 1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        position: 'relative',
      }}>
        <div style={{
          width: PHONE_W, height: PHONE_H, borderRadius: 48,
          background: t.bg, overflow: 'hidden', position: 'relative',
          color: t.ink,
        }}>
          {/* status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 44, zIndex: 40,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 24px 8px', pointerEvents: 'none',
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontWeight: 700, fontSize: 14, color: t.ink,
          }}>
            <div>9:41</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="17" height="11" viewBox="0 0 17 11"><g fill={t.ink}><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.5" y="5" width="3" height="6" rx="0.5"/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5"/><rect x="13.5" y="0" width="3" height="11" rx="0.5"/></g></svg>
              <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 3c2 0 3.7.7 5 2l1-1C12 2.5 9.8 1.5 7.5 1.5S3 2.5 1.5 4l1 1c1.3-1.3 3-2 5-2zm0 3c1.2 0 2.2.4 3 1.2l1-1C10.3 5 9 4.4 7.5 4.4S4.7 5 3.5 6.2l1 1C5.3 6.4 6.3 6 7.5 6zm0 2.4a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" fill={t.ink}/></svg>
              <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" fill="none" stroke={t.ink} strokeOpacity="0.4"/><rect x="2" y="2" width="17" height="7" rx="1.2" fill={t.ink}/><rect x="21" y="3.5" width="1.5" height="4" rx="0.7" fill={t.ink} fillOpacity="0.5"/></svg>
            </div>
          </div>
          {/* notch */}
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            width: 110, height: 28, borderRadius: 18, background: '#000', zIndex: 45,
          }} />
          {/* content */}
          <div style={{ position: 'absolute', inset: 0, paddingTop: 44 }}>
            {children}
          </div>
          {/* home indicator */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            width: 134, height: 5, borderRadius: 3, zIndex: 45,
            background: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)',
          }} />
        </div>
      </div>
      {label && (
        <div style={{
          textAlign: 'center',
          fontFamily: 'Nunito, system-ui, sans-serif',
          color: '#8a8a85',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: -0.1 }}>{label}</div>
          {sub && <div style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

// Pill button
function Btn({ children, variant = 'primary', size = 'md', onClick, dark = false, leading, trailing, style, disabled }) {
  const t = window.luupT(dark);
  const sz = size === 'lg'
    ? { h: 56, px: 22, fs: 17, radius: 28, gap: 10 }
    : size === 'sm'
    ? { h: 36, px: 14, fs: 14, radius: 18, gap: 6 }
    : { h: 48, px: 20, fs: 16, radius: 24, gap: 8 };
  const styles = {
    primary: { bg: t.ink, fg: t.bg, border: 'transparent' },
    pink:    { bg: t.pink, fg: '#fff', border: 'transparent' },
    ghost:   { bg: 'transparent', fg: t.ink, border: t.line },
    soft:    { bg: t.bgElev, fg: t.ink, border: t.line },
    danger:  { bg: 'transparent', fg: t.danger, border: t.line },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: sz.h, padding: `0 ${sz.px}px`, borderRadius: sz.radius,
      background: styles.bg, color: styles.fg,
      border: `1.5px solid ${styles.border === 'transparent' ? 'transparent' : styles.border}`,
      fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: sz.fs,
      letterSpacing: -0.1, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
      opacity: disabled ? 0.5 : 1, transition: 'transform 120ms ease, background 160ms ease',
      ...style,
    }}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onMouseUp={e => e.currentTarget.style.transform = ''}
    onMouseLeave={e => e.currentTarget.style.transform = ''}
    >
      {leading}{children}{trailing}
    </button>
  );
}

// Top bar for in-session screens
function SessionHeader({ dark, accent, type = 'chat', name = 'Luup', participants = 4, timeLeft = '23h', onMenu, onAddPeople, warning }) {
  const t = window.luupT(dark);
  return (
    <div style={{
      padding: '10px 14px 12px',
      borderBottom: `1px solid ${t.line}`,
      background: t.bg,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 14,
        background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
      }}>
        {type === 'chat' ? Icon.chat(20, '#fff') : Icon.camera(20, '#fff')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 800, fontSize: 17, letterSpacing: -0.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: t.ink,
        }}>{name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 2,
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, color: t.muted,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Icon.users(12, t.muted)} {participants}</span>
          <span>·</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: warning ? t.warn : t.muted,
            fontWeight: warning ? 700 : 400,
          }}>{Icon.clock(12, warning ? t.warn : t.muted)} {timeLeft} left</span>
        </div>
      </div>
      <button onClick={onAddPeople} style={{
        width: 40, height: 40, borderRadius: 14, border: `1.5px solid ${t.line}`,
        background: t.bgElev, color: t.ink, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.plus(18, t.ink)}</button>
      <button onClick={onMenu} style={{
        width: 40, height: 40, borderRadius: 14, border: `1.5px solid ${t.line}`,
        background: t.bgElev, color: t.ink, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.more(18, t.ink)}</button>
    </div>
  );
}

Object.assign(window, { PhoneFrame, Btn, SessionHeader, PHONE_W, PHONE_H });
