import {
  cleanYardFloat,
  formatDownAndDistance,
  formatYardline,
  formatYardNumber,
  isValidYardline100,
  isValidYardsToGo,
} from './formatting.ts';
import { contrastRatio } from './palette.ts';
import { getTeamInfo } from './teamLogos.ts';

export const PITCH_VIEWBOX_WIDTH = 600;
export const PITCH_VIEWBOX_HEIGHT = 116;
export const END_ZONE_WIDTH = 50; // 10 yards * 5 px/yd
export const FIELD_PLAY_WIDTH = 500; // 100 yards * 5 px/yd
export const FIELD_TOP = 8;
export const FIELD_HEIGHT = 100;
export const FIELD_CENTER_Y = FIELD_TOP + FIELD_HEIGHT / 2;

export type PitchValidityStatus = 'valid' | 'invalid_distance' | 'invalid_position';

export interface PitchGeometry {
  /** Explicit validity state distinguishing complete play geometry, known spot only, and invalid spot. */
  status: PitchValidityStatus;
  /** True only when both yardline_100 and ydstogo are valid. */
  isValid: boolean;
  /** True when yardline_100 is strictly inside the field of play (0 < yardline_100 < 100). */
  hasValidPosition: boolean;
  /** True when ydstogo is strictly positive and within bounds (0 < ydstogo < 100). */
  hasValidDistance: boolean;
  /** Yards from posteam's own goal line (0 < losYard < 100), or null when position is invalid. */
  losYard: number | null;
  /** Yards from posteam's own goal line to the target line (<= 100), or null when incomplete. */
  targetYard: number | null;
  /** True when ydstogo >= yardline_100 (4th & Goal) on valid geometry. */
  isGoalToGo: boolean;
  /** True when inside opponent's 20-yard line (yardline_100 <= 20) on a valid spot. */
  isRedZone: boolean;
  /** Yards remaining to opponent's goal line (0 < yardsToGoal < 100), or null when position is invalid. */
  yardsToGoal: number | null;
  /** Valid yards needed for a first down (0 < yardsToGain < 100), or null when distance is invalid. */
  yardsToGain: number | null;
  /** SVG X coordinate of the Line of Scrimmage (strictly inside 50..550), or null when position is invalid. */
  losX: number | null;
  /** SVG X coordinate of the first-down or goal line (<= 550), or null when incomplete. */
  targetX: number | null;
  /** SVG X coordinate for the tip of the forward drive arrow pointing toward defteam end zone. */
  arrowEndX: number | null;
  /** True when near goal line so trailing chevrons help visualize forward momentum into the end zone. */
  showTrailingChevrons: boolean;
}

export interface PitchMapDescription {
  geometry: PitchGeometry;
  spotLabel: string;
  losLabel: string;
  targetLabel: string;
  distanceToEzLabel: string;
  unavailableBannerText: string | null;
  ariaLabel: string;
}

export interface EndZoneStyle {
  label: string;
  background: string;
  accent: string;
  textColor: '#ffffff' | '#020617';
}

/**
 * Computes normalized field coordinates (posteam driving left-to-right toward defteam end zone)
 * from nflverse yardline_100 (0 < yardline_100 < 100) and ydstogo (0 < ydstogo < 100).
 * Missing, non-finite, or out-of-field inputs (including exact 0 and 100) produce explicit invalid states without fabrication.
 */
export function computePitchGeometry(
  yardline100: number | null | undefined,
  ydstogo: number | null | undefined
): PitchGeometry {
  const hasValidPosition = isValidYardline100(yardline100);
  const hasValidDistance = isValidYardsToGo(ydstogo);

  if (!hasValidPosition) {
    return {
      status: 'invalid_position',
      isValid: false,
      hasValidPosition: false,
      hasValidDistance,
      losYard: null,
      targetYard: null,
      isGoalToGo: false,
      isRedZone: false,
      yardsToGoal: null,
      yardsToGain: hasValidDistance ? cleanYardFloat(ydstogo) : null,
      losX: null,
      targetX: null,
      arrowEndX: null,
      showTrailingChevrons: false,
    };
  }

  const rawLosYard = 100 - yardline100;
  const losYard = cleanYardFloat(rawLosYard);
  const yardsToGoal = cleanYardFloat(yardline100);
  const isRedZone = yardline100 <= 20;
  const losX = cleanYardFloat(END_ZONE_WIDTH + losYard * 5);
  // Clamp tip cleanly before the rotated opponent end-zone label centered at x = 581
  const arrowEndX = Math.min(570, cleanYardFloat(losX + 44));
  const showTrailingChevrons = losX > 522;

  if (!hasValidDistance) {
    return {
      status: 'invalid_distance',
      isValid: false,
      hasValidPosition: true,
      hasValidDistance: false,
      losYard,
      targetYard: null,
      isGoalToGo: false,
      isRedZone,
      yardsToGoal,
      yardsToGain: null,
      losX,
      targetX: null,
      arrowEndX,
      showTrailingChevrons,
    };
  }

  const isGoalToGo = ydstogo >= yardline100;
  const rawTargetYard = isGoalToGo ? 100 : Math.min(100, losYard + ydstogo);
  const targetYard = cleanYardFloat(rawTargetYard);
  const yardsToGain = cleanYardFloat(ydstogo);
  const targetX = cleanYardFloat(END_ZONE_WIDTH + targetYard * 5);

  return {
    status: 'valid',
    isValid: true,
    hasValidPosition: true,
    hasValidDistance: true,
    losYard,
    targetYard,
    isGoalToGo,
    isRedZone,
    yardsToGoal,
    yardsToGain,
    losX,
    targetX,
    arrowEndX,
    showTrailingChevrons,
  };
}

/**
 * Derives consistent geometry, visible labels, and accessible label for FieldPitchMap.
 */
export function describePitchMap(params: {
  posteam: string;
  defteam: string;
  down: number | null | undefined;
  ydstogo: number | null | undefined;
  yardline100: number | null | undefined;
}): PitchMapDescription {
  const { posteam, defteam, down, ydstogo, yardline100 } = params;
  const geometry = computePitchGeometry(yardline100, ydstogo);

  if (geometry.status === 'invalid_position') {
    return {
      geometry,
      spotLabel: 'Position unavailable',
      losLabel: 'LOS unavailable',
      targetLabel: 'Target unavailable',
      distanceToEzLabel: `Distance to ${defteam} EZ unavailable`,
      unavailableBannerText: 'Field position unavailable',
      ariaLabel: `Field map unavailable: field position unavailable for ${posteam} vs ${defteam}.`,
    };
  }

  const spotLabel = formatYardline(yardline100, posteam, defteam);
  const losLabel = `LOS (${spotLabel})`;
  const ydsOut = formatYardNumber(yardline100 as number);
  const distanceToEzLabel = `${ydsOut} yds to ${defteam} EZ`;

  if (geometry.status === 'invalid_distance') {
    return {
      geometry,
      spotLabel,
      losLabel,
      targetLabel: '1st down target unavailable',
      distanceToEzLabel,
      unavailableBannerText: null,
      ariaLabel: `Field map: ${posteam} ball at ${spotLabel}, distance to gain unavailable, driving toward ${defteam} end zone (${ydsOut} yards away).`,
    };
  }

  const targetLabel = geometry.isGoalToGo
    ? 'Goal line'
    : `1st down (${formatYardNumber(ydstogo as number)} yds)`;
  const downDistLabel = formatDownAndDistance(down, ydstogo, yardline100);

  return {
    geometry,
    spotLabel,
    losLabel,
    targetLabel,
    distanceToEzLabel,
    unavailableBannerText: null,
    ariaLabel: `Field map: ${posteam} ball at ${spotLabel}, ${downDistLabel}, driving toward ${defteam} end zone (${ydsOut} yards away).`,
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
