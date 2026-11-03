import React from 'react';
import { Activity, ShieldCheck, Compass, BookOpen } from 'lucide-react';

export type NavTab = 'feed' | 'teams' | 'games' | 'method';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  dataAsOf?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, dataAsOf = '2026-11-03' }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md">
      <div className="mx-auto flex flex-col sm:flex-row max-w-7xl sm:items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 gap-2.5 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 shrink-0">
            <span className="text-lg sm:text-xl font-black text-white">4th</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                Fourth Down Lab
              </h1>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-sky-400 border border-sky-500/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              NFL 4th Down Decision Analytics & Outcome Tracking
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 w-full sm:w-auto" aria-label="Main navigation">
          <button
            onClick={() => onTabChange('feed')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
              activeTab === 'feed'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'feed' ? 'page' : undefined}
          >
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => onTabChange('teams')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
              activeTab === 'teams'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'teams' ? 'page' : undefined}
          >
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Teams</span>
          </button>

          <button
            onClick={() => onTabChange('games')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
              activeTab === 'games'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'games' ? 'page' : undefined}
          >
            <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Games</span>
          </button>

          <button
            onClick={() => onTabChange('method')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
              activeTab === 'method'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            aria-current={activeTab === 'method' ? 'page' : undefined}
          >
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Method</span>
          </button>
        </nav>
      </div>

      {/* Secondary Bar: Data Freshness */}
      <div className="border-t border-slate-800/50 bg-[#0a0f1d] px-4 py-1 text-center text-[11px] text-slate-400 sm:px-6">
        <span>Historical Decision Log • nflverse play-by-play 2026 (Weeks 1–8) • Data refreshed {dataAsOf}</span>
      </div>
    </header>
  );
};
