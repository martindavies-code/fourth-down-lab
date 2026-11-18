import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { MOCK_DECISIONS_FIXTURE, MOCK_TEAMS_FIXTURE } from './fixtures.ts';
import {
  formatCount,
  formatDownAndDistance,
  formatPointsDifference,
  formatProbability,
  formatScoreDifferential,
  formatTimeRemaining,
  formatWeekRange,
  formatWeekRangeJa,
  formatYardline,
  getFieldPositionInfo,
  getScoreDifferentialBadge,
} from '../utils/formatting.ts';
import {
  getTeamInfo,
  getTeamLogoUrl,
  getTeamFallbackSvg,
  getTeamName,
  isDarkLogo,
  NFL_TEAMS,
} from '../utils/teamLogos.ts';
import { computePitchGeometry, describePitchMap, getEndZoneStyle } from '../utils/pitch.ts';

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

test('Formatting Helpers: formatWeekRange, formatWeekRangeJa, and formatCount', () => {
  // formatWeekRange
  assert.equal(formatWeekRange([1, 2, 3, 4, 5, 6, 7, 8, 9]), 'Weeks 1–9');
  assert.equal(formatWeekRange([4]), 'Week 4');
  assert.equal(formatWeekRange(null, [{ week: 1 }, { week: 9 }]), 'Weeks 1–9');
  assert.equal(formatWeekRange([], []), 'unavailable');
  assert.equal(formatWeekRange(null, null), 'unavailable');
  assert.equal(formatWeekRange(undefined, undefined), 'unavailable');

  // formatWeekRangeJa
  assert.equal(formatWeekRangeJa([1, 2, 3, 4, 5, 6, 7, 8, 9]), '第1週〜第9週');
  assert.equal(formatWeekRangeJa([5]), '第5週');
  assert.equal(formatWeekRangeJa(null, [{ week: 2 }]), '第2週');
  assert.equal(formatWeekRangeJa([], []), 'unavailable');
  assert.equal(formatWeekRangeJa(null, null), 'unavailable');

  // formatCount
  assert.equal(formatCount(2106), '2,106');
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(null), 'unavailable');
  assert.equal(formatCount(undefined), 'unavailable');
  assert.equal(formatCount(NaN), 'unavailable');
});

test('Guard Against Hardcoded Counts in TeamsPage, MethodPage, FeedPage (Round 4)', () => {
  const pages = ['TeamsPage.tsx', 'MethodPage.tsx', 'FeedPage.tsx'];
  for (const page of pages) {
    const pagePath = path.resolve(`src/pages/${page}`);
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(!content.includes('1867'), `${page} must not hardcode 1867`);
    assert.ok(!content.includes('1718'), `${page} must not hardcode 1718`);
    assert.ok(!content.includes('|| 8'), `${page} must not fall back to hardcoded 8`);
    assert.ok(!content.includes(': 8'), `${page} must not fall back to hardcoded 8`);
    assert.ok(!content.includes("'1,718'"), `${page} must not fall back to hardcoded '1,718'`);
  }
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


test('Header freshness uses live metadata, never a fabricated date or clipped timestamp', () => {
  const header = fs.readFileSync('src/components/Header.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /dataAsOf=\{meta\?\.data_as_of\}/);
  assert.match(app, /weeks=\{meta\?\.weeks\}/);
  assert.match(header, /Data as of:/);
  assert.match(header, /dataAsOf\?\.trim\(\) \|\| 'unavailable'/);
  assert.match(header, /formatWeekRange\(weeks\)/);
  assert.doesNotMatch(header, /dataAsOf\s*=\s*['"]/);
  const freshnessBar = header.slice(header.indexOf('{/* Secondary Bar:'));
  assert.doesNotMatch(freshnessBar, /truncate/);
});

test('Refresh failure alert creates or updates one issue and links the failed run', async () => {
  const rawWorkflow = fs.readFileSync('.github/workflows/refresh_data.yml', 'utf8');
  const lfFixture = rawWorkflow.replace(/\r\n/g, '\n');
  const crlfFixture = lfFixture.replace(/\n/g, '\r\n');

  for (const fixture of [lfFixture, crlfFixture]) {
    const workflow = fixture.replace(/\r\n/g, '\n');
    assert.match(workflow, /cron: '0 23 \* \* 0'/);
    assert.match(workflow, /cron: '0 8,12 \* \* 1,2'/);
    assert.match(workflow, /cron: '0 8,12 \* \* 5'/);
    assert.match(workflow, /needs: refresh/);
    assert.ok(workflow.includes("failure() && needs.refresh.result == 'failure'"));
    assert.match(workflow, /issues: write/);

    const parts = workflow.split('          script: |\n');
    assert.equal(parts.length, 2, 'Expected exactly one github-script block');
    const script = parts[1]
      .split('\n')
      .map((line) => line.replace(/^ {12}/, ''))
      .join('\n');
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const run = new AsyncFunction('github', 'context', script);

    for (const existing of [false, true]) {
      const calls: Array<{ action: string; value: { body: string; issue_number?: number } }> = [];
      const github = {
        rest: {
          issues: {
            listForRepo() {},
            async create(value: { body: string }) {
              calls.push({ action: 'create', value });
            },
            async update(value: { body: string; issue_number: number }) {
              calls.push({ action: 'update', value });
            },
          },
        },
        async paginate(_method: unknown, options: { creator: string; state: string }) {
          assert.equal(options.creator, 'github-actions[bot]');
          assert.equal(options.state, 'open');
          return existing ? [{ number: 7, body: '<!-- fourth-down-lab-refresh-failure -->' }] : [];
        },
      };
      await run(github, {
        repo: { owner: 'test', repo: 'test' },
        serverUrl: 'https://github.com',
        runId: 123,
        eventName: 'schedule',
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].action, existing ? 'update' : 'create');
      if (existing) assert.equal(calls[0].value.issue_number, 7);
      assert.match(calls[0].value.body, /actions\/runs\/123/);
    }
  }
});

test('Pitch geometry computes valid positions, goal-to-go, fractional yards, and explicit invalid states', () => {
  // Valid opponent territory (screenshot play: LA ball at ARI 47, 4th & 3)
  const opp = computePitchGeometry(47, 3);
  assert.equal(opp.status, 'valid');
  assert.equal(opp.isValid, true);
  assert.equal(opp.hasValidPosition, true);
  assert.equal(opp.hasValidDistance, true);
  assert.equal(opp.losYard, 53);
  assert.equal(opp.targetYard, 56);
  assert.equal(opp.isGoalToGo, false);
  assert.equal(opp.isRedZone, false);
  assert.equal(opp.yardsToGoal, 47);
  assert.equal(opp.yardsToGain, 3);
  assert.equal(opp.losX, 315);
  assert.equal(opp.targetX, 330);
  assert.equal(opp.arrowEndX, 359);
  assert.equal(opp.showTrailingChevrons, false);

  // Valid midfield (50, 4th & 2)
  const midfield = computePitchGeometry(50, 2);
  assert.equal(midfield.status, 'valid');
  assert.equal(midfield.losYard, 50);
  assert.equal(midfield.losX, 300);
  assert.equal(midfield.targetYard, 52);
  assert.equal(midfield.targetX, 310);

  // Own territory: own 5-yard line (yardline_100 = 95), 4th & 10
  const deep = computePitchGeometry(95, 10);
  assert.equal(deep.status, 'valid');
  assert.equal(deep.losYard, 5);
  assert.equal(deep.targetYard, 15);
  assert.equal(deep.isGoalToGo, false);
  assert.equal(deep.isRedZone, false);
  assert.equal(deep.losX, 75);
  assert.equal(deep.targetX, 125);

  // Red zone & 4th & Goal from opponent 8
  const rzGoal = computePitchGeometry(8, 8);
  assert.equal(rzGoal.status, 'valid');
  assert.equal(rzGoal.losYard, 92);
  assert.equal(rzGoal.targetYard, 100);
  assert.equal(rzGoal.isGoalToGo, true);
  assert.equal(rzGoal.isRedZone, true);
  assert.equal(rzGoal.targetX, 550);
  assert.equal(rzGoal.showTrailingChevrons, false);

  // 1-yard line: arrow stops well before opponent end-zone text (x = 577)
  const oneYard = computePitchGeometry(1, 1);
  assert.equal(oneYard.status, 'valid');
  assert.equal(oneYard.losYard, 99);
  assert.equal(oneYard.targetYard, 100);
  assert.equal(oneYard.isGoalToGo, true);
  assert.equal(oneYard.losX, 545);
  assert.ok(oneYard.arrowEndX !== null && oneYard.arrowEndX <= 564);
  assert.equal(oneYard.showTrailingChevrons, true);

  // Supported fractional yards preserve precision without rounding to 0
  const fractional = computePitchGeometry(47.5, 2.5);
  assert.equal(fractional.status, 'valid');
  assert.equal(fractional.losYard, 52.5);
  assert.equal(fractional.targetYard, 55);
  assert.equal(fractional.yardsToGoal, 47.5);
  assert.equal(fractional.losX, 312.5);
  assert.equal(fractional.targetX, 325);
  assert.equal(formatYardline(47.5, 'LA', 'ARI'), 'ARI 47.5');
  assert.equal(formatDownAndDistance(4, 2.5, 47.5), '4th & 2.5');
  assert.equal(formatDownAndDistance(4, 0.5, 1.5), '4th & 0.5');

  // Invalid / missing / non-finite / out-of-range positions must NEVER fabricate midfield or clamp
  for (const badPos of [null, undefined, Number.NaN, Infinity, -Infinity, 0, 100, -5, 150, 0.5, 99.5]) {
    const geom = computePitchGeometry(badPos, 3);
    assert.equal(geom.status, 'invalid_position');
    assert.equal(geom.isValid, false);
    assert.equal(geom.hasValidPosition, false);
    assert.equal(geom.losYard, null);
    assert.equal(geom.targetYard, null);
    assert.equal(geom.yardsToGoal, null);
    assert.equal(geom.losX, null);
    assert.equal(geom.targetX, null);
    assert.equal(geom.arrowEndX, null);
    assert.equal(geom.isRedZone, false);
    assert.equal(formatYardline(badPos, 'NYJ', 'BUF'), 'Position unavailable');
    const posInfo = getFieldPositionInfo(badPos, 'NYJ', 'BUF');
    assert.equal(posInfo.isValid, false);
    assert.equal(posInfo.yardlineText, 'Position unavailable');
    assert.equal(posInfo.yardsToGoal, null);
  }

  // Valid spot with missing / non-positive / out-of-range distance keeps known spot but invalidates target
  for (const badDist of [null, undefined, Number.NaN, Infinity, 0, -3, 100]) {
    const geom = computePitchGeometry(47, badDist);
    assert.equal(geom.status, 'invalid_distance');
    assert.equal(geom.isValid, false);
    assert.equal(geom.hasValidPosition, true);
    assert.equal(geom.hasValidDistance, false);
    assert.equal(geom.losYard, 53);
    assert.equal(geom.losX, 315);
    assert.equal(geom.targetYard, null);
    assert.equal(geom.targetX, null);
    assert.equal(geom.yardsToGain, null);
    assert.equal(formatDownAndDistance(4, badDist, 47), '4th & unavailable');
  }
});

test('describePitchMap aligns visible fallback labels and accessible descriptions', () => {
  const nullBoth = describePitchMap({
    posteam: 'NYJ',
    defteam: 'BUF',
    down: 4,
    ydstogo: null,
    yardline100: null,
  });
  assert.equal(nullBoth.unavailableBannerText, 'Field position unavailable');
  assert.equal(nullBoth.losLabel, 'LOS unavailable');
  assert.equal(nullBoth.targetLabel, 'Target unavailable');
  assert.equal(nullBoth.distanceToEzLabel, 'Distance to BUF EZ unavailable');
  assert.equal(
    nullBoth.ariaLabel,
    'Field map unavailable: field position unavailable for NYJ vs BUF.'
  );

  const validPosMissingDist = describePitchMap({
    posteam: 'LA',
    defteam: 'ARI',
    down: 4,
    ydstogo: 0,
    yardline100: 47,
  });
  assert.equal(validPosMissingDist.unavailableBannerText, null);
  assert.equal(validPosMissingDist.losLabel, 'LOS (ARI 47)');
  assert.equal(validPosMissingDist.targetLabel, '1st down target unavailable');
  assert.equal(validPosMissingDist.distanceToEzLabel, '47 yds to ARI EZ');
  assert.equal(
    validPosMissingDist.ariaLabel,
    'Field map: LA ball at ARI 47, distance to gain unavailable, driving toward ARI end zone (47 yards away).'
  );
});

function loadTsxModule<T>(relativePath: string): T {
  const cjsRequire = createRequire(import.meta.url);
  const lucideProxy = new Proxy(
    {},
    {
      get: (_target, prop) => (props: Record<string, unknown>) =>
        React.createElement('svg', { 'data-icon': String(prop), ...props }),
    }
  );
  const cache = new Map<string, { exports: unknown }>();
  const load = (filePath: string): unknown => {
    const abs = path.resolve(filePath);
    const cached = cache.get(abs);
    if (cached) return cached.exports;
    const src = fs.readFileSync(abs, 'utf8');
    const { outputText } = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    });
    const mod = { exports: {} as unknown };
    cache.set(abs, mod);
    const customRequire = (id: string): unknown => {
      if (id === 'lucide-react') return lucideProxy;
      if (id.startsWith('.')) {
        const dir = path.dirname(abs);
        for (const ext of ['', '.ts', '.tsx']) {
          const candidate = path.resolve(dir, `${id}${ext}`);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return load(candidate);
          }
        }
      }
      return cjsRequire(id);
    };
    vm.runInNewContext(outputText, { require: customRequire, module: mod, exports: mod.exports });
    return mod.exports;
  };
  return load(relativePath) as T;
}

test('Rendered DecisionCard and FieldPitchMap handle null, out-of-range, partial distance, valid data, and unique SVG IDs', () => {
  const { DecisionCard } = loadTsxModule<{ DecisionCard: React.ComponentType<{ decision: Decision }> }>(
    'src/components/DecisionCard.tsx'
  );

  // 1. Null position and distance: honest unavailable state, no fabricated midfield/BUF 0/Red zone/4th & Goal
  const nullPayload = {
    ...base,
    posteam: 'NYJ',
    defteam: 'BUF',
    yardline_100: null as unknown as number,
    ydstogo: null as unknown as number,
  };
  const nullHtml = renderToStaticMarkup(React.createElement(DecisionCard, { decision: nullPayload }));
  assert.match(nullHtml, /Field position unavailable/);
  assert.match(nullHtml, /4th &amp; unavailable/);
  assert.match(nullHtml, /Position unavailable/);
  assert.match(nullHtml, /LOS unavailable/);
  assert.match(nullHtml, /Target unavailable/);
  assert.match(nullHtml, /Distance to BUF EZ unavailable/);
  assert.match(nullHtml, /aria-label="Field map unavailable: field position unavailable for NYJ vs BUF\."/);
  assert.doesNotMatch(nullHtml, /BUF 0/);
  assert.doesNotMatch(nullHtml, /at Position unavailable/);
  assert.doesNotMatch(nullHtml, /50 yds to BUF EZ/);
  assert.doesNotMatch(nullHtml, /1st down \(0 yds\)/);
  assert.doesNotMatch(nullHtml, /Red zone/);
  assert.doesNotMatch(nullHtml, /4th &amp; Goal/);
  assert.doesNotMatch(nullHtml, /#b45309/);
  assert.doesNotMatch(nullHtml, /#fbbf24/);
  assert.doesNotMatch(nullHtml, /#38bdf8/);

  // 2. Out-of-range yardline_100 (0 and 120): honest unavailable state
  for (const outOfRange of [0, 120]) {
    const oorPayload = {
      ...base,
      posteam: 'LA',
      defteam: 'ARI',
      yardline_100: outOfRange,
      ydstogo: 3,
    };
    const oorHtml = renderToStaticMarkup(React.createElement(DecisionCard, { decision: oorPayload }));
    assert.match(oorHtml, /Field position unavailable/);
    assert.match(oorHtml, /Position unavailable/);
    assert.doesNotMatch(oorHtml, /ARI 0/);
    assert.doesNotMatch(oorHtml, /#b45309/);
  }

  // 3. Valid position with unavailable distance: keeps LOS & ball marker, hides amber target line
  const validPosMissingDist = {
    ...base,
    posteam: 'LA',
    defteam: 'ARI',
    yardline_100: 47,
    ydstogo: null as unknown as number,
  };
  const partialHtml = renderToStaticMarkup(
    React.createElement(DecisionCard, { decision: validPosMissingDist })
  );
  assert.match(partialHtml, /at ARI 47/);
  assert.match(partialHtml, /4th &amp; unavailable/);
  assert.match(partialHtml, /LOS \(ARI 47\)/);
  assert.match(partialHtml, /1st down target unavailable/);
  assert.match(partialHtml, /47 yds to ARI EZ/);
  assert.match(partialHtml, /#38bdf8/);
  assert.match(partialHtml, /#b45309/);
  assert.doesNotMatch(partialHtml, /#fbbf24/);
  assert.doesNotMatch(partialHtml, /Field position unavailable/);

  // 4. Valid data + unique SVG clipPath IDs across multiple cards
  const validA = { ...base, play_id: 101, posteam: 'LA', defteam: 'ARI', yardline_100: 47, ydstogo: 3 };
  const validB = { ...base, play_id: 202, posteam: 'NYJ', defteam: 'BUF', yardline_100: 4, ydstogo: 4 };
  const twoCardsHtml = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(DecisionCard, { decision: validA }),
      React.createElement(DecisionCard, { decision: validB })
    )
  );
  const clipIds = Array.from(twoCardsHtml.matchAll(/id="(pitch-clip-[^"]+)"/g), (m) => m[1]);
  assert.equal(clipIds.length, 2);
  assert.notEqual(clipIds[0], clipIds[1]);
  assert.match(twoCardsHtml, /LOS \(ARI 47\)/);
  assert.match(twoCardsHtml, /1st down \(3 yds\)/);
  assert.match(twoCardsHtml, /LOS \(BUF 4\)/);
  assert.match(twoCardsHtml, /Goal line/);
});

test('End zone styles resolve LA alias and enforce readable contrast for all 32 teams', () => {
  const laInfo = getTeamInfo('LA');
  assert.ok(laInfo);
  assert.equal(laInfo.name, 'Rams');

  const laEz = getEndZoneStyle('LA');
  assert.equal(laEz.label, 'LA');
  assert.equal(laEz.background, '#003594');
  assert.equal(laEz.textColor, '#ffffff');

  const noEz = getEndZoneStyle('NO');
  assert.equal(noEz.textColor, '#020617');

  const pitEz = getEndZoneStyle('PIT');
  assert.equal(pitEz.textColor, '#020617');

  for (const abbr of [...Object.keys(NFL_TEAMS), 'LA']) {
    const ez = getEndZoneStyle(abbr);
    assert.ok(
      contrastRatio(ez.textColor, ez.background) >= 4.5,
      `${abbr} end-zone text ${ez.textColor} on ${ez.background} must meet WCAG AA (4.5:1)`
    );
  }
});
