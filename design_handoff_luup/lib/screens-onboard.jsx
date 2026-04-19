// Onboarding screens: Landing, Terms, Nickname, Join/Create choice

// ───────────────────────── LANDING (variant A — default: calm, social) ─────────────────────────
function LandingA({ dark, onStart, activeSessions = [], onResume }) {
  const t = window.luupT(dark);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Ambient pink orb */}
      <div style={{
        position: 'absolute', top: -80, right: -60, width: 260, height: 260,
        borderRadius: 260, background: `radial-gradient(circle, ${t.pink}55 0%, transparent 70%)`,
        filter: 'blur(8px)', pointerEvents: 'none',
      }} />

      <div style={{ padding: '18px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <LuupMark size={34} color={t.ink} dot={t.pink} />
        <div style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11, color: t.muted, letterSpacing: 0.5 }}>luup.life</div>
      </div>

      <div style={{ padding: '34px 22px 0' }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 800, fontSize: 36, lineHeight: 1.02, letterSpacing: -1.2,
          color: t.ink, textWrap: 'pretty',
        }}>
          Link Us UP —<br/>
          <span style={{ color: t.pink }}>together</span>, for 48h.
        </div>
        <div style={{
          marginTop: 12, fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 15, color: t.inkSoft, lineHeight: 1.4, maxWidth: 300,
        }}>
          Chat or share photos with people in the room. No accounts, no app. One QR, then it's gone.
        </div>
      </div>

      <div style={{ padding: '28px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => onStart('chat')} style={{
          height: 88, borderRadius: 26, border: 'none', cursor: 'pointer',
          background: t.ink, color: t.bg, textAlign: 'left',
          padding: '0 20px', fontFamily: 'Nunito, system-ui, sans-serif',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: t.pink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icon.chat(24, '#fff')}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Start a chat</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>Messages that disappear in 48h</div>
          </div>
          <div style={{ fontSize: 22, opacity: 0.5 }}>→</div>
        </button>
        <button onClick={() => onStart('photo')} style={{
          height: 88, borderRadius: 26, border: `1.5px solid ${t.line}`, cursor: 'pointer',
          background: t.bgElev, color: t.ink, textAlign: 'left',
          padding: '0 20px', fontFamily: 'Nunito, system-ui, sans-serif',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: `linear-gradient(135deg, #ff8a3d, ${t.pink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icon.camera(24, '#fff')}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Start a photo drop</div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>Everyone's shots in one place</div>
          </div>
          <div style={{ fontSize: 22, color: t.muted }}>→</div>
        </button>
      </div>

      {activeSessions.length > 0 && (
        <div style={{ padding: '26px 22px 0' }}>
          <div style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 11, fontWeight: 800, letterSpacing: 1.4,
            color: t.muted, textTransform: 'uppercase', marginBottom: 10,
          }}>Your luups</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeSessions.map((s, i) => (
              <button key={i} onClick={() => onResume(s)} style={{
                border: `1px solid ${t.line}`, background: t.bgElev,
                borderRadius: 18, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: s.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}>{s.type === 'chat' ? Icon.chat(16, '#fff') : Icon.camera(16, '#fff')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700,
                    fontSize: 15, color: t.ink, letterSpacing: -0.15,
                  }}>{s.name}</div>
                  <div style={{
                    display: 'flex', gap: 8, marginTop: 1,
                    fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, color: t.muted,
                  }}>
                    <span>{s.participants} people</span>
                    <span>·</span>
                    <span style={{ color: s.warning ? t.warn : t.muted, fontWeight: s.warning ? 700 : 400 }}>{s.timeLeft} left</span>
                  </div>
                </div>
                <div style={{ fontSize: 18, color: t.muted }}>→</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div style={{
        textAlign: 'center', padding: '0 22px 22px',
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontSize: 12, color: t.muted, lineHeight: 1.5,
      }}>
        Sessions auto-expire in 48h.<br/>No accounts ever.
      </div>
    </div>
  );
}

// ───────────────────────── LANDING (variant B — bold, type-led) ─────────────────────────
function LandingB({ dark, onStart, activeSessions = [], onResume }) {
  const t = window.luupT(dark);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.ink, color: t.bg }}>
      <div style={{ padding: '18px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
        <LuupMark size={34} color={t.bg} dot={t.pink} />
        <div style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>luup.life</div>
      </div>

      <div style={{ flex: 1, padding: '0 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 900, fontSize: 72, lineHeight: 0.88, letterSpacing: -3.5,
        }}>
          here<br/>
          <span style={{ color: t.pink }}>now</span>.<br/>
          gone<br/>
          in 48h.
        </div>
        <div style={{
          marginTop: 22, fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, maxWidth: 280,
        }}>
          A QR, a nickname, and the people around you. That's it.
        </div>
      </div>

      <div style={{ padding: '0 22px 16px', display: 'flex', gap: 10 }}>
        <button onClick={() => onStart('chat')} style={{
          flex: 1, height: 64, borderRadius: 22, border: 'none', cursor: 'pointer',
          background: t.pink, color: '#fff',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 16, fontWeight: 800, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{Icon.chat(18, '#fff')} Chat</button>
        <button onClick={() => onStart('photo')} style={{
          flex: 1, height: 64, borderRadius: 22, border: '1.5px solid rgba(255,255,255,0.15)', cursor: 'pointer',
          background: 'transparent', color: t.bg,
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 16, fontWeight: 800, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{Icon.camera(18, t.bg)} Photos</button>
      </div>

      {activeSessions.length > 0 && (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 11, fontWeight: 800, letterSpacing: 1.4,
            color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8,
          }}>Currently in</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeSessions.slice(0, 2).map((s, i) => (
              <button key={i} onClick={() => onResume(s)} style={{
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                borderRadius: 16, padding: '10px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 8, background: s.accent }}/>
                <div style={{ flex: 1, fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: 14, color: t.bg }}>{s.name}</div>
                <div style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{s.timeLeft}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        textAlign: 'center', padding: '0 22px 22px',
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontSize: 12, color: 'rgba(255,255,255,0.45)',
      }}>no accounts · no app · no trace</div>
    </div>
  );
}

// ───────────────────────── TERMS ─────────────────────────
function TermsScreen({ dark, type = 'chat', onAccept, onBack }) {
  const t = window.luupT(dark);
  const [ok, setOk] = React.useState(false);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 8px 0' }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.back(22, t.ink)}</button>
      </div>
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 800, fontSize: 30, letterSpacing: -0.8, color: t.ink,
        }}>Before we link up</div>
        <div style={{
          marginTop: 6, fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 15, color: t.muted, lineHeight: 1.4,
        }}>A few quick things to agree on.</div>
      </div>
      <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { title: '48 hours, then poof', body: 'Everything you share here — messages, photos, nicknames — disappears after 48h.' },
          { title: 'No accounts, no identity', body: "We don't know who you are. Your session is stored on this device only." },
          { title: 'Be kind', body: 'No harassment, no illegal content, no sharing without consent. Anyone can remove anything.' },
        ].map((item, i) => (
          <div key={i} style={{
            background: t.bgElev, border: `1px solid ${t.line}`,
            borderRadius: 18, padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 15,
              color: t.ink, letterSpacing: -0.1,
            }}>{item.title}</div>
            <div style={{
              marginTop: 4, fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 13, color: t.inkSoft, lineHeight: 1.45,
            }}>{item.body}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14, color: t.inkSoft,
        }}>
          <div onClick={() => setOk(!ok)} style={{
            width: 24, height: 24, borderRadius: 8,
            border: `2px solid ${ok ? t.pink : t.lineStrong}`,
            background: ok ? t.pink : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
          }}>{ok && Icon.check(14, '#fff')}</div>
          <span>I agree to the <span style={{ color: t.pink, textDecoration: 'underline' }}>terms</span> and to be kind.</span>
        </label>
        <Btn variant="pink" size="lg" disabled={!ok} onClick={onAccept} dark={dark}>
          Continue →
        </Btn>
      </div>
    </div>
  );
}

// ───────────────────────── NICKNAME ─────────────────────────
function NicknameScreen({ dark, mode = 'create', type = 'chat', onBack, onSubmit, error }) {
  const t = window.luupT(dark);
  const [name, setName] = React.useState('');
  const max = 20;
  const suggestion = ['maple', 'cocoa', 'pippin', 'river', 'sage', 'mochi'];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 8px 0' }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.back(22, t.ink)}</button>
      </div>
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 800, fontSize: 30, letterSpacing: -0.8, color: t.ink, textWrap: 'pretty',
        }}>
          {mode === 'create' ? "What should we call you?" : "Pick a name for here."}
        </div>
        <div style={{
          marginTop: 6, fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 15, color: t.muted, lineHeight: 1.4,
        }}>
          Just for this {type === 'chat' ? 'chat' : 'photo drop'}. Nobody else will see it after 48h.
        </div>
      </div>
      <div style={{ padding: '26px 22px 0' }}>
        <div style={{
          borderRadius: 22, padding: '18px 20px', background: t.bgElev,
          border: `2px solid ${error ? t.danger : t.line}`,
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'border-color 160ms ease',
        }}>
          <NickBlob name={name || '?'} size={40} dark={dark}/>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value.slice(0, max))}
            placeholder="your nickname"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 20, fontWeight: 700, color: t.ink, letterSpacing: -0.3,
              minWidth: 0,
            }}
          />
          <div style={{
            fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 12, color: t.muted,
          }}>{name.length}/{max}</div>
        </div>
        {error && (
          <div style={{
            marginTop: 10, fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 13, color: t.danger, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>{Icon.alert(14, t.danger)} {error}</div>
        )}

        <div style={{ marginTop: 18 }}>
          <div style={{
            fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, color: t.muted,
            fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
          }}>try one</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestion.map(s => (
              <button key={s} onClick={() => setName(s)} style={{
                borderRadius: 999, padding: '6px 12px',
                border: `1px solid ${t.line}`, background: t.bgElev, color: t.inkSoft,
                fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 24px' }}>
        <Btn variant="pink" size="lg" disabled={!name.trim()} onClick={() => onSubmit(name.trim())} dark={dark}
          style={{ width: '100%' }}>
          {mode === 'create' ? 'Create the luup' : 'Join'}
        </Btn>
      </div>
    </div>
  );
}

Object.assign(window, { LandingA, LandingB, TermsScreen, NicknameScreen });
