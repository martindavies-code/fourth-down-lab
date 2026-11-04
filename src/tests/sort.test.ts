import test from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_DECISIONS_FIXTURE } from './fixtures.ts';
import type { Decision } from '../types/decision.ts';
import {
  compareDecisions,
  decisionCostPp,
  sortDecisions,
  sortSnaps,
  wpaSwingPp,
} from '../utils/sort.ts';
import {
  computeAggressionStats,
  conservatismDominates,
  overAggressionHeadline,
  seasonOf,
} from '../utils/editorial.ts';

const base = MOCK_DECISIONS_FIXTURE[0];

function variant(over: Partial<Decision>): Decision {
  return { ...base, ...over } as Decision;
}

// --- metric helpers -------------------------------------------------------

test('Sort metrics: cost prefers exact cost_pp, falls back to display value, null when unknown', () => {
  assert.equal(decisionCostPp(variant({ cost_pp: 2.34, display_cost_pp: 2.3 })), 2.34);
  assert.equal(decisionCostPp(variant({ cost_pp: null, display_cost_pp: 1.7 })), 1.7);
  assert.equal(decisionCostPp(variant({ cost_pp: null, display_cost_pp: null })), null);
});

test('Sort metrics: WPA swing is absolute, in pp, and null when unknown', () => {
  assert.equal(wpaSwingPp(variant({ outcome: { ...base.outcome, realised_wpa: -0.09 } })), 9);
  assert.equal(wpaSwingPp(variant({ outcome: { ...base.outcome, realised_wpa: 0.05 } })), 5);
});

// --- unknowns never sort as zero ------------------------------------------

test('Sort: unknown cost sorts last in BOTH directions, never as zero', () => {
  const zero = variant({ play_id: 1, week: 1, cost_pp: 0.0, display_cost_pp: 0.0 });
  const mid = variant({ play_id: 2, week: 1, cost_pp: 1.5, display_cost_pp: 1.5 });
  const unknown = variant({ play_id: 3, week: 9, cost_pp: null, display_cost_pp: null });

  const desc = sortDecisions([unknown, zero, mid], 'cost_desc');
  assert.deepEqual(desc.map((d) => d.play_id), [2, 1, 3]);

  const asc = sortDecisions([unknown, zero, mid], 'cost_asc');
  assert.deepEqual(asc.map((d) => d.play_id), [1, 2, 3]);
});

// --- deterministic tiebreaks ----------------------------------------------

test('Sort: equal metric values break ties deterministically (week, game, play - recent first)', () => {
  const a = variant({ week: 1, game_id: '2026_01_A_B', play_id: 10, cost_pp: 1.0, display_cost_pp: 1.0 });
  const b = variant({ week: 2, game_id: '2026_02_A_B', play_id: 5, cost_pp: 1.0, display_cost_pp: 1.0 });
  const c = variant({ week: 2, game_id: '2026_02_A_B', play_id: 8, cost_pp: 1.0, display_cost_pp: 1.0 });

  const out1 = sortDecisions([a, b, c], 'cost_desc');
  const out2 = sortDecisions([c, a, b], 'cost_desc');
  assert.deepEqual(out1, out2, 'order must not depend on input order');
  assert.deepEqual(out1.map((d) => d.play_id), [8, 5, 10]);
});

// --- recency and chronology ------------------------------------------------

test('Sort: recent is latest week first and stable within a week; oldest reverses weeks', () => {
  const w1a = variant({ week: 1, play_id: 100 });
  const w1b = variant({ week: 1, play_id: 200 });
  const w2 = variant({ week: 2, play_id: 50 });

  const recent = sortDecisions([w1a, w2, w1b], 'recent');
  assert.deepEqual(recent.map((d) => d.play_id), [50, 100, 200]);

  const oldest = sortDecisions([w1a, w2, w1b], 'oldest');
  assert.deepEqual(oldest.map((d) => d.play_id), [100, 200, 50]);
});

test('Sort: chronological follows play_id (safe in OT, where game seconds reset)', () => {
  // OT snap: quarter_seconds_remaining resets to a larger value, but play_id still increases.
  const regulationLate = variant({ play_id: 4297, qtr: 4, quarter_seconds_remaining: 15, game_seconds_remaining: 15 });
  const overtime = variant({ play_id: 4598, qtr: 5, quarter_seconds_remaining: 481, game_seconds_remaining: 481, is_overtime: true });
  const regulationEarly = variant({ play_id: 3670, qtr: 4, quarter_seconds_remaining: 444, game_seconds_remaining: 444 });

  const out = sortDecisions([overtime, regulationLate, regulationEarly], 'chronological');
  assert.deepEqual(out.map((d) => d.play_id), [3670, 4297, 4598]);
});

test('Sort: biggest WPA swing ranks a large negative swing above a small positive one', () => {
  const bigNeg = variant({ play_id: 1, outcome: { ...base.outcome, realised_wpa: -0.09 } });
  const smallPos = variant({ play_id: 2, outcome: { ...base.outcome, realised_wpa: 0.05 } });

  const out = sortDecisions([smallPos, bigNeg], 'wpa_swing');
  assert.deepEqual(out.map((d) => d.play_id), [1, 2]);
});

test('Sort: longest distance orders by yards to go, unknowns last', () => {
  const short = variant({ play_id: 1, ydstogo: 1 });
  const long = variant({ play_id: 2, ydstogo: 15 });
  const out = sortDecisions([short, long], 'distance_desc');
  assert.deepEqual(out.map((d) => d.play_id), [2, 1]);
});

test('Sort: input array is never mutated', () => {
  const input = [
    variant({ play_id: 3, week: 1, cost_pp: 0.5 }),
    variant({ play_id: 1, week: 3, cost_pp: 9.9 }),
    variant({ play_id: 2, week: 2, cost_pp: null, display_cost_pp: null }),
  ];
  const before = input.map((d) => d.play_id);
  sortDecisions(input, 'cost_desc');
  assert.deepEqual(input.map((d) => d.play_id), before);
});

test('Sort: audited snaps order by week deterministically in both directions', () => {
  const snaps = [
    { week: 3, game_id: '2026_03_A_B', play_id: 9 },
    { week: 1, game_id: '2026_01_C_D', play_id: 3 },
    { week: 3, game_id: '2026_03_A_B', play_id: 4 },
  ];
  assert.deepEqual(sortSnaps(snaps, 'recent').map((s) => s.play_id), [9, 4, 3]);
  assert.deepEqual(sortSnaps(snaps, 'oldest').map((s) => s.play_id), [3, 4, 9]);
});

test('Sort: comparator treats two unknowns as a deterministic tie', () => {
  const a = variant({ week: 1, play_id: 10, cost_pp: null, display_cost_pp: null });
  const b = variant({ week: 2, play_id: 5, cost_pp: null, display_cost_pp: null });
  assert.ok(compareDecisions(a, b, 'cost_desc') > 0); // b (week 2) first
  assert.ok(compareDecisions(b, a, 'cost_desc') < 0);
});

// --- editorial stats --------------------------------------------------------

test('Editorial: aggression stats count go attempts and costly errors on both sides', () => {
  // Fixture: one go (cost 0), one FG (cost 0.5), one punt (cost 0) -> nothing costly.
  const stats = computeAggressionStats(MOCK_DECISIONS_FIXTURE);
  assert.equal(stats.totalDecisions, 3);
  assert.equal(stats.goAttempts, 1);
  assert.equal(stats.overAggressiveCount, 0);
  assert.equal(stats.conservativeErrorCount, 0);
  assert.match(overAggressionHeadline(stats), /Myth/);
});

test('Editorial: a costly go attempt flips the headline and the dominance claim', () => {
  const costlyGo = variant({ actual_choice: 'go', cost_pp: 4.2, display_cost_pp: 4.2 });
  const costlyPunt = variant({ actual_choice: 'punt', cost_pp: 5.1, display_cost_pp: 5.1 });

  const withGamble = computeAggressionStats([...MOCK_DECISIONS_FIXTURE, costlyGo]);
  assert.equal(withGamble.overAggressiveCount, 1);
  assert.match(overAggressionHeadline(withGamble), /Rarity/);
  assert.equal(conservatismDominates(withGamble), false);

  const withBoth = computeAggressionStats([...MOCK_DECISIONS_FIXTURE, costlyGo, costlyPunt, costlyPunt]);
  assert.equal(withBoth.overAggressiveCount, 1);
  assert.equal(withBoth.conservativeErrorCount, 2);
  assert.equal(conservatismDominates(withBoth), true);
});

test('Editorial: season label comes from meta first, then data, never hardcoded', () => {
  assert.equal(seasonOf(MOCK_DECISIONS_FIXTURE, 2027), 2027);
  assert.equal(seasonOf(MOCK_DECISIONS_FIXTURE, null), 2026);
  assert.equal(seasonOf([], null), null);
});
