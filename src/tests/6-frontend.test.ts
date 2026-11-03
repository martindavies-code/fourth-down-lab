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
  getFieldPositionInfo,
  getScoreDifferentialBadge,
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

test('Game State HUD Helpers: Field Position & Red Zone Detection', () => {
  // Own territory
  const ownPos = getFieldPositionInfo(63, 'SEA', 'CHI');
  assert.equal(ownPos.yardlineText, 'SEA 37');
  assert.equal(ownPos.territoryText, 'Own 37');
  assert.equal(ownPos.yardsToGoal, 63);
  assert.equal(ownPos.isRedZone, false);

  // Midfield 50
  const midPos = getFieldPositionInfo(50, 'SEA', 'CHI');
  assert.equal(midPos.yardlineText, '50');
  assert.equal(midPos.territoryText, 'Midfield (50)');
  assert.equal(midPos.yardsToGoal, 50);
  assert.equal(midPos.isRedZone, false);

  // Opponent territory outside red zone
  const oppPos = getFieldPositionInfo(35, 'SEA', 'CHI');
  assert.equal(oppPos.yardlineText, 'CHI 35');
  assert.equal(oppPos.territoryText, 'Opponent 35');
  assert.equal(oppPos.yardsToGoal, 35);
  assert.equal(oppPos.isRedZone, false);

  // Red Zone (<= 20)
  const rzPos = getFieldPositionInfo(18, 'SEA', 'CHI');
  assert.equal(rzPos.yardlineText, 'CHI 18');
  assert.equal(rzPos.territoryText, 'Opponent 18');
  assert.equal(rzPos.yardsToGoal, 18);
  assert.equal(rzPos.isRedZone, true);

  // Goal line (1 yd to goal)
  const glPos = getFieldPositionInfo(1, 'SEA', 'CHI');
  assert.equal(glPos.yardlineText, 'CHI 1');
  assert.equal(glPos.isRedZone, true);
});

test('Game State HUD Helpers: Score Differential Badges', () => {
  const tied = getScoreDifferentialBadge(0, 'SEA');
  assert.equal(tied.type, 'tied');
  assert.equal(tied.shortLabel, 'TIED');

  const leading = getScoreDifferentialBadge(7, 'SEA');
  assert.equal(leading.type, 'leading');
  assert.equal(leading.label, 'SEA +7');
  assert.equal(leading.shortLabel, '+7');

  const trailing = getScoreDifferentialBadge(-10, 'SEA');
  assert.equal(trailing.type, 'trailing');
  assert.equal(trailing.label, 'SEA -10');
  assert.equal(trailing.shortLabel, '-10');
});


// ---------------------------------------------------------------------------
// Situation card redesign: story sentences, option ordering, honesty rules
// ---------------------------------------------------------------------------
import { buildStory, buildRows, verdictTone } from '../utils/story.ts';
import { CARD_BG, CARD_PALETTE, contrastRatio } from '../utils/palette.ts';
import type { Decision } from '../types/decision.ts';

const base = MOCK_DECISIONS_FIXTURE[0];

function variant(over: Partial<Decision>): Decision {
  return { ...base, ...over } as Decision;
}

const otPartial: Decision = variant({
  posteam: 'ARI',
  qtr: 5,
  is_overtime: true,
  is_partial_comparison: true,
  modeled_options_count: 2,
  yardline_100: 24,
  is_toss_up: true,
  preferred_options: ['field_goal', 'go'],
  best_option: 'field_goal',
  best_wp: 0.4716,
  actual_choice: 'field_goal',
  options: {
    go: { status: 'AVAILABLE', reason: '', wp: 0.4619 },
    field_goal: { status: 'AVAILABLE', reason: '', wp: 0.4716, fg_make_prob: 0.87 },
    punt: { status: 'UNMODELLED', reason: 'Inside opponent 31-yard line; not modelled in nfl4th punt landing distribution', wp: null },
  },
  outcome: { ...base.outcome, field_goal_result: 'made', kick_distance: 42, converted: undefined },
});

test('Story: options are sorted best first and unmodelled options come last', () => {
  const rows = buildRows(base);
  assert.deepEqual(rows.map((r) => r.key), ['go', 'punt', 'field_goal']);
  assert.equal(rows[0].deltaPp, null);
  assert.ok((rows[1].deltaPp as number) > 0);
});

test('Story: the taken option is flagged on exactly one row', () => {
  const rows = buildRows(base);
  assert.equal(rows.filter((r) => r.isTaken).length, 1);
  assert.equal(rows.find((r) => r.isTaken)!.key, 'go');
});

test('Story: full comparison, taken option led, names margin and has no completeness line', () => {
  const s = buildStory(base);
  assert.equal(s.isPartial, false);
  assert.equal(s.completenessLine, null);
  assert.match(s.comparisonSentence, /Going for it led/);
  assert.match(s.comparisonSentence, /42\.0% vs 32\.0%/);
  assert.doesNotMatch(s.comparisonSentence.toLowerCase(), /best choice/);
});

test('Story: action sentence is data driven (converted vs failed)', () => {
  assert.match(buildStory(base).actionSentence, /went for it and converted/);
  const failed = variant({ outcome: { ...base.outcome, converted: false, yards_gained: 0 } });
  assert.match(buildStory(failed).actionSentence, /failed/);
});

test('Story: partial comparison states completeness and never says best choice', () => {
  const s = buildStory(variant({ ...otPartial, qtr: 4, is_overtime: false, is_toss_up: false }));
  assert.equal(s.isPartial, true);
  assert.equal(s.completenessLine, '2 of 3 options modelled - punt not included.');
  assert.doesNotMatch(s.comparisonSentence.toLowerCase(), /best choice/);
});

test('Story: overtime is context only, no recommendation framing, caveat shown', () => {
  const s = buildStory(otPartial);
  assert.equal(s.isOvertime, true);
  assert.equal(s.showVerdict, false);
  assert.match(s.domainCaveat as string, /outside the model's validated regular-season domain/);
  assert.match(s.comparisonSentence, /^Modelled win probability:/);
  assert.doesNotMatch(s.comparisonSentence.toLowerCase(), /\bled\b|best|prefer/);
  assert.equal(s.completenessLine, '2 of 3 options modelled - punt not included.');
});

test('Story: unmodelled option keeps its recorded reason and has no value', () => {
  const punt = buildStory(otPartial).rows.find((r) => r.key === 'punt')!;
  assert.equal(punt.modelled, false);
  assert.equal(punt.wp, null);
  assert.match(punt.reason, /not modelled in nfl4th punt landing distribution/);
});

test('Story: toss-up is described as a toss-up when the taken option led narrowly', () => {
  const s = buildStory(variant({ ...otPartial, qtr: 4, is_overtime: false }));
  assert.match(s.comparisonSentence, /narrowly led/);
  assert.match(s.comparisonSentence, /toss-up/i);
  assert.equal(s.isTossUp, true);
});

test('Story: taken option below the top is reported with the gap, not as a mistake', () => {
  const s = buildStory(variant({ actual_choice: 'punt' }));
  assert.match(s.comparisonSentence, /rated going for it 10\.0 pp higher than punting/);
  assert.doesNotMatch(s.comparisonSentence.toLowerCase(), /mistake|blunder|wrong/);
});

test('Story: an unmodelled taken option cannot be compared', () => {
  const s = buildStory(variant({ ...otPartial, qtr: 4, is_overtime: false, actual_choice: 'punt' }));
  assert.match(s.comparisonSentence, /Punt was not modelled here/);
});

test('Verdict tone mapping keeps the three bands', () => {
  assert.equal(verdictTone('Reasonable'), 'ok');
  assert.equal(verdictTone('Model leaned the other way'), 'lean');
  assert.equal(verdictTone('Model strongly preferred another option'), 'strong');
  assert.equal(verdictTone('Something else'), 'unknown');
});

test('Card palette text meets WCAG AA contrast (4.5:1) on the card background', () => {
  for (const [name, colour] of Object.entries(CARD_PALETTE)) {
    assert.ok(contrastRatio(colour, CARD_BG) >= 4.5, `${name} ${colour} fails 4.5:1`);
  }
});
