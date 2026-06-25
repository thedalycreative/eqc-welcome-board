# EQC Perth Campus Dashboard

Live, always-on lobby dashboard for the Equinim College Perth campus.

Built with **React 19 + TypeScript + Vite + Firebase + Tailwind CSS**, deployed on Vercel.

## Interfaces

- **Lobby display** (`/`) — full-screen kiosk view: rooms, weather, events, floorplan, news ticker
- **Mobile companion** (`/mobile`) — QR-scan compact view for visitors
- **Trainer sign-on** (`/trainer-sign-on`) — class check-in portal
- **Admin panel** (`/admin`) — password-gated configuration UI

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Firebase + admin password
npm run dev
```

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web SDK config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Web SDK config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Web SDK config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Web SDK config |
| `VITE_FIREBASE_APP_ID` | Firebase Web SDK config |
| `VITE_ADMIN_PASSWORD` | Admin panel gate |

The build fails fast if any of these are missing.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type check |

## License

MIT — see `LICENSE`.
