import React, { useEffect } from 'react';

export function Sheet({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.38)',
          animation: 'luup-fade-in 150ms ease-out',
        }}
      />
      <div
        className="fade-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: '10px 0 max(24px, env(safe-area-inset-bottom))',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 4,
            background: 'var(--line-strong)',
            margin: '4px auto 14px',
          }}
        />
        {children}
      </div>
    </div>
  );
}

export function Dialog({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
      />
      <div
        className="fade-in"
        style={{
          position: 'relative',
          width: 300,
          maxWidth: 'calc(100% - 32px)',
          background: 'var(--bg)',
          borderRadius: 24,
          padding: '22px 22px 16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
