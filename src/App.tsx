import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { FeedPage } from './pages/FeedPage';
import { TeamsPage } from './pages/TeamsPage';
import { GamesPage } from './pages/GamesPage';
import { MethodPage } from './pages/MethodPage';
import type { Decision, GameSummary, MetaData, TeamSummary } from './types/decision';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('feed');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch decisions, teams, games, and meta
        const [decisionsRes, teamsRes, gamesRes, metaRes] = await Promise.all([
          fetch('./data/decisions.json'),
          fetch('./data/teams_summary.json'),
          fetch('./data/games_summary.json'),
          fetch('./data/meta.json'),
        ]);

        if (!decisionsRes.ok) throw new Error(`Failed to load decisions: HTTP ${decisionsRes.status}`);
        if (!teamsRes.ok) throw new Error(`Failed to load teams: HTTP ${teamsRes.status}`);
        if (!gamesRes.ok) throw new Error(`Failed to load games: HTTP ${gamesRes.status}`);

        const decisionsData = await decisionsRes.json();
        const teamsData = await teamsRes.json();
        const gamesData = await gamesRes.json();
        const metaData = metaRes.ok ? await metaRes.json() : null;

        setDecisions(decisionsData);
        setTeams(teamsData);
        setGames(gamesData);
        setMeta(metaData);
      } catch (err: unknown) {
        console.error('Data load error:', err);
        setError(err instanceof Error ? err.message : 'Unknown data loading error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Skip to Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-sky-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dataAsOf={meta?.data_as_of}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pb-16">
        {activeTab === 'feed' && (
          <FeedPage decisions={decisions} loading={loading} error={error} />
        )}
        {activeTab === 'teams' && (
          <TeamsPage teams={teams} loading={loading} />
        )}
        {activeTab === 'games' && (
          <GamesPage games={games} decisions={decisions} loading={loading} />
        )}
        {activeTab === 'method' && (
          <MethodPage meta={meta} />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a12] py-8 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="font-semibold text-slate-300">
            Fourth Down Lab • Built for transparent NFL coaching decision intelligence
          </p>
          <p className="mt-1">
            Data sourced from <a href="https://github.com/nflverse" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">nflverse</a> under CC-BY 4.0. Model engine powered by Ben Baldwin’s <a href="https://github.com/nflverse/nfl4th" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">nfl4th</a> and <a href="https://py.sportsdataverse.org" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">sportsdataverse</a>.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Standalone project by Martin Davies • Separate from NFL Live Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
};
