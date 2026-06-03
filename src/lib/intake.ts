// Intake number formatting: always XX.X (two digits, dot, one letter).

export interface IntakeParts {
  digits: string; // exactly 2 digits, or '' when blank
  letter: string; // exactly 1 letter (uppercase), or '' when blank
}

const VALID_RE = /^(\d{2})\.([A-Z])$/;

export function isValidIntake(value: string | undefined | null): boolean {
  if (!value) return false;
  return VALID_RE.test(value.toUpperCase());
}

export function formatIntake(digits: string, letter: string): string | null {
  const d = (digits || '').trim();
  const l = (letter || '').trim().toUpperCase();
  if (!/^\d{2}$/.test(d)) return null;
  if (!/^[A-Z]$/.test(l)) return null;
  return `${d}.${l}`;
}

/**
 * Parse any stored intake string back into the two input parts. Tolerant of
 * legacy formats like "25g", "25 G", "25.g".
 */
export function parseIntake(value: string | undefined | null): IntakeParts {
  if (!value) return { digits: '', letter: '' };
  const upper = value.toUpperCase().trim();
  const formatted = upper.match(VALID_RE);
  if (formatted) return { digits: formatted[1], letter: formatted[2] };

  const loose = upper.replace(/[^0-9A-Z]/g, '');
  const digits = (loose.match(/^\d{1,2}/) || [''])[0];
  const letter = (loose.match(/[A-Z]$/) || [''])[0];
  return { digits: digits.padStart(0, '0').slice(0, 2), letter };
}

/**
 * Best-effort normaliser used when accepting a single combined string (e.g. from
 * the trainer sign-on flow) — returns the canonical "XX.X" form or null.
 */
export function normaliseIntake(value: string | undefined | null): string | null {
  const { digits, letter } = parseIntake(value);
  return formatIntake(digits, letter);
}
