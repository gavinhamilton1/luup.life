import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SessionHeader } from '../components/SessionHeader.jsx';
import { NickBlob } from '../components/NickBlob.jsx';
import {
  CameraIcon,
  PlusIcon,
  CloseIcon,
  TrashIcon,
  DownloadIcon,
  WifiOffIcon,
} from '../components/Icon.jsx';
import { Sheet, Dialog } from '../components/Sheet.jsx';
import { Button } from '../components/Button.jsx';
import { AddPeople } from '../components/AddPeople.jsx';
import { EdgeScreen } from './Edge.jsx';
import { useStore } from '../lib/store.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { useWebPush } from '../hooks/useWebPush.js';
import { PushPrompt } from '../components/PushPrompt.jsx';
import {
  uploadPhoto,
  removePhoto as apiRemovePhoto,
  downloadPhotoUrl,
  listPhotos,
  terminateSession,
  leaveSession,
  extendSession,
} from '../lib/api.js';
import {
  cachePhoto,
  getCachedPhotosForSession,
  deleteCachedPhoto,
  deleteSession,
} from '../lib/db.js';
import { resizeImage } from '../lib/image.js';
import { shareLink, copyText } from '../lib/share.js';
import { isExpiring } from '../lib/time.js';

export function PhotoSession({ onEnded, endedReason }) {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const session = useStore((s) => s.session);
  const participants = useStore((s) => s.participants);
  const photos = useStore((s) => s.photos);
  const addPhoto = useStore((s) => s.addPhoto);
  const updatePhoto = useStore((s) => s.updatePhoto);
  const removePhotoStore = useStore((s) => s.removePhoto);
  const setPhotos = useStore((s) => s.setPhotos);
  const connection = useStore((s) => s.connection);
  const showToast = useStore((s) => s.showToast);

  const [menuOpen, setMenuOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [terminated, setTerminated] = useState(endedReason);
  const fileRef = useRef();

  useWebSocket({
    sessionId,
    token: session.token,
    enabled: !!session.token,
    onTerminated: (ev) => {
      setTerminated({ by: ev.by || 'host' });
      onEnded?.({ by: ev.by });
    },
  });

  const push = useWebPush({
    sessionId,
    token: session.token,
    enabled: !!session.token,
  });

  // Merge cached local blobs for offline fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedPhotosForSession(sessionId);
      if (cancelled || !cached.length) return;
      for (const c of cached) {
        updatePhoto(c.photo_id, { localBlobUrl: URL.createObjectURL(c.blob) });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Refresh signed URLs periodically when tab is visible.
  useEffect(() => {
    if (!session.token) return undefined;
    async function refresh() {
      try {
        const data = await listPhotos(sessionId, session.token);
        setPhotos(data.photos || []);
      } catch {
        // ignore
      }
    }
    const id = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [sessionId, session.token, setPhotos]);

  async function handleFileSelect(e) {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    e.target.value = '';
    setUploading(true);
    for (const file of files) {
      const tmpId = `pending-${Date.now()}-${Math.random()}`;
      const localUrl = URL.createObjectURL(file);
      addPhoto({
        photo_id: tmpId,
        uploader_nickname: session.nickname,
        width: 0,
        height: 0,
        timestamp: Math.floor(Date.now() / 1000),
        signed_url: localUrl,
        pending: true,
      });
      try {
        console.log('[luup] upload begin', { tmpId, file: file.name, size: file.size });
        const resized = await resizeImage(file);
        console.log('[luup] upload POST /photos', {
          session: sessionId,
          size: resized.size,
          type: resized.type,
        });
        const res = await uploadPhoto(sessionId, session.token, resized);
        console.log('[luup] upload ok', res);
        // Remove the optimistic tile and add the server version.
        removePhotoStore(tmpId);
        addPhoto({
          photo_id: res.photo_id,
          uploader_nickname: session.nickname,
          width: res.width,
          height: res.height,
          timestamp: res.timestamp,
          signed_url: res.signed_url,
        });
        // Cache locally for offline reloads.
        try {
          await cachePhoto({
            session_id: sessionId,
            photo_id: res.photo_id,
            blob: resized,
            width: res.width,
            height: res.height,
            uploader_nickname: session.nickname,
            timestamp: res.timestamp,
          });
        } catch {
          // IndexedDB may refuse; ignore.
        }
      } catch (err) {
        console.error('[luup] upload failed', err);
        removePhotoStore(tmpId);
        showToast(err.message || 'Upload failed');
      }
    }
    setUploading(false);
  }

  async function handleRemove(photo) {
    setViewer(null);
    try {
      await apiRemovePhoto(sessionId, session.token, photo.photo_id);
      removePhotoStore(photo.photo_id);
      await deleteCachedPhoto(sessionId, photo.photo_id);
    } catch (e) {
      showToast(e.message || 'Could not remove');
    }
  }

  async function handleDownload(photo) {
    try {
      const { signed_url, filename } = await downloadPhotoUrl(
        sessionId,
        session.token,
        photo.photo_id
      );
      const a = document.createElement('a');
      a.href = signed_url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      showToast(e.message || 'Download failed');
    }
  }

  async function handleLeave() {
    try {
      await leaveSession(sessionId, session.token);
    } catch {
      // swallow
    }
    await deleteSession(sessionId);
    nav('/');
  }

  async function handleEnd() {
    try {
      await terminateSession(sessionId, session.token);
      await deleteSession(sessionId);
      nav('/');
    } catch (e) {
      showToast(e.message || 'Could not end session');
    }
  }

  async function handleExtend() {
    try {
      await extendSession(sessionId, session.token);
      showToast('Session extended');
    } catch (e) {
      showToast(e.message || 'Could not extend');
    }
  }

  if (terminated) {
    return (
      <EdgeScreen
        tone="neutral"
        icon="logout"
        title={`${terminated.by} ended the luup.`}
        body="Everyone has been disconnected. The photos have been removed from the server."
        primary="Back home"
        onPrimary={async () => {
          await deleteSession(sessionId);
          nav('/');
        }}
      />
    );
  }

  const empty = photos.length === 0;
  const warning = isExpiring(session.expiresAt);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        position: 'relative',
      }}
    >
      <SessionHeader
        type="photo"
        name={`Photo drop · ${photos.length}`}
        expiresAt={session.expiresAt}
        participantCount={participants.length}
        onBack={() => nav('/')}
        onMenu={() => setMenuOpen(true)}
        onAddPeople={() => setAddOpen(true)}
        onParticipants={() => setPeopleOpen(true)}
      />

      {push.promptable && (
        <PushPrompt onEnable={push.enable} onDismiss={push.dismiss} />
      )}

      {connection.status !== 'connected' && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
            color: 'var(--warning)',
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <WifiOffIcon size={14} color="var(--warning)" />
          {connection.status === 'connecting' ? 'Reconnecting…' : 'Offline — showing cached photos'}
        </div>
      )}

      {warning && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
            color: 'var(--warning)',
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            borderBottom: '1px solid var(--line)',
          }}
        >
          Ending soon — save anything you want to keep.
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {empty ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 32,
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent), color-mix(in srgb, var(--accent) 3%, transparent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed color-mix(in srgb, var(--accent) 40%, transparent)',
                marginBottom: 20,
              }}
            >
              <CameraIcon size={42} color="var(--accent)" />
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 22,
                color: 'var(--ink)',
                letterSpacing: '-0.4px',
              }}
            >
              No photos yet.
              <br />
              Want to be first?
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                color: 'var(--muted)',
                lineHeight: 1.4,
                maxWidth: 260,
              }}
            >
              Tap + below to drop a shot. Anyone here can.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 6,
            }}
          >
            {[...photos]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((p) => (
                <PhotoTile
                  key={p.photo_id}
                  photo={p}
                  onTap={() => setViewer(p)}
                  onRemove={() => setConfirm({ kind: 'remove', photo: p })}
                />
              ))}
          </div>
        )}
        {!empty && <div style={{ height: 80 }} />}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        aria-label="Add photo"
        style={{
          position: 'absolute',
          bottom: `calc(20px + env(safe-area-inset-bottom))`,
          right: 20,
          height: 56,
          padding: '0 22px 0 18px',
          borderRadius: 999,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 10px 24px color-mix(in srgb, var(--accent) 40%, transparent), 0 0 0 4px var(--bg)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'inherit',
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '-0.2px',
          zIndex: 20,
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <PlusIcon size={22} color="#fff" />
        Add photo
      </button>

      {viewer && (
        <PhotoViewer
          photo={viewer}
          onClose={() => setViewer(null)}
          onDownload={() => handleDownload(viewer)}
          onRemove={() => setConfirm({ kind: 'remove', photo: viewer })}
        />
      )}

      <Sheet open={peopleOpen} onClose={() => setPeopleOpen(false)}>
        <div style={{ padding: '0 22px 10px' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 20,
              color: 'var(--ink)',
              letterSpacing: '-0.4px',
            }}
          >
            {participants.length} in the luup
          </div>
        </div>
        <div style={{ padding: '0 14px' }}>
          {participants.map((p, i) => (
            <div
              key={p}
              style={{
                padding: '12px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: i === participants.length - 1 ? 'none' : '1px solid var(--line)',
              }}
            >
              <NickBlob name={p} size={34} />
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                {p}
                {p === session.nickname && (
                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · you</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <PhotoMenu
          isCreator={session.isCreator}
          onAction={(id) => {
            setMenuOpen(false);
            if (id === 'addpeople') setAddOpen(true);
            else if (id === 'extend') handleExtend();
            else if (id === 'leave') setConfirm({ kind: 'leave' });
            else if (id === 'end') setConfirm({ kind: 'end' });
            else if (id === 'downloadall') {
              photos.forEach((p) => setTimeout(() => handleDownload(p), 150));
            }
          }}
        />
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <AddPeople
          sessionId={sessionId}
          onShare={() => {
            const url = `${location.origin}/j/${sessionId}`;
            shareLink({ title: 'Join my luup', text: 'Scan or tap to join.', url });
          }}
        />
      </Sheet>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <ConfirmDialogBody
          confirm={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const c = confirm;
            setConfirm(null);
            if (c.kind === 'remove') await handleRemove(c.photo);
            else if (c.kind === 'leave') await handleLeave();
            else if (c.kind === 'end') await handleEnd();
          }}
        />
      </Dialog>
    </div>
  );
}

function PhotoTile({ photo, onTap, onRemove }) {
  const src = photo.localBlobUrl || photo.signed_url;
  const pending = photo.pending;
  return (
    <div
      onClick={onTap}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--bg-sunk)',
        border: '1px solid var(--line)',
        cursor: 'pointer',
      }}
    >
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {pending && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
          }}
        >
          Uploading…
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: 999,
          border: 'none',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CloseIcon size={12} color="#fff" />
      </button>
    </div>
  );
}

function PhotoViewer({ photo, onClose, onDownload, onRemove }) {
  const src = photo.localBlobUrl || photo.signed_url;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
      }}
    >
      <div
        style={{
          padding: `calc(env(safe-area-inset-top) + 12px) 16px 0`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: 'none',
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={20} color="#fff" />
        </button>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{photo.uploader_nickname}</div>
        <button
          onClick={onDownload}
          aria-label="Download"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: 'none',
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DownloadIcon size={18} color="#fff" />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: 20,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pinch-zoom pan-y',
        }}
      >
        {src && (
          <img
            src={src}
            alt=""
            style={{
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 12,
              margin: 'auto',
            }}
          />
        )}
      </div>
      <div
        style={{
          padding: `0 20px calc(env(safe-area-inset-bottom) + 24px)`,
          display: 'flex',
          gap: 10,
        }}
      >
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={onRemove}
          style={{
            background: 'transparent',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.2)',
          }}
          leading={<TrashIcon size={16} color="#fff" />}
        >
          Remove
        </Button>
        <Button
          size="md"
          fullWidth
          onClick={onDownload}
          style={{ background: '#fff', color: '#000', border: 'none' }}
          leading={<DownloadIcon size={16} color="#000" />}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function PhotoMenu({ isCreator, onAction }) {
  const items = [
    { id: 'addpeople', label: 'Add people' },
    { id: 'downloadall', label: 'Download all' },
    isCreator && { id: 'extend', label: 'Extend session' },
    isCreator && { id: 'end', label: 'End session for everyone', danger: true },
    { id: 'leave', label: 'Leave luup', danger: true },
  ].filter(Boolean);
  return (
    <div style={{ padding: '0 14px 14px' }}>
      {items.map((it, i) => (
        <button
          key={it.id}
          onClick={() => onAction(it.id)}
          style={{
            width: '100%',
            padding: '16px 10px',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 16,
            fontWeight: 700,
            color: it.danger ? 'var(--danger)' : 'var(--ink)',
            textAlign: 'left',
            borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line)',
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}


function ConfirmDialogBody({ confirm, onCancel, onConfirm }) {
  if (!confirm) return null;
  const copy =
    confirm.kind === 'end'
      ? {
          title: 'End the luup for everyone?',
          body: 'All photos will be removed immediately.',
          label: 'End it',
        }
      : confirm.kind === 'leave'
      ? {
          title: 'Leave the luup?',
          body: 'You can rejoin if you still have the link.',
          label: 'Leave',
        }
      : {
          title: 'Remove this photo?',
          body: 'It will disappear for everyone in the session.',
          label: 'Remove',
        };
  return (
    <>
      <div
        style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.3px' }}
      >
        {copy.title}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
        {copy.body}
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <Button variant="ghost" size="md" onClick={onCancel} fullWidth>
          Cancel
        </Button>
        <Button
          size="md"
          onClick={onConfirm}
          style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
          fullWidth
        >
          {copy.label}
        </Button>
      </div>
    </>
  );
}
