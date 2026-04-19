// Photo session + edge states

function PhotoTile({ p, dark, onTap, onRemove, accent }) {
  const t = window.luupT(dark);
  return (
    <div style={{
      position: 'relative', borderRadius: 16, overflow: 'hidden',
      background: p.cached ? t.bgSunk : p.color, aspectRatio: p.ratio,
      border: `1px solid ${t.line}`, cursor: 'pointer',
    }} onClick={onTap}>
      {/* "image" placeholder using diagonal stripe pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        background: p.cached
          ? `repeating-linear-gradient(135deg, ${t.line} 0 10px, transparent 10px 20px)`
          : `linear-gradient(${140 + p.hue}deg, ${p.color}, ${p.color2})`,
        opacity: p.cached ? 0.6 : 1,
      }}/>
      {/* subtle scene hint */}
      <div style={{
        position: 'absolute', bottom: 8, left: 10, right: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 10,
        color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4,
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}>
        <span>{p.cached ? 'CACHED' : p.label}</span>
        <span>{p.author}</span>
      </div>
      {p.cached && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(0,0,0,0.7)', color: '#fff',
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
        }}>OFFLINE ONLY</div>
      )}
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{
        position: 'absolute', top: 8, right: 8, width: 26, height: 26,
        borderRadius: 999, border: 'none',
        background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.close(14, '#fff')}</button>
    </div>
  );
}

function PhotoScreen({ dark, accent, participants, timeLeft, warning, photos = [], onMenu, onAddPeople, onAdd, onTap, onRemove, empty = false, banner, onBannerAction }) {
  const t = window.luupT(dark);

  // Split into two columns for masonry
  const colA = [], colB = [];
  photos.forEach((p, i) => (i % 2 === 0 ? colA : colB).push(p));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bg, position: 'relative' }}>
      <SessionHeader dark={dark} accent={accent} type="photo"
        name="Sarah & Jules · wedding" participants={participants.length}
        timeLeft={timeLeft} warning={warning} onMenu={onMenu} onAddPeople={onAddPeople}/>

      {banner && (
        <div style={{
          background: banner.tone === 'warn' ? `${t.warn}1a` : `${t.inkSoft}0f`,
          color: banner.tone === 'warn' ? t.warn : t.inkSoft,
          padding: '8px 14px',
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: `1px solid ${t.line}`,
        }}>{banner.text}
          {banner.action && <button onClick={onBannerAction} style={{
            marginLeft: 'auto', border: 'none', background: 'transparent',
            color: 'currentColor', fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer',
            textDecoration: 'underline',
          }}>{banner.action}</button>}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {empty ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 110, height: 110, borderRadius: 32,
              background: `linear-gradient(135deg, ${accent}22, ${accent}05)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${accent}55`, marginBottom: 20,
            }}>{Icon.camera(42, accent)}</div>
            <div style={{
              fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 22,
              color: t.ink, letterSpacing: -0.4, textWrap: 'pretty',
            }}>No photos yet.<br/>Want to be first?</div>
            <div style={{
              marginTop: 6, fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14,
              color: t.muted, lineHeight: 1.4, maxWidth: 260,
            }}>Tap + below to drop a shot. Anyone here can.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {[colA, colB].map((col, ci) => (
              <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.map((p, i) => <PhotoTile key={`${ci}-${i}`} p={p} dark={dark} accent={accent} onTap={() => onTap(p)} onRemove={() => onRemove(p)}/>)}
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 80 }}/>
      </div>

      {/* FAB */}
      <button onClick={onAdd} style={{
        position: 'absolute', bottom: 20, right: 20,
        width: 64, height: 64, borderRadius: 22, border: 'none',
        background: accent, color: '#fff', cursor: 'pointer',
        boxShadow: `0 10px 24px ${accent}55, 0 0 0 4px ${t.bg}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20,
      }}>{Icon.plus(28, '#fff')}</button>
    </div>
  );
}

// Photo viewer (full-size lightbox)
function PhotoViewer({ photo, dark, onClose, onDownload, onRemove }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60, background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '50px 16px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: 14, border: 'none',
          background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.close(20, '#fff')}</button>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff',
        }}>{photo.author}</div>
        <button onClick={onDownload} style={{
          width: 40, height: 40, borderRadius: 14, border: 'none',
          background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.download(18, '#fff')}</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          width: '100%', aspectRatio: photo.ratio, borderRadius: 16,
          background: `linear-gradient(${140 + photo.hue}deg, ${photo.color}, ${photo.color2})`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: 12, left: 14, right: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4,
          }}>
            <span>{photo.label}</span>
            <span>{photo.time}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 40px', display: 'flex', gap: 10 }}>
        <button onClick={onRemove} style={{
          flex: 1, height: 48, borderRadius: 18, border: '1.5px solid rgba(255,255,255,0.2)',
          background: 'transparent', color: '#fff',
          fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 14,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{Icon.trash(16, '#fff')} Remove</button>
        <button onClick={onDownload} style={{
          flex: 1.3, height: 48, borderRadius: 18, border: 'none',
          background: '#fff', color: '#000',
          fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 14,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{Icon.download(16, '#000')} Save</button>
      </div>
    </div>
  );
}

// Confirm dialog (generic)
function ConfirmDialog({ dark, title, body, confirmLabel, onConfirm, onCancel, tone = 'danger' }) {
  const t = window.luupT(dark);
  const c = tone === 'danger' ? t.danger : t.ink;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70 }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 300, background: t.bg, borderRadius: 24,
        padding: '22px 22px 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 18,
          color: t.ink, letterSpacing: -0.3, textWrap: 'pretty',
        }}>{title}</div>
        <div style={{
          marginTop: 6, fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14,
          color: t.inkSoft, lineHeight: 1.4,
        }}>{body}</div>
        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, height: 44, borderRadius: 14, border: `1.5px solid ${t.line}`,
            background: 'transparent', color: t.ink,
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 14,
            cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, height: 44, borderRadius: 14, border: 'none',
            background: c, color: '#fff',
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 14,
            cursor: 'pointer',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ──────────── Edge state screens ────────────

function EdgeScreen({ dark, tone = 'neutral', title, body, primary, secondary, onPrimary, onSecondary, icon }) {
  const t = window.luupT(dark);
  const color = tone === 'warn' ? t.warn : tone === 'danger' ? t.danger : t.pink;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '60px 24px 30px' }}>
      <div style={{ marginTop: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: `${color}1a`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
        }}>{icon}</div>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 30,
          color: t.ink, letterSpacing: -0.8, lineHeight: 1.05, textWrap: 'pretty',
        }}>{title}</div>
        <div style={{
          marginTop: 10, fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 15,
          color: t.inkSoft, lineHeight: 1.5, maxWidth: 300,
        }}>{body}</div>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {primary && <Btn variant="pink" size="lg" dark={dark} onClick={onPrimary} style={{ width: '100%' }}>{primary}</Btn>}
        {secondary && <Btn variant="ghost" size="lg" dark={dark} onClick={onSecondary} style={{ width: '100%' }}>{secondary}</Btn>}
      </div>
    </div>
  );
}

Object.assign(window, { PhotoScreen, PhotoViewer, ConfirmDialog, EdgeScreen });
