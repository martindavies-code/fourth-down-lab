import React from 'react';
import { Activity, ShieldCheck, Compass, BookOpen } from 'lucide-react';
import { BlitzMascot } from './AnimeMascots';

export type NavTab = 'feed' | 'teams' | 'games' | 'method';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  dataAsOf?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, dataAsOf = '2026-11-03' }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-sky-950/60 bg-[#070b14]/95 backdrop-blur-md">
      <div className="mx-auto flex flex-col sm:flex-row max-w-7xl sm:items-center justify-between px-2 py-2 sm:px-6 sm:py-3 gap-2 sm:gap-4">
        {/* Brand with Anime Mascot & Kanji Ruby */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-indigo-600 to-amber-500 p-0.5 shadow-md shadow-sky-500/25 shrink-0 transform hover:scale-105 transition-transform">
            <div className="h-full w-full bg-[#070b14] rounded-[10px] flex items-center justify-center overflow-hidden">
              <BlitzMascot className="h-9 w-9 sm:h-11 sm:w-11" mood="intense" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">
                <ruby className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-300">
                  第四ダウン研究所
                  <rt className="text-[8px] sm:text-[9px] text-sky-400 font-bold tracking-widest">FOURTH DOWN LAB</rt>
                </ruby>
              </h1>
              <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[8px] sm:text-[9px] font-black text-sky-300 border border-sky-500/40 uppercase tracking-wider">
                INDIE ANALYTICS
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-300 truncate font-medium">
              NFL 4th Down Decision Analytics • 究極の決断
            </p>
          </div>
        </div>

        {/* Navigation Tabs with Japanese Kanji Subtitles */}
        <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 w-full sm:w-auto" aria-label="Main navigation">
          <button
            onClick={() => onTabChange('feed')}
            className={`flex-1 sm:flex-none flex flex-col items-center justify-center rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all min-h-[44px] ${
              activeTab === 'feed'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'feed' ? 'page' : undefined}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
              <span>FEED</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 tracking-wider">速報</span>
          </button>

          <button
            onClick={() => onTabChange('teams')}
            className={`flex-1 sm:flex-none flex flex-col items-center justify-center rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all min-h-[44px] ${
              activeTab === 'teams'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'teams' ? 'page' : undefined}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              <span>TEAMS</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 tracking-wider">番付</span>
          </button>

          <button
            onClick={() => onTabChange('games')}
            className={`flex-1 sm:flex-none flex flex-col items-center justify-center rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all min-h-[44px] ${
              activeTab === 'games'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'games' ? 'page' : undefined}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
              <span>GAMES</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 tracking-wider">試合</span>
          </button>

          <button
            onClick={() => onTabChange('method')}
            className={`flex-1 sm:flex-none flex flex-col items-center justify-center rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all min-h-[44px] ${
              activeTab === 'method'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'method' ? 'page' : undefined}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
              <span>METHOD</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 tracking-wider">理論</span>
          </button>
        </nav>
      </div>

      {/* Secondary Bar: Data Freshness with Manga Badge */}
      <div className="border-t border-slate-800/60 bg-[#0a0f1d] px-3 py-1 text-center text-[11px] text-slate-300 sm:px-6 flex items-center justify-center gap-2">
        <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[9px] font-extrabold text-sky-300 border border-sky-400/30">
          UNOFFICIAL
        </span>
        <span className="truncate">Unofficial analytics on nflverse play-by-play (CC-BY 4.0) • Data refreshed {dataAsOf}</span>
      </div>
    </header>
  );
};
