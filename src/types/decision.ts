export type OptionName = 'go' | 'field_goal' | 'punt';

export type OptionStatus = 'AVAILABLE' | 'UNMODELLED' | 'UNSUPPORTED' | 'MODEL_FAILURE';

export type DecisionTier = 'genuine' | 'obvious' | 'clear_go' | 'incomplete';

export type VerdictLabel =
  | 'Reasonable'
  | 'Model leaned the other way'
  | 'Model strongly preferred another option'
  | string;

export type DecisionQuadrant =
  | 'Consistent & Succeeded'
  | 'Consistent & Failed'
  | 'Against Model & Succeeded'
  | 'Against Model & Failed'
  | 'Unclassified (Incomplete)';

export interface OptionDetails {
  status: OptionStatus;
  reason: string;
  wp: number | null;
  first_down_prob?: number | null;
  wp_succeed?: number | null;
  wp_fail?: number | null;
  fg_make_prob?: number | null;
  make_fg_wp?: number | null;
  miss_fg_wp?: number | null;
  low_make_probability?: boolean;
}

export interface PlayOutcome {
  play_type: string;
  desc: string;
  yards_gained: number;
  realised_wpa: number;
  realised_wpa_note: string;
  penalty_affected: boolean;
  converted?: boolean;
  failed?: boolean;
  touchdown?: boolean;
  interception?: boolean;
  fumble_lost?: boolean;
  field_goal_result?: string;
  kick_distance?: number;
  gross_yards?: number;
  blocked?: boolean;
  summary: string;
}

export interface Decision {
  game_id: string;
  play_id: number;
  season: number;
  week: number;
  season_type: string;
  home_team: string;
  away_team: string;
  posteam: string;
  defteam: string;
  qtr: number;
  quarter_seconds_remaining: number;
  half_seconds_remaining: number;
  game_seconds_remaining: number;
  down: number;
  ydstogo: number;
  yardline_100: number;
  score_differential: number;
  posteam_score: number;
  defteam_score: number;
  posteam_timeouts_remaining: number;
  defteam_timeouts_remaining: number;
  roof: string;
  spread_line: number;
  total_line: number;
  // Decision analysis
  options: {
    go: OptionDetails;
    field_goal: OptionDetails;
    punt: OptionDetails;
  };
  is_complete_comparison: boolean;
  preferred_options: OptionName[];
  is_toss_up: boolean;
  best_option: OptionName | null;
  best_wp: number | null;
  go_boost: number | null;
  tier: DecisionTier;
  is_genuine: boolean;
  // Actual choice & verdict
  actual_choice: OptionName | string;
  is_consistent_with_model: boolean | null;
  cost_pp: number | null;
  display_cost_pp: number | null;
  exact_cost_display: string | null;
  is_near_boundary: boolean;
  verdict_label: VerdictLabel;
  cost_reason: string | null;
  // Outcome
  outcome: PlayOutcome;
  play_succeeded: boolean;
  quadrant: DecisionQuadrant;
  quadrant_slug: string;
}

export interface TeamSummary {
  team: string;
  total_executed: number;
  genuine_count: number;
  toss_up_count: number;
  non_toss_up_genuine: number;
  adherent_count: number;
  adherence_pct: number | null;
  adherence_display: string;
  punted_on_clear_go: number;
  total_wp_lost_pp: number;
  low_sample_warning: boolean;
}

export interface GameSummary {
  game_id: string;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  decisions_count: number;
  decisions: Array<{
    play_id: number;
    qtr: number;
    posteam: string;
    ydstogo: number;
    yardline_100: number;
    actual_choice: string;
    cost_pp: number | null;
    verdict_label: string;
    quadrant: string;
    tier: string;
  }>;
  home_wp_lost_pp: number;
  away_wp_lost_pp: number;
}

export interface CancelledSnap {
  game_id: string;
  play_id: number;
  week: number;
  posteam: string;
  defteam: string;
  qtr: number;
  ydstogo: number;
  yardline_100: number;
  desc: string;
  penalty: boolean;
  replayed_on_fourth_down: boolean;
  replayed_details: {
    next_play_id: number;
    next_down: number;
    next_ydstogo: number;
    next_play_type: string;
    next_desc: string;
  } | null;
  status_label: string;
}

export interface MetaData {
  title: string;
  build_time: string;
  data_source: string;
  data_as_of: string;
  data_licence: string;
  model_route: string;
  season: number;
  weeks: number[];
  total_games: number;
  counts: {
    total_fourth_down_rows: number;
    executed_snaps: number;
    cancelled_snaps: number;
    cancelled_replayed: number;
    cancelled_not_replayed: number;
    excluded_snaps: number;
  };
  thresholds: {
    toss_up_pp: number;
    genuine_gap_pp: number;
    clear_go_gap_pp: number;
  };
  credits: Array<{
    entity: string;
    details: string;
    licence: string;
  }>;
  validation_summary: string;
}
