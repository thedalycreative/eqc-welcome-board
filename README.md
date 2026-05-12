# EQC Perth Campus Dashboard

> A live lobby dashboard for the **Equinim College — Perth Campus**. Shows current room allocations, weather, alerts, the campus floorplan, and trainer sign-on — all updating in real time across every screen on campus.

[![Live Site](https://img.shields.io/badge/Live-Vercel-1a7a54?style=for-the-badge)](https://eqc-dashboard-by-25g.vercel.app)
[![Stack](https://img.shields.io/badge/Stack-React_19_·_Vite_·_Firebase-1A1A1A?style=for-the-badge)](#)

---

## What this is

A single-page React app deployed on Vercel that drives the lobby screen at EQC Perth. Real-time room status, trainer photos, scrolling alerts, upcoming events, weather, and a campus map. Trainers update their own status via a QR-coded sign-on form. Staff manage everything else from the `/admin` panel.

| Where | URL |
|---|---|
| **Lobby (production)** | [eqc-dashboard-by-25g.vercel.app](https://eqc-dashboard-by-25g.vercel.app) |
| **Trainer sign-on** | [eqc-dashboard-by-25g.vercel.app/trainer-sign-on.html](https://eqc-dashboard-by-25g.vercel.app/trainer-sign-on.html) |
| **Admin panel** | [eqc-dashboard-by-25g.vercel.app/admin](https://eqc-dashboard-by-25g.vercel.app/admin) (password gated) |
| **Repo** | [github.com/thedalycreative/eqc-dashboard-by-25g](https://github.com/thedalycreative/eqc-dashboard-by-25g) |
| **Firebase** | [console.firebase.google.com/project/eqc-dashboard-by-25g](https://console.firebase.google.com/project/eqc-dashboard-by-25g) |

---

## Architecture

| Layer | Detail |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 |
| Routing | React Router v7 (BrowserRouter) — `/`, `/admin/*`, `/trainer-sign-on.html`, `/mobile` |
| Real-time | Firebase Firestore `onSnapshot` listeners (no Socket.io in production) |
| Persistence | Firebase Firestore (cloud — no in-memory state) |
| File storage | Firebase Storage (trainer photos, carousel images) |
| Production host | Vercel (static SPA + serverless rewrites) |
| Trainer sign-on | Native React/HTML form at `/trainer-sign-on.html` posting directly to Firestore |

> [!NOTE]
> An earlier version of this app ran on Render/Cloud Run as a single Node process with Socket.io for real-time sync. The current deployment is static on Vercel — Firestore handles the real-time channel directly from the browser. The `server.ts` Express server is kept for local development only (`npm run dev`).

---

## Routes

| Route | Purpose |
|---|---|
| `/` | The lobby dashboard — what shows on the campus screen |
| `/admin` | Redirects to `/admin/rooms` after password gate |
| `/admin/rooms` | Manage room allocations |
| `/admin/events` | Manage upcoming events |
| `/admin/alerts` | Manage scrolling banner alerts |
| `/admin/carousel` | (Coming Phase 4) Campus life photo carousel |
| `/admin/trainers` | (Coming Phase 4) Trainer profile management |
| `/admin/signon-log` | (Coming Phase 4) Historical sign-on log |
| `/admin/rss` | (Coming Phase 6) RSS news ticker feeds |
| `/admin/settings` | (Coming Phase 4) WiFi, contacts, brand, timing settings |
| `/trainer-sign-on.html` | Trainer sign-on form (standalone HTML) |
| `/mobile` | (Coming Phase 6) Mobile companion view |

---

## Firestore Collections

| Collection | What it stores |
|---|---|
| `rooms` | Current room allocations (resets daily) |
| `events` | Scheduled upcoming events |
| `staff` | Sign-on records |
| `announcements` | Active scrolling alerts |
| `config` | Misc app config |
| `trainers` | (Phase 4) Trainer profiles with photos |
| `carousel` | (Phase 4) Campus life images |
| `signOnLog` | (Phase 4) Historical sign-on / sign-off log |
| `rssFeeds` | (Phase 6) RSS source library |
| `settings/global` | (Phase 4) Global singleton: carousel timing, WiFi, contacts |

Security rules live in [`firestore.rules`](./firestore.rules). Deploy them with:

```bash
firebase deploy --only firestore:rules
```

---

## Local Development

**Prerequisites:** Node.js 20+, Firebase CLI (`npm install -g firebase-tools`)

```bash
npm install
cp .env.example .env       # then edit VITE_ADMIN_PASSWORD if needed
npm run dev                # http://localhost:3000
```

The `npm run dev` script runs Express with Vite middleware so the React app hot-reloads. The Firestore listeners connect live to the production Firebase project — be careful when testing destructive actions.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Run the dev server with hot reload |
| `npm run build` | Build the frontend into `dist/` for production |
| `npm run build:pages` | Build for GitHub Pages preview (demo mode) |
| `npm run start` | Run the production Express server (legacy) |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run clean` | Delete `dist/` |

---

## Deploying

### Vercel (current production)

Pushes to `main` auto-deploy. Manual deploy:

```bash
npx vercel --prod --yes
```

Set environment variables in Vercel project settings:

| Variable | Value |
|---|---|
| `VITE_ADMIN_PASSWORD` | The admin panel password |

The Firebase config has safe defaults baked in — only override `VITE_FIREBASE_*` if pointing at a different Firebase project.

### Firebase rules

Update [`firestore.rules`](./firestore.rules) then:

```bash
firebase deploy --only firestore:rules
```

---

## Environment Variables

| Variable | Where | Required | Notes |
|---|---|---|---|
| `VITE_ADMIN_PASSWORD` | build-time | recommended | Password for `/admin`. Falls back to `"asdf"` |
| `VITE_FIREBASE_*` | build-time | no | Override the baked-in Firebase config |
| `VITE_DEMO_MODE` | build-time | no | `"true"` disables Firebase writes, seeds demo data |
| `ADMIN_PASSWORD` | server | legacy | Only used by `server.ts` for Cloud Run/Render |

> [!IMPORTANT]
> Never commit a real `.env` file. The repo ships `.env.example` only — `.env*` is in `.gitignore`.

---

## Operating Guide

> [!NOTE]
> No technical background needed.

### Trainer signing on for class

1. Walk past the lobby screen on the way in
2. Scan the QR code on the lobby (or open `/trainer-sign-on.html`)
3. Fill in your name, intake, room, course, and what you're teaching today
4. Hit **Sign On & Update Board** — your room flips to **Live** on every screen

### Staff admin

1. Open the lobby and tap the cog icon in the footer (or go to `/admin` directly)
2. Enter the admin password
3. Use the sidebar to switch between tabs: Rooms, Events, Alerts, etc.
4. Changes save when you press **Save Changes** at the bottom of each tab

### Daily checks

- [ ] Lobby loads and the clock is ticking
- [ ] All six rooms display as **Available** at the start of the day
- [ ] WiFi QR scans and connects
- [ ] Floorplan and Google Map both render
- [ ] Trainer sign-on portal opens via the QR
- [ ] An alert posted by an admin appears on the marquee within ~1 second

---

## Project Reference Files

- [`PROJECT.md`](./PROJECT.md) — what this project is, who it's for, and the user journey
- [`BRAND.md`](./BRAND.md) — the EQC visual and tonal reference

---

## Compliance

This is the public-facing screen of a **Registered Training Organisation (RTO 45758, CRICOS 03952E)**. The footer lists the campus address, phone, email, fire-assembly point, and first-aid location. **Do not remove these** — they're a regulatory requirement.

---

## License

Internal project for EQC Institute / Equinim College. All trademarks and brand assets belong to their respective owners.
