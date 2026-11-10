import React, { useState, useMemo } from 'react';
import type { CancelledSnap, Decision, GameSummary, MetaData } from '../types/decision';
import { DecisionCard } from '../components/DecisionCard';
import { getTeamLogoUrl, isDarkLogo, getTeamName, getTeamFallbackSvg } from '../utils/teamLogos';
import { Compass, Calendar, Zap, ArrowRight, ShieldAlert, ArrowUpDown } from 'lucide-react';
import { GAME_SORT_OPTIONS, sortDecisions, sortLabel, type DecisionSortKey } from '../utils/sort';
import { BlitzMascot, MangaStamp, MangaSoundEffect } from '../components/AnimeMascots';

interface GamesPageProps {
  games: GameSummary[];
  decisions: Decision[];
  cancelledSnaps?: CancelledSnap[];
  meta?: MetaData | null;
  loading: boolean;
}

const formatChoiceName = (opt?: string | null) => {
  if (opt === 'go') return 'Go for it';
  if (opt === 'field_goal') return 'Field Goal';
  if (opt === 'punt') return 'Punt';
  return opt || 'n/a';
};

export const GamesPage: React.FC<GamesPageProps> = ({
  games,
  decisions,
  cancelledSnaps = [],
  meta = null,
  loading,
}) => {
  const weeks = useMemo(() => {
    const set = new Set(games.map((g) => g.week));
    return Array.from(set).sort((a, b) => b - a);
  }, [games]);

  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return games[0]?.week || 1;
  });

  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.game_id || '');

  // Keep selectedGameId in sync when games load
  React.useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[0].game_id);
    }
  }, [games, selectedGameId]);

  const activeGame = useMemo(() => {
    return games.find((g) => g.game_id === selectedGameId) || games[0];
  }, [games, selectedGameId]);

  // Keep selectedWeek synced with activeGame
  React.useEffect(() => {
    if (activeGame && activeGame.week !== selectedWeek) {
      setSelectedWeek(activeGame.week);
    }
  }, [activeGame, selectedWeek]);

  const gamesForWeek = useMemo(() => {
    return games.filter((g) => g.week === selectedWeek);
  }, [games, selectedWeek]);

  const handleWeekChange = (newWeek: number) => {
    setSelectedWeek(newWeek);
    const firstGame = games.find((g) => g.week === newWeek);
    if (firstGame) {
      setSelectedGameId(firstGame.game_id);
    }
  };

  const gameDecisions = useMemo(() => {
    if (!activeGame) return [];
    return decisions
      .filter((d) => d.game_id === activeGame.game_id)
      .sort((a, b) => a.play_id - b.play_id); // Chronological order (play_id; game seconds reset in OT)
  }, [decisions, activeGame]);

  // Card list ordering. The timeline strip above always stays chronological;
  // this only reorders the full cards below. Chronological is the default.
  const [gameSortKey, setGameSortKey] = useState<DecisionSortKey>('chronological');

  const sortedGameDecisions = useMemo(() => {
    return sortDecisions(gameDecisions, gameSortKey);
  }, [gameDecisions, gameSortKey]);

  const gameCancelledSnaps = useMemo(() => {
    if (!activeGame) return [];
    return (cancelledSnaps || []).filter((s) => s.game_id === activeGame.game_id);
  }, [cancelledSnaps, activeGame]);

  const gameExcludedSnaps = useMemo(() => {
    if (!activeGame) return [];
    return (meta?.excluded_snaps || []).filter((s) => s.game_id === activeGame.game_id);
  }, [meta, activeGame]);

  const gameSummaryData = useMemo(() => {
    if (!activeGame || gameDecisions.length === 0) return null;

    // Highest cost decision
    const costliestPlay = [...gameDecisions]
      .filter((d) => (d.cost_pp ?? 0) > 0)
      .sort((a, b) => (b.cost_pp ?? 0) - (a.cost_pp ?? 0))[0] || null;

    // Choice counts
    const goPlays = gameDecisions.filter((d) => d.actual_choice === 'go');
    const goConverted = goPlays.filter((d) => d.outcome.converted).length;
    const fgPlays = gameDecisions.filter((d) => d.actual_choice === 'field_goal');
    const puntPlays = gameDecisions.filter((d) => d.actual_choice === 'punt');
    const suboptimalCalls = gameDecisions.filter((d) => (d.cost_pp ?? 0) > 1.0);

    const awayCost = activeGame.away_wp_lost_pp;
    const homeCost = activeGame.home_wp_lost_pp;
    const diff = Math.abs(awayCost - homeCost);
    let coachingVerdict = `Both teams had comparable decision equity: total model cost differed by ${diff.toFixed(1)} pp across ${gameDecisions.length} fourth-down decisions.`;
    if (diff >= 1.0) {
      if (awayCost > homeCost) {
        coachingVerdict = `${activeGame.home_team} surrendered an estimated ${diff.toFixed(1)} pp less model-valued win probability than ${activeGame.away_team} across ${gameDecisions.length} fourth-down decisions.`;
      } else {
        coachingVerdict = `${activeGame.away_team} surrendered an estimated ${diff.toFixed(1)} pp less model-valued win probability than ${activeGame.home_team} across ${gameDecisions.length} fourth-down decisions.`;
      }
    }

    const allWithinTolerance = gameDecisions.every((d) => (d.cost_pp ?? 0) <= 1.0);
    const hasStronglyPreferredBlunder = costliestPlay && (costliestPlay.cost_pp ?? 0) > 3.0;

    return {
      totalSnaps: gameDecisions.length,
      goCount: goPlays.length,
      goConverted,
      fgCount: fgPlays.length,
      puntCount: puntPlays.length,
      suboptimalCount: suboptimalCalls.length,
      costliestPlay,
      coachingVerdict,
      allWithinTolerance,
      hasStronglyPreferredBlunder,
    };
  }, [activeGame, gameDecisions]);

  const scrollToDecision = (playId: number) => {
    const el = document.getElementById(`decision-${playId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-sky-400', 'border-sky-400');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-sky-400', 'border-sky-400');
      }, 2200);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-300">Loading game summaries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Two-Part Coordinated Game Selector */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg anime-card-glow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-400" />
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>【名勝負選定】Select NFL Matchup</span>
                <MangaSoundEffect sound="バチバチ！" english="vs" className="text-amber-400 hidden sm:inline-flex" />
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Choose a regular season week, then select an individual game
              </p>
            </div>
          </div>

          {/* Two-Part Coordinated Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 w-full md:max-w-xl">
            {/* Part 1: Week Selector */}
            <div className="sm:col-span-4">
              <label htmlFor="week-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                1. Select Week
              </label>
              <select
                id="week-select"
                value={selectedWeek}
                onChange={(e) => handleWeekChange(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-bold text-white focus:border-sky-500 focus:outline-none min-h-[44px]"
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Part 2: Game Selector */}
            <div className="sm:col-span-8">
              <label htmlFor="game-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                2. Select Matchup ({gamesForWeek.length} Games)
              </label>
              <select
                id="game-select"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-bold text-white focus:border-sky-500 focus:outline-none min-h-[44px]"
              >
                {gamesForWeek.map((g) => (
                  <option key={g.game_id} value={g.game_id}>
                    {g.away_team} at {g.home_team} ({g.decisions_count} fourth downs)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {activeGame && (
        <div className="space-y-6">
          {/* Active Game Header */}
          <div className="rounded-xl border border-slate-800 bg-[#101729] p-5 shadow-lg anime-card-glow relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
              {/* Matchup */}
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Away Team */}
                <div className="flex items-center gap-3">
                  <img
                    src={getTeamLogoUrl(activeGame.away_team)}
                    alt={getTeamName(activeGame.away_team)}
                    className={`h-10 w-10 sm:h-12 sm:w-12 object-contain ${isDarkLogo(activeGame.away_team) ? 'team-logo-dark-outline' : ''}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getTeamFallbackSvg(activeGame.away_team);
                    }}
                  />
                  <div>
                    <span className="text-base sm:text-lg font-black text-white">{activeGame.away_team}</span>
                    <span className="block text-xs text-slate-400">{getTeamName(activeGame.away_team)}</span>
                    <span className="text-[11px] text-rose-300 font-bold tabular-nums">
                      WP Lost: {activeGame.away_wp_lost_pp.toFixed(1)} pp
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400">VS</span>
                </div>

                {/* Home Team */}
                <div className="flex items-center gap-3">
                  <img
                    src={getTeamLogoUrl(activeGame.home_team)}
                    alt={getTeamName(activeGame.home_team)}
                    className={`h-10 w-10 sm:h-12 sm:w-12 object-contain ${isDarkLogo(activeGame.home_team) ? 'team-logo-dark-outline' : ''}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getTeamFallbackSvg(activeGame.home_team);
                    }}
                  />
                  <div>
                    <span className="text-base sm:text-lg font-black text-white">{activeGame.home_team}</span>
                    <span className="block text-xs text-slate-400">{getTeamName(activeGame.home_team)}</span>
                    <span className="text-[11px] text-rose-300 font-bold tabular-nums">
                      WP Lost: {activeGame.home_wp_lost_pp.toFixed(1)} pp
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Meta */}
              <div className="flex items-center gap-3 text-xs">
                <div className="rounded-lg bg-slate-800/80 px-3 py-1.5 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Season & Week:</span>
                  <span className="font-bold text-white">2026 • Week {activeGame.week}</span>
                </div>
                <div className="rounded-lg bg-slate-800/80 px-3 py-1.5 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">4th Down Snaps:</span>
                  <span className="font-bold text-sky-400 tabular-nums">{gameDecisions.length}</span>
                </div>
                <div className="hidden sm:flex items-center">
                  <BlitzMascot className="h-10 w-10" mood="determined" />
                </div>
              </div>
            </div>

            {/* Game 4th-Down Tactical Summary Box */}
            {gameSummaryData && (
              <div className="mt-5 rounded-xl border border-slate-800/90 bg-[#080d19] p-4 text-xs relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span className="font-extrabold uppercase tracking-wider text-slate-200">
                      Game 4th-Down Tactical Summary
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Go: <strong className="text-white">{gameSummaryData.goCount}</strong> ({gameSummaryData.goConverted} converted)</span>
                    <span>•</span>
                    <span>FG: <strong className="text-white">{gameSummaryData.fgCount}</strong></span>
                    <span>•</span>
                    <span>Punts: <strong className="text-white">{gameSummaryData.puntCount}</strong></span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Tactical Assessment */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-1.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Coaching Decision Assessment
                      </span>
                      <p className="mt-1 text-slate-200 font-medium leading-relaxed">
                        {gameSummaryData.coachingVerdict}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] pt-1">
                      <span className="text-slate-400">
                        {activeGame.away_team} Cost: <strong className="text-rose-400 tabular-nums">{activeGame.away_wp_lost_pp.toFixed(1)} pp</strong>
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">
                        {activeGame.home_team} Cost: <strong className="text-rose-400 tabular-nums">{activeGame.home_wp_lost_pp.toFixed(1)} pp</strong>
                      </span>
                    </div>
                  </div>

                  {/* Turning Point Callout (P0-8) */}
                  <div className="md:col-span-5 rounded-lg border border-slate-800 bg-[#0b101c] p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        <span>{gameSummaryData.hasStronglyPreferredBlunder ? 'Crucial Turning Point' : 'Largest Single Decision Cost'}</span>
                        {gameSummaryData.costliestPlay && (
                          <span className={`${gameSummaryData.hasStronglyPreferredBlunder ? 'text-rose-400' : 'text-amber-400'} font-extrabold tabular-nums`}>
                            -{gameSummaryData.costliestPlay.cost_pp?.toFixed(1)} pp
                          </span>
                        )}
                      </div>
                      {gameSummaryData.costliestPlay && (gameSummaryData.hasStronglyPreferredBlunder || !gameSummaryData.allWithinTolerance) ? (
                        <p className="mt-1 text-slate-300 text-[11px] leading-snug line-clamp-2">
                          Play #{gameDecisions.findIndex((d) => d.play_id === gameSummaryData.costliestPlay?.play_id) + 1} (Q{gameSummaryData.costliestPlay.qtr}): {gameSummaryData.costliestPlay.posteam} chose{' '}
                          <strong className="text-white">{formatChoiceName(gameSummaryData.costliestPlay.actual_choice)}</strong> over preferred{' '}
                          <strong className="text-sky-300">{formatChoiceName(gameSummaryData.costliestPlay.best_option)}</strong>.
                        </p>
                      ) : (
                        <p className="mt-1 text-slate-400 text-[11px] leading-snug">
                          Every decision in this matchup was within the model's 1.0 pp tolerance.
                        </p>
                      )}
                    </div>

                    {gameSummaryData.costliestPlay && (
                      <button
                        type="button"
                        onClick={() => scrollToDecision(gameSummaryData.costliestPlay!.play_id)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <span>Jump to this play on timeline</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Decision Costs Timeline Strip */}
            <div className="mt-5 border-t border-slate-800/80 pt-4 relative z-10">
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sky-400" />
                  <span>Chronological Decision Timeline ({gameDecisions.length} Snaps — Click to jump)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Green = Reasonable • Amber = Leaned • Rose = Strongly Preferred
                </span>
              </div>

              {/* Visual Strip with Interactive Click (P1-8 accessible timeline) */}
              <div className="flex h-7 w-full items-center gap-1 overflow-x-auto rounded-lg bg-[#070b14] p-1 border border-slate-800">
                {gameDecisions.map((d, index) => {
                  const cost = d.cost_pp ?? 0;
                  let bg = 'bg-emerald-500';
                  if (cost > 3.0) bg = 'bg-rose-500';
                  else if (cost > 1.0) bg = 'bg-amber-500';

                  return (
                    <button
                      key={d.play_id}
                      type="button"
                      onClick={() => scrollToDecision(d.play_id)}
                      className={`h-full flex-1 min-w-[20px] rounded transition-all hover:scale-y-125 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-900 cursor-pointer ${bg}`}
                      title={`Play #${index + 1} (${d.posteam}, Q${d.qtr}): ${d.actual_choice.toUpperCase()} • Cost: ${cost.toFixed(1)} pp • ${d.verdict_label} — Click to inspect`}
                      aria-label={`Play ${index + 1}, Q${d.qtr}, ${d.posteam} chose ${formatChoiceName(d.actual_choice)}, cost ${cost.toFixed(1)} pp`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audited Non-Executed Snaps for this Game (P1-10) */}
          {(gameCancelledSnaps.length > 0 || gameExcludedSnaps.length > 0) && (
            <div className="rounded-xl border border-slate-800 bg-[#0a0f1d] p-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                    Audited Non-Executed Snaps in this Matchup ({gameCancelledSnaps.length + gameExcludedSnaps.length} Snaps)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Excluded from decision model (penalty / victory formation)
                </span>
              </div>
              <div className="space-y-2">
                {gameCancelledSnaps.map((cs) => (
                  <div key={cs.play_id} className="rounded-lg border border-slate-800/80 bg-[#070b14] p-2.5 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-amber-300">
                        Play #{cs.play_id} • Q{cs.qtr} • {cs.posteam} ({cs.status_label})
                      </span>
                      {cs.replayed_on_fourth_down ? (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300 font-semibold border border-sky-500/30">
                          Replayed on 4th Down (Play #{cs.replayed_details?.next_play_id})
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                          Resulted in 1st Down / Turnover / End of Half
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-300 font-normal">{cs.desc}</p>
                  </div>
                ))}
                {gameExcludedSnaps.map((es) => (
                  <div key={es.play_id} className="rounded-lg border border-purple-500/30 bg-purple-950/15 p-2.5 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-purple-300">
                        Play #{es.play_id} • Q{es.qtr} • {es.posteam} ({es.reason})
                      </span>
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300 font-semibold border border-purple-500/40">
                        Victory Formation Kneel
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300 font-normal">{es.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Cards (chronological by default; sortable) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>
                  {gameSortKey === 'chronological'
                    ? `Chronological Decisions (${gameDecisions.length} Plays)`
                    : `Decisions (${gameDecisions.length} Plays) · Sorted by ${sortLabel(gameSortKey)}`}
                </span>
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="game-sort" className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                    <ArrowUpDown className="h-3.5 w-3.5 text-sky-400" />
                    <span>Sort plays</span>
                  </label>
                  <select
                    id="game-sort"
                    value={gameSortKey}
                    onChange={(e) => setGameSortKey(e.target.value as DecisionSortKey)}
                    className="rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none min-h-[40px]"
                  >
                    {GAME_SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <MangaStamp kanji="激闘" subtext="ALL PLAYS" variant="kekkoh" />
              </div>
            </div>
            {sortedGameDecisions.map((decision) => (
              <DecisionCard key={`${decision.game_id}_${decision.play_id}`} decision={decision} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
