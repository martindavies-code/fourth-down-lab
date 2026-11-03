import type { Decision, OptionName } from '../types/decision.ts';
import { formatProbability } from './formatting.ts';

/**
 * Story + comparison helpers for the situation card.
 * Everything here is derived from the decision data. Nothing is hardcoded flavour text,
 * and no model output, threshold or verdict logic is changed.
 */

export const OPTION_LABELS: Record<OptionName, string> = {
  go: 'Go for it',
  field_goal: 'Field goal',
  punt: 'Punt',
};

const OPTION_GERUND: Record<OptionName, string> = {
  go: 'going for it',
  field_goal: 'kicking',
  punt: 'punting',
};

const OPTION_ORDER: OptionName[] = ['go', 'field_goal', 'punt'];

export interface BarRow {
  key: OptionName;
  label: string;
  modelled: boolean;
  wp: number | null;
  isTaken: boolean;
  /** pp below the highest modelled option, null for the top row or unmodelled rows */
  deltaPp: number | null;
  /** recorded reason (used for unmodelled rows) */
  reason: string;
}

export interface Story {
  isPartial: boolean;
  isOvertime: boolean;
  /** false when the play is outside the validated model domain */
  showVerdict: boolean;
  modelledCount: number;
  unmodelledNames: string[];
  /** sentence 1: what the team did and what happened */
  actionSentence: string;
  /** sentence 2: how the modelled options compared */
  comparisonSentence: string;
  /** shown directly at the verdict line when any option is unmodelled */
  completenessLine: string | null;
  /** shown at verdict level when outside the validated domain */
  domainCaveat: string | null;
  rows: BarRow[];
  isTossUp: boolean;
}

export function isPartialComparison(d: Decision): boolean {
  return Boolean(
    d.is_partial_comparison || (d.yardline_100 < 31 && d.options.punt.status === 'UNMODELLED')
  );
}

export function isOvertimePlay(d: Decision): boolean {
  return Boolean(d.is_overtime || d.qtr >= 5);
}

export function buildRows(d: Decision): BarRow[] {
  const modelled = OPTION_ORDER.filter(
    (k) => d.options[k].status === 'AVAILABLE' && d.options[k].wp !== null && d.options[k].wp !== undefined
  )
    .map((k) => ({ k, wp: d.options[k].wp as number }))
    .sort((a, b) => b.wp - a.wp);
  const top = modelled.length ? modelled[0].wp : null;

  const rows: BarRow[] = modelled.map(({ k, wp }) => ({
    key: k,
    label: OPTION_LABELS[k],
    modelled: true,
    wp,
    isTaken: d.actual_choice === k,
    deltaPp: top !== null && top - wp > 0.001 ? (top - wp) * 100 : null,
    reason: d.options[k].reason,
  }));

  for (const k of OPTION_ORDER) {
    if (!modelled.some((m) => m.k === k)) {
      rows.push({
        key: k,
        label: OPTION_LABELS[k],
        modelled: false,
        wp: null,
        isTaken: d.actual_choice === k,
        deltaPp: null,
        reason: d.options[k].reason,
      });
    }
  }
  return rows;
}

export function actionSentence(d: Decision): string {
  const o = d.outcome;
  if (d.actual_choice === 'go') {
    if (o.converted) return `${d.posteam} went for it and converted (+${Math.round(o.yards_gained)} yds).`;
    return `${d.posteam} went for it and failed (${Math.round(o.yards_gained)} yds), a turnover on downs.`;
  }
  if (d.actual_choice === 'field_goal') {
    const dist = o.kick_distance ? `${o.kick_distance}-yard ` : '';
    return o.field_goal_result === 'made'
      ? `${d.posteam} kicked the ${dist}field goal. Good.`
      : `${d.posteam} tried the ${dist}field goal. No good.`;
  }
  if (d.actual_choice === 'punt') {
    return `${d.posteam} punted.`;
  }
  return `${d.posteam} chose ${String(d.actual_choice)}.`;
}

function pct(wp: number): string {
  return formatProbability(wp);
}

export function comparisonSentence(d: Decision, rows: BarRow[]): string {
  const modelled = rows.filter((r) => r.modelled);
  const taken = d.actual_choice as OptionName;
  const takenRow = rows.find((r) => r.key === taken);

  if (modelled.length === 0) return 'No option was modelled for this snap.';
  if (!takenRow || !takenRow.modelled) {
    return `${OPTION_LABELS[taken] ?? String(taken)} was not modelled here, so it cannot be compared with the other options.`;
  }
  if (modelled.length === 1) {
    return `Only ${takenRow.label.toLowerCase()} was modelled (${pct(takenRow.wp as number)}).`;
  }

  // Overtime is outside the validated domain: describe the numbers, no recommendation framing.
  if (isOvertimePlay(d)) {
    return `Modelled win probability: ${modelled.map((r) => `${r.label.toLowerCase()} ${pct(r.wp as number)}`).join(', ')}.`;
  }

  const top = modelled[0];
  const second = modelled[1];
  if (takenRow.key === top.key) {
    const margin = ((top.wp as number) - (second.wp as number)) * 100;
    if (d.is_toss_up) {
      return `${capitalise(OPTION_GERUND[top.key])} narrowly led ${OPTION_GERUND[second.key]}, ${pct(top.wp as number)} vs ${pct(second.wp as number)}. A toss-up.`;
    }
    return `${capitalise(OPTION_GERUND[top.key])} led ${OPTION_GERUND[second.key]} by ${margin.toFixed(1)} pp, ${pct(top.wp as number)} vs ${pct(second.wp as number)}.`;
  }

  // The taken option was not the highest modelled one.
  const gap = takenRow.deltaPp ?? 0;
  if (d.is_toss_up && d.preferred_options.includes(taken)) {
    return `${capitalise(OPTION_GERUND[taken])} and ${OPTION_GERUND[top.key]} were a toss-up, ${pct(takenRow.wp as number)} vs ${pct(top.wp as number)}.`;
  }
  return `The model rated ${OPTION_GERUND[top.key]} ${gap.toFixed(1)} pp higher than ${OPTION_GERUND[taken]}, ${pct(top.wp as number)} vs ${pct(takenRow.wp as number)}.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildStory(d: Decision): Story {
  const rows = buildRows(d);
  const modelled = rows.filter((r) => r.modelled);
  const unmodelled = rows.filter((r) => !r.modelled);
  const isPartial = isPartialComparison(d) || unmodelled.length > 0;
  const isOvertime = isOvertimePlay(d);
  const modelledCount = d.modeled_options_count ?? modelled.length;
  const unmodelledNames = unmodelled.map((r) => r.label.toLowerCase());

  return {
    isPartial,
    isOvertime,
    showVerdict: !isOvertime,
    modelledCount,
    unmodelledNames,
    actionSentence: actionSentence(d),
    comparisonSentence: comparisonSentence(d, rows),
    completenessLine: isPartial
      ? `${modelledCount} of 3 options modelled${unmodelledNames.length ? ` - ${unmodelledNames.join(' and ')} not included` : ''}.`
      : null,
    domainCaveat: isOvertime
      ? "Overtime is outside the model's validated regular-season domain, so these numbers are context, not a recommendation."
      : null,
    rows,
    isTossUp: d.is_toss_up,
  };
}

/** Verdict band presentation. Bands and thresholds come from the data (verdict_label), unchanged. */
export type VerdictTone = 'ok' | 'lean' | 'strong' | 'unknown';

export function verdictTone(label: string): VerdictTone {
  if (label.startsWith('Reasonable')) return 'ok';
  if (label.startsWith('Model leaned')) return 'lean';
  if (label.startsWith('Model strongly preferred')) return 'strong';
  return 'unknown';
}
