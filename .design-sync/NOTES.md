# design-sync notes — eqc-perth-campus-dashboard

This repo is an **application** (Vite + React 19 + Tailwind v4), not a packaged
component library. The synced design system is the small, genuinely reusable
surface: the token/theme system plus `ConfirmDialog`, `IconPicker`, `EventIcon`.
Page-level screens (Lobby, Mobile, Admin*, TrainerSignOn) are Firebase/router/
data-bound app code and are intentionally **not** synced.

## How this DS is built (non-standard for a package shape)
- There is no library build and no `main`/`module`/`exports` entry. A hand-written
  re-export entry, **`.design-sync/ds-entry.tsx`**, defines the exact synced
  surface. esbuild bundles it to `window.EQC`.
- `cfg.buildCmd` runs `vite build` and copies the hashed compiled CSS to a stable
  path `dist/ds-styles.css`, which `cfg.cssEntry` points at. (`dist/` is
  gitignored; the build regenerates it each run.)
- The converter/validate/capture commands must pass `--entry .design-sync/ds-entry.tsx`.
- Prop interfaces are local (non-exported) so auto-extraction yields
  `{ [key: string]: unknown }`. Real props are supplied via `cfg.dtsPropsFor`
  (copied verbatim from source — keep in sync if the component props change).
- Groups are assigned via `cfg.docsDir` (`.design-sync/docs/*.md`) frontmatter
  `category` (Overlays / Inputs / Icons). Those docs also become each
  `<Name>.prompt.md`.

## Re-sync commands
```sh
# from repo root, after `npm ci`
npx vite build && cp dist/assets/index-*.css dist/ds-styles.css   # = cfg.buildCmd
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry .design-sync/ds-entry.tsx --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
node .ds-sync/package-capture.mjs --out ./ds-bundle
```
The single-command driver (`resync.mjs`) takes the same `--entry` and, on a real
re-sync, `--remote .design-sync/.cache/remote-sync.json`.

## Environment
- Node v22; deps via `npm ci` (package-lock.json).
- Playwright **1.56.1** pins Chromium build **1194**, which is pre-installed at
  `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`). Installed into `.ds-sync` with
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so no browser is re-downloaded.

## Known render warns (triaged benign — not new on re-sync)
- `[RENDER_THIN] EventIcon` — EventIcon renders lucide SVGs with **no text nodes**,
  so the thin/allHollow check fires. Confirmed via screenshot: 8 brand-green
  glyphs render fine. Benign.
- `[FONT_REMOTE]` "JetBrains Mono", "Playfair Display" — fonts load via a remote
  Google Fonts `@import` in the compiled CSS. Expected; no action.

## Preview / authoring decisions
- `ConfirmDialog` is a `fixed inset-0` overlay. The preview harness wraps the
  single story in `transform: translateZ(0)`, which becomes the containing block
  for the fixed backdrop and collapses it to 0 height (header clips above the
  card). Fix: each ConfirmDialog story wraps its dialog in an in-flow
  `minHeight: 460` Frame. Keep this if reworking the preview.
  `cfg.overrides.ConfirmDialog = { cardMode: "single", primaryStory: "Danger" }`.
- `IconPicker`'s open grid is interaction-only (internal open-on-click state); it
  cannot render statically. Previews show the **trigger button** variants only.

## Re-sync risks (what can silently go stale)
- **`cfg.dtsPropsFor`** is a hand-written copy of each component's props. If a
  component's prop interface changes in source, these `.d.ts` bodies will be wrong
  until updated by hand. There is no automatic check.
- **Tailwind coverage**: `styles.css` is the *app's compiled* Tailwind output, so
  it contains only the utility classes and theme tokens the app actually uses
  (Tailwind v4 tree-shakes the rest — e.g. `eqc-card` / `eqc-border` tokens are
  defined in source but not compiled). Designs the agent builds with utilities the
  app never used may render unstyled. If broader coverage is wanted, generate a
  Tailwind build with a safelist and point `cfg.cssEntry` at it.
- **`ds-entry.tsx` drift**: this file, not the package, is the source of truth for
  the synced surface. Adding/removing components means editing both it and
  `cfg.componentSrcMap` (and `dtsPropsFor` / a doc).
- Fonts are fetched from Google Fonts at runtime (remote `@import`), not shipped.

## Upload status
- The first attempt ran in **claude.ai/code (web)**, where Claude Design
  authorization (`/design-login`) is not available, so **nothing was uploaded**.
  The validated `ds-bundle/` and all durable sync inputs are committed. To finish:
  run the upload from an authorized session ("Send to Claude Code Web" or a local
  `/design-sync`). No `projectId` is pinned yet — the authorized run will create
  the project and record it.
