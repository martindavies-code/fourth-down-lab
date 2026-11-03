import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MOCK_DECISIONS_FIXTURE, MOCK_TEAMS_FIXTURE } from './fixtures.ts';
import {
  formatDownAndDistance,
  formatPointsDifference,
  formatProbability,
  formatScoreDifferential,
  formatTimeRemaining,
  formatYardline,
} from '../utils/formatting.ts';
import {
  getTeamLogoUrl,
  getTeamFallbackSvg,
  getTeamName,
  isDarkLogo,
  NFL_TEAMS,
} from '../utils/teamLogos.ts';

test('Frontend Unit Tests: Filter Logic', () => {
  const all = MOCK_DECISIONS_FIXTURE;

  // 1. Filter by week
  const week1 = all.filter((d) => d.week === 1);
  assert.equal(week1.length, 2);

  // 2. Filter by team
  const detPlays = all.filter((d) => d.posteam === 'DET' || d.defteam === 'DET');
  assert.equal(detPlays.length, 1);

  // 3. Genuine decision filter (hiding obvious)
  const genuineOnly = all.filter((d) => d.tier !== 'obvious');
  assert.equal(genuineOnly.length, 2);

  // 4. Clear Go filter
  const clearGo = all.filter((d) => d.tier === 'clear_go');
  assert.equal(clearGo.length, 1);
  assert.equal(clearGo[0].play_id, 101);
});

test('Frontend Unit Tests: Adherence Denominator Rules', () => {
  // Verifies that toss-ups are strictly EXCLUDED from the adherence denominator
  const det = MOCK_TEAMS_FIXTURE.find((t) => t.team === 'DET')!;
  assert.equal(det.genuine_count, 42);
  assert.equal(det.toss_up_count, 12);
  // Denominator must equal genuine_count - toss_up_count
  assert.equal(det.non_toss_up_genuine, det.genuine_count - det.toss_up_count);
  assert.equal(det.non_toss_up_genuine, 30);
  assert.equal(det.adherence_pct, 80.0);
  assert.equal(det.adherence_display, '24 / 30 (80.0%)');
});

test('Frontend Unit Tests: 2x2 Separation Integrity', () => {
  for (const d of MOCK_DECISIONS_FIXTURE) {
    // Quadrant must reflect decision consistency and play success
    if (d.is_consistent_with_model === true && d.play_succeeded) {
      assert.equal(d.quadrant, 'Consistent & Succeeded');
    }
    // Must never contain words like mistake or blunder
    assert.doesNotMatch(d.verdict_label.toLowerCase(), /mistake/);
    assert.doesNotMatch(d.verdict_label.toLowerCase(), /blunder/);
  }
});

test('Formatting Helpers: formatTimeRemaining', () => {
  assert.equal(formatTimeRemaining(1, 900), 'Q1 15:00');
  assert.equal(formatTimeRemaining(4, 129), 'Q4 2:09');
  assert.equal(formatTimeRemaining(5, 540), 'OT 9:00');
});

test('Formatting Helpers: formatYardline', () => {
  assert.equal(formatYardline(50, 'GB', 'TB'), '50');
  assert.equal(formatYardline(8, 'GB', 'TB'), 'TB 8');
  assert.equal(formatYardline(75, 'GB', 'TB'), 'GB 25');
});

test('Formatting Helpers: formatDownAndDistance', () => {
  assert.equal(formatDownAndDistance(4, 8, 8), '4th & Goal');
  assert.equal(formatDownAndDistance(4, 5, 2), '4th & Goal');
  assert.equal(formatDownAndDistance(4, 2, 45), '4th & 2');
});

test('Formatting Helpers: formatProbability (P1-1)', () => {
  assert.equal(formatProbability(0.0), '0%');
  assert.equal(formatProbability(0.0005), '<0.1%');
  assert.equal(formatProbability(0.122), '12.2%');
  assert.equal(formatProbability(0.55), '55.0%');
  assert.equal(formatProbability(0.9995), '>99.9%');
  assert.equal(formatProbability(1.0), '100%');
  assert.equal(formatProbability(null), 'n/a');
  assert.equal(formatProbability(undefined), 'n/a');
  assert.equal(formatProbability(NaN), 'n/a');
});

test('Formatting Helpers: formatPointsDifference', () => {
  assert.equal(formatPointsDifference(3.68), '+3.7 pp');
  assert.equal(formatPointsDifference(-2.5), '-2.5 pp');
  assert.equal(formatPointsDifference(0.0), '0.0 pp');
  assert.equal(formatPointsDifference(null), 'n/a');
  assert.equal(formatPointsDifference(undefined), 'n/a');
  assert.equal(formatPointsDifference(NaN), 'n/a');
});

test('Formatting Helpers: formatScoreDifferential', () => {
  assert.equal(formatScoreDifferential(0, 'GB'), 'Tied');
  assert.equal(formatScoreDifferential(7, 'GB'), 'GB leading by 7');
  assert.equal(formatScoreDifferential(-8, 'GB'), 'GB trailing by 8');
});

test('Team Logo Helpers (P1-4)', () => {
  assert.equal(
    getTeamLogoUrl('GB'),
    'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/gb.png'
  );
  assert.equal(
    getTeamLogoUrl('NFL'),
    'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png'
  );
  assert.equal(getTeamName('GB'), 'Green Bay Packers');
  assert.equal(getTeamName('DET'), 'Detroit Lions');
  assert.equal(getTeamName('UNKNOWN'), 'UNKNOWN');

  assert.equal(isDarkLogo('NYJ'), true);
  assert.equal(isDarkLogo('PIT'), true);
  assert.equal(isDarkLogo('GB'), false);
  assert.equal(Object.keys(NFL_TEAMS).length, 32);

  const fallback = getTeamFallbackSvg('MIA');
  assert.ok(fallback.startsWith('data:image/svg+xml;utf8,'));
  assert.ok(fallback.includes('MIA'));
});

test('Guard Against Stale-Stat Regressions (P2-5)', () => {
  // Ensure that no numeric season statistics live as hardcoded literals in SeasonEditorialAnalysis.tsx
  const componentPath = path.resolve('src/components/SeasonEditorialAnalysis.tsx');
  const content = fs.readFileSync(componentPath, 'utf-8');

  assert.ok(!content.includes('92.9%'), 'Must not hardcode 92.9%');
  assert.ok(!content.includes('1,718 snaps'), 'Must not hardcode 1,718 snaps');
  assert.ok(!content.includes('345 fourth-down'), 'Must not hardcode 345 fourth-down');
  assert.ok(!content.includes('44.2 pp of win probability'), 'Must not hardcode 44.2 pp');
  assert.ok(!content.includes('13 / 14 non-toss-ups'), 'Must not hardcode 13 / 14');
});
