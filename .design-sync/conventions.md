## EQC Perth Campus — design conventions

This is the reusable surface of the EQC Perth Campus dashboard (React 19 +
Tailwind v4). The components are plain, self-contained React components —
**no provider or theme wrapper is required**. They render fully styled as long
as the bound `styles.css` is linked (it `@import`s `_ds_bundle.css`, which
carries the compiled Tailwind utilities and the EQC brand tokens). Import each
from `window.EQC` (e.g. `window.EQC.ConfirmDialog`).

### Styling idiom — Tailwind v4 utility classes

Build your own layout with Tailwind utility classes. The brand is expressed as
theme tokens, available both as utilities and as CSS variables:

**Brand colors** (verified utilities): `bg-eqc-green` `text-eqc-green`
`border-eqc-green` `ring-eqc-green` — brand green `#1a7a54`, the primary / live
accent and primary buttons. `bg-eqc-bg` — `#062016`, the dark-green lobby
background. `text-eqc-text` — `#1A1A1A` body text. `text-eqc-muted` — `#666`
secondary text. As variables: `var(--color-eqc-green)`, `var(--color-eqc-bg)`,
`var(--color-eqc-text)`, `var(--color-eqc-muted)`. Card surfaces use `bg-white`;
borders use the standard gray scale (`border-gray-100` / `border-gray-200`).

**Fonts** (utilities): `font-display` — Playfair Display, **headings only**;
`font-sans` — Roboto, the default for body and UI; `font-mono` — JetBrains Mono,
for timers / IDs / code; `font-timer` — Roboto tuned for countdowns. Bare
headings (`h1`–`h6`) already default to the display serif. Variables:
`var(--font-display)`, `var(--font-sans)`, `var(--font-mono)`.

`styles.css` is the app's *compiled* Tailwind output: it carries the brand
tokens and every utility the app itself uses. Prefer the brand utilities and
`var(--color-eqc-*)` / `var(--font-*)` tokens above for anything that must stay
on-brand, rather than inventing new color values.

### Where the truth lives
- `styles.css` → `_ds_bundle.css` — the compiled stylesheet (brand tokens +
  utilities). Read it before styling.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage notes.

### Components
- `ConfirmDialog` (Overlays) — modal confirm with `danger` / `warning` / `info`
  tones; renders nothing when `open` is false.
- `IconPicker` (Inputs) — controlled trigger that opens a searchable lucide grid;
  store its `value`, render it back with `EventIcon`.
- `EventIcon` (Icons) — renders a lucide icon by `name`, falling back to a
  Calendar; pass `className="text-eqc-green"` for the brand color.

### Build snippet

```jsx
function DeleteTrainer({ open, onClose }) {
  return (
    <div className="font-sans text-eqc-text">
      <h2 className="font-display text-2xl">Trainers</h2>
      <p className="text-sm text-eqc-muted">Manage who can sign on at the campus.</p>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Delete this trainer?"
        body="This removes them from the sign-on log and can't be undone."
        confirmLabel="Delete"
        onConfirm={onClose}
        onCancel={onClose}
      />
    </div>
  );
}
```
