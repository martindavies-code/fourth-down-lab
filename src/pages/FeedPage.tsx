import React, { useState, useMemo } from 'react';
import type { CancelledSnap, Decision, MetaData } from '../types/decision';
import { DecisionCard } from '../components/DecisionCard';
import { NFL_TEAMS } from '../utils/teamLogos';
import { formatWeekRangeJa, formatCount } from '../utils/formatting';
import { Filter, RotateCcw, Eye, EyeOff, Search, ChevronDown, ChevronUp, ShieldAlert, ArrowUpDown } from 'lucide-react';
import { FEED_SORT_OPTIONS, sortDecisions, sortSnaps, type DecisionSortKey } from '../utils/sort';
import { BlitzMascot, RefereeMascot } from '../components/AnimeMascots';

interface FeedPageProps {
  decisions: Decision[];
  cancelledSnaps?: CancelledSnap[];
  meta?: MetaData | null;
  loading: boolean;
  error: string | null;
  /** Set when another page asks the feed to open one team's decisions. */
  teamDrilldown?: { team: string; nonce: number } | null;
  onTeamDrilldownConsumed?: () => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  decisions,
  cancelledSnaps = [],
  meta = null,
  loading,
  error,
  teamDrilldown = null,
  onTeamDrilldownConsumed,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('genuine'); // 'genuine' | 'all' | 'clear_go' | 'incomplete'
  const [selectedVerdict, setSelectedVerdict] = useState<string>('ALL');
  const [showObvious, setShowObvious] = useState<boolean>(false);
  const [onlyAgainstModel, setOnlyAgainstModel] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<DecisionSortKey>('recent');
  const [page, setPage] = useState<number>(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const PAGE_SIZE = 25;

  // Cross-page drill-down (e.g. Teams table -> this feed): reset every filter
  // to its default, then apply the team, so no stale filter can strand the
  // user in an empty or contradictory view.
  React.useEffect(() => {
    if (!teamDrilldown) return;
    if (NFL_TEAMS[teamDrilldown.team]) {
      setSelectedWeek('ALL');
      setSelectedTier('genuine');
      setSelectedVerdict('ALL');
      setShowObvious(false);
      setOnlyAgainstModel(false);
      setSearchQuery('');
      setSortKey('recent');
      setPage(1);
      setSelectedTeam(teamDrilldown.team);
    }
    onTeamDrilldownConsumed?.();
  }, [teamDrilldown, onTeamDrilldownConsumed]);

  // The incomplete audit has no model metrics; only time ordering applies.
  React.useEffect(() => {
    if (selectedTier === 'incomplete' && sortKey !== 'recent' && sortKey !== 'oldest') {
      setSortKey('recent');
    }
  }, [selectedTier, sortKey]);

  const weeks = useMemo(() => {
    const w = Array.from(new Set(decisions.map((d) => d.week))).sort((a, b) => a - b);
    return w;
  }, [decisions]);

  const teams = useMemo(() => {
    return Object.keys(NFL_TEAMS).sort();
  }, []);

  // Filtered executed decisions
  const filteredDecisions = useMemo(() => {
    if (selectedTier === 'incomplete') return [];

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
      if (selectedVerdict !== 'ALL') {
        if (selectedVerdict === 'Reasonable' && !d.verdict_label.startsWith('Reasonable')) return false;
        if (selectedVerdict === 'Model leaned the other way' && !d.verdict_label.startsWith('Model leaned')) return false;
        if (selectedVerdict === 'Model strongly preferred another option' && !d.verdict_label.startsWith('Model strongly preferred')) return false;
        if (selectedVerdict === 'partial' && !d.is_partial_comparison && d.yardline_100 >= 31) return false;
      }
      // Against model filter
      if (onlyAgainstModel && d.is_consistent_with_model !== false) {
        return false;
      }
      // Search filter (P1-9: matches players, teams, desc, choice, verdict)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${d.posteam} ${d.defteam} ${d.outcome.desc} ${d.actual_choice} ${d.verdict_label} ${d.quadrant}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      // Tier filter & Obvious toggle
      if (selectedTier === 'clear_go' && d.tier !== 'clear_go') {
        return false;
      }
      if (selectedTier === 'genuine' && !showObvious) {
        if (d.tier === 'obvious') return false;
      }

      return true;
    });
  }, [decisions, selectedWeek, selectedTeam, selectedTier, selectedVerdict, showObvious, onlyAgainstModel, searchQuery]);

  // Filtered cancelled & excluded snaps (P1-10)
  const filteredIncompleteSnaps = useMemo(() => {
    if (selectedTier !== 'incomplete') return [];

    const allIncomplete = [
      ...cancelledSnaps.map((cs) => ({
        ...cs,
        type: 'cancelled' as const,
      })),
      ...(meta?.excluded_snaps || []).map((es) => ({
        ...es,
        penalty: false,
        replayed_on_fourth_down: false,
        replayed_details: null,
        status_label: 'Victory formation kneel',
        type: 'excluded' as const,
      })),
    ];

    return allIncomplete.filter((s) => {
      if (selectedWeek !== 'ALL' && s.week !== parseInt(selectedWeek, 10)) return false;
      if (selectedTeam !== 'ALL' && s.posteam !== selectedTeam && s.defteam !== selectedTeam) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${s.posteam} ${s.defteam} ${s.desc} ${s.status_label}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [selectedTier, cancelledSnaps, meta, selectedWeek, selectedTeam, searchQuery]);

  // Tier counts
  const genuineCount = useMemo(() => decisions.filter((d) => d.tier === 'genuine').length, [decisions]);
  const clearGoCount = useMemo(() => decisions.filter((d) => d.tier === 'clear_go').length, [decisions]);
  const incompleteCount = useMemo(() => cancelledSnaps.length + (meta?.excluded_snaps?.length || 1), [cancelledSnaps, meta]);

  // Sort (unknown metric values always sort last, never as 0)
  const sortedDecisions = useMemo(() => {
    return sortDecisions(filteredDecisions, sortKey);
  }, [filteredDecisions, sortKey]);

  const sortedIncompleteSnaps = useMemo(() => {
    return sortSnaps(filteredIncompleteSnaps, sortKey === 'oldest' ? 'oldest' : 'recent');
  }, [filteredIncompleteSnaps, sortKey]);

  // Pagination slice
  const displayedDecisions = useMemo(() => {
    return sortedDecisions.slice(0, page * PAGE_SIZE);
  }, [sortedDecisions, page]);

  const displayedIncomplete = useMemo(() => {
    return sortedIncompleteSnaps.slice(0, page * PAGE_SIZE);
  }, [sortedIncompleteSnaps, page]);

  const hasMore = selectedTier === 'incomplete'
    ? displayedIncomplete.length < filteredIncompleteSnaps.length
    : displayedDecisions.length < filteredDecisions.length;

  const resetFilters = () => {
    setSelectedWeek('ALL');
    setSelectedTeam('ALL');
    setSelectedTier('genuine');
    setSelectedVerdict('ALL');
    setShowObvious(false);
    setOnlyAgainstModel(false);
    setSearchQuery('');
    setSortKey('recent');
    setPage(1);
  };

  const totalSnapsInView = selectedTier === 'incomplete' ? filteredIncompleteSnaps.length : filteredDecisions.length;

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

  const weekRangeJa = formatWeekRangeJa(meta?.weeks, decisions);
  const maxWeek = meta?.weeks?.length
    ? Math.max(...meta.weeks)
    : weeks.length
    ? Math.max(...weeks)
    : null;
  const totalFourthDownDisplay = formatCount(meta?.counts?.total_fourth_down_rows);
  const executedSnapsDisplay = formatCount(
    meta?.counts?.executed_snaps ?? (decisions.length > 0 ? decisions.length : undefined)
  );
  const cancelledCountDisplay = formatCount(meta?.counts?.cancelled_snaps);
  const excludedCountDisplay = formatCount(meta?.counts?.excluded_snaps);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Anime Hero Banner (Eyeshield 21 Style, P0-6 data-driven numbers) */}
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
              <span>
                激闘！2026シーズン {weekRangeJa !== 'unavailable' ? `${weekRangeJa} ` : ''}全{totalFourthDownDisplay !== 'unavailable' ? `${totalFourthDownDisplay}プレー解析` : 'プレー解析 (unavailable)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
              <span>勝利へのギャンブルか、堅実な陣地戦か！？</span>
            </h2>
            <p className="text-sm sm:text-base text-white leading-relaxed font-semibold drop-shadow-sm">
              Every authentic NFL 4th down decision tracked, simulated, and audited ({executedSnapsDisplay} decisions scored, {cancelledCountDisplay} cancelled snaps audited, {excludedCountDisplay} kneel excluded). Mathematically evaluating the win probability of Go, Field Goal, and Punt from the exact same pre-snap moment.
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

      {/* Sticky Filter Bar on Scroll (P1-7) */}
      <div className="sticky top-[88px] z-30 mb-4 flex items-center justify-between rounded-lg border border-slate-800 bg-[#0a0f1d]/95 px-3 py-2 text-xs backdrop-blur-md shadow-md">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-sky-400" />
          <span className="font-bold text-white">
            {selectedTier === 'incomplete' ? 'Incomplete Audit' : 'Active Feed'}:
          </span>
          <span className="text-slate-300">
            Showing <strong className="text-sky-300 tabular-nums">{totalSnapsInView}</strong> {selectedTier === 'incomplete' ? 'audited snaps' : 'plays'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle button (P1-7) */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="sm:hidden flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white"
          >
            <span>Filters</span>
            {mobileFilterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {(selectedWeek !== 'ALL' || selectedTeam !== 'ALL' || selectedVerdict !== 'ALL' || searchQuery.trim()) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls & Filter Bar (Collapsible on mobile via mobileFilterOpen, P1-7) */}
      <section
        className={`mb-6 rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg anime-card-glow ${
          mobileFilterOpen ? 'block' : 'hidden sm:block'
        }`}
        aria-label="Filters"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Decision Filter & Search</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Found <strong className="text-white tabular-nums">{totalSnapsInView}</strong> matching {selectedTier === 'incomplete' ? 'audited snaps' : 'decisions'}
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

        {/* Tier Selector Buttons (P1-10 with accurate counts) */}
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
              <span className="ml-1 text-[10px] opacity-75 tabular-nums">({genuineCount})</span>
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
              <span className="ml-1 text-[10px] opacity-75 tabular-nums">({clearGoCount})</span>
            </button>
            <button
              onClick={() => { setSelectedTier('all'); setPage(1); }}
              className={`min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTier === 'all'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/50 shadow-sm shadow-indigo-500/10'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>All Executed</span>
              <span className="ml-1 text-[10px] opacity-75 tabular-nums">({decisions.length})</span>
            </button>
            <button
              onClick={() => { setSelectedTier('incomplete'); setPage(1); }}
              className={`min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTier === 'incomplete'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50 shadow-sm shadow-rose-500/10'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Incomplete Audit</span>
              <span className="ml-1 text-[10px] opacity-75 tabular-nums">({incompleteCount})</span>
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
              <option value="ALL">
                {maxWeek !== null ? `All Weeks (1–${maxWeek})` : 'All Weeks'}
              </option>
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

          {/* Verdict Filter (P1-6) */}
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
              <option value="partial">Partial / Punt Unmodelled (&lt; 31 yds)</option>
            </select>
          </div>

          {/* Search Input (P1-9) */}
          <div>
            <label htmlFor="filter-search" className="block text-[11px] font-semibold text-slate-400 mb-1">
              Search Plays & Players
            </label>
            <div className="relative">
              <input
                id="filter-search"
                type="text"
                placeholder="Team, player, action, penalty..."
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

          {/* Sort control (P-sort: unknown values always sort last) */}
          <div className="flex items-center gap-2 min-h-[36px]">
            <label htmlFor="feed-sort" className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ArrowUpDown className="h-3.5 w-3.5 text-sky-400" />
              <span>Sort by</span>
            </label>
            <select
              id="feed-sort"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as DecisionSortKey);
                setPage(1);
              }}
              className="rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none min-h-[40px]"
            >
              {(selectedTier === 'incomplete'
                ? FEED_SORT_OPTIONS.filter((o) => o.key === 'recent' || o.key === 'oldest')
                : FEED_SORT_OPTIONS
              ).map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="space-y-4">
        {/* Normal Executed Decisions Feed */}
        {selectedTier !== 'incomplete' && displayedDecisions.map((decision) => (
          <DecisionCard key={`${decision.game_id}_${decision.play_id}`} decision={decision} />
        ))}

        {/* Incomplete Tier Feed (P1-10: Cancelled & Excluded Snaps) */}
        {selectedTier === 'incomplete' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-4 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold mb-1">
                <ShieldAlert className="h-4 w-4" />
                <span>Audited Incomplete & Excluded Fourth Down Snaps ({incompleteCount} Total)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                These snaps were nullified prior to play execution (false starts, delay of game, neutral zone infractions) or represent victory formation kneels that are excluded from decision evaluation.
              </p>
            </div>

            {displayedIncomplete.map((snap) => (
              <article
                key={`${snap.game_id}_${snap.play_id}`}
                className="rounded-xl border border-slate-800 bg-[#0d121e] p-4 text-xs space-y-2 anime-card-glow"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {snap.posteam} vs {snap.defteam}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                      Week {snap.week} • Q{snap.qtr} • Play #{snap.play_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {snap.type === 'excluded' ? (
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                        Victory Formation Kneel
                      </span>
                    ) : snap.replayed_on_fourth_down ? (
                      <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                        Replayed on 4th Down
                      </span>
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        Resulted in 1st Down / Turnover
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-200 font-medium leading-relaxed">
                  {snap.desc}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                  <span>Status: <strong className="text-slate-300">{snap.status_label}</strong></span>
                  {snap.replayed_details && (
                    <span className="text-sky-300">
                      Follow-up play #{snap.replayed_details.next_play_id}: 4th & {snap.replayed_details.next_ydstogo} ({snap.replayed_details.next_play_type})
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {totalSnapsInView === 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-8 sm:p-12 text-center flex flex-col items-center justify-center anime-card-glow">
            <RefereeMascot className="h-20 w-20 mb-3" />
            <span className="text-amber-400 font-extrabold text-sm uppercase tracking-wider">
              【 審判の笛・該当なし 】
            </span>
            <h3 className="text-base font-bold text-white mt-1">No decisions match your current filters</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md">
              No plays match the selected criteria. Try resetting filters or toggling "Show obvious punts & kicks".
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400 transition-colors shadow-md min-h-[44px]"
            >
              Reset Filters
            </button>
          </div>
        )}

        {hasMore && (
          <div className="pt-4 text-center">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-xl border border-sky-400/50 bg-sky-500/15 px-8 py-3 text-xs font-black text-sky-300 hover:bg-sky-500/25 transition-all shadow-md min-h-[44px]"
            >
              Load More ({selectedTier === 'incomplete' ? displayedIncomplete.length : displayedDecisions.length} of {totalSnapsInView})
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
