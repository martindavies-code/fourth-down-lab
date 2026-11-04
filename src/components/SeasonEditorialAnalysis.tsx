import React, { useMemo } from 'react';
import type { Decision, MetaData, TeamSummary } from '../types/decision';
import { getTeamName } from '../utils/teamLogos';
import {
  formatDownAndDistance,
  formatTimeRemaining,
  getFieldPositionInfo,
  getScoreDifferentialBadge,
} from '../utils/formatting';
import { buildStory } from '../utils/story';
import {
  COSTLY_ERROR_THRESHOLD_PP,
  computeAggressionStats,
  conservatismDominates,
  overAggressionHeadline,
  seasonOf,
} from '../utils/editorial';
import { Flame, ShieldAlert, Award, Compass, TrendingDown, CheckCircle2, Quote } from 'lucide-react';
import { MangaStamp } from './AnimeMascots';

interface SeasonEditorialAnalysisProps {
  decisions: Decision[];
  teams: TeamSummary[];
  meta: MetaData | null;
}

/** Small uppercase block label, matching the decision-card section headers. */
const BlockLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</div>
);

/** Short human label for the choice a team actually made. */
function choiceSummary(d: Decision): string {
  if (d.actual_choice === 'field_goal') {
    return `${d.outcome.kick_distance ? `${d.outcome.kick_distance}-yd ` : ''}FG attempt`;
  }
  if (d.actual_choice === 'go') return '4th-down go attempt';
  if (d.actual_choice === 'punt') return 'punt';
  return String(d.actual_choice);
}

export const SeasonEditorialAnalysis: React.FC<SeasonEditorialAnalysisProps> = ({
  decisions,
  teams,
  meta,
}) => {
  // 1. Costliest Single Decision of the season so far (deterministic tiebreak)
  const costliestCall = useMemo(() => {
    return (
      [...decisions]
        .filter((d) => d.cost_pp !== null)
        .sort(
          (a, b) =>
            (b.cost_pp ?? 0) - (a.cost_pp ?? 0) ||
            a.week - b.week ||
            (a.game_id < b.game_id ? -1 : a.game_id > b.game_id ? 1 : 0) ||
            a.play_id - b.play_id
        )[0] || null
    );
  }, [decisions]);

  const costliestStory = useMemo(
    () => (costliestCall ? buildStory(costliestCall) : null),
    [costliestCall]
  );

  // 2. Adherence Leader (excluding low sample warning)
  const adherenceLeader = useMemo(() => {
    return (
      [...teams]
        .filter((t) => !t.low_sample_warning && t.adherence_pct !== null)
        .sort(
          (a, b) => (b.adherence_pct ?? 0) - (a.adherence_pct ?? 0) || a.total_wp_lost_pp - b.total_wp_lost_pp
        )[0] || null
    );
  }, [teams]);

  // 3. Second Place Adherent Team
  const adherenceRunnerUp = useMemo(() => {
    const valid = [...teams]
      .filter((t) => !t.low_sample_warning && t.adherence_pct !== null)
      .sort(
        (a, b) => (b.adherence_pct ?? 0) - (a.adherence_pct ?? 0) || a.total_wp_lost_pp - b.total_wp_lost_pp
      );
    return valid.length > 1 ? valid[1] : null;
  }, [teams]);

  // 4. Most Punts on Clear Go Situations
  const clearGoPuntsTeam = useMemo(() => {
    return [...teams].sort((a, b) => b.punted_on_clear_go - a.punted_on_clear_go)[0] || null;
  }, [teams]);

  // 5. Aggression vs conservatism split (all thresholds from the data helpers)
  const aggression = useMemo(() => computeAggressionStats(decisions), [decisions]);

  // 6. Lowest & Highest Cumulative Cost Teams
  const lowestCostTeam = useMemo(() => {
    return (
      [...teams]
        .filter((t) => !t.low_sample_warning)
        .sort((a, b) => a.total_wp_lost_pp - b.total_wp_lost_pp)[0] || null
    );
  }, [teams]);

  const highestCostTeam = useMemo(() => {
    return [...teams].sort((a, b) => b.total_wp_lost_pp - a.total_wp_lost_pp)[0] || null;
  }, [teams]);

  // 7. Season, max week and refresh stamp - all from the data
  const season = seasonOf(decisions, meta?.season);
  const seasonLabel = season !== null ? `${season}` : 'Current';

  const maxWeek = useMemo(() => {
    if (meta?.weeks?.length) return Math.max(...meta.weeks);
    if (decisions.length > 0) return Math.max(...decisions.map((d) => d.week));
    return 8;
  }, [meta, decisions]);

  const dataAsOf = meta?.data_as_of || 'unknown refresh date';

  const leaderRunnerUpTied =
    adherenceLeader &&
    adherenceRunnerUp &&
    adherenceLeader.adherence_pct !== null &&
    adherenceLeader.adherence_pct === adherenceRunnerUp.adherence_pct;

  const sameTeamWorstAndClearGo =
    highestCostTeam && clearGoPuntsTeam && highestCostTeam.team === clearGoPuntsTeam.team;

  return (
    <section className="mb-8 rounded-2xl border border-slate-800 bg-[#0c1222] p-5 sm:p-7 shadow-2xl relative overflow-hidden anime-card-glow">
      {/* Background Graphic Watermark */}
      <div className="absolute -top-12 -right-12 text-[140px] font-black text-white/[0.02] select-none pointer-events-none">
        4TH
      </div>

      {/* Section Title with Japanese Title Flavour */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              【シーズン激闘総括】{seasonLabel} Season Tactical Analysis & Extremes
            </h2>
            <MangaStamp kanji="激闘" subtext="ANALYSIS" variant="hissho" className="scale-75 hidden sm:inline-flex" />
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            Editorial deep-dive across Weeks 1–{maxWeek} (data refreshed {dataAsOf}): uncovering the costliest tactical calls, the myth of over-aggression, and the NFL coaching divide.
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Every figure and story on this page is recomputed from the latest data refresh, so it changes when new weeks are processed. Nothing here is hand-edited.
          </p>
        </div>
      </div>

      {/* Key Metric Highlights Grid (All English boxes, dynamically computed) */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
            <Flame className="h-4 w-4" />
            <span>Costliest Call</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">
            {costliestCall?.cost_pp ? `${costliestCall.cost_pp.toFixed(1)} pp` : 'n/a'}
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            {costliestCall
              ? `${costliestCall.posteam} ${choiceSummary(costliestCall)} vs ${costliestCall.defteam} (Wk ${costliestCall.week})`
              : 'Calculating...'}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <Award className="h-4 w-4" />
            <span>Adherence Leader</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">
            {adherenceLeader?.adherence_pct !== null && adherenceLeader?.adherence_pct !== undefined
              ? `${adherenceLeader.adherence_pct.toFixed(1)}%`
              : 'n/a'}
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            {adherenceLeader
              ? `${getTeamName(adherenceLeader.team)} (${adherenceLeader.adherent_count}/${adherenceLeader.non_toss_up_genuine} non-toss-ups)`
              : 'Calculating...'}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
            <ShieldAlert className="h-4 w-4" />
            <span>Clear Go Punts</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">
            {clearGoPuntsTeam ? `${clearGoPuntsTeam.punted_on_clear_go} Punts` : '0 Punts'}
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            {clearGoPuntsTeam ? `${getTeamName(clearGoPuntsTeam.team)} (NFL High)` : 'Calculating...'}
          </p>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
            <Compass className="h-4 w-4" />
            <span>Over-Aggressive Calls</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">
            {aggression.overAggressiveCount} Calls
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            {aggression.overAggressiveCount === 0
              ? `Zero costly gambles across ${aggression.totalDecisions.toLocaleString()} scored decisions`
              : `${aggression.overAggressiveCount} of ${aggression.goAttempts.toLocaleString()} go attempts cost > ${COSTLY_ERROR_THRESHOLD_PP.toFixed(1)} pp`}
          </p>
        </div>
      </div>

      {/* In-Depth Feature Stories Grid with Artwork */}
      <div className="space-y-6">
        {/* Story 1: Worst Decision of the Season (card-style hierarchy) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-slate-700/60 shadow-md group">
            <img
              src="assets/anime-fieldgoal-kick.jpg"
              alt="Manga football placekicker kicking towards goalposts"
              className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-black text-amber-300 tracking-wider uppercase">
                Case Study: The Costliest Call
              </span>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-4">
            {costliestCall && costliestStory ? (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>The Costliest Tactical Call of {seasonLabel}</span>
                  </div>

                  {/* 1. The situation */}
                  <div className="mt-3">
                    <BlockLabel>The situation</BlockLabel>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1">
                      Week {costliestCall.week}: {getTeamName(costliestCall.posteam)} vs {getTeamName(costliestCall.defteam)}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-300 font-semibold">
                      {formatDownAndDistance(costliestCall.down, costliestCall.ydstogo, costliestCall.yardline_100)}
                      {' · '}at {getFieldPositionInfo(costliestCall.yardline_100, costliestCall.posteam, costliestCall.defteam).yardlineText}
                      {' · '}{formatTimeRemaining(costliestCall.qtr, costliestCall.quarter_seconds_remaining)}
                      {' · '}{getScoreDifferentialBadge(costliestCall.score_differential, costliestCall.posteam).label} ({costliestCall.posteam_score}–{costliestCall.defteam_score})
                    </p>
                  </div>

                  {/* 2. The model comparison (pre-snap, choice-aware) */}
                  <div className="mt-3">
                    <BlockLabel>Model comparison (pre-snap)</BlockLabel>
                    <p className="mt-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {costliestStory.comparisonSentence}
                    </p>
                    {costliestStory.completenessLine && (
                      <p className="mt-1 text-[11px] text-slate-400">{costliestStory.completenessLine}</p>
                    )}
                    {costliestStory.showVerdict && costliestCall.cost_pp !== null && (
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Taking the lower-rated option cost an estimated{' '}
                        <strong className="text-white">{costliestCall.cost_pp.toFixed(1)} percentage points</strong> of win probability.
                      </p>
                    )}
                  </div>

                  {/* 3. What actually happened */}
                  <div className="mt-3">
                    <BlockLabel>What happened</BlockLabel>
                    <p className="mt-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {costliestStory.actionSentence}
                    </p>
                    <div className="mt-2 rounded-lg border border-slate-700/70 bg-[#0a0f1d] p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Quote className="h-3 w-3" />
                        <span>Raw play-by-play (nflverse)</span>
                      </div>
                      <p className="mt-1 text-[11px] sm:text-xs text-slate-400 leading-relaxed font-mono">
                        {costliestCall.outcome.desc}
                      </p>
                    </div>
                    {costliestCall.play_succeeded && (costliestCall.cost_pp ?? 0) > COSTLY_ERROR_THRESHOLD_PP && (
                      <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Under conventional commentary, a spectacular make can be celebrated as a bold success - but decision theory distinguishes the sound call from the athletic bailout.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                  {costliestStory.showVerdict ? (
                    <>
                      <span className="text-slate-400">
                        Pre-Snap Model Verdict:{' '}
                        <strong className="text-rose-400">
                          {costliestCall.verdict_label}
                          {costliestCall.cost_pp !== null ? ` (${costliestCall.cost_pp.toFixed(1)} pp deficit)` : ''}
                        </strong>
                      </span>
                      <span className="text-slate-400">
                        Post-Snap Outcome: <strong className="text-emerald-400">{costliestCall.quadrant}</strong>
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-300">{costliestStory.domainCaveat}</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs sm:text-sm text-slate-300 mt-2">Loading decision data...</p>
            )}
          </div>
        </div>

        {/* Story 2: The Myth of Over-Aggression (claims follow the data) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-8 flex flex-col justify-between space-y-3 order-2 md:order-1">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Analytical Mythbusting</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                {overAggressionHeadline(aggression)}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Whenever a team fails on fourth down, critics routinely claim coaches have become "blind slaves to spreadsheets."
                The tracking across all {aggression.totalDecisions.toLocaleString()} scored fourth downs in {seasonLabel} (Weeks 1–{maxWeek}) tells a different story.
              </p>
              {aggression.overAggressiveCount === 0 ? (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                  Out of {aggression.goAttempts.toLocaleString()} fourth-down go attempts across Weeks 1–{maxWeek},{' '}
                  <strong className="text-emerald-400">not one</strong> cost more than {COSTLY_ERROR_THRESHOLD_PP.toFixed(1)} percentage points against the model's preferred option - no over-gambles so far this season.
                  {aggression.conservativeErrorCount > 0 && (
                    <>
                      {' '}The costly errors have come from the opposite direction:{' '}
                      <strong className="text-amber-400">{aggression.conservativeErrorCount} punts or field-goal attempts</strong> surrendered more than {COSTLY_ERROR_THRESHOLD_PP.toFixed(1)} pp each.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                  Out of {aggression.goAttempts.toLocaleString()} fourth-down go attempts across Weeks 1–{maxWeek},{' '}
                  <strong className="text-emerald-400">{aggression.overAggressiveCount}</strong> cost more than {COSTLY_ERROR_THRESHOLD_PP.toFixed(1)} percentage points against the model's preferred option.
                  {conservatismDominates(aggression) ? (
                    <>
                      {' '}Costly errors still skew heavily conservative:{' '}
                      <strong className="text-amber-400">{aggression.conservativeErrorCount} punts or field-goal attempts</strong> crossed the same {COSTLY_ERROR_THRESHOLD_PP.toFixed(1)} pp line, versus {aggression.overAggressiveCount} go attempts.
                    </>
                  ) : aggression.conservativeErrorCount > 0 ? (
                    <>
                      {' '}For comparison, {aggression.conservativeErrorCount} punts or field-goal attempts also crossed that line.
                    </>
                  ) : null}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wide">Key Takeaway</span>
              <p className="mt-1 text-slate-300">
                {conservatismDominates(aggression) || aggression.overAggressiveCount === 0
                  ? 'Coaches do not risk game equity by being too aggressive; they surrender equity by retreating when the mathematics command them to attack.'
                  : 'Judge each call against the pre-snap numbers, not the post-hoc narrative.'}
              </p>
            </div>
          </div>

          <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-slate-700/60 shadow-md group order-1 md:order-2">
            <img
              src="assets/anime-runningback-dive.jpg"
              alt="Manga football running back diving over scrimmage line"
              className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-black text-sky-300 tracking-wider uppercase">
                4th & Inches: The Conversion Battle
              </span>
            </div>
          </div>
        </div>

        {/* Story 3: The Coaching Divide */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-slate-700/60 shadow-md group">
            <img
              src="assets/anime-quarterback-pass.jpg"
              alt="Manga anime quarterback launching deep pass"
              className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-black text-emerald-300 tracking-wider uppercase">
                Tactical Masterminds vs Traditionalists
              </span>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                <Award className="h-3.5 w-3.5" />
                <span>The NFL Coaching Spectrum</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                Analytics Darlings vs The Cowardly Punt Index
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Weeks 1–{maxWeek} of the {seasonLabel} season show a widening philosophical gulf between coaching staffs:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-300">
                {adherenceLeader && (
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(adherenceLeader.team)}</strong>: Benchmark for modern game theory, at a league-best <strong className="text-emerald-400">{adherenceLeader.adherence_pct?.toFixed(1)}% adherence</strong> ({adherenceLeader.adherent_count} of {adherenceLeader.non_toss_up_genuine} non-toss-ups), surrendering only {adherenceLeader.total_wp_lost_pp.toFixed(1)} pp of win probability across Weeks 1–{maxWeek}, and committing {adherenceLeader.punted_on_clear_go} punts on Clear Go situations.
                    </span>
                  </li>
                )}
                {adherenceRunnerUp && (
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(adherenceRunnerUp.team)}</strong>: {leaderRunnerUpTied ? 'Level with the leader' : 'Close behind'} at <strong className="text-cyan-400">{adherenceRunnerUp.adherence_pct?.toFixed(1)}% adherence</strong> with only {adherenceRunnerUp.total_wp_lost_pp.toFixed(1)} pp lost across {adherenceRunnerUp.non_toss_up_genuine} decisions.
                    </span>
                  </li>
                )}
                {sameTeamWorstAndClearGo && highestCostTeam && (
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(highestCostTeam.team)}</strong>: Surrendered a league-worst <strong className="text-rose-400">{highestCostTeam.total_wp_lost_pp.toFixed(1)} pp of win probability</strong> and committed <strong className="text-rose-400">{highestCostTeam.punted_on_clear_go} punts on Clear Go situations</strong> - the most of any team in the NFL.
                    </span>
                  </li>
                )}
                {!sameTeamWorstAndClearGo && highestCostTeam && clearGoPuntsTeam && (
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(highestCostTeam.team)} & {getTeamName(clearGoPuntsTeam.team)}</strong>: {getTeamName(highestCostTeam.team)} surrendered a league-worst <strong className="text-rose-400">{highestCostTeam.total_wp_lost_pp.toFixed(1)} pp of win probability</strong> due to repeated conservative choices, while {getTeamName(clearGoPuntsTeam.team)} committed <strong className="text-rose-400">{clearGoPuntsTeam.punted_on_clear_go} punts on Clear Go situations</strong> - the most of any team in the NFL.
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">
                Lowest Cumulative Cost: <strong className="text-emerald-400">{lowestCostTeam ? `${getTeamName(lowestCostTeam.team)} (${lowestCostTeam.total_wp_lost_pp.toFixed(1)} pp lost)` : 'n/a'}</strong>
              </span>
              <span className="text-slate-400">
                Highest Cumulative Cost: <strong className="text-rose-400">{highestCostTeam ? `${getTeamName(highestCostTeam.team)} (${highestCostTeam.total_wp_lost_pp.toFixed(1)} pp lost)` : 'n/a'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
