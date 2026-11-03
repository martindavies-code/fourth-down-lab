import React from 'react';
import type { MetaData } from '../types/decision';
import { BookOpen, ShieldAlert, CheckCircle, Scale, Database, Cpu } from 'lucide-react';
import { BlitzMascot, RefereeMascot, MangaStamp } from '../components/AnimeMascots';

interface MethodPageProps {
  meta: MetaData | null;
}

export const MethodPage: React.FC<MethodPageProps> = ({ meta }) => {
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
              How genuine NFL fourth-down situations are modelled, compared, and audited against counterfactual outcomes.
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
              <strong className="text-white">1. 【スナップ前】Before the Snap:</strong> Pre-play win probability (WP) of each legally and practically feasible choice (Go, Field Goal, Punt), evaluated from the identical pre-snap situation using the same machine learning model.
            </li>
            <li>
              <strong className="text-white">2. 【激闘の結果】What Happened:</strong> The action the team executed, followed by the real-world outcome and realized win probability change (WPA).
            </li>
          </ul>

          <div className="mt-4 rounded-lg border border-slate-800 bg-[#080d19] p-3 text-xs">
            <span className="font-bold text-amber-300 block mb-1">【四象限の審判】The 2x2 Outcome Matrix:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2">
                <span className="font-black text-emerald-300 block">完全勝利 ★ Consistent & Succeeded</span>
                <span className="text-[11px] text-slate-300">Model preferred it, and the team converted or scored.</span>
              </div>
              <div className="rounded border border-sky-500/30 bg-sky-950/20 p-2">
                <span className="font-black text-sky-300 block">惜敗の涙 ✕ Consistent & Failed (Unlucky)</span>
                <span className="text-[11px] text-slate-300">Statistically sound call, but denied by bad luck or defensive play.</span>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-950/20 p-2">
                <span className="font-black text-amber-300 block">奇跡生還 ⚡ Against Model & Succeeded (Bailed Out)</span>
                <span className="text-[11px] text-slate-300">Suboptimal risk, bailed out by individual player heroics.</span>
              </div>
              <div className="rounded border border-rose-500/30 bg-rose-950/20 p-2">
                <span className="font-black text-rose-300 block">大爆死 ☠ Against Model & Failed</span>
                <span className="text-[11px] text-slate-300">Costly unrecommended gamble that resulted in catastrophic turnover.</span>
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

        {/* Data Source & Freshness */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center gap-2 text-sky-400 mb-3">
            <Database className="h-5 w-5" />
            <h2 className="text-base font-black text-white">【公式データ】Data Source & Freshness</h2>
          </div>
          <p>
            Play-by-play data is sourced directly from official <strong>nflverse</strong> annual releases (<code>play_by_play_2026.parquet</code>).
          </p>
          <div className="mt-3 rounded-lg border border-slate-800 bg-[#080d19] p-3 text-xs">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 tabular-nums">
              <div>
                <span className="text-slate-400 block text-[11px]">Season Scope:</span>
                <span className="font-bold text-white">2026 Regular Season</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Weeks Covered:</span>
                <span className="font-bold text-white">Weeks 1 to 8 (121 Games)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Data Timestamp:</span>
                <span className="font-bold text-white">{meta?.data_as_of || '2026-11-03'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total 4th Downs:</span>
                <span className="font-bold text-white">{meta?.counts.total_fourth_down_rows || 1867}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-slate-400 text-xs">
            The dataset is refreshed via an automated build pipeline that converts raw play-by-play tables into static JSON files served with zero runtime database queries.
          </p>
        </section>

        {/* Model Architecture & Validation */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <div className="flex items-center gap-2 text-indigo-400 mb-3">
            <Cpu className="h-5 w-5" />
            <h2 className="text-base font-black text-white">【人工知能モデル】Model Engine & Validation Status</h2>
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

          <div className="mt-4 rounded-lg border border-slate-800 bg-[#080d19] p-3 text-xs">
            <h3 className="font-bold text-white mb-1 text-xs">Validation Results Summary</h3>
            <p className="text-slate-300">
              Validated against the published <strong>2020 NFC Championship benchmark</strong> (GB vs TB, Q4 2:09, 4th & 8 on TB 8).
              All win probabilities (`go_wp` 0.122 vs doc 0.137, `fg_wp` 0.114 vs doc 0.100) match within 1.5 percentage points.
              Continuous monotonicity tests across all 5 kicking eras, 3 roof types, and yard lines show <strong>0 violations</strong>.
            </p>
            <p className="mt-2 text-slate-400 text-[11px] italic">
              Formal audit status: <strong>Validated against one published example only, supplemented by comprehensive mathematical and physical property checks</strong>.
            </p>
          </div>
        </section>

        {/* Option Status & Punting Inside 31 */}
        <section className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-lg anime-card-glow">
          <h2 className="text-base font-black text-white mb-2">Option Status Rules & Territory Boundaries</h2>
          <p>
            Every option is assigned an explicit status code before ranking:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1.5 text-xs text-slate-300 pl-2">
            <li>
              <strong>AVAILABLE:</strong> An ordinary legal choice supported by the model.
            </li>
            <li>
              <strong>UNMODELLED:</strong> Where an option is not supported by empirical distributions in that territory. Specifically, <strong>punting inside the opponent’s 31-yard line</strong> is unmodelled in <code>nfl4th</code> because modern NFL teams do not punt from the red zone (exactly 0 punts occurred inside the 31 across the entire 2026 dataset). In this territory, the feasible set consists of Go vs Field Goal.
            </li>
            <li>
              <strong>UNSUPPORTED:</strong> Situations with extreme or unmodelled clocks (e.g. negative seconds or unmodelled overtime formats).
            </li>
            <li>
              <strong>MODEL FAILURE:</strong> If an option expected to be available returns a missing value, the pipeline fails immediately.
            </li>
          </ul>
        </section>

        {/* Cancelled Snaps & Replay Audit */}
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
            <li>Total cancelled fourth-down snaps: <strong>148</strong> (142 penalties).</li>
            <li>Followed by a replayed 4th-down snap: <strong>110</strong> (evaluated separately at the new distance).</li>
            <li>Resulted in a 1st down or end of half: <strong>38</strong>.</li>
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

