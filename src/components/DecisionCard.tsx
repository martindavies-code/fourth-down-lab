import React, { useState } from 'react';
import type { Decision, OptionName } from '../types/decision';
import { getTeamLogoUrl, isDarkLogo, getTeamName } from '../utils/teamLogos';
import {
  formatDownAndDistance,
  formatProbability,
  formatScoreDifferential,
  formatTimeRemaining,
  formatYardline,
} from '../utils/formatting';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Info,
  Footprints,
  Crosshair,
  Flame,
} from 'lucide-react';
import { MangaStamp } from './AnimeMascots';

interface DecisionCardProps {
  decision: Decision;
}

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
    preferred_options,
    is_toss_up,
    tier,
    actual_choice,
    verdict_label,
    display_cost_pp,
    exact_cost_display,
    is_near_boundary,
    cost_reason,
    outcome,
    quadrant,
  } = decision;

  // Verdict style & icon with authentic Japanese manga stamps
  const getVerdictBadge = () => {
    if (verdict_label === 'Reasonable') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <span>【 的確 】Reasonable</span>
        </span>
      );
    }
    if (verdict_label === 'Model leaned the other way') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>【 逆張り 】Model Leaned</span>
        </span>
      );
    }
    if (verdict_label === 'Model strongly preferred another option') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/10">
          <AlertCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
          <span>【 大波乱 】Strongly Preferred</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-400 border border-slate-500/30">
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{verdict_label}</span>
      </span>
    );
  };

  // Quadrant pill with Japanese labels
  const getQuadrantBadge = () => {
    if (quadrant === 'Consistent & Succeeded') {
      return (
        <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
          完全勝利 ★ Consistent & Succeeded
        </span>
      );
    }
    if (quadrant === 'Consistent & Failed') {
      return (
        <span className="rounded bg-sky-950/60 px-2 py-0.5 text-[11px] font-bold text-sky-300 border border-sky-500/30">
          惜敗の涙 ✕ Consistent & Failed (Unlucky)
        </span>
      );
    }
    if (quadrant === 'Against Model & Succeeded') {
      return (
        <span className="rounded bg-amber-950/60 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
          奇跡生還 ⚡ Against Model & Succeeded (Bailed Out)
        </span>
      );
    }
    if (quadrant === 'Against Model & Failed') {
      return (
        <span className="rounded bg-rose-950/60 px-2 py-0.5 text-[11px] font-bold text-rose-300 border border-rose-500/30">
          大爆死 ☠ Against Model & Failed
        </span>
      );
    }
    return null;
  };

  const optionList: {
    key: OptionName;
    labelEn: string;
    labelJp: string;
    stampKanji: string;
    stampSubtext: string;
    stampVariant: 'hissho' | 'kekkoh' | 'teki' | 'haran' | 'teppeki';
    icon: React.ReactNode;
  }[] = [
    {
      key: 'go',
      labelEn: 'Go for it',
      labelJp: 'ギャンブル決行',
      stampKanji: '決行',
      stampSubtext: 'GAMBLE',
      stampVariant: 'hissho',
      icon: <Flame className="h-3.5 w-3.5 text-amber-400" />,
    },
    {
      key: 'field_goal',
      labelEn: 'Field Goal',
      labelJp: '狙撃キック',
      stampKanji: '狙撃',
      stampSubtext: '3-PTS',
      stampVariant: 'kekkoh',
      icon: <Crosshair className="h-3.5 w-3.5 text-cyan-400" />,
    },
    {
      key: 'punt',
      labelEn: 'Punt',
      labelJp: '陣地挽回パント',
      stampKanji: '陣地',
      stampSubtext: 'PUNT',
      stampVariant: 'teppeki',
      icon: <Footprints className="h-3.5 w-3.5 text-indigo-400" />,
    },
  ];

  return (
    <article
      className="group relative rounded-xl border border-slate-800 bg-[#0d121e] shadow-lg transition-all hover:border-sky-500/50 anime-card-glow"
      aria-label={`4th down decision for ${posteam} against ${defteam}`}
    >
      {/* Card Header: Matchup & Situation */}
      <div className="border-b border-slate-800/80 bg-[#101728] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Teams & Logos */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-1.5">
              <img
                src={getTeamLogoUrl(posteam)}
                alt={getTeamName(posteam)}
                className={`h-7 w-7 object-contain ${isDarkLogo(posteam) ? 'team-logo-dark-outline' : ''}`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getTeamLogoUrl('NFL');
                }}
              />
              <span className="font-bold text-white">{posteam}</span>
              <span className="text-xs text-slate-400 font-bold">vs</span>
              <span className="text-xs font-semibold text-slate-300">{defteam}</span>
            </div>

            {/* Score & Timeouts */}
            <div className="flex items-center gap-1 text-xs tabular-nums text-slate-300">
              <span className="font-semibold text-white">{posteam_score}</span>
              <span className="text-slate-500">-</span>
              <span className="font-semibold text-white">{defteam_score}</span>
              <span className="ml-1 text-[11px] text-slate-400">
                ({formatScoreDifferential(score_differential, posteam, defteam)})
              </span>
            </div>
          </div>

          {/* Situation Badges */}
          <div className="flex items-center gap-2">
            {tier === 'clear_go' && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-300 border border-amber-500/40">
                <Flame className="h-3 w-3 text-amber-400" />
                <span>【 決行推奨 】Clear Go (+{decision.go_boost ? decision.go_boost.toFixed(1) : ''} pp)</span>
              </span>
            )}
            {tier === 'obvious' && (
              <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                定石判定 Obvious
              </span>
            )}
            <div className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-sky-400 tabular-nums">
              {formatDownAndDistance(down, ydstogo, yardline_100)}
            </div>
            <div className="text-xs font-medium text-slate-400">
              at {formatYardline(yardline_100, posteam, defteam)}
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              • {formatTimeRemaining(qtr, quarter_seconds_remaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: TWO CLEARLY SEPARATED BLOCKS */}
      <div className="grid grid-cols-1 divide-y divide-slate-800/80 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* BLOCK 1: BEFORE THE SNAP (7 Cols on Desktop) */}
        <div className="p-4 sm:p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1. 【スナップ前】運命の三択 (Before the Snap: 3 Choices)
              </h3>
            </div>
            <div className="text-[11px] text-slate-400 tabular-nums">
              Timeouts: <span className="font-semibold text-white">{posteam} {posteam_timeouts_remaining}</span>, {defteam} {defteam_timeouts_remaining}
            </div>
          </div>

          {/* Options Comparison Table */}
          <div className="space-y-2.5" role="table" aria-label="Fourth down options comparison">
            {optionList.map(({ key, labelEn, labelJp, stampKanji, stampSubtext, stampVariant, icon }) => {
              const opt = options[key];
              const isPreferred = preferred_options.includes(key);
              const isActual = actual_choice === key;
              const wpVal = opt.wp;
              const pctWidth = wpVal ? Math.min(100, Math.max(0, wpVal * 100)) : 0;

              return (
                <div
                  key={key}
                  className={`rounded-lg border p-2.5 transition-all ${
                    isPreferred
                      ? 'border-sky-400/50 bg-sky-950/30 shadow-sm'
                      : 'border-slate-800/60 bg-[#0a0f1d]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{icon}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white">{labelEn}</span>
                        <span className="text-[11px] text-slate-400 font-semibold">({labelJp})</span>
                      </div>

                      {/* Explicit Hanko Stamp for Preferred Options */}
                      {isPreferred && (
                        <MangaStamp
                          kanji={is_toss_up ? '伯仲' : stampKanji}
                          subtext={is_toss_up ? 'TOSS-UP' : stampSubtext}
                          variant={stampVariant}
                        />
                      )}

                      {isActual && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-slate-700">
                          【 決断 】Team Took This
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 tabular-nums">
                      {opt.status === 'AVAILABLE' ? (
                        <span className="text-sm font-extrabold text-white">
                          {formatProbability(wpVal)}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          {opt.status === 'UNMODELLED' ? 'Unmodelled' : 'Unsupported'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar Visualizer */}
                  {opt.status === 'AVAILABLE' && wpVal !== null && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isPreferred
                            ? 'bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-400'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${pctWidth}%` }}
                      />
                    </div>
                  )}

                  {/* Low make prob note */}
                  {key === 'field_goal' && opt.low_make_probability && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400/90 font-medium">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>Very low make probability ({formatProbability(opt.fg_make_prob)})</span>
                    </div>
                  )}

                  {/* Unmodelled note */}
                  {opt.status === 'UNMODELLED' && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      {opt.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Expandable Model Details Drawer */}
          <div className="mt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-sky-300 transition-colors"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Hide model details' : 'Show model breakdown (P(convert), P(FG), counterfactuals)'}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-sky-400" /> : <ChevronDown className="h-3.5 w-3.5 text-sky-400" />}
            </button>

            {isExpanded && (
              <div className="mt-2 rounded-lg border border-slate-800/80 bg-[#080d1a] p-3 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">P(Convert):</span>
                    <span className="font-bold text-white tabular-nums">
                      {formatProbability(options.go.first_down_prob)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">WP if converted:</span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      {formatProbability(options.go.wp_succeed)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">WP if failed:</span>
                    <span className="font-bold text-rose-400 tabular-nums">
                      {formatProbability(options.go.wp_fail)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">FG make prob:</span>
                    <span className="font-bold text-white tabular-nums">
                      {formatProbability(options.field_goal.fg_make_prob)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400">
                  Calculated via sportsdataverse nfl4th port against identical pre-snap game state.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BLOCK 2: WHAT HAPPENED (5 Cols on Desktop) */}
        <div className="flex flex-col justify-between p-4 sm:p-5 lg:col-span-5 bg-[#0b101c]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                2. 【激闘の結果】審判の判定 (What Happened: Result)
              </h3>
              {getQuadrantBadge()}
            </div>

            {/* Verdict on Decision */}
            <div className="rounded-lg border border-slate-800 bg-[#0e1424] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Actual Team Choice:</span>
                  <span className="font-extrabold text-white capitalize">{actual_choice}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block text-right">Model Verdict:</span>
                  <div className="flex items-center gap-1 justify-end">
                    {getVerdictBadge()}
                  </div>
                </div>
              </div>

              {/* Cost Difference */}
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                <span className="text-slate-400 font-medium">Estimated Cost of Choice:</span>
                <span className="font-bold tabular-nums text-white">
                  {display_cost_pp !== null ? `${display_cost_pp.toFixed(1)} pp` : 'n/a'}
                  {is_near_boundary && exact_cost_display && (
                    <span
                      className="ml-1 text-[11px] font-normal text-sky-400"
                      title={`Exact unrounded cost: ${exact_cost_display} pp. Boundary classification is evaluated on the unrounded value.`}
                    >
                      ({exact_cost_display} exact)
                    </span>
                  )}
                </span>
              </div>
              {cost_reason && (
                <div className="mt-1 text-[11px] italic text-slate-400">
                  {cost_reason}
                </div>
              )}
            </div>

            {/* Play Outcome Details */}
            <div className="mt-3 rounded-lg border border-slate-800/80 bg-[#090e19] p-3 text-xs">
              <div className="text-[11px] font-semibold text-slate-400">Play Description:</div>
              <p className="mt-1 text-slate-200 line-clamp-3 leading-relaxed">
                {outcome.desc}
              </p>

              {outcome.penalty_affected && (
                <div className="mt-2 inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  <span>Penalty affected the outcome of this executed play</span>
                </div>
              )}

              {/* Realised WPA */}
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                <span className="text-slate-400">Realised WPA (nflverse):</span>
                <span
                  className={`font-bold tabular-nums ${
                    outcome.realised_wpa > 0
                      ? 'text-emerald-400'
                      : outcome.realised_wpa < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {outcome.realised_wpa > 0 ? '+' : ''}
                  {(outcome.realised_wpa * 100).toFixed(1)} pp
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {outcome.realised_wpa_note}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

