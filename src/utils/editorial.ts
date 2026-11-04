import type { Decision } from '../types/decision.ts';

/**
 * Data-derived facts behind the Season Editorial Analysis stories.
 * Every narrative claim on that page must trace back to these numbers;
 * when the data changes, the wording follows it.
 */

/** Cost band above which a call counts as a substantial model error. */
export const COSTLY_ERROR_THRESHOLD_PP = 3.0;

export interface AggressionStats {
  totalDecisions: number;
  goAttempts: number;
  /** Go attempts that cost more than the threshold vs the model's preferred option. */
  overAggressiveCount: number;
  /** Punts or field-goal attempts that cost more than the threshold. */
  conservativeErrorCount: number;
}

function finiteCost(d: Decision): number | null {
  return typeof d.cost_pp === 'number' && Number.isFinite(d.cost_pp) ? d.cost_pp : null;
}

export function computeAggressionStats(decisions: Decision[]): AggressionStats {
  let goAttempts = 0;
  let overAggressiveCount = 0;
  let conservativeErrorCount = 0;

  for (const d of decisions) {
    const cost = finiteCost(d);
    if (d.actual_choice === 'go') {
      goAttempts += 1;
      if (cost !== null && cost > COSTLY_ERROR_THRESHOLD_PP) overAggressiveCount += 1;
    } else if (d.actual_choice === 'punt' || d.actual_choice === 'field_goal') {
      if (cost !== null && cost > COSTLY_ERROR_THRESHOLD_PP) conservativeErrorCount += 1;
    }
  }

  return {
    totalDecisions: decisions.length,
    goAttempts,
    overAggressiveCount,
    conservativeErrorCount,
  };
}

/** True only while costly conservative errors outnumber costly gambles. */
export function conservatismDominates(stats: AggressionStats): boolean {
  return stats.conservativeErrorCount > stats.overAggressiveCount;
}

export function overAggressionHeadline(stats: AggressionStats): string {
  return stats.overAggressiveCount === 0
    ? 'The Myth of "Reckless Aggression" in Modern NFL Coaching'
    : 'The Rarity of "Reckless Aggression" in Modern NFL Coaching';
}

/** Season label for headings, taken from the data rather than hardcoded. */
export function seasonOf(decisions: Decision[], metaSeason?: number | null): number | null {
  if (typeof metaSeason === 'number' && Number.isFinite(metaSeason)) return metaSeason;
  const first = decisions[0]?.season;
  return typeof first === 'number' && Number.isFinite(first) ? first : null;
}
