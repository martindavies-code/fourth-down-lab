import test from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_DECISIONS_FIXTURE, MOCK_TEAMS_FIXTURE } from './fixtures.ts';

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
