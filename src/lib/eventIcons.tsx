// Shared event/footer icon resolver backed by lucide-react.
// We expose the full library to the icon picker but provide a curated
// fast-path map for the icons that ship with the dashboard out of the box.

import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Calendar } from 'lucide-react';

type IconRecord = Record<string, LucideIcon>;

// Filter out non-icon exports (createLucideIcon, default, types, lowercase
// helpers). Every lucide icon component has a PascalCase name and is a
// React forwardRef object.
const ALL_ICONS: IconRecord = Object.fromEntries(
  Object.entries(LucideIcons as unknown as Record<string, unknown>).filter(
    ([name, value]) =>
      /^[A-Z][A-Za-z0-9]+$/.test(name) &&
      name !== 'LucideIcon' &&
      typeof value === 'object' &&
      value !== null &&
      // forwardRef returns an object with a render function; functional icon
      // components are also valid.
      ('render' in (value as any) || typeof (value as any).$$typeof !== 'undefined')
  )
) as IconRecord;

export const ALL_LUCIDE_ICONS: IconRecord = ALL_ICONS;

export function getLucideIcon(name?: string): LucideIcon {
  if (!name) return Calendar;
  return ALL_ICONS[name] || Calendar;
}

/**
 * Convenience wrapper that renders the lucide icon by name with sensible
 * defaults. Used by EventList in the lobby.
 */
export function EventIcon({ name, size = 18, className }: { name?: string; size?: number; className?: string }) {
  const Icon = getLucideIcon(name);
  return <Icon size={size} className={className} />;
}
