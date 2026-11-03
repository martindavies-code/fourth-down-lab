import React, { useState, useMemo } from 'react';
import type { Decision } from '../types/decision';
import { DecisionCard } from '../components/DecisionCard';
import { NFL_TEAMS } from '../utils/teamLogos';
import { Filter, RotateCcw, Eye, EyeOff, Search } from 'lucide-react';
import { BlitzMascot, RefereeMascot } from '../components/AnimeMascots';

interface FeedPageProps {
  decisions: Decision[];
  loading: boolean;
  error: string | null;
}

export const FeedPage: React.FC<FeedPageProps> = ({ decisions, loading, error }) => {
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('genuine'); // 'genuine' | 'all' | 'clear_go' | 'incomplete'
  const [selectedVerdict, setSelectedVerdict] = useState<string>('ALL');
  const [showObvious, setShowObvious] = useState<boolean>(false);
  const [onlyAgainstModel, setOnlyAgainstModel] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 25;

  const weeks = useMemo(() => {
    const w = Array.from(new Set(decisions.map((d) => d.week))).sort((a, b) => a - b);
    return w;
  }, [decisions]);

  const teams = useMemo(() => {
    return Object.keys(NFL_TEAMS).sort();
  }, []);

  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      // Week filter
      if (selectedWeek !== 'ALL' && d.week !== parseInt(selectedWeek, 10)) {
        return false;
      }
      // Team filter
      if (selectedTeam !== 'ALL' && d.posteam !== selectedTeam && d.defteam !== selectedTeam) {
        return false;
      }
      // Verdict filter
      if (selectedVerdict !== 'ALL' && d.verdict_label !== selectedVerdict) {
        return false;
      }
      // Against model filter
      if (onlyAgainstModel && d.is_consistent_with_model !== false) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${d.posteam} ${d.defteam} ${d.outcome.desc} ${d.actual_choice}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      // Tier filter & Obvious toggle
      if (selectedTier === 'clear_go' && d.tier !== 'clear_go') {
        return false;
      }
      if (selectedTier === 'incomplete' && d.tier !== 'incomplete') {
        return false;
      }
      if (selectedTier === 'genuine' && !showObvious) {
        // Hide obvious punts and kicks unless showObvious is checked
        if (d.tier === 'obvious') return false;
      }

      return true;
    });
  }, [decisions, selectedWeek, selectedTeam, selectedTier, selectedVerdict, showObvious, onlyAgainstModel, searchQuery]);

  // Pagination slice
  const displayedDecisions = useMemo(() => {
    return filteredDecisions.slice(0, page * PAGE_SIZE);
  }, [filteredDecisions, page]);

  const hasMore = displayedDecisions.length < filteredDecisions.length;

  const resetFilters = () => {
    setSelectedWeek('ALL');
    setSelectedTeam('ALL');
    setSelectedTier('genuine');
    setSelectedVerdict('ALL');
    setShowObvious(false);
    setOnlyAgainstModel(false);
    setSearchQuery('');
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-300">Loading NFL 4th down decisions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-6">
          <h2 className="text-lg font-bold text-rose-400">Failed to Load Decisions</h2>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Anime Hero Banner (Eyeshield 21 Style) */}
      <section className="mb-6 overflow-hidden rounded-2xl border-2 border-sky-500/40 bg-[#070b14] shadow-2xl relative anime-card-glow">
        <div
          className="absolute inset-0 bg-cover bg-right sm:bg-center opacity-35 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url('assets/anime-hero-banner.jpg')` }}
        />
        <div className="relative p-4 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3 text-center md:text-left rounded-xl bg-[#090e1c]/90 backdrop-blur-md p-5 sm:p-6 border border-slate-700/70 shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>激闘！2026シーズン 第1週〜第8週 全1,867プレー完全解析</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
              <span>勝利へのギャンブルか、堅実な陣地戦か！？</span>
            </h2>
            <p className="text-sm sm:text-base text-white leading-relaxed font-semibold drop-shadow-sm">
              Every authentic NFL 4th down decision tracked, simulated, and audited. 
              Mathematically evaluating the win probability of Go, Field Goal, and Punt from the exact same pre-snap moment.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-sky-200 bg-sky-950/90 px-3 py-1.5 rounded-lg border border-sky-400/50 shadow-sm">
                ⚡ Gamble = 4th Down Go Attempt
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-200 bg-emerald-950/90 px-3 py-1.5 rounded-lg border border-emerald-400/50 shadow-sm">
                🎯 Reasonable = Sound Call
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-200 bg-rose-950/90 px-3 py-1.5 rounded-lg border border-rose-400/50 shadow-sm">
                ☠ Suboptimal = Costly Choice
              </span>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/95 border border-sky-400/50 shrink-0 shadow-2xl backdrop-blur-md">
            <BlitzMascot className="h-20 w-20" mood="intense" />
            <span className="mt-1.5 text-xs font-black text-sky-300">ブリッツ君 (Blitz-kun)</span>
            <span className="text-[10px] text-slate-300 font-bold">Chief Model Analyst</span>
          </div>
        </div>
      </section>

      {/* Controls & Filter Bar */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg anime-card-glow" aria-label="Filters">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Decision Filter & Search</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white tabular-nums">{filteredDecisions.length}</strong> of{' '}
              <strong className="text-white tabular-nums">{decisions.length}</strong> decisions
            </span>

            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Tier Selector Buttons */}
        <div className="mt-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
            Decision Tier Filter
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => { setSelectedTier('genuine'); setPage(1); }}
              className={`min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTier === 'genuine'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-500/10'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Genuine (≤3.0 pp)</span>
            </button>
            <button
              onClick={() => { setSelectedTier('clear_go'); setPage(1); }}
              className={`min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTier === 'clear_go'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/10'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Clear Go (&gt;3.0 pp)</span>
            </button>
            <button
              onClick={() => { setSelectedTier('all'); setPage(1); }}
              className={`min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTier === 'all'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/50 shadow-sm shadow-indigo-500/10'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>All Snaps</span>
            </button>
            <button
              onClick={() => { setSelectedTier('incomplete'); setPage(1); }}
              className={`min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTier === 'incomplete'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50 shadow-sm shadow-rose-500/10'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Incomplete</span>
            </button>
          </div>
        </div>

        {/* Dropdowns & Search */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Week Filter */}
          <div>
            <label htmlFor="filter-week" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Week
            </label>
            <select
              id="filter-week"
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All Weeks (1–{weeks.length ? Math.max(...weeks) : 8})</option>
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label htmlFor="filter-team" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Team
            </label>
            <select
              id="filter-team"
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All 32 Teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t} - {NFL_TEAMS[t]?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Verdict Filter */}
          <div>
            <label htmlFor="filter-verdict" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Model Verdict
            </label>
            <select
              id="filter-verdict"
              value={selectedVerdict}
              onChange={(e) => {
                setSelectedVerdict(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All Verdicts</option>
              <option value="Reasonable">Reasonable (Cost ≤ 1.0 pp)</option>
              <option value="Model leaned the other way">Model Leaned (1.0–3.0 pp)</option>
              <option value="Model strongly preferred another option">Strongly Preferred Alternative (&gt; 3.0 pp)</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label htmlFor="filter-search" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Search Plays
            </label>
            <div className="relative">
              <input
                id="filter-search"
                type="text"
                placeholder="Team, player, action..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-700 bg-[#111827] pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none min-h-[40px]"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Toggles Row */}
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white min-h-[36px]">
            <input
              type="checkbox"
              checked={showObvious}
              onChange={(e) => {
                setShowObvious(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            {showObvious ? <Eye className="h-3.5 w-3.5 text-sky-400" /> : <EyeOff className="h-3.5 w-3.5 text-slate-500" />}
            <span>Show obvious punts & kicks</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white min-h-[36px]">
            <input
              type="checkbox"
              checked={onlyAgainstModel}
              onChange={(e) => {
                setOnlyAgainstModel(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span>Only show calls against model</span>
          </label>
        </div>
      </section>

      {/* Decision Cards Feed */}
      <main className="space-y-4">
        {displayedDecisions.map((decision) => (
          <DecisionCard key={`${decision.game_id}_${decision.play_id}`} decision={decision} />
        ))}

        {filteredDecisions.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-8 sm:p-12 text-center flex flex-col items-center justify-center anime-card-glow">
            <RefereeMascot className="h-20 w-20 mb-3" />
            <span className="text-amber-400 font-extrabold text-sm uppercase tracking-wider">
              【 審判の笛・該当なし 】
            </span>
            <h3 className="text-base font-bold text-white mt-1">No decisions match your current filters</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md">
              条件に一致するプレーが見つかりませんでした。フィルターをリセットするか「定石判定を含める (Show obvious)」をお試しください。
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400 transition-colors shadow-md min-h-[44px]"
            >
              フィルター解除 Reset Filters
            </button>
          </div>
        )}

        {hasMore && (
          <div className="pt-4 text-center">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-xl border border-sky-400/50 bg-sky-500/15 px-8 py-3 text-xs font-black text-sky-300 hover:bg-sky-500/25 transition-all shadow-md min-h-[44px]"
            >
              さらに読み込む Load More Decisions ({displayedDecisions.length} of {filteredDecisions.length})
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
