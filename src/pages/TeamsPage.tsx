import React, { useState, useMemo } from 'react';
import type { TeamSummary } from '../types/decision';
import { getTeamLogoUrl, isDarkLogo, getTeamName } from '../utils/teamLogos';
import { ShieldCheck, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface TeamsPageProps {
  teams: TeamSummary[];
  loading: boolean;
}

type SortField = 'adherence_pct' | 'total_wp_lost_pp' | 'genuine_count' | 'toss_up_count' | 'punted_on_clear_go' | 'team';

export const TeamsPage: React.FC<TeamsPageProps> = ({ teams, loading }) => {
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
      {/* Page Header */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">NFL Team 4th-Down Adherence & Cost Table</h2>
            <p className="text-xs text-slate-400">
              Measuring coaching decision alignment with the mathematical win probability model on genuine 4th-down situations (Weeks 1–8).
            </p>
          </div>
        </div>

        {/* Methodology Clarification Note */}
        <div className="mt-4 rounded-lg border border-slate-800/80 bg-[#080d19] p-3 text-xs text-slate-300">
          <p>
            <strong className="text-sky-400">Adherence Definition:</strong> Share of <em>non-toss-up genuine decisions</em> where the team’s actual play was the model’s single preferred choice. Toss-ups (options within 1.0 pp of each other) are reported separately and explicitly excluded from the denominator.
          </p>
          <p className="mt-1 text-slate-400 text-[11px]">
            * Total WP given up is the arithmetic sum of estimated option deficits (cost) across all plays, presented as a model estimate.
          </p>
        </div>
      </div>

      {/* Teams Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0c1220] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Team Fourth Down Adherence">
            <thead className="border-b border-slate-800 bg-[#101729] text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3.5">
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
                    <span>Adherence (Non-Toss-Up)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  <button onClick={() => handleSort('punted_on_clear_go')} className="flex items-center gap-1 mx-auto hover:text-white">
                    <span>Punted on "Clear Go"</span>
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
                  className="transition-colors hover:bg-slate-800/30"
                >
                  {/* Team Identity */}
                  <td className="px-4 py-3 font-medium text-white">
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
                  <td className="px-4 py-3 text-center tabular-nums text-slate-200">
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
                          className={`font-bold text-sm ${
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
                      <span className="inline-block rounded bg-rose-500/10 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/20">
                        {team.punted_on_clear_go}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  {/* Total WP Lost */}
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-200">
                    {team.total_wp_lost_pp.toFixed(1)} pp
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
