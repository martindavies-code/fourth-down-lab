import type { Decision } from '../types/decision.ts';

/**
 * Shared, honest sorting for decision lists (feed and game pages).
 *
 * Rules:
 * - Unknown values (null / non-finite) always sort LAST in every direction.
 *   They are unknown, never zero.
 * - Ties resolve deterministically, independent of input order.
 * - Input arrays are never mutated.
 */

export type DecisionSortKey =
  | 'recent'
  | 'oldest'
  | 'chronological'
  | 'cost_desc'
  | 'cost_asc'
  | 'wpa_swing'
  | 'distance_desc';

export interface SortOption {
  key: DecisionSortKey;
  label: string;
}

export const FEED_SORT_OPTIONS: SortOption[] = [
  { key: 'recent', label: 'Most recent (latest week first)' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'cost_desc', label: 'Biggest model cost (pp)' },
  { key: 'cost_asc', label: 'Smallest model cost (pp)' },
  { key: 'wpa_swing', label: 'Biggest realised WPA swing' },
  { key: 'distance_desc', label: 'Longest 4th-down distance' },
];

export const GAME_SORT_OPTIONS: SortOption[] = [
  { key: 'chronological', label: 'Chronological (play order)' },
  { key: 'cost_desc', label: 'Biggest model cost (pp)' },
  { key: 'cost_asc', label: 'Smallest model cost (pp)' },
  { key: 'wpa_swing', label: 'Biggest realised WPA swing' },
  { key: 'distance_desc', label: 'Longest 4th-down distance' },
];

const ALL_OPTIONS: SortOption[] = [...FEED_SORT_OPTIONS, ...GAME_SORT_OPTIONS];

export function sortLabel(key: DecisionSortKey): string {
  return ALL_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

function finiteOrNull(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Pre-snap model cost in percentage points. Prefers the exact unrounded
 * cost_pp (the value classifications are evaluated on); falls back to the
 * displayed rounded value only when the exact value is missing.
 */
export function decisionCostPp(d: Decision): number | null {
  return finiteOrNull(d.cost_pp) ?? finiteOrNull(d.display_cost_pp);
}

/** Absolute realised WPA swing in percentage points (post-play nflverse model). */
export function wpaSwingPp(d: Decision): number | null {
  const wpa = finiteOrNull(d.outcome?.realised_wpa);
  return wpa === null ? null : Math.abs(wpa) * 100;
}

function distanceYards(d: Decision): number | null {
  return finiteOrNull(d.ydstogo);
}

/** Deterministic recency tiebreak: latest week, then game id, then play id. */
function recencyTiebreak(a: Decision, b: Decision): number {
  if (a.week !== b.week) return b.week - a.week;
  if (a.game_id !== b.game_id) return a.game_id < b.game_id ? 1 : -1;
  return b.play_id - a.play_id;
}

function metricValue(d: Decision, key: DecisionSortKey): number | null {
  switch (key) {
    case 'cost_desc':
    case 'cost_asc':
      return decisionCostPp(d);
    case 'wpa_swing':
      return wpaSwingPp(d);
    case 'distance_desc':
      return distanceYards(d);
    default:
      return null;
  }
}

export function compareDecisions(a: Decision, b: Decision, key: DecisionSortKey): number {
  switch (key) {
    case 'chronological':
      // play_id increases with the real play sequence. game_seconds_remaining
      // is NOT safe for this: it resets at the start of overtime.
      return a.play_id - b.play_id;
    case 'recent':
      // Latest week first; within a week keep the pipeline's data order
      // (Array.prototype.sort is stable).
      return b.week - a.week;
    case 'oldest':
      return a.week - b.week;
    default: {
      const va = metricValue(a, key);
      const vb = metricValue(b, key);
      if (va === null && vb === null) return recencyTiebreak(a, b);
      if (va === null) return 1; // unknown always last
      if (vb === null) return -1;
      if (va !== vb) {
        const dir = key === 'cost_asc' ? 1 : -1;
        return va < vb ? -dir : dir;
      }
      return recencyTiebreak(a, b);
    }
  }
}

export function sortDecisions(decisions: Decision[], key: DecisionSortKey): Decision[] {
  return [...decisions].sort((a, b) => compareDecisions(a, b, key));
}

/** Minimal shape shared by cancelled and excluded snaps. */
export interface SnapLike {
  week: number;
  game_id: string;
  play_id: number;
}

/** Recent/oldest ordering for audited non-executed snaps (no model metrics exist). */
export function sortSnaps<T extends SnapLike>(snaps: T[], key: 'recent' | 'oldest'): T[] {
  const dir = key === 'oldest' ? 1 : -1;
  return [...snaps].sort(
    (a, b) =>
      (a.week - b.week) * dir ||
      (a.game_id < b.game_id ? -1 : a.game_id > b.game_id ? 1 : 0) * dir ||
      (a.play_id - b.play_id) * dir
  );
}
