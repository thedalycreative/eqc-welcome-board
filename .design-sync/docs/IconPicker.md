---
category: Inputs
keywords: [icon, picker, lucide, select, form]
---

# IconPicker

A trigger button that opens a searchable grid of the full lucide icon library.
Use it wherever a user assigns an icon — events, rooms, alerts, footer links.
It's a controlled input: pass the selected icon `name` and handle `onChange`.

## Usage

```jsx
const [icon, setIcon] = useState('Calendar');

<IconPicker
  value={icon}
  onChange={setIcon}
  triggerLabel="Event icon"
  accentColor="#1a7a54"
/>
```

## Notes

- Controlled: `value` is the current lucide icon name (e.g. `"Calendar"`); `onChange` fires with the chosen name.
- The trigger shows the selected icon, or `triggerFallbackIcon` (a Smile by default) plus `triggerLabel` / the value / "Choose icon".
- `accentColor` is the hex ring color around the trigger and the selected grid cell. Defaults to the EQC brand green `#1a7a54`.
- The picker opens as a centered, searchable, paginated overlay (96 icons/page) over a blurred backdrop. The open grid is an interaction state, so previews show the trigger button only.
