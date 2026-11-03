/** Card palette (hex). Used by the contrast test so the card text stays readable. */
export const CARD_BG = '#0d121e';
export const CARD_PALETTE = {
  ink: '#ffffff',
  inkSecondary: '#cbd5e1', // slate-300
  inkMuted: '#94a3b8', // slate-400
  accentTaken: '#fbbf24', // amber-400, "the team's actual choice"
  good: '#6ee7b7', // emerald-300
  warn: '#fcd34d', // amber-300
  bad: '#fda4af', // rose-300
  info: '#7dd3fc', // sky-300
} as const;

function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
