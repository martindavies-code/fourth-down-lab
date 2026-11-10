import React from 'react';
import type { MetaData } from '../types/decision';
import { formatWeekRange, formatCount } from '../utils/formatting';
import { BookOpen, ShieldAlert, CheckCircle, Scale, Database, Cpu } from 'lucide-react';
import { BlitzMascot, RefereeMascot, MangaStamp } from '../components/AnimeMascots';

interface MethodPageProps {
  meta: MetaData | null;
}

export const MethodPage: React.FC<MethodPageProps> = ({ meta }) => {
  const weekRange = formatWeekRange(meta?.weeks, null, 'Weeks 1 to ');
  const maxWeek = meta?.weeks?.length ? Math.max(...meta.weeks) : null;
  const totalRowsDisplay = formatCount(meta?.counts?.total_fourth_down_rows);
  const executedRowsDisplay = formatCount(meta?.counts?.executed_snaps);
  const cancelledRowsDisplay = formatCount(meta?.counts?.cancelled_snaps);
  const replayedCountDisplay = formatCount(meta?.counts?.cancelled_replayed);
  const notReplayedCountDisplay = formatCount(meta?.counts?.cancelled_not_replayed);
  const excludedRowsDisplay = formatCount(meta?.counts?.excluded_snaps);
  const gamesCountDisplay = formatCount(meta?.counts?.games);
  const madeFgsNegWpaCountDisplay = formatCount(meta?.made_fgs_negative_wpa_audit?.count);
  const dataAsOf = meta?.data_as_of || 'unavailable';
  const puntsInside31 = meta?.punt_domain?.empirical_punts_inside_31 !== undefined
    ? meta.punt_domain.empirical_punts_inside_31
    : 'unavailable';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Title Header with Anime Mascot */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 mb-2">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-wider">
                【分析理論と検証仕様】Methodology & Verification
              </span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Fourth Down Lab: Analytical Architecture & Standards
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-medium">
              How authentic NFL fourth-down situations are modelled, compared, and audited against counterfactual outcomes.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-sky-400/30 shrink-0">
            <BlitzMascot className="h-16 w-16" mood="happy" />
            <span className="text-[10px] font-black text-sky-300">理論解析班</span>
          </div>
        </div>
      </div>

      <div className="space-y-8 text-xs leading-relaxed text-slate-300 sm:text-sm">
        {/* Core Philosophy */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sky-400">
              <Scale className="h-5 w-5" />
              <h2 className="text-base font-black text-white">
                【鉄則】結果ではなく決断を裁け！ (Judge Decision, Not Outcome)
              </h2>
            </div>
            <MangaStamp kanji="鉄則" subtext="LAW" variant="hissho" />
          </div>
          <p>
            In sports analytics, judging a coaching decision by whether the subsequent play succeeded or failed is known as <strong>outcome bias</strong> (結果論の罠). A sound, positive-expectation decision can fail due to bad execution or unfortunate bounces, and a suboptimal call can succeed through individual athletic brilliance.
          </p>
          <p className="mt-2.5">
            Every decision card in Fourth Down Lab features two deliberately isolated sections:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1.5 text-slate-300 pl-2">
            <li>
              <strong className="text-white">1. Before the Snap:</strong> Pre-play win probability (WP) of each legally and practically feasible choice (Go, Field Goal, Punt), evaluated from the identical pre-snap situation using the same machine learning model.
            </li>
            <li>
              <strong className="text-white">2. What Happened:</strong> The action the team executed, followed by the real-world physical outcome and realized win probability change (WPA from the nflverse post-play model).
            </li>
          </ul>

          <div className="mt-4 rounded-lg border border-slate-800 bg-[#080d19] p-3 text-xs">
            <span className="font-bold text-amber-300 block mb-1">The 2x2 Decision-vs-Outcome Matrix:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2">
                <span className="font-black text-emerald-300 block">Consistent & Succeeded</span>
                <span className="text-[11px] text-slate-300">Model preferred it, and the team converted or scored.</span>
              </div>
              <div className="rounded border border-sky-500/30 bg-sky-950/20 p-2">
                <span className="font-black text-sky-300 block">Consistent & Failed (Unlucky)</span>
                <span className="text-[11px] text-slate-300">Statistically sound call, but denied by bad luck or defensive play.</span>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-950/20 p-2">
                <span className="font-black text-amber-300 block">Against Model & Succeeded (Bailed Out)</span>
                <span className="text-[11px] text-slate-300">Suboptimal risk, bailed out by individual player heroics.</span>
              </div>
              <div className="rounded border border-rose-500/30 bg-rose-950/20 p-2">
                <span className="font-black text-rose-300 block">Against Model & Failed</span>
                <span className="text-[11px] text-slate-300">Costly unrecommended call that resulted in turnover or stopped play.</span>
              </div>
            </div>
          </div>
        </section>

        {/* The Comparison Metric */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <h2 className="text-base font-black text-white">
                【勝利確率至上主義】Win Probability Over EPA (勝利確率 vs 期待得点)
              </h2>
            </div>
            <MangaStamp kanji="的確" subtext="WIN-PROB" variant="teki" />
          </div>
          <p>
            Options are evaluated strictly by the <strong>expected win probability (WP / 勝利期待値)</strong> of the possessing team from a common pre-snap baseline. Differences between options are reported in <strong>percentage points of win probability (pp)</strong>.
          </p>
          <p className="mt-2 text-slate-300">
            We do <em>not</em> rank coaching decisions using Expected Points Added (EPA / 期待得点付加). Expected points and win probability frequently diverge, especially late in games, in one-possession situations, or when nursing or chasing leads where clock run-off and territory possession dominate point expectation.
          </p>
        </section>

        {/* Data Source & Freshness (P0-6 driven from meta) */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center gap-2 text-sky-400 mb-3">
            <Database className="h-5 w-5" />
            <h2 className="text-base font-black text-white">【データ仕様と完全照合】Data Source & Exact Reconciliation</h2>
          </div>
          <p>
            Play-by-play data is sourced directly from <strong>nflverse</strong> releases (<code>play_by_play_2026.parquet</code>). Every fourth-down snap in the raw dataset is strictly reconciled:
          </p>
          <div className="mt-3 rounded-lg border border-slate-800 bg-[#080d19] p-3 text-xs">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 tabular-nums">
              <div>
                <span className="text-slate-400 block text-[11px]">Season Scope:</span>
                <span className="font-bold text-white">2026 Regular Season</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Weeks Covered:</span>
                <span className="font-bold text-white">
                  {weekRange !== 'unavailable' ? weekRange : 'Weeks unavailable'}{' '}
                  ({gamesCountDisplay !== 'unavailable' ? `${gamesCountDisplay} Games` : 'Games unavailable'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Data Timestamp:</span>
                <span className="font-bold text-white">{dataAsOf}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total 4th Downs:</span>
                <span className="font-bold text-white">
                  {totalRowsDisplay !== 'unavailable' ? `${totalRowsDisplay} Snaps` : 'Snaps unavailable'}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-800 pt-2 text-[11px] text-slate-300">
              <strong className="text-sky-300">Exact Snap Reconciliation:</strong>{' '}
              {totalRowsDisplay} Total = {executedRowsDisplay} Executed Decisions + {cancelledRowsDisplay} Cancelled/Nullified Snaps + {excludedRowsDisplay} Victory Kneel.
            </div>
          </div>
        </section>

        {/* Model Architecture & Validation (P0-2, P2-2, P2-4) */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center gap-2 text-indigo-400 mb-3">
            <Cpu className="h-5 w-5" />
            <h2 className="text-base font-black text-white">【人工知能モデル】Model Engine & Empirical Audit</h2>
          </div>
          <p>
            We implement <strong>Route A</strong>: the Python port of Ben Baldwin’s <code>nfl4th</code> engine provided by <code>sportsdataverse</code> (v0.1.4). It evaluates three distinct conditional decision paths:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-slate-300 pl-2 text-xs">
            <li>
              <strong>ギャンブル決行 (Go for it):</strong> Integrates over a 76-class multinomial XGBoost distribution of yards gained (including turnover-on-downs flips, field positioning, and automatic 2-point vs PAT valuation on touchdowns).
            </li>
            <li>
              <strong>狙撃キック (Field Goal):</strong> Predicts kick make probability from distance, kicking era, and roof configuration (indoor, dome, outdoors), weighting post-kick possession flips.
            </li>
            <li>
              <strong>陣地挽回 (Punt):</strong> Weights the empirical landing distribution of net punts, touchbacks, return touchdowns, and muffed catches.
            </li>
          </ul>

          <div className="mt-4 rounded-lg border border-slate-800 bg-[#080d19] p-3 text-xs space-y-2">
            <h3 className="font-bold text-white text-xs">Validation Results & Audit Findings</h3>
            <p className="text-slate-300">
              Mathematical exactness property checks verify on all {executedRowsDisplay} plays that expected win probabilities match conditional probabilities to &lt; 10⁻⁶:
              <code className="ml-1 text-[11px] text-sky-300">go_wp = p_convert * wp_succeed + (1 - p_convert) * wp_fail</code>.
            </p>
            <p className="text-slate-300">
              Validated against the published <strong>2020 NFC Championship benchmark</strong> (GB vs TB, Q4 2:09, 4th & 8 on TB 8) within 1.5 percentage points. Cross-validation against a diverse sample of 50 plays across {maxWeek !== null ? `all ${maxWeek} weeks` : 'all weeks'} confirms continuous monotonic behavior.
            </p>
            <div className="rounded border border-slate-700/60 bg-[#060a14] p-2 text-[11px] text-slate-300">
              <strong className="text-amber-300">Realised WPA on Made Field Goals Audit:</strong> An audit of the 2026 dataset identified {madeFgsNegWpaCountDisplay} made field goals that resulted in negative realised WPA in the nflverse post-play win probability model. Verification against raw play-by-play transitions confirms this is a faithful state transition of the nflverse post-play model (surrendering possession inside opponent territory when touchdown equity was high), not a join or perspective artefact.
            </div>
          </div>
        </section>

        {/* Option Status Rules & Punt Domain Grounding (P0-3) */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <h2 className="text-base font-black text-white mb-2">Option Status Rules & Punt Territory Grounding</h2>
          <p>
            Every option is assigned an explicit status code before ranking:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1.5 text-xs text-slate-300 pl-2">
            <li>
              <strong>AVAILABLE:</strong> An ordinary legal choice supported by the empirical distribution model.
            </li>
            <li>
              <strong>UNMODELLED (Punt Domain Grounding):</strong> In <code>nfl4th</code>, empirical support in the punt distribution table (<code>punt_data.parquet</code>) strictly begins at <code>yardline_100 &gt;= 31.0</code>. Inside the opponent's 31-yard line (<code>yardline_100 &lt; 31.0</code>), punting has zero empirical table support and returns missing values. Across all {totalRowsDisplay} fourth downs in 2026, <strong>exactly {puntsInside31} punts occurred inside the 31-yard line</strong>. Where punting is unmodelled, cards are explicitly labelled as partial comparisons (2 of 3 options modelled) evaluated between Go and Field Goal.
            </li>
            <li>
              <strong>OVERTIME plays:</strong> Regular season overtime plays (<code>qtr &gt;= 5</code>) operate under modified sudden-death rules and are flagged as <em>Overtime — outside validated model domain</em>.
            </li>
            <li>
              <strong>UNSUPPORTED / MODEL FAILURE:</strong> Situations with invalid clock states (e.g. negative game seconds) or missing values where an option should be available fail the build pipeline immediately.
            </li>
          </ul>
        </section>

        {/* Cancelled Snaps & Replay Audit (P0-6, P1-10) */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black text-white">【反則審議】Cancelled Snaps & Penalty Replay Tracking</h2>
            <RefereeMascot className="h-10 w-10" />
          </div>
          <p>
            Plays with <code>play_type == "no_play"</code> (predominantly pre-snap false starts, delay of game, and defensive offsides) are strictly <strong>excluded from the executed decision dataset</strong> because the play was nullified before execution.
          </p>
          <p className="mt-2">
            We preserve all cancelled snaps in a dedicated public audit file (<code>audit_cancelled_snaps.json</code>):
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-slate-300 pl-2">
            <li>Total cancelled fourth-down snaps: <strong>{cancelledRowsDisplay}</strong> (evaluated in public audit log).</li>
            <li>Followed by a replayed 4th-down snap: <strong>{replayedCountDisplay}</strong> (evaluated separately at the new distance).</li>
            <li>Resulted in a 1st down, turnover, or end of half: <strong>{notReplayedCountDisplay}</strong>.</li>
            <li>In addition, <strong>{excludedRowsDisplay}</strong> victory formation kneel (Mahomes vs DEN) is preserved in <code>meta.json</code>.</li>
          </ul>
        </section>

        {/* Known Limitations */}
        <section className="rounded-xl border border-amber-500/40 bg-amber-950/15 p-5 shadow-lg anime-card-glow">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-base font-black text-white">Known Model Limitations (モデルの限界)</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            While the underlying <code>nfl4th</code> engine is the gold standard of public NFL analytics, users should be aware of known domain constraints:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-slate-300 pl-2">
            <li>The model does not know specific player personnel, punter leg strength, returner elusiveness, or active game injuries.</li>
            <li>It does not incorporate micro-weather effects (wind gusts, freezing temperatures, or precipitation).</li>
            <li>It does not cover penalties committed during punt returns or blocked kicks returned for touchdowns.</li>
            <li>A planned fake punt or fake kick is recorded as a "go" attempt because play-by-play data cannot reliably distinguish intended play-design.</li>
            <li>Win probability differences of 1 to 2 percentage points lie within standard model uncertainty; single plays are tiny sample sizes.</li>
          </ul>
        </section>

        {/* Licences & Credits */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <h2 className="text-base font-black text-white mb-3">【ライセンス表記】Licences, Attribution & Credits</h2>
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-[#080d19] p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">nflverse Play-by-Play Data</span>
                <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-400 border border-sky-500/20">
                  CC-BY 4.0
                </span>
              </div>
              <p className="mt-1 text-slate-300">
                Data provided by the nflverse project (https://github.com/nflverse). Licensed under Creative Commons Attribution 4.0 International.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#080d19] p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">nfl4th Decision Surface</span>
                <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-400 border border-sky-500/20">
                  MIT Licence
                </span>
              </div>
              <p className="mt-1 text-slate-300">
                Created by Ben Baldwin (https://github.com/nflverse/nfl4th). Core expected win probability logic and landing distribution model artifacts.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#080d19] p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">sportsdataverse Python Package</span>
                <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-400 border border-sky-500/20">
                  MIT Licence
                </span>
              </div>
              <p className="mt-1 text-slate-300">
                Python port and packaging by Saiem Gilani (https://py.sportsdataverse.org).
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
