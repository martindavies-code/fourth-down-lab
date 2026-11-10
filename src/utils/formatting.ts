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

export function formatYardline(yardline100: number, posteam: string, defteam: string): string {
  if (yardline100 === 50) return '50';
  if (yardline100 < 50) {
    return `${defteam} ${Math.round(yardline100)}`;
  }
  return `${posteam} ${Math.round(100 - yardline100)}`;
}

export function formatDownAndDistance(_down: number, ydstogo: number, yardline100: number): string {
  const dist = Math.round(ydstogo);
  if (dist >= yardline100) {
    return `4th & Goal`;
  }
  return `4th & ${dist}`;
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
  yardsToGoal: number;
  isRedZone: boolean;
}

export function getFieldPositionInfo(yardline100: number, posteam: string, defteam: string): FieldPositionInfo {
  const y100 = Math.round(yardline100);
  const isRedZone = y100 <= 20;

  if (y100 === 50) {
    return {
      yardlineText: '50',
      territoryText: 'Midfield (50)',
      yardsToGoal: 50,
      isRedZone: false,
    };
  }

  if (y100 < 50) {
    return {
      yardlineText: `${defteam} ${y100}`,
      territoryText: `Opponent ${y100}`,
      yardsToGoal: y100,
      isRedZone,
    };
  }

  const ownYard = 100 - y100;
  return {
    yardlineText: `${posteam} ${ownYard}`,
    territoryText: `Own ${ownYard}`,
    yardsToGoal: y100,
    isRedZone: false,
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


