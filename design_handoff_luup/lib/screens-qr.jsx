// QR share screen — the hero. Two variants.

// Animated looping border that riffs on the logo's "L-loop"
function LoopBorder({ size, color, dark, speed = 8 }) {
  const r = size / 2 - 12;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="loop-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color}/>
          <stop offset="60%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* static subtle ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} strokeWidth="1.5"/>
      {/* animated loop */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#loop-g)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${r*1.4} ${r*6.5}`}
        style={{ transformOrigin: 'center', animation: `luup-spin ${speed}s linear infinite` }}
      />
      {/* dot */}
      <circle cx={size/2 + r} cy={size/2} r="5" fill={color}
        style={{ transformOrigin: `${size/2}px ${size/2}px`, animation: `luup-spin ${speed}s linear infinite` }}/>
    </svg>
  );
}

function QRShareScreen({ dark, type = 'chat', accent = '#0ea5e9', nickname = 'maple', participants = [], timeLeft = '47h 58m', onBack, onCopy, onShare, onEnter, variant = 'A' }) {
  const t = window.luupT(dark);
  const url = 'luup.life/j/pk3x7';
  const [copied, setCopied] = React.useState(false);
  const doCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); onCopy && onCopy(); };

  if (variant === 'B') {
    // Variant B — maximalist, QR card on pink canvas
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: accent, color: '#fff' }}>
        <div style={{
          padding: '10px 8px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onBack} style={{
            width: 40, height: 40, border: 'none', background: 'rgba(255,255,255,0.15)',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icon.close(18, '#fff')}</button>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.15)',
            fontFamily: 'ui-monospace, SF Mono, monospace',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
          }}>LIVE · {participants.length} here</div>
          <div style={{ width: 40 }}/>
        </div>
        <div style={{ padding: '16px 22px 0', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontWeight: 900, fontSize: 42, lineHeight: 0.95, letterSpacing: -1.5,
          }}>Point. Scan.<br/>You're in.</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <LoopBorder size={290} color="#fff" speed={10}/>
            <div style={{
              width: 266, height: 266, borderRadius: 24, background: '#fff',
              margin: 12, padding: 18, boxSizing: 'border-box',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}>
              <FauxQR size={230} cells={29} fg="#111" bg="#fff" seed="luup-pk3x7"/>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, padding: '0 22px' }}>
          <div style={{
            fontFamily: 'ui-monospace, SF Mono, monospace',
            fontSize: 15, fontWeight: 700, letterSpacing: -0.2,
          }}>{url}</div>
          <div style={{
            marginTop: 3, fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 13, opacity: 0.8,
          }}>You're <b>{nickname}</b> · ends in {timeLeft}</div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 22px 20px', display: 'flex', gap: 10 }}>
          <button onClick={doCopy} style={{
            flex: 1, height: 52, borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 15,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>{copied ? Icon.check(16, '#fff') : Icon.copy(16, '#fff')} {copied ? 'Copied' : 'Copy link'}</button>
          <button onClick={onShare} style={{
            flex: 1, height: 52, borderRadius: 20, border: 'none',
            background: '#fff', color: accent,
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 15,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>{Icon.share(16, accent)} Share</button>
        </div>
        {onEnter && (
          <div style={{ padding: '0 22px 20px' }}>
            <button onClick={onEnter} style={{
              width: '100%', height: 48, borderRadius: 18, border: 'none',
              background: 'rgba(0,0,0,0.15)', color: '#fff',
              fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}>Enter the luup →</button>
          </div>
        )}
      </div>
    );
  }

  // Variant A — calm default
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '10px 8px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.close(20, t.ink)}</button>
        <div style={{
          padding: '6px 12px', borderRadius: 999,
          background: t.bgElev, border: `1px solid ${t.line}`,
          fontFamily: 'ui-monospace, SF Mono, monospace',
          fontSize: 11, fontWeight: 700, color: t.inkSoft, letterSpacing: 0.6,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: t.ok, display: 'inline-block',
            boxShadow: `0 0 0 3px ${t.ok}22`, animation: 'luup-pulse 2s ease-in-out infinite' }}/>
          LIVE
        </div>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ padding: '6px 22px 0', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 800, fontSize: 26, letterSpacing: -0.6, color: t.ink,
        }}>Point & scan to join</div>
        <div style={{
          marginTop: 4, fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 14, color: t.muted,
        }}>or tap Share to send the link</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <LoopBorder size={296} color={accent} dark={dark} speed={9}/>
          <div style={{
            width: 272, height: 272, borderRadius: 28,
            background: dark ? '#fff' : '#fff',
            margin: 12, padding: 16, boxSizing: 'border-box',
            boxShadow: dark
              ? '0 10px 40px rgba(255,93,122,0.25), 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 10px 30px rgba(17,17,17,0.08), 0 0 0 1px rgba(17,17,17,0.05)',
          }}>
            <FauxQR size={240} cells={31} fg="#111" bg="#fff" seed="luup-pk3x7"/>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14, padding: '0 22px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999,
          background: t.bgElev, border: `1px solid ${t.line}`,
        }}>
          <span style={{
            fontFamily: 'ui-monospace, SF Mono, monospace',
            fontSize: 14, fontWeight: 700, color: t.ink, letterSpacing: -0.2,
          }}>{url}</span>
          <button onClick={doCopy} style={{
            border: 'none', background: 'transparent', color: copied ? t.ok : t.pink,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, fontWeight: 800,
          }}>{copied ? Icon.check(14, t.ok) : Icon.copy(14, t.pink)} {copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>

      {/* Participant liveroom */}
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{
          borderRadius: 22, padding: '14px 16px',
          background: t.bgElev, border: `1px solid ${t.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, fontWeight: 800,
              color: t.muted, letterSpacing: 1.4, textTransform: 'uppercase',
            }}>In the luup · {participants.length}</div>
            <div style={{
              fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, color: t.muted,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>{Icon.clock(12, t.muted)} {timeLeft} left</div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: -6 }}>
            <div style={{ display: 'flex' }}>
              {participants.map((p, i) => (
                <div key={i} style={{
                  marginLeft: i === 0 ? 0 : -8,
                  outline: `2px solid ${t.bgElev}`,
                  borderRadius: 999,
                  transform: p.justJoined ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 300ms ease',
                }}>
                  <NickBlob name={p.name} size={30} dark={dark}/>
                </div>
              ))}
            </div>
            <div style={{
              marginLeft: 10, fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 13, color: t.inkSoft,
            }}>
              {participants.length > 1
                ? <><b style={{ color: t.ink }}>{participants[participants.length-1].name}</b> just joined</>
                : <>Waiting for friends to scan…</>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 20px', display: 'flex', gap: 10 }}>
        <Btn variant="ghost" size="lg" onClick={doCopy} dark={dark} style={{ flex: 1 }}
          leading={copied ? Icon.check(16, t.ok) : Icon.copy(16, t.ink)}>
          {copied ? 'Copied' : 'Copy'}
        </Btn>
        <Btn variant="pink" size="lg" onClick={onShare} dark={dark} style={{ flex: 1.2 }}
          leading={Icon.share(16, '#fff')}>
          Share link
        </Btn>
      </div>
      {onEnter && (
        <div style={{ padding: '0 22px 20px' }}>
          <button onClick={onEnter} style={{
            width: '100%', height: 44, borderRadius: 18, border: 'none',
            background: 'transparent', color: t.pink,
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 14,
            cursor: 'pointer',
          }}>Enter the luup →</button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { QRShareScreen, LoopBorder });
