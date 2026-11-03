import React, { useState, useMemo } from 'react';
import type { Decision, GameSummary } from '../types/decision';
import { DecisionCard } from '../components/DecisionCard';
import { getTeamLogoUrl, isDarkLogo, getTeamName } from '../utils/teamLogos';
import { Compass, Calendar } from 'lucide-react';
import { BlitzMascot, MangaStamp, MangaSoundEffect } from '../components/AnimeMascots';

interface GamesPageProps {
  games: GameSummary[];
  decisions: Decision[];
  loading: boolean;
}

export const GamesPage: React.FC<GamesPageProps> = ({ games, decisions, loading }) => {
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

  const gameDecisions = useMemo(() => {
    if (!activeGame) return [];
    return decisions
      .filter((d) => d.game_id === activeGame.game_id)
      .sort((a, b) => a.play_id - b.play_id); // Chronological order
  }, [decisions, activeGame]);

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
      {/* Game Selector Bar */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg anime-card-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>【名勝負選定】Select NFL Matchup</span>
              <MangaSoundEffect sound="バチバチ！" english="vs" className="text-amber-400 hidden sm:inline-flex" />
            </h2>
          </div>

          <div className="flex-1 max-w-md">
            <label htmlFor="game-select" className="sr-only">
              Choose game
            </label>
            <select
              id="game-select"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-semibold text-white focus:border-sky-500 focus:outline-none min-h-[44px]"
            >
              {games.map((g) => (
                <option key={g.game_id} value={g.game_id}>
                  第{g.week}週 Week {g.week}: {g.away_team} at {g.home_team} ({g.decisions_count} fourth downs)
                </option>
              ))}
            </select>
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
                      e.currentTarget.src = getTeamLogoUrl('NFL');
                    }}
                  />
                  <div>
                    <span className="text-base sm:text-lg font-black text-white">{activeGame.away_team}</span>
                    <span className="block text-xs text-slate-400">{getTeamName(activeGame.away_team)}</span>
                    <span className="text-[11px] text-rose-300 font-bold tabular-nums">
                      喪失 WP: {activeGame.away_wp_lost_pp.toFixed(1)} pp
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs sm:text-sm font-black text-amber-400 italic">激突！</span>
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
                      e.currentTarget.src = getTeamLogoUrl('NFL');
                    }}
                  />
                  <div>
                    <span className="text-base sm:text-lg font-black text-white">{activeGame.home_team}</span>
                    <span className="block text-xs text-slate-400">{getTeamName(activeGame.home_team)}</span>
                    <span className="text-[11px] text-rose-300 font-bold tabular-nums">
                      喪失 WP: {activeGame.home_wp_lost_pp.toFixed(1)} pp
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Meta */}
              <div className="flex items-center gap-3 text-xs">
                <div className="rounded-lg bg-slate-800/80 px-3 py-1.5 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Season & Week:</span>
                  <span className="font-bold text-white">2026 第{activeGame.week}週</span>
                </div>
                <div className="rounded-lg bg-slate-800/80 px-3 py-1.5 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">4th Down Snaps:</span>
                  <span className="font-bold text-sky-400 tabular-nums">{gameDecisions.length}回</span>
                </div>
                <div className="hidden sm:flex items-center">
                  <BlitzMascot className="h-10 w-10" mood="determined" />
                </div>
              </div>
            </div>

            {/* Decision Costs Timeline Strip */}
            <div className="mt-5 border-t border-slate-800/80 pt-4 relative z-10">
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sky-400" />
                  <span>【戦況推移】Chronological Decision Timeline ({gameDecisions.length} Snaps)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Green = 的確 Reasonable • Amber = 逆張り Leaned • Rose = 大波乱 Strongly Preferred
                </span>
              </div>

              {/* Visual Strip */}
              <div className="flex h-7 w-full items-center gap-1 overflow-x-auto rounded-lg bg-[#070b14] p-1 border border-slate-800">
                {gameDecisions.map((d, index) => {
                  const cost = d.cost_pp ?? 0;
                  let bg = 'bg-emerald-500';
                  if (cost > 3.0) bg = 'bg-rose-500';
                  else if (cost > 1.0) bg = 'bg-amber-500';

                  return (
                    <div
                      key={d.play_id}
                      className={`h-full flex-1 min-w-[20px] rounded transition-all hover:opacity-80 cursor-pointer ${bg}`}
                      title={`Play #${index + 1} (${d.posteam}, Q${d.qtr}): ${d.actual_choice.toUpperCase()} • Cost: ${cost.toFixed(1)} pp • ${d.verdict_label}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chronological List of Decision Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>【全プレー年代記】Chronological Decisions ({gameDecisions.length} Plays)</span>
              </h3>
              <MangaStamp kanji="激闘" subtext="ALL PLAYS" variant="kekkoh" />
            </div>
            {gameDecisions.map((decision) => (
              <DecisionCard key={`${decision.game_id}_${decision.play_id}`} decision={decision} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
