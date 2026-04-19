// Chat session view

function ChatMessage({ msg, me, dark, accent }) {
  const t = window.luupT(dark);
  if (msg.system) {
    return (
      <div style={{
        textAlign: 'center', padding: '8px 22px',
        fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, color: t.muted,
      }}>{msg.body}</div>
    );
  }
  const isMe = msg.author === me;
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '4px 14px',
      flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end',
    }}>
      {!isMe && !msg.stackWithPrev && <NickBlob name={msg.author} size={28} dark={dark}/>}
      {!isMe && msg.stackWithPrev && <div style={{ width: 28 }}/>}
      <div style={{ maxWidth: '78%' }}>
        {!msg.stackWithPrev && !isMe && (
          <div style={{
            fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, fontWeight: 700,
            color: t.muted, marginBottom: 3, padding: '0 14px',
          }}>{msg.author} · {msg.time}</div>
        )}
        <div style={{
          background: isMe ? accent : t.bgElev,
          color: isMe ? '#fff' : t.ink,
          borderRadius: 22,
          borderTopLeftRadius: isMe ? 22 : (msg.stackWithPrev ? 10 : 22),
          borderTopRightRadius: isMe ? (msg.stackWithPrev ? 10 : 22) : 22,
          borderBottomLeftRadius: isMe ? 22 : 10,
          borderBottomRightRadius: isMe ? 10 : 22,
          padding: '10px 14px',
          border: isMe ? 'none' : `1px solid ${t.line}`,
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: 15, lineHeight: 1.35, letterSpacing: -0.1,
          wordBreak: 'break-word',
        }}>{msg.body}</div>
      </div>
    </div>
  );
}

function ChatScreen({ dark, accent, me = 'maple', participants, messages, onSend, onMenu, onAddPeople, timeLeft, warning, banner, onBannerAction }) {
  const t = window.luupT(dark);
  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef();
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bg }}>
      <SessionHeader dark={dark} accent={accent} type="chat"
        name={`Kai's dinner party`} participants={participants.length}
        timeLeft={timeLeft} warning={warning} onMenu={onMenu} onAddPeople={onAddPeople}/>

      {banner && (
        <div style={{
          background: banner.tone === 'warn' ? `${t.warn}1a` : banner.tone === 'danger' ? `${t.danger}1a` : `${t.inkSoft}0f`,
          color: banner.tone === 'warn' ? t.warn : banner.tone === 'danger' ? t.danger : t.inkSoft,
          padding: '8px 14px',
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: `1px solid ${t.line}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: 'currentColor', opacity: 0.6 }}/>
          {banner.text}
          {banner.action && <button onClick={onBannerAction} style={{
            marginLeft: 'auto', border: 'none', background: 'transparent',
            color: 'currentColor', fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer',
            textDecoration: 'underline',
          }}>{banner.action}</button>}
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          textAlign: 'center', padding: '0 22px 14px',
          fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 12, color: t.muted, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 800, color: t.inkSoft, fontSize: 13 }}>You've got 48 hours together</div>
          <div style={{ marginTop: 2 }}>Everything here vanishes after.</div>
        </div>
        {messages.map((m, i) => <ChatMessage key={i} msg={m} me={me} dark={dark} accent={accent}/>)}
      </div>

      <div style={{
        padding: '8px 12px 10px',
        borderTop: `1px solid ${t.line}`, background: t.bg,
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <div style={{
          flex: 1, background: t.bgElev, borderRadius: 22,
          border: `1px solid ${t.line}`,
          padding: '10px 14px', minHeight: 44, display: 'flex', alignItems: 'center',
        }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onSend(draft.trim()); setDraft(''); }}}
            placeholder="Say something…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 15, color: t.ink,
              minWidth: 0,
            }}
          />
        </div>
        <button onClick={() => { if (draft.trim()) { onSend(draft.trim()); setDraft(''); }}}
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none',
            background: draft.trim() ? accent : t.bgSunk,
            color: draft.trim() ? '#fff' : t.muted,
            cursor: draft.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
          }}>{Icon.send(18, draft.trim() ? '#fff' : t.muted)}</button>
      </div>
    </div>
  );
}

// Participant sheet (tapping participant count)
function ParticipantSheet({ dark, participants, me, onClose }) {
  const t = window.luupT(dark);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '10px 0 34px', maxHeight: '70%', overflowY: 'auto',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 4, background: t.lineStrong,
          margin: '4px auto 14px',
        }}/>
        <div style={{
          padding: '0 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <div style={{
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800, fontSize: 20, color: t.ink,
            letterSpacing: -0.4,
          }}>{participants.length} in the luup</div>
          <button onClick={onClose} style={{
            border: 'none', background: 'transparent', color: t.muted, cursor: 'pointer',
            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: 14,
          }}>Done</button>
        </div>
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {participants.map((p, i) => (
            <div key={i} style={{
              padding: '10px 10px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i === participants.length - 1 ? 'none' : `1px solid ${t.line}`,
            }}>
              <NickBlob name={p.name} size={34} dark={dark}/>
              <div style={{
                flex: 1, fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700,
                fontSize: 15, color: t.ink,
              }}>{p.name} {p.name === me && <span style={{ color: t.muted, fontWeight: 400 }}>· you</span>}</div>
              {p.isCreator && <span style={{
                fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 11, fontWeight: 800,
                color: t.pink, padding: '3px 8px', borderRadius: 999, background: t.pinkSoft,
                letterSpacing: 0.4,
              }}>HOST</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Menu sheet
function MenuSheet({ dark, isCreator, onClose, onAction }) {
  const t = window.luupT(dark);
  const items = [
    { id: 'addpeople', label: 'Add people', icon: Icon.plus(18, t.ink) },
    isCreator && { id: 'extend', label: 'Extend session +24h', icon: Icon.clock(18, t.ink) },
    { id: 'download', label: 'Save my messages', icon: Icon.download(18, t.ink) },
    isCreator && { id: 'end', label: 'End session for everyone', icon: Icon.close(18, t.danger), danger: true },
    { id: 'leave', label: 'Leave luup', icon: Icon.logout(18, t.danger), danger: true },
  ].filter(Boolean);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '10px 14px 34px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: t.lineStrong, margin: '4px auto 14px' }}/>
        {items.map((it, i) => (
          <button key={it.id} onClick={() => onAction(it.id)} style={{
            width: '100%', padding: '14px 10px', border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 16, fontWeight: 700,
            color: it.danger ? t.danger : t.ink, textAlign: 'left',
            borderBottom: i === items.length - 1 ? 'none' : `1px solid ${t.line}`,
          }}>
            {it.icon}
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ChatScreen, ParticipantSheet, MenuSheet });
