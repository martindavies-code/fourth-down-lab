/**
 * British English formatting helpers for Fourth Down Lab.
 */

export function formatTimeRemaining(qtr: number, qtrSeconds: number): string {
  const mins = Math.floor(qtrSeconds / 60);
  const secs = Math.floor(qtrSeconds % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  
  if (qtr <= 4) {
    return `Q${qtr} ${timeStr}`;
  }
  return `OT ${timeStr}`;
}

export function cleanYardFloat(value: number): number {
  return Number(value.toPrecision(12));
}

export function isValidYardline100(yardline100: unknown): yardline100 is number {
  return (
    typeof yardline100 === 'number' &&
    Number.isFinite(yardline100) &&
    yardline100 > 0 &&
    yardline100 < 100
  );
}

export function isValidYardsToGo(ydstogo: unknown): ydstogo is number {
  return (
    typeof ydstogo === 'number' &&
    Number.isFinite(ydstogo) &&
    ydstogo > 0 &&
    ydstogo < 100
  );
}

export function formatYardNumber(yards: number): string {
  const clean = cleanYardFloat(yards);
  if (Number.isInteger(clean)) {
    return String(clean);
  }
  if (clean > 0 && clean < 0.1) {
    return '<0.1';
  }
  if (clean > 99.9 && clean < 100) {
    return '99.9';
  }
  if (clean > 49.9 && clean < 50) {
    return '49.9';
  }
  const rounded1 = Math.round(clean * 10) / 10;
  return Number.isInteger(rounded1) ? String(rounded1) : rounded1.toFixed(1);
}

export function formatYardline(
  yardline100: number | null | undefined,
  posteam: string,
  defteam: string
): string {
  if (!isValidYardline100(yardline100)) {
    return 'Position unavailable';
  }
  const y100 = cleanYardFloat(yardline100);
  if (y100 === 50) return '50';
  if (y100 < 50) {
    return `${defteam} ${formatYardNumber(y100)}`;
  }
  return `${posteam} ${formatYardNumber(cleanYardFloat(100 - y100))}`;
}

export function formatDownAndDistance(
  _down: number | null | undefined,
  ydstogo: number | null | undefined,
  yardline100: number | null | undefined
): string {
  if (!isValidYardsToGo(ydstogo)) {
    return '4th & unavailable';
  }
  if (isValidYardline100(yardline100) && ydstogo >= yardline100) {
    return `4th & Goal`;
  }
  return `4th & ${formatYardNumber(ydstogo)}`;
}

export function formatProbability(prob: number | null | undefined): string {
  if (prob === null || prob === undefined || isNaN(prob)) return 'n/a';
  if (prob === 0) return '0%';
  if (prob > 0 && prob < 0.001) return '<0.1%';
  if (prob >= 0.999 && prob < 1) return '>99.9%';
  if (prob === 1) return '100%';
  return `${(prob * 100).toFixed(1)}%`;
}

export function formatPointsDifference(pp: number | null | undefined): string {
  if (pp === null || pp === undefined || isNaN(pp)) return 'n/a';
  const sign = pp > 0 ? '+' : '';
  return `${sign}${pp.toFixed(1)} pp`;
}

export function formatScoreDifferential(diff: number, posteam: string, _defteam?: string): string {
  if (diff === 0) return 'Tied';
  if (diff > 0) return `${posteam} leading by ${Math.round(diff)}`;
  return `${posteam} trailing by ${Math.round(Math.abs(diff))}`;
}

export interface ScoreDifferentialBadge {
  label: string;
  shortLabel: string;
  type: 'leading' | 'trailing' | 'tied';
}

export function getScoreDifferentialBadge(diff: number, posteam: string): ScoreDifferentialBadge {
  const rounded = Math.round(diff);
  if (rounded === 0) {
    return { label: 'Tied Game', shortLabel: 'TIED', type: 'tied' };
  }
  if (rounded > 0) {
    return {
      label: `${posteam} +${rounded}`,
      shortLabel: `+${rounded}`,
      type: 'leading',
    };
  }
  return {
    label: `${posteam} -${Math.abs(rounded)}`,
    shortLabel: `-${Math.abs(rounded)}`,
    type: 'trailing',
  };
}

export interface FieldPositionInfo {
  yardlineText: string;
  territoryText: string;
  yardsToGoal: number | null;
  isRedZone: boolean;
  isValid: boolean;
}

export function getFieldPositionInfo(
  yardline100: number | null | undefined,
  posteam: string,
  defteam: string
): FieldPositionInfo {
  if (!isValidYardline100(yardline100)) {
    return {
      yardlineText: 'Position unavailable',
      territoryText: 'Position unavailable',
      yardsToGoal: null,
      isRedZone: false,
      isValid: false,
    };
  }

  const y100 = cleanYardFloat(yardline100);
  const isRedZone = yardline100 <= 20;

  if (y100 === 50) {
    return {
      yardlineText: '50',
      territoryText: 'Midfield (50)',
      yardsToGoal: 50,
      isRedZone: false,
      isValid: true,
    };
  }

  if (y100 < 50) {
    const oppYardText = formatYardNumber(y100);
    return {
      yardlineText: `${defteam} ${oppYardText}`,
      territoryText: `Opponent ${oppYardText}`,
      yardsToGoal: y100,
      isRedZone,
      isValid: true,
    };
  }

  const ownYard = cleanYardFloat(100 - y100);
  const ownYardText = formatYardNumber(ownYard);
  return {
    yardlineText: `${posteam} ${ownYardText}`,
    territoryText: `Own ${ownYardText}`,
    yardsToGoal: y100,
    isRedZone: false,
    isValid: true,
  };
}

/**
 * Derives a human-readable week range string from weeks list or decision array.
 * Returns formatted string like 'Weeks 1–9' or 'Week 1', or 'unavailable' if data is empty.
 */
export function formatWeekRange(
  weeks?: number[] | null,
  decisions?: { week: number }[] | null,
  prefix: string = 'Weeks '
): string {
  let derived: number[] = [];
  if (weeks && weeks.length > 0) {
    derived = weeks;
  } else if (decisions && decisions.length > 0) {
    derived = Array.from(new Set(decisions.map((d) => d.week)));
  }

  if (derived.length === 0) {
    return 'unavailable';
  }

  const min = Math.min(...derived);
  const max = Math.max(...derived);
  if (min === max) {
    return `Week ${min}`;
  }
  return `${prefix}${min}–${max}`;
}

/**
 * Derives a Japanese week range string from weeks list or decision array.
 * Returns formatted string like '第1週〜第9週' or '第1週', or 'unavailable' if data is empty.
 */
export function formatWeekRangeJa(
  weeks?: number[] | null,
  decisions?: { week: number }[] | null
): string {
  let derived: number[] = [];
  if (weeks && weeks.length > 0) {
    derived = weeks;
  } else if (decisions && decisions.length > 0) {
    derived = Array.from(new Set(decisions.map((d) => d.week)));
  }

  if (derived.length === 0) {
    return 'unavailable';
  }

  const min = Math.min(...derived);
  const max = Math.max(...derived);
  if (min === max) {
    return `第${min}週`;
  }
  return `第${min}週〜第${max}週`;
}

/**
 * Formats a count value or falls back to 'unavailable' when undefined, null, or NaN.
 */
export function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined || isNaN(count)) {
    return 'unavailable';
  }
  return count.toLocaleString();
}


