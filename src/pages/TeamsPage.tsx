import React, { useState, useMemo } from 'react';
import type { TeamSummary } from '../types/decision';
import { getTeamLogoUrl, isDarkLogo, getTeamName } from '../utils/teamLogos';
import { AlertTriangle, ArrowUpDown, Table, Sparkles } from 'lucide-react';
import { BlitzMascot, MangaStamp, MangaSoundEffect } from '../components/AnimeMascots';
import { SeasonEditorialAnalysis } from '../components/SeasonEditorialAnalysis';

interface TeamsPageProps {
  teams: TeamSummary[];
  loading: boolean;
}

type SortField = 'adherence_pct' | 'total_wp_lost_pp' | 'genuine_count' | 'toss_up_count' | 'punted_on_clear_go' | 'team';
type TeamsTab = 'rankings' | 'analysis';

export const TeamsPage: React.FC<TeamsPageProps> = ({ teams, loading }) => {
  const [activeTab, setActiveTab] = useState<TeamsTab>('rankings');
  const [sortField, setSortField] = useState<SortField>('adherence_pct');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null adherence
      if (sortField === 'adherence_pct') {
        aVal = a.adherence_pct ?? -1;
        bVal = b.adherence_pct ?? -1;
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortAsc ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });
  }, [teams, sortField, sortAsc]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-300">Loading team adherence rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Teams Sub-Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1220] p-2.5 shadow-lg anime-card-glow">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
              activeTab === 'rankings'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Table className="h-4 w-4" />
            <span>Team Rankings & Tables</span>
            <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-semibold">32 Teams</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
              activeTab === 'analysis'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Season Editorial Analysis</span>
            <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 font-bold border border-amber-500/30">Manga Stories</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Weeks 1–8:</span> 1,718 Snaps Audited
        </div>
      </div>

      {/* Tab 1: Season Editorial Analysis */}
      {activeTab === 'analysis' && <SeasonEditorialAnalysis />}

      {/* Tab 2: Team Rankings & Tables */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          {/* Page Header with Anime Mascot & Kanji Banner */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/40 text-emerald-400 p-1 shadow-md">
                  <BlitzMascot className="h-10 w-10" mood="happy" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white sm:text-xl">
                      【全32軍団番付】NFL Team 4th-Down Adherence & Cost Table
                    </h2>
                    <MangaSoundEffect sound="ドドンッ！" english="rank" className="text-emerald-400 hidden sm:inline-flex" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    Measuring coaching decision alignment with the mathematical win probability model on genuine 4th-down situations (Weeks 1–8).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MangaStamp kanji="番付" subtext="RANKING" variant="teki" />
                <MangaStamp kanji="鉄壁" subtext="DEFENSE" variant="teppeki" />
              </div>
            </div>

            {/* Methodology Clarification Note */}
            <div className="mt-4 rounded-lg border border-slate-800/80 bg-[#080d19] p-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-sky-400">Adherence Definition:</strong> Share of <em>non-toss-up genuine decisions</em> where the team’s actual play was the model’s single preferred choice. Toss-ups (options within 1.0 pp of each other) are reported separately and explicitly excluded from the denominator.
              </p>
              <p className="mt-1 text-slate-400 text-[11px]">
                * Total WP given up is the arithmetic sum of estimated option deficits (cost) across all plays, presented as a model estimate.
              </p>
            </div>
          </div>

          {/* Teams Table with Sticky Left Column */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0c1220] shadow-lg anime-card-glow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Team Fourth Down Adherence">
                <thead className="border-b border-slate-800 bg-[#101729] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-[#101729] px-4 py-3.5 z-10 shadow-[1px_0_0_0_rgba(51,65,85,0.4)]">
                      <button onClick={() => handleSort('team')} className="flex items-center gap-1 hover:text-white">
                        <span>Team</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center">
                      <button onClick={() => handleSort('genuine_count')} className="flex items-center gap-1 mx-auto hover:text-white">
                        <span>Genuine Decisions</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center">
                      <button onClick={() => handleSort('toss_up_count')} className="flex items-center gap-1 mx-auto hover:text-white">
                        <span>Toss-Ups</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center">
                      <button onClick={() => handleSort('adherence_pct')} className="flex items-center gap-1 mx-auto hover:text-white">
                        <span>Adherence</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center">
                      <button onClick={() => handleSort('punted_on_clear_go')} className="flex items-center gap-1 mx-auto hover:text-white">
                        <span>Punted on Clear Go</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      <button onClick={() => handleSort('total_wp_lost_pp')} className="flex items-center gap-1 ml-auto hover:text-white">
                        <span>Est. WP Given Up*</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedTeams.map((team, idx) => (
                    <tr
                      key={team.team}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      {/* Team Identity - Sticky on horizontal scroll */}
                      <td className="sticky left-0 bg-[#0c1220] px-4 py-3 font-medium text-white z-10 shadow-[1px_0_0_0_rgba(51,65,85,0.4)]">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-bold text-slate-400 tabular-nums w-4">
                            {idx + 1}
                          </span>
                          <img
                            src={getTeamLogoUrl(team.team)}
                            alt={getTeamName(team.team)}
                            className={`h-6 w-6 object-contain ${isDarkLogo(team.team) ? 'team-logo-dark-outline' : ''}`}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getTeamLogoUrl('NFL');
                            }}
                          />
                          <div>
                            <span className="font-bold">{team.team}</span>
                            <span className="hidden sm:inline text-xs text-slate-400 ml-1.5">
                              {getTeamName(team.team)}
                            </span>
                          </div>
                          {team.low_sample_warning && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20"
                              title="Sample size under 5 genuine decisions; interpret adherence with caution"
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Small sample</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Genuine Decisions Count */}
                      <td className="px-4 py-3 text-center tabular-nums text-slate-200 font-semibold">
                        {team.genuine_count}
                      </td>

                      {/* Toss-ups */}
                      <td className="px-4 py-3 text-center tabular-nums text-slate-300">
                        {team.toss_up_count}
                      </td>

                      {/* Adherence with explicit denominator */}
                      <td className="px-4 py-3 text-center tabular-nums">
                        {team.adherence_pct !== null ? (
                          <div>
                            <span
                              className={`font-black text-sm ${
                                team.adherence_pct >= 70
                                  ? 'text-emerald-400'
                                  : team.adherence_pct >= 50
                                  ? 'text-sky-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {team.adherence_pct.toFixed(1)}%
                            </span>
                            <div className="text-[11px] text-slate-400">
                              {team.adherent_count} / {team.non_toss_up_genuine}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">n/a</span>
                        )}
                      </td>

                      {/* Punted on Clear Go */}
                      <td className="px-4 py-3 text-center tabular-nums">
                        {team.punted_on_clear_go > 0 ? (
                          <span className="inline-block rounded bg-rose-500/15 px-2 py-0.5 font-bold text-rose-300 border border-rose-500/30">
                            {team.punted_on_clear_go}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Total WP Lost */}
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-200">
                        {team.total_wp_lost_pp.toFixed(1)} pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

