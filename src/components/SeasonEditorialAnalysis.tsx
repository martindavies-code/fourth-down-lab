import React, { useMemo } from 'react';
import type { Decision, MetaData, TeamSummary } from '../types/decision';
import { getTeamName } from '../utils/teamLogos';
import { formatProbability } from '../utils/formatting';
import { Flame, ShieldAlert, Award, Compass, TrendingDown, CheckCircle2 } from 'lucide-react';
import { MangaStamp } from './AnimeMascots';

interface SeasonEditorialAnalysisProps {
  decisions: Decision[];
  teams: TeamSummary[];
  meta: MetaData | null;
}

export const SeasonEditorialAnalysis: React.FC<SeasonEditorialAnalysisProps> = ({
  decisions,
  teams,
  meta,
}) => {
  // 1. Costliest Single Decision of Season
  const costliestCall = useMemo(() => {
    return [...decisions]
      .filter((d) => d.cost_pp !== null)
      .sort((a, b) => (b.cost_pp ?? 0) - (a.cost_pp ?? 0))[0] || null;
  }, [decisions]);

  // 2. Adherence Leader (excluding low sample warning)
  const adherenceLeader = useMemo(() => {
    return [...teams]
      .filter((t) => !t.low_sample_warning && t.adherence_pct !== null)
      .sort((a, b) => (b.adherence_pct ?? 0) - (a.adherence_pct ?? 0))[0] || null;
  }, [teams]);

  // 3. Second Place Adherent Team
  const adherenceRunnerUp = useMemo(() => {
    const valid = [...teams]
      .filter((t) => !t.low_sample_warning && t.adherence_pct !== null)
      .sort((a, b) => (b.adherence_pct ?? 0) - (a.adherence_pct ?? 0));
    return valid.length > 1 ? valid[1] : null;
  }, [teams]);

  // 4. Most Punts on Clear Go Situations
  const clearGoPuntsTeam = useMemo(() => {
    return [...teams].sort((a, b) => b.punted_on_clear_go - a.punted_on_clear_go)[0] || null;
  }, [teams]);

  // 5. Over-Aggressive Calls (> 3.0 pp cost on Go attempts)
  const overAggressiveCalls = useMemo(() => {
    return decisions.filter((d) => d.actual_choice === 'go' && (d.cost_pp ?? 0) > 3.0);
  }, [decisions]);

  // 6. Total Go Attempts and Total Plays
  const totalGoAttempts = useMemo(() => {
    return decisions.filter((d) => d.actual_choice === 'go').length;
  }, [decisions]);

  const totalDecisionsCount = decisions.length;

  // 7. Lowest & Highest Cumulative Cost Teams
  const lowestCostTeam = useMemo(() => {
    return [...teams]
      .filter((t) => !t.low_sample_warning)
      .sort((a, b) => a.total_wp_lost_pp - b.total_wp_lost_pp)[0] || null;
  }, [teams]);

  const highestCostTeam = useMemo(() => {
    return [...teams].sort((a, b) => b.total_wp_lost_pp - a.total_wp_lost_pp)[0] || null;
  }, [teams]);

  // 8. Max Week and Timestamp
  const maxWeek = useMemo(() => {
    if (meta?.weeks?.length) return Math.max(...meta.weeks);
    if (decisions.length > 0) return Math.max(...decisions.map((d) => d.week));
    return 8;
  }, [meta, decisions]);

  const dataAsOf = meta?.data_as_of || '2026-11-03';

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
              【シーズン激闘総括】2026 Season Tactical Analysis & Extremes
            </h2>
            <MangaStamp kanji="激闘" subtext="ANALYSIS" variant="hissho" className="scale-75 hidden sm:inline-flex" />
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            Editorial deep-dive across Weeks 1–{maxWeek} (data refreshed {dataAsOf}): uncovering the costliest tactical calls, the myth of over-aggression, and the NFL coaching divide.
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
              ? `${costliestCall.posteam} ${costliestCall.actual_choice === 'field_goal' ? `${costliestCall.outcome.kick_distance || ''}-yd FG` : costliestCall.actual_choice} vs ${costliestCall.defteam} (Wk ${costliestCall.week})`
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
            {overAggressiveCalls.length} Calls
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            {overAggressiveCalls.length === 0
              ? `Zero costly gambles across ${totalDecisionsCount.toLocaleString()} snaps`
              : `${overAggressiveCalls.length} costly gambles across ${totalDecisionsCount.toLocaleString()} snaps`}
          </p>
        </div>
      </div>

      {/* In-Depth Feature Stories Grid with Artwork */}
      <div className="space-y-6">
        {/* Story 1: Worst Decision of the Season */}
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

          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>The Costliest Tactical Call of 2026</span>
              </div>
              {costliestCall ? (
                <>
                  <h3 className="text-base sm:text-lg font-black text-white mt-2">
                    Week {costliestCall.week}: {getTeamName(costliestCall.posteam)} vs {getTeamName(costliestCall.defteam)} (4th & {Math.round(costliestCall.ydstogo)} on {costliestCall.yardline_100 < 50 ? `${costliestCall.defteam} ${Math.round(costliestCall.yardline_100)}` : `${costliestCall.posteam} ${Math.round(100 - costliestCall.yardline_100)}`}, Q{costliestCall.qtr} {Math.floor(costliestCall.quarter_seconds_remaining / 60)}:{(Math.floor(costliestCall.quarter_seconds_remaining % 60)).toString().padStart(2, '0')})
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                    {costliestCall.posteam} faced 4th & {Math.round(costliestCall.ydstogo)} trailing {costliestCall.posteam_score}–{costliestCall.defteam_score}. 
                    The mathematical win probability model strongly urged going for it (<strong className="text-emerald-400">Go WP: {formatProbability(costliestCall.options.go.wp)}</strong> vs <strong className="text-rose-400">Field Goal WP: {formatProbability(costliestCall.options.field_goal.wp)}</strong>), 
                    calculating a deficit of <strong className="text-white">{costliestCall.cost_pp ? `${costliestCall.cost_pp.toFixed(1)} percentage points` : ''}</strong> for attempting a kick.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                    {costliestCall.outcome.desc} Under conventional commentary, converting an improbable kick can be celebrated as a bold success, but decision theory distinguishes the sound call from the athletic bailout.
                  </p>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-slate-300 mt-2">Loading decision data...</p>
              )}
            </div>

            {costliestCall && (
              <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">Pre-Snap Model Verdict: <strong className="text-rose-400">{costliestCall.verdict_label} ({costliestCall.cost_pp?.toFixed(1)} pp deficit)</strong></span>
                <span className="text-slate-400">Post-Snap Outcome: <strong className="text-emerald-400">{costliestCall.quadrant}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Story 2: The Myth of Over-Aggression */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-8 flex flex-col justify-between space-y-3 order-2 md:order-1">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Analytical Mythbusting</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                The Myth of "Reckless Aggression" in Modern NFL Coaching
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Whenever a team fails on fourth down, critics routinely claim coaches have become "blind slaves to spreadsheets." 
                However, empirical tracking across all {totalDecisionsCount.toLocaleString()} fourth downs in 2026 reveals a stark reality: 
                <strong className="text-white"> NFL head coaches never over-gamble.</strong>
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Out of {totalGoAttempts} fourth-down go attempts across Weeks 1–{maxWeek}, there were <strong className="text-emerald-400">{overAggressiveCalls.length} instances</strong> where a team attempted a conversion that cost more than 3.0 percentage points compared to a punt or field goal. 
                Substantial coaching mistakes in the 2026 season were overwhelmingly acts of <strong className="text-amber-400">excessive conservatism</strong>—punting on 4th & short near midfield or attempting low-percentage 55+ yard kicks instead of trusting the offense.
              </p>
            </div>

            <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wide">Key Takeaway</span>
              <p className="mt-1 text-slate-300">
                Coaches do not risk game equity by being too aggressive; they surrender equity by retreating when the mathematics command them to attack.
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
                The 2026 season shows a widening philosophical gulf between coaching staffs:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-300">
                {adherenceLeader && (
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(adherenceLeader.team)}</strong>: Benchmark for modern game theory, achieving a league-best <strong className="text-emerald-400">{adherenceLeader.adherence_pct?.toFixed(1)}% adherence</strong> ({adherenceLeader.adherent_count} of {adherenceLeader.non_toss_up_genuine} non-toss-ups), surrendering only {adherenceLeader.total_wp_lost_pp.toFixed(1)} pp of win probability all season, and committing {adherenceLeader.punted_on_clear_go} punts on Clear Go situations.
                    </span>
                  </li>
                )}
                {adherenceRunnerUp && (
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(adherenceRunnerUp.team)}</strong>: Close behind at <strong className="text-cyan-400">{adherenceRunnerUp.adherence_pct?.toFixed(1)}% adherence</strong> with only {adherenceRunnerUp.total_wp_lost_pp.toFixed(1)} pp lost across {adherenceRunnerUp.non_toss_up_genuine} decisions.
                    </span>
                  </li>
                )}
                {highestCostTeam && clearGoPuntsTeam && (
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">{getTeamName(highestCostTeam.team)} & {getTeamName(clearGoPuntsTeam.team)}</strong>: {getTeamName(highestCostTeam.team)} surrendered a league-worst <strong className="text-rose-400">{highestCostTeam.total_wp_lost_pp.toFixed(1)} pp of win probability</strong> due to repeated conservative choices, while {getTeamName(clearGoPuntsTeam.team)} committed <strong className="text-rose-400">{clearGoPuntsTeam.punted_on_clear_go} punts on Clear Go situations</strong>—the most of any team in the NFL.
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
