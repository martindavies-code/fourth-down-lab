import React from 'react';
import { Flame, ShieldAlert, Award, Compass, TrendingDown, CheckCircle2 } from 'lucide-react';
import { MangaStamp } from './AnimeMascots';

export const SeasonEditorialAnalysis: React.FC = () => {
  return (
    <section className="mb-8 rounded-2xl border border-slate-800 bg-[#0c1222] p-5 sm:p-7 shadow-2xl relative overflow-hidden anime-card-glow">
      {/* Background Graphic Watermark */}
      <div className="absolute -top-12 -right-12 text-[140px] font-black text-white/[0.02] select-none pointer-events-none">
        4TH
      </div>

      {/* Section Title with Japanese Title Flavour */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              【シーズン激闘総括】2026 Season Tactical Analysis & Extremes
            </h2>
            <MangaStamp kanji="激闘" subtext="ANALYSIS" variant="hissho" className="scale-75 hidden sm:inline-flex" />
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            Editorial deep-dive into Weeks 1–8: uncovering the costliest tactical calls, the myth of over-aggression, and the NFL coaching divide.
          </p>
        </div>
      </div>

      {/* Key Metric Highlights Grid (All English boxes) */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
            <Flame className="h-4 w-4" />
            <span>Costliest Call</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">9.8 pp</div>
          <p className="mt-1 text-[11px] text-slate-300">
            JAX 60-yd FG vs HOU (Week 6, Q4 2:00)
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <Award className="h-4 w-4" />
            <span>Adherence Leader</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">92.9%</div>
          <p className="mt-1 text-[11px] text-slate-300">
            Miami Dolphins (13 / 14 non-toss-ups)
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
            <ShieldAlert className="h-4 w-4" />
            <span>Clear Go Punts</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">4 Punts</div>
          <p className="mt-1 text-[11px] text-slate-300">
            Baltimore Ravens (NFL High)
          </p>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
            <Compass className="h-4 w-4" />
            <span>Over-Aggressive Calls</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white tabular-nums">0 Calls</div>
          <p className="mt-1 text-[11px] text-slate-300">
            Zero costly gambles across 1,718 snaps
          </p>
        </div>
      </div>

      {/* In-Depth Feature Stories Grid with Artwork */}
      <div className="space-y-6">
        {/* Story 1: Worst Decision of the Season */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-slate-700/60 shadow-md group">
            <img
              src="assets/anime-fieldgoal-kick.jpg"
              alt="Manga football placekicker kicking towards goalposts"
              className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-black text-amber-300 tracking-wider uppercase">
                Case Study: The 60-Yard Gamble
              </span>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>The Costliest Tactical Call of 2026</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                Week 6: Jacksonville Jaguars vs Houston Texans (4th & 4 on HOU 42, Q4 2:00)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Trailing 17-20 with exactly two minutes remaining, Jacksonville faced 4th & 4 at the Houston 42-yard line. 
                The mathematical win probability model strongly urged going for it (<strong className="text-emerald-400">Go WP: 35.7%</strong> vs <strong className="text-rose-400">Field Goal WP: 25.9%</strong>), 
                calculating a massive penalty of <strong className="text-white">9.8 percentage points</strong> for attempting a kick.
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Kicker Cam Little stepped up and astonishingly booted a 60-yard field goal right through the uprights. 
                Under conventional broadcast commentary, this was hailed as "brilliant coaching." 
                Yet under genuine decision theory, this was a severe tactical error bailed out by outlier kicker execution. 
                A made 60-yard kick only ties the game, whereas converting 4th & 4 puts Jacksonville in prime position to score a game-winning touchdown while draining the remaining clock.
              </p>
            </div>

            <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">Pre-Snap Model Verdict: <strong className="text-rose-400">Strongly Preferred Alternative (9.8 pp deficit)</strong></span>
              <span className="text-slate-400">Post-Snap Outcome: <strong className="text-emerald-400">Against Model & Succeeded (Bailed Out)</strong></span>
            </div>
          </div>
        </div>

        {/* Story 2: The Myth of Over-Aggression */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-8 flex flex-col justify-between space-y-3 order-2 md:order-1">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Analytical Mythbusting</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                The Myth of "Reckless Aggression" in Modern NFL Coaching
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Whenever a team fails on fourth down, critics routinely claim coaches have become "blind slaves to spreadsheets." 
                However, empirical tracking across all 1,718 fourth downs in 2026 reveals a stark reality: 
                <strong className="text-white"> NFL head coaches never over-gamble.</strong>
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                Out of 345 fourth-down go attempts across Weeks 1–8, there was <em>not a single instance</em> where a team attempted a conversion that cost more than 3.0 percentage points compared to a punt or field goal. 
                Every substantial coaching mistake in the 2026 season was an act of <strong className="text-amber-400">excessive conservatism</strong>—punting on 4th & 1 near midfield or attempting low-percentage 55+ yard kicks instead of trusting the offense.
              </p>
            </div>

            <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wide">Key Takeaway</span>
              <p className="mt-1 text-slate-300">
                Coaches do not risk game equity by being too aggressive; they surrender equity by retreating when the mathematics command them to attack.
              </p>
            </div>
          </div>

          <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-slate-700/60 shadow-md group order-1 md:order-2">
            <img
              src="assets/anime-runningback-dive.jpg"
              alt="Manga football running back diving over scrimmage line"
              className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-black text-sky-300 tracking-wider uppercase">
                4th & Inches: The Conversion Battle
              </span>
            </div>
          </div>
        </div>

        {/* Story 3: The Coaching Divide */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-800 bg-[#080d19] overflow-hidden p-4 sm:p-5">
          <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-slate-700/60 shadow-md group">
            <img
              src="assets/anime-quarterback-pass.jpg"
              alt="Manga anime quarterback launching deep pass"
              className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] font-black text-emerald-300 tracking-wider uppercase">
                Tactical Masterminds vs Traditionalists
              </span>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                <Award className="h-3.5 w-3.5" />
                <span>The NFL Coaching Spectrum</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-2">
                Analytics Darlings vs The Cowardly Punt Index
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-normal">
                The 2026 season shows a widening philosophical gulf between coaching staffs:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong className="text-white">Miami Dolphins (Mike McDaniel)</strong>: The benchmark for modern game theory. Achieving a league-best <strong className="text-emerald-400">92.9% adherence</strong>, surrendering only 3.9 pp of win probability all season, and committing zero punts on Clear Go situations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong className="text-white">Buffalo Bills (Sean McDermott)</strong>: Close behind at <strong className="text-cyan-400">84.2% adherence</strong> with only 8.4 pp lost across 19 decisions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong className="text-white">Baltimore Ravens & Denver Broncos</strong>: Denver surrendered a league-worst <strong className="text-rose-400">44.2 pp of win probability</strong> due to repeated conservative choices, while Baltimore committed <strong className="text-rose-400">4 punts on Clear Go situations</strong>—the most of any team in the NFL.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-[#0e1628] p-3 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">Lowest Cumulative Cost: <strong className="text-emerald-400">Miami Dolphins (3.9 pp lost)</strong></span>
              <span className="text-slate-400">Highest Cumulative Cost: <strong className="text-rose-400">Denver Broncos (44.2 pp lost)</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
