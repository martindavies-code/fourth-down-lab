import type { ModelComparison, ModelComparisonPlay } from '../types/decision';

/** Lookup key shared by every page that pairs a decision with its reference row. */
export function comparisonKey(gameId: string, playId: number): string {
  return `${gameId}_${playId}`;
}

/** Indexes the comparison layer's plays for O(1) lookup from decision cards. */
export function buildComparisonIndex(
  comparison: ModelComparison | null | undefined,
): Map<string, ModelComparisonPlay> {
  const map = new Map<string, ModelComparisonPlay>();
  if (!comparison) return map;
  for (const play of comparison.plays) {
    map.set(comparisonKey(play.game_id, play.play_id), play);
  }
  return map;
}

/** Short display label for a reference verdict band. */
export function refVerdictShortLabel(refVerdict: string): string {
  if (refVerdict === 'Reasonable') return 'Reasonable';
  if (refVerdict === 'Model leaned the other way') return 'Leaned the other way';
  if (refVerdict === 'Model strongly preferred another option') return 'Strongly preferred another option';
  return refVerdict;
}

/** True when the development rebuild reaches a different verdict band. */
export function refVerdictDiffers(siteVerdict: string, refVerdict: string | null): boolean {
  return refVerdict !== null && refVerdict !== siteVerdict;
}
