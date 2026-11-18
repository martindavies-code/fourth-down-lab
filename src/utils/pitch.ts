import { contrastRatio } from './palette.ts';
import { getTeamInfo } from './teamLogos.ts';

export const PITCH_VIEWBOX_WIDTH = 600;
export const PITCH_VIEWBOX_HEIGHT = 116;
export const END_ZONE_WIDTH = 50; // 10 yards * 5 px/yd
export const FIELD_PLAY_WIDTH = 500; // 100 yards * 5 px/yd
export const FIELD_TOP = 8;
export const FIELD_HEIGHT = 100;
export const FIELD_CENTER_Y = FIELD_TOP + FIELD_HEIGHT / 2;

export interface PitchGeometry {
  /** Yards from posteam's own goal line (1..99). */
  losYard: number;
  /** Yards from posteam's own goal line to the target line (first down or goal line, <= 100). */
  targetYard: number;
  /** True when ydstogo >= yardline_100 (4th & Goal). */
  isGoalToGo: boolean;
  /** True when inside opponent's 20-yard line (yardline_100 <= 20). */
  isRedZone: boolean;
  /** Yards remaining to opponent's goal line (1..99). */
  yardsToGoal: number;
  /** SVG X coordinate of the Line of Scrimmage (55..545). */
  losX: number;
  /** SVG X coordinate of the first-down or goal line (<= 550). */
  targetX: number;
  /** SVG X coordinate for the tip of the forward drive arrow pointing toward defteam end zone. */
  arrowEndX: number;
  /** True when near goal line so trailing chevrons help visualize forward momentum into the end zone. */
  showTrailingChevrons: boolean;
}

export interface EndZoneStyle {
  label: string;
  background: string;
  accent: string;
  textColor: '#ffffff' | '#020617';
}

/**
 * Computes normalized field coordinates (posteam driving left-to-right toward defteam end zone)
 * from nflverse yardline_100 (yards to opponent goal line) and ydstogo.
 */
export function computePitchGeometry(yardline100: number, ydstogo: number): PitchGeometry {
  const safeYardline100 = Number.isFinite(yardline100)
    ? Math.min(99, Math.max(1, yardline100))
    : 50;
  const safeYdsToGo = Number.isFinite(ydstogo) ? Math.max(0.5, ydstogo) : 10;

  const losYard = 100 - safeYardline100;
  const isGoalToGo = safeYdsToGo >= safeYardline100;
  const targetYard = isGoalToGo ? 100 : Math.min(100, losYard + safeYdsToGo);
  const isRedZone = safeYardline100 <= 20;

  const losX = END_ZONE_WIDTH + losYard * 5;
  const targetX = END_ZONE_WIDTH + targetYard * 5;
  // Clamp tip before the rotated opponent end-zone label centered around x = 578
  const arrowEndX = Math.min(564, losX + 44);
  const showTrailingChevrons = losX > 522;

  return {
    losYard,
    targetYard,
    isGoalToGo,
    isRedZone,
    yardsToGoal: Math.round(safeYardline100),
    losX,
    targetX,
    arrowEndX,
    showTrailingChevrons,
  };
}

/**
 * Returns team-colored end zone background, accent stripe, and WCAG-optimal contrasting label color.
 */
export function getEndZoneStyle(teamAbbr: string): EndZoneStyle {
  const clean = teamAbbr?.toUpperCase().trim() || 'NFL';
  const info = getTeamInfo(clean);
  const background = info?.primaryColor ?? '#1e293b';
  const accent = info?.secondaryColor ?? '#64748b';

  const whiteContrast = contrastRatio(background, '#ffffff');
  const darkContrast = contrastRatio(background, '#020617');
  const textColor = whiteContrast >= darkContrast ? '#ffffff' : '#020617';

  return {
    label: clean,
    background,
    accent,
    textColor,
  };
}
