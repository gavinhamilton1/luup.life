import { create } from 'zustand';

const initialSession = {
  id: null,
  type: null,
  token: null,
  nickname: null,
  isCreator: false,
  expiresAt: null,
  status: 'active',
};

export const useStore = create((set, get) => ({
  session: { ...initialSession },
  participants: [],
  messages: [],
  photos: [],
  connection: { status: 'disconnected', reconnectAttempt: 0 },
  toast: null,

  setSession: (partial) =>
    set((s) => ({ session: { ...s.session, ...partial } })),

  resetSession: () =>
    set({
      session: { ...initialSession },
      participants: [],
      messages: [],
      photos: [],
      connection: { status: 'disconnected', reconnectAttempt: 0 },
    }),

  setParticipants: (list) => set({ participants: list }),

  setMessages: (list) => set({ messages: list }),

  appendMessage: (m) =>
    set((s) => {
      // Dedup echoes of the same server-stamped message (can arrive twice
      // when multiple WS connections are briefly alive, e.g. StrictMode/HMR).
      if (
        s.messages.some(
          (x) =>
            x.timestamp === m.timestamp &&
            x.nickname === m.nickname &&
            x.text === m.text &&
            !!x.system === !!m.system
        )
      ) {
        return s;
      }
      return { messages: [...s.messages, m] };
    }),

  setPhotos: (list) => set({ photos: list }),

  addPhoto: (p) =>
    set((s) => {
      if (s.photos.some((x) => x.photo_id === p.photo_id)) return s;
      return { photos: [...s.photos, p].sort((a, b) => a.timestamp - b.timestamp) };
    }),

  removePhoto: (photoId) =>
    set((s) => ({ photos: s.photos.filter((p) => p.photo_id !== photoId) })),

  updatePhoto: (photoId, patch) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.photo_id === photoId ? { ...p, ...patch } : p
      ),
    })),

  setConnection: (conn) =>
    set((s) => ({ connection: { ...s.connection, ...conn } })),

  showToast: (text) => {
    set({ toast: text });
    setTimeout(() => {
      if (get().toast === text) set({ toast: null });
    }, 1600);
  },
  clearToast: () => set({ toast: null }),
}));
