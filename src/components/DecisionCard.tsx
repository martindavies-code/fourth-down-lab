import React, { useState } from 'react';
import type { Decision, OptionName } from '../types/decision';
import { getTeamLogoUrl, isDarkLogo, getTeamName, getTeamFallbackSvg } from '../utils/teamLogos';
import {
  formatDownAndDistance,
  formatProbability,
  getFieldPositionInfo,
  getScoreDifferentialBadge,
} from '../utils/formatting';
import { buildStory, verdictTone, OPTION_LABELS } from '../utils/story';
import {
  computeWpaSwing,
  getCardAccentClass,
  getChoiceVisual,
  getCounterfactualForks,
  getExecutionVisual,
  getOptionMicroStat,
  getTopModelledWp,
  getVerdictStamp,
} from '../utils/cardVisuals';
import { TimeoutPips } from './TimeoutPips';
import { FieldPitchMap } from './FieldPitchMap';
import { MangaStamp } from './AnimeMascots';
import {
  ChevronDown,
  ChevronUp,
  CornerUpRight,
  MapPin,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

interface DecisionCardProps {
  decision: Decision;
}

const TONE_CLASSES = {
  ok: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  lean: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  strong: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
  unknown: 'border-slate-600 bg-slate-800/60 text-slate-200',
} as const;

const TILE_TOP_ACCENT = {
  ok: 'border-t-2 border-t-emerald-400/70',
  lean: 'border-t-2 border-t-amber-400/75',
  strong: 'border-t-2 border-t-rose-400/80',
  unknown: 'border-t-2 border-t-indigo-400/70',
} as const;

const SFX_TONE_CLASSES = {
  gold: 'text-amber-300',
  ok: 'text-emerald-300',
  strong: 'text-rose-300',
  neutral: 'text-sky-300',
} as const;

const OptionIcon: React.FC<{ option: OptionName | string; className?: string }> = ({
  option,
  className = 'h-3.5 w-3.5 shrink-0',
}) => {
  if (option === 'go') return <Zap className={className} aria-hidden="true" />;
  if (option === 'field_goal') return <Target className={className} aria-hidden="true" />;
  return <CornerUpRight className={className} aria-hidden="true" />;
};

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    posteam,
    defteam,
    qtr,
    quarter_seconds_remaining,
    down,
    ydstogo,
    yardline_100,
    score_differential,
    posteam_score,
    defteam_score,
    posteam_timeouts_remaining,
    defteam_timeouts_remaining,
    options,
    actual_choice,
    verdict_label,
    display_cost_pp,
    exact_cost_display,
    is_near_boundary,
    cost_reason,
    outcome,
    quadrant,
    tier,
  } = decision;

  const story = buildStory(decision);
  const fieldPos = getFieldPositionInfo(yardline_100, posteam, defteam);
  const scoreDiffBadge = getScoreDifferentialBadge(score_differential, posteam);
  const isTwoMinDrill = qtr === 4 && quarter_seconds_remaining <= 120 && quarter_seconds_remaining > 0;

  const mins = Math.floor(quarter_seconds_remaining / 60);
  const secs = Math.floor(quarter_seconds_remaining % 60);
  const clock = `${mins}:${secs.toString().padStart(2, '0')}`;
  const periodLabel = qtr <= 4 ? `Q${qtr}` : 'OT';

  // Verdict band text. Bands and thresholds are unchanged (they come from the data).
  const tone = verdictTone(verdict_label);
  const verdictText =
    tone === 'ok'
      ? 'Reasonable'
      : tone === 'lean'
      ? 'Model leaned the other way'
      : tone === 'strong'
      ? 'Model strongly preferred another option'
      : verdict_label;
  const verdictScope = story.isPartial ? ' (among modelled options)' : '';

  // Visual storytelling helpers (strictly preserving 2x2 pre-snap vs post-play separation)
  const choiceVisual = getChoiceVisual(actual_choice);
  const verdictStamp = getVerdictStamp({
    showVerdict: story.showVerdict,
    isTossUp: story.isTossUp,
    tone,
    actualChoice: actual_choice,
    tier,
    verdictLabel: verdict_label,
  });
  const execution = getExecutionVisual(decision);
  const executionTone =
    execution.sfxTone === 'gold'
      ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
      : execution.good === null
      ? TONE_CLASSES.unknown
      : execution.good
      ? TONE_CLASSES.ok
      : TONE_CLASSES.strong;

  const wpaSwing = computeWpaSwing(outcome.realised_wpa);
  const wpaText = `${wpaSwing.wpaPp > 0 ? '+' : ''}${wpaSwing.wpaPp.toFixed(1)} pp`;
  const wpaColour =
    wpaSwing.wpaPp > 0 ? 'text-emerald-300' : wpaSwing.wpaPp < 0 ? 'text-rose-300' : 'text-slate-200';

  const topWp = getTopModelledWp(story);
  const topRow = story.rows.find((r) => r.modelled && r.wp !== null);
  const hasSeparateModelTopBar = Boolean(
    story.showVerdict && !story.isTossUp && topRow && !topRow.isTaken
  );
  const counterfactualForks = getCounterfactualForks(decision);
  const cardAccentClass = getCardAccentClass(tone, story.showVerdict);
  const scoreDiffTone =
    scoreDiffBadge.type === 'leading'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : scoreDiffBadge.type === 'trailing'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
      : 'border-slate-600/80 bg-slate-800/70 text-slate-200';

  const logo = (team: string) => (
    <img
      src={getTeamLogoUrl(team)}
      alt={getTeamName(team)}
      className={`h-8 w-8 object-contain ${isDarkLogo(team) ? 'team-logo-dark-outline' : ''}`}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = getTeamFallbackSvg(team);
      }}
    />
  );

  return (
    <article
      id={`decision-${decision.play_id}`}
      className={`group relative overflow-hidden rounded-xl border border-slate-800 ${cardAccentClass} bg-[#0d121e] shadow-lg transition-all duration-300 hover:border-sky-500/50 anime-card-glow scroll-mt-40 sm:scroll-mt-28`}
      aria-label={`4th down decision for ${posteam} against ${defteam}`}
    >
      {/* ===== 1. THE SITUATION: scorebug strip + hero down, distance, pitch map and clock ===== */}
      <header className="border-b border-slate-800/90 bg-[#0b1120] manga-speedlines p-4 sm:p-5">
        {/* Scorebug strip */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-300">
          <div
            className="flex items-center gap-2"
            aria-label={`Score: ${posteam} ${posteam_score}, ${defteam} ${defteam_score}`}
          >
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5">
              {logo(posteam)}
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
              <span className="text-sm font-black text-white">{posteam}</span>
              <span className="tabular-nums text-lg font-black text-white">{posteam_score}</span>
            </div>
            <span className="text-slate-400 font-bold" aria-hidden="true">-</span>
            <div className="inline-flex items-center gap-1.5 px-1 py-0.5">
              <span className="tabular-nums text-lg font-black text-slate-200">{defteam_score}</span>
              <span className="text-sm font-black text-slate-200">{defteam}</span>
              {logo(defteam)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="rounded border border-slate-700/80 bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-bold text-slate-200">
              Wk {decision.week}
            </span>
            <span className={`rounded border px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${scoreDiffTone}`}>
              {scoreDiffBadge.type === 'tied' ? 'Tied game' : scoreDiffBadge.label}
            </span>
            <span className="inline-flex items-center gap-1" title={`${posteam} has possession`}>
              <span className="font-semibold text-amber-300">{posteam} ball</span>
              <TimeoutPips timeouts={posteam_timeouts_remaining} teamAbbr={posteam} />
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-slate-300">{defteam}</span>
              <TimeoutPips timeouts={defteam_timeouts_remaining} teamAbbr={defteam} />
            </span>
          </div>
        </div>

        {/* Hero: down and distance, field pitch visualization, clock and field position */}
        <div className="mt-4 flex flex-wrap items-end lg:items-center justify-between gap-x-5 gap-y-3">
          <div className="order-1 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-300">
              <span>Fourth down</span>
              <span className="text-[10px] font-bold tracking-normal text-sky-200/80" aria-hidden="true">
                第四ダウン
              </span>
            </div>
            <div className="text-5xl sm:text-6xl font-black uppercase leading-none tracking-tight text-white tabular-nums">
              {formatDownAndDistance(down, ydstogo, yardline_100)}
            </div>
          </div>

          <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1 lg:max-w-[520px] lg:mx-auto">
            <FieldPitchMap
              posteam={posteam}
              defteam={defteam}
              down={down}
              ydstogo={ydstogo}
              yardline100={yardline_100}
              yardlineText={fieldPos.yardlineText}
            />
          </div>

          <div className="order-2 ml-auto text-right lg:order-3 lg:ml-0 shrink-0">
            <div className="flex items-baseline justify-end gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  story.isOvertime ? 'text-indigo-300' : 'text-sky-300'
                }`}
              >
                {periodLabel}
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">{clock}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1 font-bold text-white">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
                {fieldPos.isValid ? `at ${fieldPos.yardlineText}` : fieldPos.yardlineText}
              </span>
              {fieldPos.isValid && fieldPos.isRedZone && (
                <span className="inline-flex items-center gap-1 rounded border border-rose-400/45 bg-rose-500/15 px-1.5 py-0.5 text-xs font-bold text-rose-200">
                  <span>Red zone</span>
                  <span className="hidden sm:inline text-[10px] text-rose-200/90" aria-hidden="true">
                    レッドゾーン
                  </span>
                </span>
              )}
              {isTwoMinDrill && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-400/45 bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold text-amber-200">
                  <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>2-min drill</span>
                  <span className="hidden sm:inline text-[10px] text-amber-200/90" aria-hidden="true">
                    緊迫
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-5 space-y-5">
        {/* ===== 2. THE STORY: play-call badge, two data-driven sentences & pre-snap Japanese hanko stamp ===== */}
        <section aria-label="What happened">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              {/* Visual play-call & highlight eyebrow */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-extrabold tracking-wide ${choiceVisual.badgeClass}`}
                >
                  <OptionIcon option={actual_choice} className="h-3 w-3 shrink-0" />
                  <span className="uppercase">{choiceVisual.label}</span>
                  <span className="opacity-85 font-bold" aria-hidden="true">
                    · {choiceVisual.ja}
                  </span>
                </span>

                {execution.highlightTag && (
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 font-black tracking-wide ${
                      execution.sfxTone === 'gold'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                        : 'border-rose-400/50 bg-rose-500/15 text-rose-200'
                    }`}
                  >
                    {execution.highlightTag}
                  </span>
                )}

                {tier === 'clear_go' && story.showVerdict && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 font-bold text-cyan-200">
                    <span>Clear go spot</span>
                    <span className="hidden sm:inline text-[10px] opacity-85" aria-hidden="true">
                      強攻推奨
                    </span>
                  </span>
                )}
              </div>

              <p className="text-xl sm:text-2xl font-extrabold leading-snug text-white">
                {story.actionSentence}
              </p>
              <p className="mt-1 text-sm sm:text-base text-slate-200 leading-snug">
                {story.comparisonSentence}
              </p>
            </div>

            {/* Authentic Japanese Hanko Stamp — strictly pre-snap model state, never outcome */}
            <div className="shrink-0 pt-0.5">
              <MangaStamp
                kanji={verdictStamp.kanji}
                subtext={verdictStamp.subtext}
                variant={verdictStamp.variant}
                title={verdictStamp.title}
                ariaHidden
                className="px-2 py-1"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {story.showVerdict ? (
              <span className={`rounded-md border px-2.5 py-1 font-bold ${TONE_CLASSES[tone]}`}>
                {verdictText}
                {verdictScope}
              </span>
            ) : (
              <span
                className={`rounded-md border px-2.5 py-1 font-bold ${TONE_CLASSES.unknown}`}
                title="Overtime play - outside validated regular-season model domain"
              >
                {story.domainCaveat}
              </span>
            )}
            {story.completenessLine && (
              <span className="rounded-md border border-slate-600 bg-slate-800/60 px-2.5 py-1 font-semibold text-slate-200">
                {story.completenessLine}
              </span>
            )}
          </div>
        </section>

        {/* ===== 3. THE OPTIONS: visual WP comparison with Model Top vs Taken & WP gap ===== */}
        <section aria-label="Fourth down options comparison">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Modelled win probability before snap (%)
              <span
                className="hidden sm:inline ml-1.5 text-[11px] font-bold tracking-normal text-sky-300/85"
                aria-hidden="true"
              >
                事前勝率比較
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
              {hasSeparateModelTopBar && (
                <span className="inline-flex items-center gap-1 font-semibold text-sky-200">
                  <span className="h-2 w-2 rounded-sm bg-sky-400" aria-hidden="true" />
                  <span>Model top</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
                <span className="h-2 w-2 rounded-sm bg-amber-400" aria-hidden="true" />
                <span>Taken</span>
              </span>
              {story.isTossUp && story.showVerdict && (
                <span className="rounded border border-sky-400/40 bg-sky-500/15 px-1.5 py-0.5 font-bold text-sky-200">
                  Toss-up
                  <span className="ml-1 text-[10px] opacity-85" aria-hidden="true">
                    伯仲
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5" role="table">
            {story.rows.map((row) => {
              const rowVisual = getChoiceVisual(row.key);
              const isModelTop =
                story.showVerdict &&
                !story.isTossUp &&
                row.modelled &&
                row.deltaPp === null &&
                topWp !== null;
              const microStat = row.modelled ? getOptionMicroStat(decision, row.key) : null;
              const wpPct = row.wp !== null ? Math.min(100, Math.max(0, row.wp * 100)) : 0;
              const topPct = topWp !== null ? Math.min(100, Math.max(0, topWp * 100)) : 0;
              const showCostGap =
                row.isTaken &&
                story.showVerdict &&
                row.deltaPp !== null &&
                row.wp !== null &&
                topWp !== null &&
                topPct > wpPct;
              const showBenchmarkTick =
                story.showVerdict &&
                !story.isTossUp &&
                !isModelTop &&
                !showCostGap &&
                topWp !== null;

              const barFillClass = row.isTaken
                ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                : isModelTop
                ? 'bg-gradient-to-r from-sky-500 to-cyan-300'
                : 'bg-slate-500/85';

              return (
                <div
                  key={row.key}
                  role="row"
                  className="grid grid-cols-[6rem_1fr] sm:grid-cols-[8.5rem_1fr] items-center gap-2.5 sm:gap-3"
                >
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1 text-sm font-bold text-white">
                      <OptionIcon
                        option={row.key}
                        className={`h-3.5 w-3.5 shrink-0 ${
                          row.isTaken
                            ? 'text-amber-300'
                            : isModelTop
                            ? 'text-sky-300'
                            : 'text-slate-300'
                        }`}
                      />
                      <span className="truncate">{row.label}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span
                        className="text-[10px] font-bold text-slate-300"
                        aria-hidden="true"
                      >
                        {rowVisual.shortJa}
                      </span>
                      {row.isTaken && (
                        <span className="rounded bg-amber-500/20 border border-amber-400/45 px-1 py-px text-[10px] font-extrabold text-amber-300 leading-tight">
                          TAKEN
                        </span>
                      )}
                      {isModelTop && (
                        <span className="rounded bg-sky-500/20 border border-sky-400/45 px-1 py-px text-[10px] font-extrabold text-sky-300 leading-tight">
                          TOP
                        </span>
                      )}
                    </div>
                    {microStat && (
                      <span className="mt-0.5 block text-[10px] font-semibold text-slate-300 tabular-nums">
                        {microStat}
                      </span>
                    )}
                  </div>

                  {row.modelled && row.wp !== null ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="relative h-6 flex-1 rounded-md border border-slate-700/60 bg-slate-800/90 overflow-hidden"
                        role="img"
                        aria-label={`${row.label}: ${formatProbability(row.wp)}`}
                      >
                        {/* 50% midpoint guide */}
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 left-1/2 z-0 w-px bg-slate-500/35"
                          aria-hidden="true"
                        />

                        {/* Main WP fill */}
                        <div
                          className={`relative z-[1] h-full rounded-l ${barFillClass}`}
                          style={{
                            width: `${wpPct}%`,
                            minWidth: wpPct > 0 ? '3px' : undefined,
                          }}
                        />

                        {/* Visual WP gap on taken option when below the model's highest option */}
                        {showCostGap && (
                          <div
                            className="pointer-events-none absolute top-0 bottom-0 z-[2] bg-rose-400/30 border-r-2 border-dashed border-sky-300"
                            style={{
                              left: `${wpPct}%`,
                              width: `${Math.max(0, topPct - wpPct)}%`,
                            }}
                            aria-hidden="true"
                          />
                        )}

                        {/* Subtle vertical benchmark tick at top modelled WP */}
                        {showBenchmarkTick && (
                          <div
                            className="pointer-events-none absolute top-0 bottom-0 z-[2] border-l border-dashed border-sky-300/60"
                            style={{ left: `${topPct}%` }}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="w-[4.75rem] sm:w-24 shrink-0 text-right leading-tight">
                        <span className="text-sm font-black text-white tabular-nums">
                          {formatProbability(row.wp)}
                        </span>
                        {row.deltaPp !== null && (
                          <span
                            className={`block text-[10px] sm:text-[11px] tabular-nums ${
                              row.isTaken ? 'font-bold text-rose-300' : 'text-slate-300'
                            }`}
                          >
                            -{row.deltaPp.toFixed(1)} pp
                            <span className="hidden sm:inline"> vs highest</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 flex-1 rounded-md border border-dashed border-slate-600 bg-slate-900/40" />
                        <span className="w-[4.75rem] sm:w-24 shrink-0 text-right text-xs font-semibold italic text-slate-300">
                          - no model -
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">
                        {row.label} not modelled here. Reason in model details.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="mt-1.5 grid grid-cols-[6rem_1fr] sm:grid-cols-[8.5rem_1fr] gap-2.5 sm:gap-3 text-[11px] text-slate-300 tabular-nums"
            aria-hidden="true"
          >
            <span />
            <div className="flex gap-2">
              <div className="flex flex-1 justify-between">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <span className="w-[4.75rem] sm:w-24 shrink-0" />
            </div>
          </div>
        </section>

        {/* ===== Three separate things: 1. pre-snap decision, 2. execution + manga SFX, 3. realised WPA swing ===== */}
        <section
          aria-label="Decision, execution and realised win probability"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
        >
          {/* Tile 1: Pre-snap decision quality */}
          <div
            className={`rounded-lg border border-slate-700/90 ${
              story.showVerdict ? TILE_TOP_ACCENT[tone] : TILE_TOP_ACCENT.unknown
            } bg-[#0a0f1d] p-3`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <span>Decision (pre-snap model)</span>
              <span
                className="shrink-0 whitespace-nowrap text-[10px] font-bold tracking-normal text-sky-300/85"
                aria-hidden="true"
              >
                事前判断
              </span>
            </div>
            {story.showVerdict ? (
              <>
                <div className="mt-1.5 text-sm font-bold text-white">{verdictText}</div>
                <div className="mt-0.5 text-xs text-slate-300 tabular-nums">
                  Cost {display_cost_pp !== null ? `${display_cost_pp.toFixed(1)} pp` : 'n/a'}
                  {is_near_boundary && exact_cost_display && (
                    <span
                      title={`Exact unrounded cost: ${exact_cost_display} pp. Boundary classification is evaluated on the unrounded value.`}
                    >
                      {' '}
                      ({exact_cost_display} exact)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1.5 text-sm font-semibold text-slate-200">
                No verdict (outside validated domain)
              </div>
            )}
          </div>

          {/* Tile 2: On-field execution + static katakana SFX */}
          <div className="rounded-lg border border-slate-700/90 border-t-2 border-t-sky-400/60 bg-[#0a0f1d] p-3">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <span>Execution (did it work)</span>
              <span
                className="shrink-0 whitespace-nowrap text-[10px] font-bold tracking-normal text-sky-300/85"
                aria-hidden="true"
              >
                プレー結果
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className={`inline-block rounded border px-2 py-0.5 text-sm font-bold ${executionTone}`}>
                {execution.text}
              </div>
              <span
                className="inline-flex items-center gap-1 select-none"
                aria-hidden="true"
              >
                <span className={`text-sm font-black italic tracking-tight ${SFX_TONE_CLASSES[execution.sfxTone]}`}>
                  {execution.sfx}
                </span>
                <span className="rounded border border-slate-700 bg-slate-900/90 px-1 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-200">
                  {execution.sfxGloss}
                </span>
              </span>
            </div>
          </div>

          {/* Tile 3: Post-play Realised WPA + bidirectional swing gauge */}
          <div className="rounded-lg border border-slate-700/90 border-t-2 border-t-slate-500/70 bg-[#0a0f1d] p-3">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <span>Realised WPA (nflverse)</span>
              <span
                className="shrink-0 whitespace-nowrap text-[10px] font-bold tracking-normal text-sky-300/85"
                aria-hidden="true"
              >
                事後WPA
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className={`text-sm font-black tabular-nums ${wpaColour}`}>{wpaText}</div>
              {/* Bidirectional mini swing meter (±25 pp scale) */}
              <div
                className="relative grid h-2 w-24 shrink-0 grid-cols-2 overflow-hidden rounded-full bg-slate-800 border border-slate-700/70"
                aria-hidden="true"
              >
                <div className="flex justify-end">
                  {wpaSwing.direction === 'neg' && (
                    <div
                      className="h-full bg-rose-400"
                      style={{ width: `${wpaSwing.fillPct}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-start">
                  {wpaSwing.direction === 'pos' && (
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${wpaSwing.fillPct}%` }}
                    />
                  )}
                </div>
                <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px bg-slate-300/80" />
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-300">
              Post-play model, not comparable with the pre-snap bars
            </div>
          </div>
        </section>

        {/* ===== 4. THE DETAIL: everything else, one layer down ===== */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-sky-300 transition-colors"
            aria-expanded={isExpanded}
          >
            <span
              className="rounded border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-black text-sky-300"
              aria-hidden="true"
            >
              詳細
            </span>
            <span>
              {isExpanded
                ? 'Hide model details'
                : 'Show full model breakdown (P(convert), P(FG), counterfactuals)'}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-sky-400 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-sky-400 shrink-0" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-3 rounded-lg border border-slate-800/80 bg-[#080d1a] p-3 text-xs text-slate-200">
              {/* Visual Counterfactual Risk / Reward Forks */}
              {counterfactualForks.length > 0 && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 border-b border-slate-800/80 pb-3">
                  {counterfactualForks.map((fork) => {
                    const failPct = Math.min(100, Math.max(0, fork.failWp * 100));
                    const succPct = Math.min(100, Math.max(0, fork.succeedWp * 100));
                    const loPct = Math.min(failPct, succPct);
                    const spanPct = Math.abs(succPct - failPct);
                    const expPct =
                      fork.expectedWp !== null
                        ? Math.min(100, Math.max(0, fork.expectedWp * 100))
                        : null;

                    return (
                      <div
                        key={fork.title}
                        className="rounded-md border border-slate-800 bg-[#0b1120] p-2.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                          <span>{fork.title}</span>
                          <span className="text-[10px] text-sky-300/85" aria-hidden="true">
                            {fork.ja}
                          </span>
                        </div>
                        <div className="relative mt-2 h-2.5 rounded-full bg-slate-800" aria-hidden="true">
                          <div
                            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-rose-400/80 via-sky-400/70 to-emerald-400/80"
                            style={{ left: `${loPct}%`, width: `${Math.max(2, spanPct)}%` }}
                          />
                          {expPct !== null && (
                            <div
                              className="absolute -top-0.5 h-3.5 w-1 -translate-x-1/2 rounded-full bg-white shadow"
                              style={{ left: `${expPct}%` }}
                            />
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums">
                          <span className="font-bold text-rose-300">
                            {fork.failLabel}: {formatProbability(fork.failWp)}
                          </span>
                          <span className="font-bold text-emerald-300">
                            {fork.succeedLabel}: {formatProbability(fork.succeedWp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="P(Convert)" value={formatProbability(options.go.first_down_prob)} />
                <Stat
                  label="WP if converted"
                  value={formatProbability(options.go.wp_succeed)}
                  tone="text-emerald-300"
                />
                <Stat
                  label="WP if failed"
                  value={formatProbability(options.go.wp_fail)}
                  tone="text-rose-300"
                />
                <Stat label="FG make prob" value={formatProbability(options.field_goal.fg_make_prob)} />
                <Stat
                  label="WP if kick made"
                  value={formatProbability(options.field_goal.make_fg_wp ?? null)}
                  tone="text-emerald-300"
                />
                <Stat
                  label="WP if kick missed"
                  value={formatProbability(options.field_goal.miss_fg_wp ?? null)}
                  tone="text-rose-300"
                />
                {options.punt.status === 'AVAILABLE' && (
                  <Stat
                    label="Punt: expected post-punt state"
                    value={`${formatProbability(options.punt.wp)} WP`}
                  />
                )}
              </div>

              {options.field_goal.low_make_probability && (
                <p className="font-medium text-amber-300">
                  Very low make probability ({formatProbability(options.field_goal.fg_make_prob)})
                </p>
              )}

              <div className="space-y-1">
                <div>
                  <span className="text-slate-300">Play description: </span>
                  <span className="text-slate-100">{outcome.desc}</span>
                </div>
                {outcome.penalty_affected && (
                  <div className="text-amber-300">Penalty affected the outcome of this executed play.</div>
                )}
                <div>
                  <span className="text-slate-300">Realised win probability shift: </span>
                  <span className="font-bold tabular-nums">{wpaText} WPA</span>
                  <span className="text-slate-300">
                    {' '}
                    (nflverse WPA model). {outcome.realised_wpa_note}
                  </span>
                </div>
                <div>
                  <span className="text-slate-300">Model verdict: </span>
                  <span className="font-semibold">{verdict_label}</span>
                  {cost_reason && <span className="text-slate-300"> - {cost_reason}</span>}
                </div>
                <div>
                  <span className="text-slate-300">Pre-snap decision cost: </span>
                  <span className="font-bold tabular-nums">
                    {display_cost_pp !== null ? `${display_cost_pp.toFixed(1)} pp` : 'n/a'}
                    {is_near_boundary && exact_cost_display && ` (${exact_cost_display} exact)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-300">2x2 category: </span>
                  <span className="font-semibold">{quadrant}</span>
                </div>
                {tier === 'clear_go' && decision.go_boost !== null && (
                  <div>
                    <span className="text-slate-300">Clear go: </span>
                    <span className="font-semibold tabular-nums">
                      +{decision.go_boost.toFixed(1)} pp vs second best
                    </span>
                  </div>
                )}
                {tier === 'obvious' && <div className="text-slate-300">Obvious call.</div>}
                {story.rows
                  .filter((r) => !r.modelled)
                  .map((r) => (
                    <div key={r.key}>
                      <span className="text-slate-300">{OPTION_LABELS[r.key]} not modelled: </span>
                      <span>{r.reason}</span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-300">
                Calculated via sportsdataverse nfl4th port against identical pre-snap game state.
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div>
    <span className="block text-[11px] text-slate-300">{label}:</span>
    <span className={`font-bold tabular-nums ${tone ?? 'text-white'}`}>{value}</span>
  </div>
);
