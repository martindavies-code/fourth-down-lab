import type { Decision, OptionName } from '../types/decision.ts';
import type { Story, VerdictTone } from './story.ts';
import { formatProbability } from './formatting.ts';

export type StampVariant = 'hissho' | 'kekkoh' | 'teki' | 'haran' | 'teppeki';

export interface ChoiceVisual {
  label: string;
  ja: string;
  shortJa: string;
  badgeClass: string;
}

export interface VerdictStampSpec {
  kanji: string;
  subtext: string;
  variant: StampVariant;
  title: string;
}

export interface ExecutionVisual {
  text: string;
  sfx: string;
  sfxGloss: string;
  sfxTone: 'gold' | 'ok' | 'strong' | 'neutral';
  good: boolean | null;
  highlightTag: string | null;
}

export interface WpaSwingVisual {
  wpaPp: number;
  direction: 'pos' | 'neg' | 'flat';
  /** Percentage of the half-bar (0..100) scaled to ±25 pp */
  fillPct: number;
  isCapped: boolean;
}

export interface CounterfactualFork {
  title: string;
  ja: string;
  failLabel: string;
  failWp: number;
  expectedWp: number | null;
  succeedLabel: string;
  succeedWp: number;
}

const CHOICE_VISUALS: Record<OptionName, ChoiceVisual> = {
  go: {
    label: 'Go for it',
    ja: 'ギャンブル',
    shortJa: 'ギャンブル',
    badgeClass: 'border-sky-400/50 bg-sky-500/15 text-sky-200',
  },
  field_goal: {
    label: 'Field goal',
    ja: 'FGトライ',
    shortJa: 'FG',
    badgeClass: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  },
  punt: {
    label: 'Punt',
    ja: 'パント',
    shortJa: 'パント',
    badgeClass: 'border-indigo-400/50 bg-indigo-500/15 text-indigo-200',
  },
};

export function getChoiceVisual(choice: string): ChoiceVisual {
  if (choice === 'go' || choice === 'field_goal' || choice === 'punt') {
    return CHOICE_VISUALS[choice];
  }
  return {
    label: choice,
    ja: '選択',
    shortJa: '選択',
    badgeClass: 'border-slate-600 bg-slate-800/60 text-slate-200',
  };
}

/**
 * Derives the decorative Japanese hanko stamp strictly from PRE-SNAP model state.
 * Never depends on post-play execution outcome (preserving 2x2 decision-vs-outcome separation).
 */
export function getVerdictStamp(params: {
  showVerdict: boolean;
  isTossUp: boolean;
  tone: VerdictTone;
  actualChoice: string;
  tier: string;
  verdictLabel: string;
}): VerdictStampSpec {
  const { showVerdict, isTossUp, tone, actualChoice, tier, verdictLabel } = params;

  if (!showVerdict) {
    return {
      kanji: '延長',
      subtext: 'OVERTIME',
      variant: 'teppeki',
      title: 'Overtime — context only, outside validated regular-season model domain',
    };
  }

  if (tone === 'ok' && isTossUp) {
    return {
      kanji: '伯仲',
      subtext: 'TOSS-UP',
      variant: 'kekkoh',
      title: 'Toss-up — top modelled options were within 1.0 pp pre-snap',
    };
  }

  if (tone === 'ok' && tier === 'clear_go' && actualChoice === 'go') {
    return {
      kanji: '決行',
      subtext: 'CLEAR GO',
      variant: 'teki',
      title: 'Go-for-it call aligned with a clear pre-snap model lead',
    };
  }

  if (tone === 'ok') {
    return {
      kanji: '的確',
      subtext: 'SOUND CALL',
      variant: 'teki',
      title: 'Reasonable pre-snap call consistent with the model',
    };
  }

  if (tone === 'lean') {
    return {
      kanji: '審議',
      subtext: 'MODEL LEAN',
      variant: 'hissho',
      title: 'Pre-snap model leaned toward another option',
    };
  }

  if (tone === 'strong') {
    return {
      kanji: '波乱',
      subtext: 'BOLD SPLIT',
      variant: 'haran',
      title: 'Pre-snap model strongly preferred another option',
    };
  }

  return {
    kanji: '判定',
    subtext: 'MODEL',
    variant: 'teppeki',
    title: verdictLabel,
  };
}

/**
 * Derives play execution text and katakana SFX strictly from POST-PLAY outcome.
 * Completely independent of whether the pre-snap call matched the model.
 */
export function getExecutionVisual(decision: Decision): ExecutionVisual {
  const { actual_choice, outcome } = decision;
  const hasYards = typeof outcome.yards_gained === 'number' && Number.isFinite(outcome.yards_gained);
  const ydsRounded = hasYards ? Math.round(outcome.yards_gained) : null;
  const ydsSigned = ydsRounded !== null ? `${ydsRounded > 0 ? '+' : ''}${ydsRounded} yds` : null;

  if (actual_choice === 'go') {
    if (outcome.touchdown) {
      return {
        text: ydsSigned ? `Touchdown! (${ydsSigned})` : 'Touchdown!',
        sfx: 'ドカーン！',
        sfxGloss: 'TOUCHDOWN',
        sfxTone: 'gold',
        good: true,
        highlightTag: 'TOUCHDOWN • タッチダウン',
      };
    }
    if (outcome.converted) {
      return {
        text: ydsSigned ? `Converted (${ydsSigned})` : 'Converted',
        sfx: '突破！',
        sfxGloss: '1ST DOWN',
        sfxTone: 'ok',
        good: true,
        highlightTag: null,
      };
    }
    if (outcome.interception) {
      return {
        text: ydsRounded !== null ? `Intercepted (${ydsRounded} yds)` : 'Intercepted',
        sfx: 'ガシッ！',
        sfxGloss: 'INTERCEPTED',
        sfxTone: 'strong',
        good: false,
        highlightTag: 'TURNOVER • 攻守交代',
      };
    }
    if (outcome.fumble_lost) {
      return {
        text: ydsRounded !== null ? `Fumble lost (${ydsRounded} yds)` : 'Fumble lost',
        sfx: 'ポロッ！',
        sfxGloss: 'FUMBLE',
        sfxTone: 'strong',
        good: false,
        highlightTag: 'TURNOVER • 攻守交代',
      };
    }
    return {
      text: ydsRounded !== null ? `Failed (${ydsRounded} yds), turnover on downs` : 'Failed, turnover on downs',
      sfx: '阻止！',
      sfxGloss: 'STOPPED',
      sfxTone: 'strong',
      good: false,
      highlightTag: null,
    };
  }

  if (actual_choice === 'field_goal') {
    const kickDist =
      typeof outcome.kick_distance === 'number' && Number.isFinite(outcome.kick_distance) && outcome.kick_distance > 0
        ? `${Math.round(outcome.kick_distance)}-yd `
        : '';

    if (outcome.field_goal_result === 'made') {
      return {
        text: `${kickDist}kick good`,
        sfx: 'スパッ！',
        sfxGloss: 'GOOD!',
        sfxTone: 'ok',
        good: true,
        highlightTag: null,
      };
    }
    if (outcome.blocked || outcome.field_goal_result === 'blocked') {
      return {
        text: `${kickDist}kick blocked`,
        sfx: 'バシッ！',
        sfxGloss: 'BLOCKED',
        sfxTone: 'strong',
        good: false,
        highlightTag: 'BLOCKED • ブロック',
      };
    }
    return {
      text: kickDist ? `${kickDist}kick missed` : 'Kick missed or blocked',
      sfx: 'ヒュン…',
      sfxGloss: 'NO GOOD',
      sfxTone: 'strong',
      good: false,
      highlightTag: null,
    };
  }

  if (actual_choice === 'punt') {
    if (outcome.blocked) {
      return {
        text: 'Punt blocked',
        sfx: 'バシッ！',
        sfxGloss: 'BLOCKED',
        sfxTone: 'strong',
        good: false,
        highlightTag: 'BLOCKED • ブロック',
      };
    }
    const gross =
      typeof outcome.gross_yards === 'number' && Number.isFinite(outcome.gross_yards) && outcome.gross_yards > 0
        ? Math.round(outcome.gross_yards)
        : null;
    return {
      text: gross !== null ? `${gross}-yd punt` : 'Punt executed',
      sfx: 'ドーン！',
      sfxGloss: 'PUNT',
      sfxTone: 'neutral',
      good: null,
      highlightTag: null,
    };
  }

  return {
    text: outcome.summary || 'Play executed',
    sfx: 'ドン！',
    sfxGloss: 'PLAY',
    sfxTone: 'neutral',
    good: null,
    highlightTag: null,
  };
}

/**
 * Returns the concise pre-snap success probability micro-stat shown directly on option rows.
 */
export function getOptionMicroStat(decision: Decision, optionKey: OptionName): string | null {
  if (optionKey === 'go') {
    const p = decision.options.go.first_down_prob;
    if (typeof p === 'number' && Number.isFinite(p)) {
      return `Conv ${formatProbability(p)}`;
    }
  }
  if (optionKey === 'field_goal') {
    const p = decision.options.field_goal.fg_make_prob;
    if (typeof p === 'number' && Number.isFinite(p)) {
      return `Make ${formatProbability(p)}`;
    }
  }
  return null;
}

/**
 * Computes bidirectional swing bar geometry for realised WPA (scaled to ±25 pp).
 */
export function computeWpaSwing(realisedWpa: number | null | undefined): WpaSwingVisual {
  const safe = typeof realisedWpa === 'number' && Number.isFinite(realisedWpa) ? realisedWpa : 0;
  const wpaPp = safe * 100;
  const absPp = Math.abs(wpaPp);
  if (absPp < 0.05) {
    return { wpaPp, direction: 'flat', fillPct: 0, isCapped: false };
  }
  const scaled = Math.min(100, (absPp / 25) * 100);
  return {
    wpaPp,
    direction: wpaPp > 0 ? 'pos' : 'neg',
    fillPct: Math.max(5, Math.round(scaled * 10) / 10),
    isCapped: absPp > 25,
  };
}

/**
 * Left-edge color spine for instant visual scanning across the decision feed.
 */
export function getCardAccentClass(tone: VerdictTone, showVerdict: boolean): string {
  if (!showVerdict) return 'border-l-4 border-l-indigo-400/80';
  if (tone === 'ok') return 'border-l-4 border-l-emerald-400/80';
  if (tone === 'lean') return 'border-l-4 border-l-amber-400/85';
  if (tone === 'strong') return 'border-l-4 border-l-rose-500/90';
  return 'border-l-4 border-l-slate-500/70';
}

/**
 * Builds visual counterfactual WP risk/reward forks for the expanded details drawer.
 */
export function getCounterfactualForks(decision: Decision): CounterfactualFork[] {
  const forks: CounterfactualFork[] = [];
  const go = decision.options.go;
  if (
    go.status === 'AVAILABLE' &&
    typeof go.wp_fail === 'number' &&
    Number.isFinite(go.wp_fail) &&
    typeof go.wp_succeed === 'number' &&
    Number.isFinite(go.wp_succeed)
  ) {
    forks.push({
      title: 'Go for it risk / reward',
      ja: 'ギャンブル分岐',
      failLabel: 'If failed',
      failWp: go.wp_fail,
      expectedWp: typeof go.wp === 'number' && Number.isFinite(go.wp) ? go.wp : null,
      succeedLabel: 'If converted',
      succeedWp: go.wp_succeed,
    });
  }

  const fg = decision.options.field_goal;
  if (
    fg.status === 'AVAILABLE' &&
    typeof fg.miss_fg_wp === 'number' &&
    Number.isFinite(fg.miss_fg_wp) &&
    typeof fg.make_fg_wp === 'number' &&
    Number.isFinite(fg.make_fg_wp)
  ) {
    forks.push({
      title: 'Field goal risk / reward',
      ja: 'FG分岐',
      failLabel: 'If missed',
      failWp: fg.miss_fg_wp,
      expectedWp: typeof fg.wp === 'number' && Number.isFinite(fg.wp) ? fg.wp : null,
      succeedLabel: 'If made',
      succeedWp: fg.make_fg_wp,
    });
  }

  return forks;
}

/**
 * Returns the highest modelled WP across available options (used as visual reference marker).
 */
export function getTopModelledWp(story: Story): number | null {
  const topRow = story.rows.find((r) => r.modelled && r.wp !== null);
  return topRow?.wp ?? null;
}
