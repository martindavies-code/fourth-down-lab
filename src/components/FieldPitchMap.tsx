import React, { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  describePitchMap,
  END_ZONE_WIDTH,
  FIELD_CENTER_Y,
  FIELD_HEIGHT,
  FIELD_PLAY_WIDTH,
  FIELD_TOP,
  getEndZoneStyle,
  PITCH_VIEWBOX_HEIGHT,
  PITCH_VIEWBOX_WIDTH,
} from '../utils/pitch';

interface FieldPitchMapProps {
  posteam: string;
  defteam: string;
  down: number | null | undefined;
  ydstogo: number | null | undefined;
  yardline100: number | null | undefined;
  yardlineText?: string;
}

const TURF_BANDS = Array.from({ length: 20 }, (_, i) => i);
const MAJOR_YARD_LINES = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const FIVE_YARD_LINES = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
const SIDELINE_TICKS = Array.from({ length: 99 }, (_, i) => i + 1).filter((y) => y % 5 !== 0);

/**
 * Visualizes a single 4th-down pre-snap situation on a 120-yard NFL field:
 * posteam drives left-to-right from their own end zone toward defteam's end zone,
 * highlighting the line of scrimmage, first-down/goal target line, and drive direction.
 */
export const FieldPitchMap: React.FC<FieldPitchMapProps> = ({
  posteam,
  defteam,
  down,
  ydstogo,
  yardline100,
}) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `pitch-clip-${uid}`;

  const desc = describePitchMap({ posteam, defteam, down, ydstogo, yardline100 });
  const { geometry } = desc;
  const ownEz = getEndZoneStyle(posteam);
  const oppEz = getEndZoneStyle(defteam);

  const fieldBottom = FIELD_TOP + FIELD_HEIGHT;
  const hasPosition = geometry.hasValidPosition && geometry.losX !== null && geometry.arrowEndX !== null;
  const hasCompleteTarget = geometry.status === 'valid' && geometry.losX !== null && geometry.targetX !== null;
  const losX = geometry.losX ?? 0;
  const targetX = geometry.targetX ?? 0;
  const shaftStartX = losX + 8.5;
  const arrowTipX = geometry.arrowEndX ?? 0;
  const headLength = Math.min(9.5, Math.max(6, (arrowTipX - shaftStartX) * 0.55));
  const headHalfHeight = Math.min(6, Math.max(4.2, headLength * 0.62));
  const arrowBaseX = arrowTipX - headLength;
  const shaftEndX = Math.max(shaftStartX + 1, arrowBaseX + 1);

  return (
    <div
      className="w-full rounded-lg border border-slate-700/70 bg-[#080d1a] px-2.5 py-2 shadow-inner"
      role="img"
      aria-label={desc.ariaLabel}
    >
      {/* Top direction & end-zone callout */}
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] leading-none">
        <span className="inline-flex items-center gap-1 font-bold text-slate-300 shrink-0">
          <span
            className="inline-block h-2 w-2 rounded-sm border border-white/30"
            style={{ backgroundColor: ownEz.background }}
            aria-hidden="true"
          />
          <span>{ownEz.label} EZ</span>
        </span>

        <span className="inline-flex items-center gap-1 font-bold text-sky-300">
          <span>
            {posteam}
            <span className="hidden min-[380px]:inline"> driving</span>
          </span>
          <ArrowRight className="h-3 w-3 shrink-0 text-amber-400" aria-hidden="true" />
          <span>
            {defteam}{' '}
            <span className="hidden min-[380px]:inline">end zone</span>
            <span className="min-[380px]:hidden">EZ</span>
          </span>
        </span>

        <span className="inline-flex items-center gap-1 font-bold text-slate-300 shrink-0">
          <span>{oppEz.label} EZ</span>
          <span
            className="inline-block h-2 w-2 rounded-sm border border-white/30"
            style={{ backgroundColor: oppEz.background }}
            aria-hidden="true"
          />
        </span>
      </div>

      {/* 120-yard SVG Pitch */}
      <svg
        viewBox={`0 0 ${PITCH_VIEWBOX_WIDTH} ${PITCH_VIEWBOX_HEIGHT}`}
        className="block h-auto w-full select-none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={0}
              y={FIELD_TOP}
              width={PITCH_VIEWBOX_WIDTH}
              height={FIELD_HEIGHT}
              rx={6}
            />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* Alternating 5-yard mowed turf bands */}
          {TURF_BANDS.map((band) => (
            <rect
              key={band}
              x={END_ZONE_WIDTH + band * 25}
              y={FIELD_TOP}
              width={25}
              height={FIELD_HEIGHT}
              fill={band % 2 === 0 ? '#0d3822' : '#11442a'}
            />
          ))}

          {/* Subtle Red Zone shading (last 20 yards before defteam goal line) */}
          <rect
            x={END_ZONE_WIDTH + 400}
            y={FIELD_TOP}
            width={100}
            height={FIELD_HEIGHT}
            fill={geometry.isRedZone ? 'rgba(244, 63, 94, 0.10)' : 'rgba(244, 63, 94, 0.03)'}
          />

          {/* Left End Zone (posteam own) */}
          <rect
            x={0}
            y={FIELD_TOP}
            width={END_ZONE_WIDTH}
            height={FIELD_HEIGHT}
            fill={ownEz.background}
          />
          <rect
            x={0}
            y={FIELD_TOP}
            width={5}
            height={FIELD_HEIGHT}
            fill={ownEz.accent}
            opacity={0.85}
          />
          <text
            x={25}
            y={FIELD_CENTER_Y}
            fill={ownEz.textColor}
            fontSize="15"
            fontWeight="900"
            letterSpacing="2"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(-90 25 ${FIELD_CENTER_Y})`}
          >
            {ownEz.label}
          </text>

          {/* Right End Zone (defteam target) */}
          <rect
            x={END_ZONE_WIDTH + FIELD_PLAY_WIDTH}
            y={FIELD_TOP}
            width={END_ZONE_WIDTH}
            height={FIELD_HEIGHT}
            fill={oppEz.background}
          />
          <rect
            x={PITCH_VIEWBOX_WIDTH - 5}
            y={FIELD_TOP}
            width={5}
            height={FIELD_HEIGHT}
            fill={oppEz.accent}
            opacity={0.85}
          />
          <text
            x={581}
            y={FIELD_CENTER_Y}
            fill={oppEz.textColor}
            fontSize="15"
            fontWeight="900"
            letterSpacing="2"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(90 581 ${FIELD_CENTER_Y})`}
          >
            {oppEz.label}
          </text>

          {/* 5-yard minor lines */}
          {FIVE_YARD_LINES.map((y) => {
            const x = END_ZONE_WIDTH + y * 5;
            return (
              <line
                key={y}
                x1={x}
                y1={FIELD_TOP}
                x2={x}
                y2={fieldBottom}
                stroke="rgba(255, 255, 255, 0.14)"
                strokeWidth={1}
              />
            );
          })}

          {/* 10-yard major lines and numbers */}
          {MAJOR_YARD_LINES.map((y) => {
            const x = END_ZONE_WIDTH + y * 5;
            const isMid = y === 50;
            const num = y <= 50 ? y : 100 - y;
            const label = y < 50 ? `‹ ${num}` : y > 50 ? `${num} ›` : '50';
            return (
              <g key={y}>
                <line
                  x1={x}
                  y1={FIELD_TOP}
                  x2={x}
                  y2={fieldBottom}
                  stroke={isMid ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.3)'}
                  strokeWidth={isMid ? 1.8 : 1.1}
                />
                <text
                  x={x}
                  y={FIELD_TOP + 13}
                  fill={isMid ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.45)'}
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {label}
                </text>
                <text
                  x={x}
                  y={fieldBottom - 6}
                  fill={isMid ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.45)'}
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* 1-yard sideline hash ticks */}
          {SIDELINE_TICKS.map((y) => {
            const x = END_ZONE_WIDTH + y * 5;
            return (
              <g key={y}>
                <line
                  x1={x}
                  y1={FIELD_TOP}
                  x2={x}
                  y2={FIELD_TOP + 3.5}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth={0.9}
                />
                <line
                  x1={x}
                  y1={fieldBottom - 3.5}
                  x2={x}
                  y2={fieldBottom}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth={0.9}
                />
              </g>
            );
          })}

          {/* Own & Opponent Goal Lines */}
          <line
            x1={END_ZONE_WIDTH}
            y1={FIELD_TOP}
            x2={END_ZONE_WIDTH}
            y2={fieldBottom}
            stroke="rgba(255, 255, 255, 0.72)"
            strokeWidth={2}
          />
          <line
            x1={END_ZONE_WIDTH + FIELD_PLAY_WIDTH}
            y1={FIELD_TOP}
            x2={END_ZONE_WIDTH + FIELD_PLAY_WIDTH}
            y2={fieldBottom}
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={2.2}
          />

          {/* Shaded Yards-to-Gain Zone & Target Line (only when both spot and distance are valid) */}
          {hasCompleteTarget && (
            <>
              <rect
                x={losX}
                y={FIELD_TOP}
                width={Math.max(2, targetX - losX)}
                height={FIELD_HEIGHT}
                fill="rgba(251, 191, 36, 0.2)"
              />
              <line
                x1={targetX}
                y1={FIELD_TOP}
                x2={targetX}
                y2={fieldBottom}
                stroke="rgba(251, 191, 36, 0.35)"
                strokeWidth={5}
              />
              <line
                x1={targetX}
                y1={FIELD_TOP}
                x2={targetX}
                y2={fieldBottom}
                stroke="#fbbf24"
                strokeWidth={geometry.isGoalToGo ? 3.2 : 2.5}
              />
            </>
          )}

          {/* Line of Scrimmage, Drive Direction & Football (only when spot is valid) */}
          {hasPosition && (
            <>
              <line
                x1={losX}
                y1={FIELD_TOP}
                x2={losX}
                y2={fieldBottom}
                stroke="rgba(56, 189, 248, 0.38)"
                strokeWidth={6}
              />
              <line
                x1={losX}
                y1={FIELD_TOP}
                x2={losX}
                y2={fieldBottom}
                stroke="#38bdf8"
                strokeWidth={2.5}
              />

              {geometry.showTrailingChevrons && (
                <g
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.78)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline
                    points={`${losX - 27},${FIELD_CENTER_Y - 5} ${losX - 21},${FIELD_CENTER_Y} ${losX - 27},${FIELD_CENTER_Y + 5}`}
                  />
                  <polyline
                    points={`${losX - 18},${FIELD_CENTER_Y - 5} ${losX - 12},${FIELD_CENTER_Y} ${losX - 18},${FIELD_CENTER_Y + 5}`}
                  />
                </g>
              )}

              <line
                x1={shaftStartX}
                y1={FIELD_CENTER_Y}
                x2={shaftEndX}
                y2={FIELD_CENTER_Y}
                stroke="rgba(2, 6, 23, 0.78)"
                strokeWidth={5}
                strokeLinecap="round"
              />
              <line
                x1={shaftStartX}
                y1={FIELD_CENTER_Y}
                x2={shaftEndX}
                y2={FIELD_CENTER_Y}
                stroke="#ffffff"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
              <polygon
                points={`${arrowTipX},${FIELD_CENTER_Y} ${arrowBaseX},${FIELD_CENTER_Y - headHalfHeight} ${arrowBaseX},${FIELD_CENTER_Y + headHalfHeight}`}
                fill="#ffffff"
                stroke="rgba(2, 6, 23, 0.78)"
                strokeWidth={1.2}
                strokeLinejoin="round"
              />

              <ellipse
                cx={losX}
                cy={FIELD_CENTER_Y}
                rx={8.5}
                ry={5.6}
                fill="rgba(2, 6, 23, 0.75)"
              />
              <ellipse
                cx={losX}
                cy={FIELD_CENTER_Y}
                rx={7}
                ry={4.5}
                fill="#b45309"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <line
                x1={losX - 2.6}
                y1={FIELD_CENTER_Y}
                x2={losX + 2.6}
                y2={FIELD_CENTER_Y}
                stroke="#ffffff"
                strokeWidth={1.1}
                strokeLinecap="round"
              />
              <line
                x1={losX - 1.5}
                y1={FIELD_CENTER_Y - 1.4}
                x2={losX - 1.5}
                y2={FIELD_CENTER_Y + 1.4}
                stroke="#ffffff"
                strokeWidth={0.9}
              />
              <line
                x1={losX}
                y1={FIELD_CENTER_Y - 1.4}
                x2={losX}
                y2={FIELD_CENTER_Y + 1.4}
                stroke="#ffffff"
                strokeWidth={0.9}
              />
              <line
                x1={losX + 1.5}
                y1={FIELD_CENTER_Y - 1.4}
                x2={losX + 1.5}
                y2={FIELD_CENTER_Y + 1.4}
                stroke="#ffffff"
                strokeWidth={0.9}
              />
            </>
          )}

          {/* Honest unavailable overlay when yardline_100 is missing or out of bounds */}
          {desc.unavailableBannerText !== null && (
            <g>
              <rect
                x={END_ZONE_WIDTH}
                y={FIELD_TOP}
                width={FIELD_PLAY_WIDTH}
                height={FIELD_HEIGHT}
                fill="rgba(8, 13, 26, 0.58)"
              />
              <rect
                x={160}
                y={FIELD_CENTER_Y - 17}
                width={280}
                height={34}
                rx={6}
                fill="#0b1120"
                stroke="rgba(148, 163, 184, 0.45)"
                strokeWidth={1.2}
              />
              <text
                x={300}
                y={FIELD_CENTER_Y}
                fill="#e2e8f0"
                fontSize="14"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {desc.unavailableBannerText}
              </text>
            </g>
          )}
        </g>

        {/* Crisp outer sideline border */}
        <rect
          x={0.75}
          y={FIELD_TOP + 0.75}
          width={PITCH_VIEWBOX_WIDTH - 1.5}
          height={FIELD_HEIGHT - 1.5}
          rx={5.5}
          fill="none"
          stroke="rgba(226, 232, 240, 0.35)"
          strokeWidth={1.5}
        />
      </svg>

      {/* Bottom micro-legend */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-slate-300 leading-none">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-2.5 w-1 rounded-full ${hasPosition ? 'bg-sky-400' : 'bg-slate-500'}`}
              aria-hidden="true"
            />
            <span>{desc.losLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-2.5 w-1 rounded-full ${hasCompleteTarget ? 'bg-amber-400' : 'bg-slate-500'}`}
              aria-hidden="true"
            />
            <span>{desc.targetLabel}</span>
          </span>
        </div>
        <span className="font-semibold text-slate-200 tabular-nums">
          {desc.distanceToEzLabel}
        </span>
      </div>
    </div>
  );
};
