# Handoff: LUUP — Ephemeral Proximity Chat & Photo Sharing PWA

## Overview

LUUP is a mobile-first PWA for short-lived, location-anchored group chat and photo sharing. A host creates a "luup" (chat or photo), a QR code / short link is shared in-person, and anyone who scans joins for up to **48 hours** — after which the entire session (messages, photos, participants) disappears. Think: dinner parties, weddings, conference hallways, festivals — a fresh group chat that cleans itself up.

Core pillars:
- **Ephemeral** — everything auto-expires at 48h; host can end early.
- **Proximity-first** — joining is mediated by QR / short link shared in-person. No accounts, no friending.
- **Two session types** — `chat` (text + light media) and `photo` (shared camera roll, masonry gallery).
- **Lightweight identity** — nickname + generated avatar color; no auth, no profile.

## About the Design Files

The files in this bundle are **design references created in HTML/React (via in-browser Babel)** — interactive prototypes showing intended look, layout, copy, and flow. They are **not production code** and should not be copied directly.

Your task is to **recreate these designs in the target codebase's existing environment** (or, if starting from scratch, in the framework best suited to a mobile-first PWA — likely React + Vite or Next.js App Router with PWA manifest, or SwiftUI / Jetpack Compose for native). Use the codebase's established component library, styling system, and state patterns.

The HTML prototype runs inside a simulated iOS frame (`lib/ios-frame.jsx`) at **375 × 812** — that frame should be dropped in the real implementation; the designs should adapt to actual device viewports.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, component anatomy, and copy are intentional and should be matched closely. Micro-interactions (copied toasts, expiry countdowns, upload progress) are specified; match behavior even if implementation differs.

Motion is lightly specified — use sensible defaults (150–250ms ease-out for most UI transitions) unless otherwise noted.

---

## Design Tokens

Defined in `lib/tokens.jsx`. Two themes (light, dark). Per-session accent color is assignable.

### Light theme
| Token | Value | Use |
|---|---|---|
| `bg` | `#efece4` | Page background (warm off-white) |
| `bgElev` | `#ffffff` | Card / sheet surface |
| `ink` | `#111111` | Primary text, logo |
| `inkSoft` | `#3a3a3a` | Secondary text |
| `muted` | `#8a8a85` | Tertiary / meta text |
| `line` | `#e8e5dd` | Dividers, hairlines |
| `lineStrong` | `#d9d6ce` | Button borders, input borders |
| `accent` (was `pink`) | `#0ea5e9` | Primary brand accent (sky blue) |
| `accentSoft` | `#e0f2fe` | Accent tint surface |
| `accentInk` | `#0369a1` | Accent on tint |
| `success` | `#0a8f5a` | Online, confirmations |
| `warning` | `#d97706` | Expiring soon |
| `danger` | `#dc2626` | Destructive, end session |

### Dark theme
| Token | Value |
|---|---|
| `bg` | `#0f0f0e` |
| `bgElev` | `#1a1a17` |
| `ink` | `#f5f2ea` |
| `inkSoft` | `#c8c5bc` |
| `muted` | `#8a8a82` |
| `line` | `#2a2a27` |
| `lineStrong` | `#3a3a35` |
| `accent` | `#38bdf8` |
| `accentSoft` | `#0c3a55` |
| `accentInk` | `#7dd3fc` |

### Per-session accents (light / dark)
Hosts' sessions are stamped with one of: `#0ea5e9`, `#6b5cff`, `#0a8f5a`, `#ff8a3d`, `#d97706`, `#c026d3`. Used for session card borders, QR frame, and the accent dot in participant avatars.

### Typography
- **Primary:** Nunito (weights 400, 600, 700, 800). Tight letter-spacing at display sizes (`-0.5` to `-0.8` at 28–44px).
- **Mono:** `ui-monospace, SF Mono, monospace` — used sparingly for `luup.life` wordmarks, QR URLs, countdown timers.
- **Scale:**
  - Display (hero): 36–44px / 800 / -0.8 letter-spacing
  - Title: 22–28px / 800 / -0.4
  - Body: 15–16px / 400–600 / 1.45 line-height
  - Meta: 11–13px / 700 / 0.5–1.4 letter-spacing (uppercase for section labels)

### Spacing
4px base. Common steps: 4, 6, 8, 10, 12, 16, 18, 20, 22, 24, 32, 40.

### Radii
- Pill buttons, chips: `999px`
- Cards, sheets, inputs: `14–20px`
- Photo tiles: `12px`
- Avatar: `50%`

### Shadows
Light use only. Phone frame + focus shadows: `0 20px 40px rgba(0,0,0,0.08)`. Cards generally rely on `line` borders instead of shadow.

### Icons
Inline SVG, 1.6px stroke, rounded line caps. Set defined in `lib/primitives.jsx` as `Icon.*` (clock, logout, camera, chat, qr, share, copy, etc). Size 16–32. Replace with the target codebase's icon library (Lucide, SF Symbols, Material Symbols) at equivalent metaphors.

### Logo
`assets/luup-logo.svg` — full LUUP wordmark. Also rendered programmatically in `lib/primitives.jsx` (`LuupLogo`, `LuupMark`). `LuupLogo` accepts `color` prop; use `ink` on light, `bg` on dark. Tagline: **"Link Us UP"** (note: `UP` uppercase — it's a play on LUUP / link up).

---

## Screens / Views

Grouped by flow. IDs in parentheses match `SCREENS` array in `LUUP.html`.

### Entry

#### 1. Landing A (`landing-a`)
- **Purpose:** First-run / logged-out hero. Two primary CTAs: *Create a luup* and *Join a luup*.
- **Layout:** Full-bleed light bg. Top bar with `LuupMark` (34) + `luup.life` mono wordmark (right). Hero headline "**Link Us UP —** *together*, for 48h." at ~44px/800. The word "together" is styled with `accent` color. Two stacked buttons near bottom: primary (dark fill) Create; secondary (outline) Join. Footer microcopy: "No accounts · No cloud · Gone in 48h."
- **Behavior:** Create → nickname screen. Join → camera / code input screen.

#### 2. Landing B (`landing-b`)
- **Purpose:** Variant with inverted palette (dark ink bg, pale text) and a looping "recent luups" carousel glimpse — for returning users who've been in previous sessions.
- Same CTAs. Toggled via Tweaks panel.

#### 3. Nickname (`nickname`)
- **Purpose:** Pick a short handle + auto-generated avatar color.
- **Layout:** Input field (20px radius, `lineStrong` border, 18px type), label "**What should we call you?**", helper text "Just for this luup. Gone when it ends." Below: 6 swatches to cycle accent. Primary button "Continue".
- **Validation:** 2–16 chars, alphanumeric + `.` `_` `-`.

### Create

#### 4. Create — pick type (`create-type`)
- **Purpose:** Choose chat or photo session.
- **Layout:** Two tall cards side-by-side, each with a large icon (chat bubble / camera), title, one-line description. Selected card gets `accent` border + `accentSoft` fill.

#### 5. Create — name + limits (`create-name`)
- **Purpose:** Name the session, optionally set participant cap.
- **Layout:** Session name input; pill row of caps (5 / 10 / 25 / 50 / ∞). 48h duration is fixed and shown as a locked chip with clock icon.

#### 6. Share / QR (`qr-a`, `qr-b`)
- **Purpose:** Show QR + short link to share with people in the room.
- **Layout A:** Centered QR (260px, with cut-out `LuupMark` at center), short URL `luup.life/j/pk3x7` in mono below, `Copy link` and `Share…` buttons. Top: session name + countdown (`47h 58m`). Bottom: "0 of 10 joined" — updates live.
- **Layout B:** Full-bleed card with accent border, QR takes 60% of screen, "Point a phone here" headline; more expressive/presentation mode for holding up at a party.
- **Behavior:** Copy shows a toast "Copied" for 1.6s. Share uses native Web Share API. QR updates count as participants join.

### Join

#### 7. Join — scan (`join-scan`)
- **Purpose:** Camera viewfinder for QR.
- **Layout:** Full-screen camera feed (mock gradient in prototype). Centered square reticle (240px, `accent` corners only). Below viewfinder: "Scan a luup QR" + "Or enter a code" text link.

#### 8. Join — code (`join-code`)
- **Purpose:** 6-char code entry fallback.
- **Layout:** 6 boxed input slots, monospace 28px. Auto-advance on keystroke. "Can't find a code? Ask the host to share the link."

#### 9. Join — preview (`join-preview`)
- **Purpose:** Confirm session before joining.
- **Layout:** Session card (name, type icon, host nickname, avatar stack of current participants, time remaining). Primary button "Join as maple" (uses chosen nickname). Secondary "Not now". Fine print: "Everything ends in 23h 12m."

### Chat session (`chat`)

- **Purpose:** Active group chat.
- **Layout:**
  - **Top bar** (56px): back chevron, session name + countdown (e.g., "Kai's dinner · 23h 12m"), participant stack (overlapping avatars, max 4 + `+N`), overflow menu.
  - **Messages:** Stacked bubbles, left-aligned for others (with small avatar + nickname above first bubble in a run), right-aligned for self (no avatar, `accent` fill). Timestamps as centered gray labels every ~15min or on tap.
  - **Composer:** Pinned bottom. Rounded pill input (20px radius, `line` border). Camera icon left-inside (opens attach sheet). Send button right-inside, accent-filled when input has text.
- **States:** Typing indicator (3 dots), image attachment (inline rounded thumb), system messages ("maple joined", "river left") as centered `muted` text.

### Photo session (`photo`, `photo-upload`, `photo-detail`)

- **Purpose:** Shared, time-limited camera roll.
- **Layout:**
  - **Gallery:** CSS Grid masonry. 2 columns on 375w. Tile aspect ratios from data (3:4, 4:5, 1:1). Bottom of each tile: tiny author avatar dot + first-name label on hover/tap.
  - **Top bar:** session name + countdown + participant count. Filter chip row: "All · Mine · Starred".
  - **FAB:** floating camera button bottom-right, `accent` fill, 56px.
- **Upload sheet:** Slide-up, shows captured preview, caption input (optional), Post / Discard.
- **Detail:** Tap a tile → fullscreen swipeable viewer. Bottom chrome: author, time, caption, ⭐ star, ⬇ save-to-device, 🗑 remove (own photos only).
- **Important:** Every photo includes a `cached: boolean` — cached ones persist locally after session ends; non-cached vanish with the session. UI hint: small download-cloud icon on uncached tiles.

### End states

#### Expiring soon (`expiring`)
- Banner at top of chat/photo view: warning-tinted, "Ending in 1h 48m — save anything you want to keep." with a "Save all my photos" action for photo sessions.

#### Expired (`expired`)
- Full-screen edge view. Large clock icon (`accent`). Title "That's a wrap — 48h are up." Body "This luup has expired. Photos saved locally are still yours — they live on this device." Primary: "Back home". Secondary: "View my saved photos" (if any).

#### Ended by host (`ended`)
- Same layout, logout icon. "Kai ended the luup." "Everyone has been disconnected. The messages and photos are gone."

#### Offline (`offline`)
- Banner (not full-screen) at top of active session: "You're offline. Messages will send when you're back." `warning` tint.

#### Not found (`not-found`)
- Full-screen. Title "This luup isn't here." Body "The link may have expired or been ended. Ask whoever shared it for a new one."

---

## Interactions & Behavior

### Global
- **Theme toggle** — light ↔ dark. Persist in `localStorage`.
- **Accent color** — per-session; set on create. Other UIs use default `accent` token.
- **Countdown** — live ticker visible at top of chat/photo sessions and on cards. Format: `Nh NNm` under 48h, `NNm` under 1h, `Expired` at 0.

### Ephemerality (critical)
- All session data (messages, photos, participants) is deleted at T+48h from creation, or immediately if host ends.
- Client must handle hard boundary: on expiry, transition active UI → `expired` screen and clear cached session blobs.
- **Exception:** photos the local user explicitly marked "save to device" persist in device storage; they're not part of the session.

### Create flow
1. Type → 2. Name/cap → 3. QR share. Each step has back. On QR screen, session is already live.

### Join flow
1. Scan QR **or** enter code → 2. Preview card → 3. Confirm nickname → enter session.
- QR deep link `luup.life/j/<id>` bypasses scan, goes straight to preview.

### Chat
- Send on Enter (mobile: send button). Optimistic rendering with `pending` state (dim until acked).
- Image attach via camera or library; images show upload progress inline then resolve.
- Long-press own message → Delete (local + propagate).

### Photo
- Capture → optional caption → Post. Upload shows progress overlay on the tile in the gallery.
- Tap tile → viewer. Swipe left/right navigates. Pinch-zoom supported.
- Star = local favorite only. Save = download to device (triggers native save sheet).

### Transitions
- Screen transitions: slide-over from right for forward nav (200ms ease-out), slide-back on back. On QR screen → session, cross-fade.
- Toasts: fade up 200ms, 1.6s hold, fade out 200ms.

---

## State Management

### Session-local state (reset on session end)
- `session: { id, type, name, hostId, accent, createdAt, expiresAt, participantCap }`
- `participants: [{ id, nickname, color, joinedAt, isHost }]`
- `messages: [{ id, authorId, type: 'text'|'image'|'system', body, attachments, sentAt, status }]`
- `photos: [{ id, authorId, url, ratio, color, caption, takenAt, starredLocally, cachedLocally }]`

### Device-local state (persistent)
- `me: { nickname, preferredColor, theme }` — preserved across sessions
- `savedPhotos: Photo[]` — photos explicitly saved from past sessions
- `recentLuups: [{ id, name, endedAt, savedPhotoCount }]` — shown on Landing B variant

### Network
- Treat as real-time: WebSocket or Firebase RTDB-style subscription per session. Messages/photos are ordered by server timestamp.
- Media uploads: direct-to-storage with signed URL; the message/photo record references the URL.
- All server state is TTL'd at 48h from creation.

---

## Assets

- `assets/luup-logo.svg` — canonical wordmark. Can be recolored via CSS `fill` / `color`.
- All other iconography is inline SVG in `lib/primitives.jsx` — recreate using the target codebase's icon system at equivalent metaphors.
- Photo imagery in the prototype is procedural (colored gradient tiles). Real implementation uses user-captured images. **No stock imagery required.**

---

## Files (design references)

Copied into this handoff:

- `LUUP.html` — entry + router, screen registry, Tweaks panel, flow map.
- `lib/tokens.jsx` — color & theme tokens.
- `lib/primitives.jsx` — `LuupLogo`, `LuupMark`, `Icon.*`, small shared atoms.
- `lib/ios-frame.jsx` — simulated device frame used only for the prototype.
- `lib/shell.jsx` — `PhoneFrame`, `EdgeScreen`, shared layout helpers.
- `lib/screens-onboard.jsx` — Landing A/B, Nickname, Create flow.
- `lib/screens-qr.jsx` — QR share A/B.
- `lib/screens-chat.jsx` — Chat session + composer.
- `lib/screens-photo.jsx` — Photo gallery, upload sheet, detail viewer.
- `assets/luup-logo.svg` — brand mark.

### How to view
Open `LUUP.html` in a browser. It renders a grid of all screens; click any phone to focus it. The Tweaks panel (toolbar toggle) flips theme / accent / variants.

---

## Build notes

- **Platform:** PWA-first. Must work installed to home screen. Offline: show cached session history in read-only mode with the "offline" banner.
- **Auth:** none in MVP. Nickname + device-local identity. Optional future: one-tap "claim my luup" via passkey if host wants to manage sessions.
- **Permissions:** camera (QR scan, photo session), notifications (optional — "new message" while session active).
- **Privacy:** zero-retention server policy; document in an in-app "About this luup" sheet linked from each session's overflow menu.
