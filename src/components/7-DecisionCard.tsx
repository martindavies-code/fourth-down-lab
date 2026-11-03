import React, { useState } from 'react';
import type { Decision } from '../types/decision';
import { getTeamLogoUrl, isDarkLogo, getTeamName, getTeamFallbackSvg } from '../utils/teamLogos';
import {
  formatDownAndDistance,
  formatProbability,
  getFieldPositionInfo,
  getScoreDifferentialBadge,
} from '../utils/formatting';
import { buildStory, verdictTone, OPTION_LABELS } from '../utils/story';
import { TimeoutPips } from './TimeoutPips';
import { ChevronDown, ChevronUp, MapPin, Timer } from 'lucide-react';

interface DecisionCardProps {
  decision: Decision;
}

const TONE_CLASSES = {
  ok: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  lean: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  strong: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
  unknown: 'border-slate-600 bg-slate-800/60 text-slate-300',
} as const;

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

  // Execution result tone (did the play work). Separate from decision quality.
  const executionGood =
    actual_choice === 'go'
      ? Boolean(outcome.converted)
      : actual_choice === 'field_goal'
      ? outcome.field_goal_result === 'made'
      : null;
  const executionText =
    actual_choice === 'go'
      ? outcome.converted
        ? `Converted (+${outcome.yards_gained} yds)`
        : `Failed (${outcome.yards_gained} yds), turnover on downs`
      : actual_choice === 'field_goal'
      ? outcome.field_goal_result === 'made'
        ? `${outcome.kick_distance ? `${outcome.kick_distance}-yd ` : ''}kick good`
        : 'Kick missed or blocked'
      : 'Punt executed';
  const executionTone =
    executionGood === null ? TONE_CLASSES.unknown : executionGood ? TONE_CLASSES.ok : TONE_CLASSES.strong;

  const wpaPp = outcome.realised_wpa * 100;
  const wpaText = `${wpaPp > 0 ? '+' : ''}${wpaPp.toFixed(1)} pp`;
  const wpaColour = wpaPp > 0 ? 'text-emerald-300' : wpaPp < 0 ? 'text-rose-300' : 'text-slate-200';

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
      className="group relative rounded-xl border border-slate-800 bg-[#0d121e] shadow-lg transition-all duration-300 hover:border-sky-500/50 anime-card-glow scroll-mt-40 sm:scroll-mt-28"
      aria-label={`4th down decision for ${posteam} against ${defteam}`}
    >
      {/* ===== 1. THE SITUATION: scorebug strip + hero down, distance and clock ===== */}
      <header className="border-b border-slate-800/90 bg-[#0b1120] p-4 sm:p-5 rounded-t-xl">
        {/* Scorebug strip */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2.5" aria-label={`Score: ${posteam} ${posteam_score}, ${defteam} ${defteam_score}`}>
            {logo(posteam)}
            <span className="text-sm font-black text-white">{posteam}</span>
            <span className="tabular-nums text-lg font-black text-white">{posteam_score}</span>
            <span className="text-slate-400" aria-hidden="true">-</span>
            <span className="tabular-nums text-lg font-black text-white">{defteam_score}</span>
            <span className="text-sm font-black text-white">{defteam}</span>
            {logo(defteam)}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">
              Wk {decision.week} - {scoreDiffBadge.type === 'tied' ? 'Tied game' : scoreDiffBadge.label}
            </span>
            <span className="inline-flex items-center gap-1" title={`${posteam} has possession`}>
              <span className="font-semibold text-amber-300">{posteam} ball</span>
              <TimeoutPips timeouts={posteam_timeouts_remaining} teamAbbr={posteam} />
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-slate-400">{defteam}</span>
              <TimeoutPips timeouts={defteam_timeouts_remaining} teamAbbr={defteam} />
            </span>
          </div>
        </div>

        {/* Hero: down and distance, clock and period, field position */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-300">Fourth down</div>
            <div className="text-5xl sm:text-6xl font-black uppercase leading-none tracking-tight text-white tabular-nums">
              {formatDownAndDistance(down, ydstogo, yardline_100)}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-2xl sm:text-3xl font-black text-sky-300">{periodLabel}</span>
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">{clock}</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1 font-bold text-white">
                <MapPin className="h-4 w-4 text-amber-400" aria-hidden="true" />
                at {fieldPos.yardlineText}
                {fieldPos.isRedZone && <span className="ml-1 text-rose-300">Red zone</span>}
              </span>
              {isTwoMinDrill && (
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Timer className="h-4 w-4" aria-hidden="true" />
                  2-min drill
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-5 space-y-5">
        {/* ===== 2. THE STORY: two data-driven sentences, then completeness / domain at verdict level ===== */}
        <section aria-label="What happened">
          <p className="text-xl sm:text-2xl font-extrabold leading-snug text-white">{story.actionSentence}</p>
          <p className="mt-1 text-base text-slate-200 leading-snug">{story.comparisonSentence}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {story.showVerdict ? (
              <span className={`rounded-md border px-2.5 py-1 font-bold ${TONE_CLASSES[tone]}`}>
                {verdictText}
                {verdictScope}
              </span>
            ) : (
              <span className={`rounded-md border px-2.5 py-1 font-bold ${TONE_CLASSES.unknown}`} title="Overtime play - outside validated regular-season model domain">
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

        {/* ===== 3. THE OPTIONS: one aligned comparison ===== */}
        <section aria-label="Fourth down options comparison">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Modelled win probability before snap (%)
            </h3>
            {story.isTossUp && story.showVerdict && (
              <span className="text-xs font-bold text-sky-300">Toss-up</span>
            )}
          </div>
          <div className="space-y-2" role="table">
            {story.rows.map((row) => (
              <div key={row.key} role="row" className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[7rem_1fr] items-center gap-3">
                <div className="text-sm font-bold text-white leading-tight">
                  {row.label}
                  {row.isTaken && <span className="block text-[11px] font-extrabold text-amber-400">TAKEN</span>}
                </div>
                {row.modelled && row.wp !== null ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="relative h-5 flex-1 rounded bg-slate-800"
                      role="img"
                      aria-label={`${row.label}: ${formatProbability(row.wp)}`}
                    >
                      <div
                        className={`h-full rounded ${row.isTaken ? 'bg-amber-400' : 'bg-slate-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, row.wp * 100))}%` }}
                      />
                    </div>
                    <div className="w-24 text-right leading-tight">
                      <span className="text-sm font-black text-white tabular-nums">{formatProbability(row.wp)}</span>
                      {row.deltaPp !== null && (
                        <span className="block text-[11px] text-slate-300 tabular-nums">
                          -{row.deltaPp.toFixed(1)} pp vs highest
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 flex-1 rounded border border-dashed border-slate-600" />
                      <span className="w-24 text-right text-xs font-semibold italic text-slate-300">- no model -</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">
                      {row.label} not modelled here. Reason in model details.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-[5.5rem_1fr] sm:grid-cols-[7rem_1fr] gap-3 text-[11px] text-slate-400 tabular-nums" aria-hidden="true">
            <span />
            <div className="flex gap-2">
              <div className="flex flex-1 justify-between">
                <span>0%</span>
                <span>100%</span>
              </div>
              <span className="w-24" />
            </div>
          </div>
        </section>

        {/* ===== Three separate things: decision quality, execution, realised WPA ===== */}
        <section aria-label="Decision, execution and realised win probability" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-[#0a0f1d] p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Decision (pre-snap model)</div>
            {story.showVerdict ? (
              <>
                <div className="mt-1 text-sm font-bold text-white">{verdictText}</div>
                <div className="text-xs text-slate-300 tabular-nums">
                  Cost {display_cost_pp !== null ? `${display_cost_pp.toFixed(1)} pp` : 'n/a'}
                  {is_near_boundary && exact_cost_display && (
                    <span title={`Exact unrounded cost: ${exact_cost_display} pp. Boundary classification is evaluated on the unrounded value.`}>
                      {' '}({exact_cost_display} exact)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm font-semibold text-slate-200">No verdict (outside validated domain)</div>
            )}
          </div>
          <div className="rounded-lg border border-slate-700 bg-[#0a0f1d] p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Execution (did it work)</div>
            <div className={`mt-1 inline-block rounded border px-2 py-0.5 text-sm font-bold ${executionTone}`}>
              {executionText}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-[#0a0f1d] p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Realised WPA (nflverse)</div>
            <div className={`mt-1 text-sm font-black tabular-nums ${wpaColour}`}>{wpaText}</div>
            <div className="text-xs text-slate-300">Post-play model, not comparable with the pre-snap bars</div>
          </div>
        </section>

        {/* ===== 4. THE DETAIL: everything else, one layer down ===== */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm font-semibold text-slate-300 hover:text-sky-300 transition-colors"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Hide model details' : 'Show full model breakdown (P(convert), P(FG), counterfactuals)'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-sky-400" /> : <ChevronDown className="h-4 w-4 text-sky-400" />}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-3 rounded-lg border border-slate-800/80 bg-[#080d1a] p-3 text-xs text-slate-200">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="P(Convert)" value={formatProbability(options.go.first_down_prob)} />
                <Stat label="WP if converted" value={formatProbability(options.go.wp_succeed)} tone="text-emerald-300" />
                <Stat label="WP if failed" value={formatProbability(options.go.wp_fail)} tone="text-rose-300" />
                <Stat label="FG make prob" value={formatProbability(options.field_goal.fg_make_prob)} />
                <Stat label="WP if kick made" value={formatProbability(options.field_goal.make_fg_wp ?? null)} tone="text-emerald-300" />
                <Stat label="WP if kick missed" value={formatProbability(options.field_goal.miss_fg_wp ?? null)} tone="text-rose-300" />
                {options.punt.status === 'AVAILABLE' && (
                  <Stat label="Punt: expected post-punt state" value={`${formatProbability(options.punt.wp)} WP`} />
                )}
              </div>

              {options.field_goal.low_make_probability && (
                <p className="font-medium text-amber-300">
                  Very low make probability ({formatProbability(options.field_goal.fg_make_prob)})
                </p>
              )}

              <div className="space-y-1">
                <div>
                  <span className="text-slate-400">Play description: </span>
                  <span className="text-slate-100">{outcome.desc}</span>
                </div>
                {outcome.penalty_affected && (
                  <div className="text-amber-300">Penalty affected the outcome of this executed play.</div>
                )}
                <div>
                  <span className="text-slate-400">Realised win probability shift: </span>
                  <span className="font-bold tabular-nums">{wpaText} WPA</span>
                  <span className="text-slate-300"> (nflverse WPA model). {outcome.realised_wpa_note}</span>
                </div>
                <div>
                  <span className="text-slate-400">Model verdict: </span>
                  <span className="font-semibold">{verdict_label}</span>
                  {cost_reason && <span className="text-slate-300"> - {cost_reason}</span>}
                </div>
                <div>
                  <span className="text-slate-400">Pre-snap decision cost: </span>
                  <span className="font-bold tabular-nums">
                    {display_cost_pp !== null ? `${display_cost_pp.toFixed(1)} pp` : 'n/a'}
                    {is_near_boundary && exact_cost_display && ` (${exact_cost_display} exact)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">2x2 category: </span>
                  <span className="font-semibold">{quadrant}</span>
                </div>
                {tier === 'clear_go' && decision.go_boost !== null && (
                  <div>
                    <span className="text-slate-400">Clear go: </span>
                    <span className="font-semibold tabular-nums">+{decision.go_boost.toFixed(1)} pp vs second best</span>
                  </div>
                )}
                {tier === 'obvious' && <div className="text-slate-300">Obvious call.</div>}
                {story.rows
                  .filter((r) => !r.modelled)
                  .map((r) => (
                    <div key={r.key}>
                      <span className="text-slate-400">{OPTION_LABELS[r.key]} not modelled: </span>
                      <span>{r.reason}</span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
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
    <span className="block text-[11px] text-slate-400">{label}:</span>
    <span className={`font-bold tabular-nums ${tone ?? 'text-white'}`}>{value}</span>
  </div>
);
