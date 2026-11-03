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
