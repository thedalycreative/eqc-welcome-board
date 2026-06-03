// Color utilities for picking readable text against arbitrary backgrounds.

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let v = m[1];
  if (v.length === 3) v = v.split('').map(c => c + c).join('');
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const DARK = '#062016';
const LIGHT = '#ffffff';

/**
 * Returns the brand dark or white based on which gives better contrast.
 * Threshold tuned so EQC-green (#1a7a54) and similar mid-tones land on white.
 */
export function getReadableTextColor(bgHex: string | undefined): typeof DARK | typeof LIGHT {
  if (!bgHex) return LIGHT;
  const rgb = hexToRgb(bgHex);
  if (!rgb) return LIGHT;
  return relativeLuminance(rgb) > 0.55 ? DARK : LIGHT;
}

/**
 * Returns a translucent accent (white at 70% alpha on dark bgs, eqc-green on light bgs)
 * for source/label chips that need to stand out from the main text.
 */
export function getAccentTextColor(bgHex: string | undefined): string {
  const text = getReadableTextColor(bgHex);
  return text === LIGHT ? 'rgba(255,255,255,0.85)' : '#1a7a54';
}
