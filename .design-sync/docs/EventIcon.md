---
category: Icons
keywords: [icon, lucide, event, glyph]
---

# EventIcon

Renders a lucide icon by its string `name`, with a safe fallback. It's the
convenience wrapper the dashboard uses to turn stored icon names (from
`IconPicker`) into rendered glyphs, so an unknown or missing name never throws —
it falls back to a Calendar.

## Usage

```jsx
// Stored name from IconPicker → rendered icon
<EventIcon name="MapPin" size={24} className="text-eqc-green" />

// Unknown / empty names fall back to a Calendar
<EventIcon name="" size={24} />
```

## Notes

- `name` is any lucide icon name (e.g. `"Calendar"`, `"Bell"`, `"Users"`). Unknown or empty names render a Calendar.
- `size` is the pixel size (default `18`).
- `className` is forwarded to the icon — use it to apply brand color, e.g. `text-eqc-green`.
- Pairs with `IconPicker`: store the picker's `value`, render it with `EventIcon`.
