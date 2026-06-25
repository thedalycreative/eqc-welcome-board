---
category: Overlays
keywords: [dialog, modal, confirm, alert, destructive]
---

# ConfirmDialog

A modal confirmation dialog with a dimmed, blurred backdrop. Use it to confirm
destructive or significant actions before they run. It supports keyboard
shortcuts (Enter confirms, Escape cancels), three tones, and an optional middle
button for three-way choices.

## Usage

```jsx
const [open, setOpen] = useState(false);

<ConfirmDialog
  open={open}
  tone="danger"
  title="Delete this trainer?"
  body="This removes them from the sign-on log. This can't be undone."
  confirmLabel="Delete"
  onConfirm={() => { remove(); setOpen(false); }}
  onCancel={() => setOpen(false)}
/>
```

## Notes

- `open` controls visibility — the component renders nothing when `false`.
- `tone` (`danger` | `warning` | `info`) sets the icon and primary-button color. Defaults to `warning`. `info` uses the EQC brand green.
- `body` accepts a string or JSX for richer explanations.
- Provide `altLabel` + `onAlt` to add a middle button for a three-way dialog (e.g. Save / Discard / Cancel).
- Clicking the backdrop, the close button, or pressing Escape all call `onCancel`.
