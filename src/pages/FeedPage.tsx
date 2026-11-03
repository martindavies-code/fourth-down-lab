import React, { useState, useMemo } from 'react';
import type { Decision } from '../types/decision';
import { DecisionCard } from '../components/DecisionCard';
import { NFL_TEAMS } from '../utils/teamLogos';
import { Filter, RotateCcw, Eye, EyeOff, Search } from 'lucide-react';

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
      {/* Controls & Filter Bar */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg" aria-label="Filters">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white">Decision Filter & Search</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white tabular-nums">{filteredDecisions.length}</strong> of{' '}
              <strong className="text-white tabular-nums">{decisions.length}</strong> decisions
            </span>

            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Dropdowns & Inputs */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
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
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
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
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">All 32 Teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t} - {NFL_TEAMS[t]?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Decision Tier */}
          <div>
            <label htmlFor="filter-tier" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Decision Tier
            </label>
            <select
              id="filter-tier"
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="genuine">Genuine Decisions (Gap ≤ 3.0 pp)</option>
              <option value="clear_go">Clear Go Decisions (&gt; 3.0 pp)</option>
              <option value="all">All Snaps (incl. Obvious)</option>
              <option value="incomplete">Incomplete Comparisons Only</option>
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
              className="w-full rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">All Verdicts</option>
              <option value="Reasonable">Reasonable (Cost ≤ 1.0 pp)</option>
              <option value="Model leaned the other way">Model leaned other way (1.0–3.0 pp)</option>
              <option value="Model strongly preferred another option">Model strongly preferred (&gt; 3.0 pp)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
            <label htmlFor="filter-search" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Search Plays
            </label>
            <div className="relative">
              <input
                id="filter-search"
                type="text"
                placeholder="Team, player, desc..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-700 bg-[#111827] pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Toggles Row */}
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
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
            <span>Show obvious punts & kicks (hidden by default)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={onlyAgainstModel}
              onChange={(e) => {
                setOnlyAgainstModel(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span>Went against model recommendation only</span>
          </label>
        </div>
      </section>

      {/* Decision Cards Feed */}
      <main className="space-y-4">
        {displayedDecisions.map((decision) => (
          <DecisionCard key={`${decision.game_id}_${decision.play_id}`} decision={decision} />
        ))}

        {filteredDecisions.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-12 text-center">
            <h3 className="text-base font-bold text-slate-300">No decisions match your current filters</h3>
            <p className="mt-1 text-xs text-slate-400">
              Try resetting your filters or enabling "Show obvious punts and kicks".
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400"
            >
              Reset Filters
            </button>
          </div>
        )}

        {hasMore && (
          <div className="pt-4 text-center">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-6 py-3 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition-all shadow-md"
            >
              Load More Decisions ({displayedDecisions.length} of {filteredDecisions.length})
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
