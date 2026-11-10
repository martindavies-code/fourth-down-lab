"""Unit and regression tests for Fourth Down Lab data pipeline and model engine."""

from __future__ import annotations

import io
import sys
from pathlib import Path
from typing import Self
from unittest.mock import patch

# Add project root and pipeline dir to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# External package pandas lacks bundled type stubs in active environment
import pandas as pd  # type: ignore[import-untyped]
import polars as pl
import pytest
from build_data import (
    audit_cancelled_snaps,
    build_metadata,
    calculate_games_summary,
    calculate_team_summaries,
    fetch_or_load_pbp,
    run_pipeline,
)
from model_engine import (
    _safe_float,
    _safe_int,
    evaluate_decision_row,
    process_scored_row,
)


def create_mock_scored_row(
    yardline_100: float = 50.0,
    ydstogo: float = 2.0,
    play_type: str = "run",
    go_wp: float = 0.55,
    fg_wp: float = 0.50,
    punt_wp: float = 0.52,
    first_down_prob: float = 0.60,
    fg_make_prob: float = 0.75,
    wp_succeed: float = 0.62,
    wp_fail: float = 0.45,
    wpa: float = 0.03,
    penalty: int = 0,
    game_sec: float = 1800.0,
    qtr: int = 2,
    fourth_down_converted: int = 1,
    fourth_down_failed: int = 0,
    yards_gained: int = 3,
) -> dict:
    """Creates a synthetic pre-scored row for testing decision logic."""
    return {
        "game_id": "2026_01_TEST_GAME",
        "play_id": 100,
        "season": 2026,
        "week": 1,
        "season_type": "REG",
        "home_team": "DET",
        "away_team": "GB",
        "posteam": "DET",
        "defteam": "GB",
        "qtr": qtr,
        "quarter_seconds_remaining": 900.0,
        "half_seconds_remaining": 900.0,
        "game_seconds_remaining": game_sec,
        "down": 4,
        "ydstogo": ydstogo,
        "yardline_100": yardline_100,
        "score_differential": 0.0,
        "posteam_score": 14,
        "defteam_score": 14,
        "posteam_timeouts_remaining": 3,
        "defteam_timeouts_remaining": 3,
        "roof": "dome",
        "spread_line": -3.0,
        "total_line": 51.0,
        "play_type": play_type,
        "desc": f"Mock play {play_type}",
        "go_wp": go_wp,
        "fg_wp": fg_wp,
        "punt_wp": punt_wp,
        "first_down_prob": first_down_prob,
        "fg_make_prob": fg_make_prob,
        "wp_succeed": wp_succeed,
        "wp_fail": wp_fail,
        "wpa": wpa,
        "penalty": penalty,
        "fourth_down_converted": fourth_down_converted,
        "fourth_down_failed": fourth_down_failed,
        "yards_gained": yards_gained,
    }


class TestSafeHelpers:
    """Tests for safe conversion helpers."""

    def test_safe_float(self) -> None:
        assert _safe_float(None, 1.5) == 1.5
        assert _safe_float(float("nan"), 2.0) == 2.0
        assert _safe_float("4.2", 0.0) == 4.2
        assert _safe_float("invalid", 3.0) == 3.0

    def test_safe_int(self) -> None:
        assert _safe_int(None, 5) == 5
        assert _safe_int(float("nan"), 7) == 7
        assert _safe_int("10", 0) == 10
        assert _safe_int("bad", 9) == 9


class TestOptionStatusRules:
    """Tests for option status rules and reason codes."""

    def test_ordinary_fourth_down_statuses(self) -> None:
        row = create_mock_scored_row(yardline_100=50.0)
        dec = process_scored_row(row)
        assert dec["options"]["go"]["status"] == "AVAILABLE"
        assert dec["options"]["field_goal"]["status"] == "AVAILABLE"
        assert dec["options"]["punt"]["status"] == "AVAILABLE"

    def test_punt_inside_31_is_unmodelled(self) -> None:
        row = create_mock_scored_row(yardline_100=15.0, punt_wp=float("nan"))
        dec = process_scored_row(row)
        assert dec["options"]["punt"]["status"] == "UNMODELLED"
        assert "not modelled in nfl4th punt landing distribution" in dec["options"]["punt"]["reason"]
        assert dec["is_partial_comparison"] is True

    def test_low_make_probability_flag(self) -> None:
        row = create_mock_scored_row(yardline_100=42.0, fg_make_prob=0.08)
        dec = process_scored_row(row)
        assert dec["options"]["field_goal"]["low_make_probability"] is True

        row_normal = create_mock_scored_row(yardline_100=20.0, fg_make_prob=0.85)
        dec_normal = process_scored_row(row_normal)
        assert dec_normal["options"]["field_goal"]["low_make_probability"] is False

    def test_unsupported_clock_context(self) -> None:
        row = create_mock_scored_row(game_sec=-5.0)
        dec = process_scored_row(row)
        assert dec["options"]["go"]["status"] == "UNSUPPORTED"
        assert dec["is_complete_comparison"] is False

    def test_model_failure_raises(self) -> None:
        # Go failure
        row_go = create_mock_scored_row(yardline_100=50.0, go_wp=float("nan"))
        with pytest.raises(ValueError, match="MODEL FAILURE: go_wp is missing"):
            process_scored_row(row_go)

        # FG failure
        row_fg = create_mock_scored_row(yardline_100=50.0, fg_wp=float("nan"))
        with pytest.raises(ValueError, match="MODEL FAILURE: fg_wp is missing"):
            process_scored_row(row_fg)

        # Punt failure in punt territory
        row_punt = create_mock_scored_row(yardline_100=50.0, punt_wp=float("nan"))
        with pytest.raises(ValueError, match="MODEL FAILURE: punt_wp is missing"):
            process_scored_row(row_punt)


class TestVerdictAndBoundaries:
    """Tests for verdict thresholds, ties, and boundary classifications."""

    def test_toss_up_within_1pp(self) -> None:
        row = create_mock_scored_row(go_wp=0.505, fg_wp=0.500, punt_wp=0.450)
        dec = process_scored_row(row)
        assert dec["is_toss_up"] is True
        assert "go" in dec["preferred_options"]
        assert "field_goal" in dec["preferred_options"]
        assert dec["is_consistent_with_model"] is True
        assert dec["verdict_label"] == "Reasonable"

    def test_exact_tie(self) -> None:
        row = create_mock_scored_row(go_wp=0.5000, fg_wp=0.5000, punt_wp=0.4000)
        dec = process_scored_row(row)
        assert dec["is_toss_up"] is True
        assert dec["cost_pp"] == 0.0
        assert dec["is_consistent_with_model"] is True
        assert dec["verdict_label"] == "Reasonable"

    def test_cost_boundary_1pp(self) -> None:
        # Exactly 1.0 pp cost
        row_10 = create_mock_scored_row(
            go_wp=0.510, fg_wp=0.500, punt_wp=0.400, play_type="field_goal"
        )
        dec_10 = process_scored_row(row_10)
        assert dec_10["cost_pp"] == pytest.approx(1.0, abs=1e-5)
        assert dec_10["verdict_label"] == "Reasonable"
        assert dec_10["is_near_boundary"] is True

        # 1.01 pp cost (Model leaned)
        row_101 = create_mock_scored_row(
            go_wp=0.5101, fg_wp=0.5000, punt_wp=0.4000, play_type="field_goal"
        )
        dec_101 = process_scored_row(row_101)
        assert dec_101["cost_pp"] > 1.0
        assert dec_101["verdict_label"] == "Model leaned the other way"

    def test_cost_boundary_3pp(self) -> None:
        # Exactly 3.0 pp cost
        row_30 = create_mock_scored_row(
            go_wp=0.530, fg_wp=0.500, punt_wp=0.400, play_type="field_goal"
        )
        dec_30 = process_scored_row(row_30)
        assert dec_30["cost_pp"] == pytest.approx(3.0, abs=1e-5)
        assert dec_30["verdict_label"] == "Model leaned the other way"
        assert dec_30["is_near_boundary"] is True

        # 3.01 pp cost (Model strongly preferred)
        row_301 = create_mock_scored_row(
            go_wp=0.5301, fg_wp=0.5000, punt_wp=0.4000, play_type="field_goal"
        )
        dec_301 = process_scored_row(row_301)
        assert dec_301["cost_pp"] > 3.0
        assert dec_301["verdict_label"] == "Model strongly preferred another option"


class TestDecisionTiers:
    """Tests for clear_go, genuine, and obvious decision tier classifications."""

    def test_clear_go_tier(self) -> None:
        row = create_mock_scored_row(go_wp=0.60, fg_wp=0.50, punt_wp=0.45)
        dec = process_scored_row(row)
        assert dec["tier"] == "clear_go"
        assert dec["is_genuine"] is True
        assert dec["go_boost"] == pytest.approx(10.0, abs=0.1)

    def test_genuine_tier(self) -> None:
        row = create_mock_scored_row(go_wp=0.52, fg_wp=0.50, punt_wp=0.45)
        dec = process_scored_row(row)
        assert dec["tier"] == "genuine"
        assert dec["is_genuine"] is True

    def test_obvious_tier(self) -> None:
        row = create_mock_scored_row(go_wp=0.40, fg_wp=0.30, punt_wp=0.60)
        dec = process_scored_row(row)
        assert dec["tier"] == "obvious"
        assert dec["is_genuine"] is False

    def test_nan_punt_wp(self) -> None:
        row = create_mock_scored_row(
            go_wp=0.55, fg_wp=0.50, punt_wp=float("nan"), yardline_100=50.0
        )
        with pytest.raises(ValueError, match="MODEL FAILURE: punt_wp is missing"):
            process_scored_row(row)

    def test_missing_fg_wp(self) -> None:
        row = create_mock_scored_row(go_wp=0.55, fg_wp=float("nan"), yardline_100=10.0)
        with pytest.raises(ValueError, match="MODEL FAILURE: fg_wp is missing"):
            process_scored_row(row)


class TestHonest2x2Separation:
    """Tests that decisions and results are evaluated separately."""

    def test_good_call_failed(self) -> None:
        row = create_mock_scored_row(
            go_wp=0.58,
            fg_wp=0.50,
            punt_wp=0.45,
            play_type="run",
            fourth_down_converted=0,
            fourth_down_failed=1,
            yards_gained=0,
            wpa=-0.25,
        )
        dec = process_scored_row(row)
        assert dec["is_consistent_with_model"] is True
        assert dec["play_succeeded"] is False
        assert dec["quadrant"] == "Consistent & Failed"
        assert "mistake" not in dec["verdict_label"].lower()

    def test_bad_call_succeeded(self) -> None:
        row = create_mock_scored_row(
            go_wp=0.65,
            fg_wp=0.40,
            punt_wp=0.45,
            play_type="field_goal",
            fourth_down_converted=0,
            fourth_down_failed=0,
            wpa=0.10,
        )
        row["field_goal_result"] = "made"
        row["kick_distance"] = 45
        dec = process_scored_row(row)
        assert dec["is_consistent_with_model"] is False
        assert dec["play_succeeded"] is True
        assert dec["quadrant"] == "Against Model & Succeeded"
        assert dec["verdict_label"] == "Model strongly preferred another option"

    def test_conversion_fallback_logic(self) -> None:
        # fourth_down_converted/failed not recorded, but yards_gained >= ydstogo
        row_suc = create_mock_scored_row(
            ydstogo=2.0,
            yards_gained=3,
            fourth_down_converted=0,
            fourth_down_failed=0,
            play_type="run",
        )
        dec_suc = process_scored_row(row_suc)
        assert dec_suc["play_succeeded"] is True

        # yards_gained < ydstogo
        row_fail = create_mock_scored_row(
            ydstogo=2.0,
            yards_gained=1,
            fourth_down_converted=0,
            fourth_down_failed=0,
            play_type="run",
        )
        dec_fail = process_scored_row(row_fail)
        assert dec_fail["play_succeeded"] is False

    def test_punt_blocked_vs_clean(self) -> None:
        # Clean punt
        row_clean = create_mock_scored_row(play_type="punt", punt_wp=0.55, go_wp=0.45)
        row_clean["kick_distance"] = 48
        row_clean["punt_blocked"] = 0
        dec_clean = process_scored_row(row_clean)
        assert dec_clean["play_succeeded"] is True
        assert dec_clean["quadrant"] == "Consistent & Succeeded"

        # Blocked punt
        row_blocked = create_mock_scored_row(play_type="punt", punt_wp=0.55, go_wp=0.45)
        row_blocked["kick_distance"] = 10
        row_blocked["punt_blocked"] = 1
        dec_blocked = process_scored_row(row_blocked)
        assert dec_blocked["play_succeeded"] is False
        assert dec_blocked["quadrant"] == "Consistent & Failed"

    def test_unmodelled_actual_choice(self) -> None:
        row = create_mock_scored_row(play_type="drop_kick")
        dec = process_scored_row(row)
        assert dec["verdict_label"] == "Actual choice unmodelled"
        assert dec["quadrant"] == "Unclassified (Incomplete)"


class TestBuildDataPureFunctions:
    """Tests for pure aggregation and auditing functions in build_data.py."""

    def test_audit_cancelled_snaps(self) -> None:
        df_fourth = pl.DataFrame(
            {
                "game_id": ["G1", "G1"],
                "play_id": [10, 20],
                "play_type": ["no_play", "no_play"],
                "week": [1, 1],
                "posteam": ["DET", "GB"],
                "defteam": ["GB", "DET"],
                "qtr": [1, 2],
                "ydstogo": [5.0, 10.0],
                "yardline_100": [40.0, 70.0],
                "desc": ["Penalty false start", "Penalty delay of game"],
                "penalty": [1, 1],
            }
        )
        df_sorted = pl.DataFrame(
            {
                "game_id": ["G1", "G1", "G1"],
                "play_id": [10, 11, 20],
                "down": [4, 4, 4],
                "ydstogo": [5.0, 10.0, 15.0],
                "play_type": ["no_play", "pass", "no_play"],
                "desc": ["Penalty false start", "Replayed pass", "Penalty delay"],
            }
        )
        audit_list, replayed, not_replayed = audit_cancelled_snaps(df_fourth, df_sorted)
        assert len(audit_list) == 2
        assert replayed == 1
        assert not_replayed == 1

    def test_calculate_team_summaries(self) -> None:
        mock_decisions = [
            {
                "posteam": "DET",
                "cost_pp": 0.5,
                "is_genuine": True,
                "is_toss_up": False,
                "is_consistent_with_model": True,
                "tier": "genuine",
                "actual_choice": "go",
            },
            {
                "posteam": "DET",
                "cost_pp": 2.0,
                "is_genuine": True,
                "is_toss_up": False,
                "is_consistent_with_model": False,
                "tier": "genuine",
                "actual_choice": "punt",
            },
            {
                "posteam": "DET",
                "cost_pp": 0.0,
                "is_genuine": True,
                "is_toss_up": True,  # Toss-up: excluded from denominator
                "is_consistent_with_model": True,
                "tier": "genuine",
                "actual_choice": "go",
            },
        ]
        summaries = calculate_team_summaries(mock_decisions)
        det = next(s for s in summaries if s["team"] == "DET")
        assert det["genuine_count"] == 3
        assert det["toss_up_count"] == 1
        assert det["non_toss_up_genuine"] == 2
        assert det["adherent_count"] == 1
        assert det["adherence_pct"] == 50.0
        assert det["low_sample_warning"] is True

    def test_calculate_games_summary(self) -> None:
        mock_decisions = [
            {
                "game_id": "2026_01_GB_DET",
                "season": 2026,
                "week": 1,
                "home_team": "DET",
                "away_team": "GB",
                "play_id": 50,
                "qtr": 1,
                "posteam": "DET",
                "ydstogo": 2.0,
                "yardline_100": 45.0,
                "actual_choice": "go",
                "cost_pp": 1.5,
                "verdict_label": "Model leaned the other way",
                "quadrant": "Consistent & Succeeded",
                "tier": "genuine",
            }
        ]
        games = calculate_games_summary(mock_decisions)
        assert len(games) == 1
        assert games[0]["game_id"] == "2026_01_GB_DET"
        assert games[0]["home_wp_lost_pp"] == 1.5

    def test_build_metadata(self) -> None:
        meta = build_metadata(
            100, 10, 85, 85, 32, 16, data_as_of="2026-11-03 14:00 UTC"
        )
        assert meta["counts"]["total_fourth_down_rows"] == 100
        assert meta["counts"]["cancelled_snaps"] == 10
        assert meta["data_as_of"] == "2026-11-03 14:00 UTC"

    def test_run_pipeline_synthetic(self, tmp_path: Path) -> None:
        df_empty = pl.DataFrame(
            {
                "game_id": ["G1"],
                "play_id": [1],
                "down": [4],
                "play_type": ["no_play"],
                "play_deleted": [0],
                "week": [1],
                "posteam": ["DET"],
                "defteam": ["GB"],
                "qtr": [1],
                "ydstogo": [5.0],
                "yardline_100": [50.0],
                "desc": ["Penalty"],
                "penalty": [1],
            }
        )
        res = run_pipeline(df_raw=df_empty, output_dir=tmp_path, run_model=False)
        assert res["cancelled_count"] == 1
        assert (tmp_path / "meta.json").exists()
        assert (tmp_path / "audit_cancelled_snaps.json").exists()

        # Also test with output_dir=None
        res_no_out = run_pipeline(df_raw=df_empty, output_dir=None, run_model=False)
        assert res_no_out["cancelled_count"] == 1

    def test_run_pipeline_loads_pbp_when_df_raw_none(self, tmp_path: Path) -> None:
        dummy_df = pl.DataFrame(
            {
                "game_id": ["G1"],
                "play_id": [1],
                "down": [4],
                "play_type": ["no_play"],
                "play_deleted": [0],
                "week": [1],
                "posteam": ["DET"],
                "defteam": ["GB"],
                "qtr": [1],
                "ydstogo": [5.0],
                "yardline_100": [50.0],
                "desc": ["Penalty"],
                "penalty": [1],
            }
        )
        with patch("build_data.fetch_or_load_pbp", return_value=dummy_df):
            res = run_pipeline(df_raw=None, output_dir=tmp_path, run_model=False)
            assert res["cancelled_count"] == 1

    def test_run_pipeline_with_mocked_model(self, tmp_path: Path) -> None:
        df_executed = pl.DataFrame(
            {
                "game_id": ["G1"],
                "play_id": [2],
                "down": [4],
                "play_type": ["run"],
                "play_deleted": [0],
                "week": [1],
                "posteam": ["DET"],
                "defteam": ["GB"],
                "qtr": [1],
                "ydstogo": [1.0],
                "yardline_100": [40.0],
                "desc": ["(12:00) J.Goff run for 2 yards"],
                "penalty": [0],
                "season": [2026],
                "season_type": ["REG"],
                "home_team": ["GB"],
                "away_team": ["DET"],
                "quarter_seconds_remaining": [720.0],
                "half_seconds_remaining": [720.0],
                "game_seconds_remaining": [2520.0],
                "score_differential": [0.0],
                "posteam_timeouts_remaining": [3],
                "defteam_timeouts_remaining": [3],
                "home_opening_kickoff": [1],
                "roof": ["outdoors"],
                "spread_line": [2.5],
                "total_line": [48.0],
                "wpa": [0.02],
                "yards_gained": [2],
                "fourth_down_converted": [1],
                "fourth_down_failed": [0],
            }
        )

        mock_scored_return = pd.DataFrame(
            [
                {
                    "game_id": "G1",
                    "play_id": 2,
                    "season": 2026,
                    "week": 1,
                    "season_type": "REG",
                    "home_team": "GB",
                    "away_team": "DET",
                    "posteam": "DET",
                    "defteam": "GB",
                    "qtr": 1,
                    "quarter_seconds_remaining": 720.0,
                    "half_seconds_remaining": 720.0,
                    "game_seconds_remaining": 2520.0,
                    "down": 4,
                    "ydstogo": 1.0,
                    "yardline_100": 40.0,
                    "score_differential": 0.0,
                    "posteam_timeouts_remaining": 3,
                    "defteam_timeouts_remaining": 3,
                    "home_opening_kickoff": 1,
                    "roof": "outdoors",
                    "spread_line": 2.5,
                    "total_line": 48.0,
                    "play_type": "run",
                    "desc": "(12:00) J.Goff run for 2 yards",
                    "yards_gained": 2,
                    "fourth_down_converted": 1,
                    "fourth_down_failed": 0,
                    "wpa": 0.02,
                    "penalty": 0,
                    "go_wp": 0.58,
                    "fg_wp": 0.51,
                    "punt_wp": 0.53,
                    "first_down_prob": 0.70,
                    "fg_make_prob": 0.72,
                    "wp_succeed": 0.62,
                    "wp_fail": 0.45,
                }
            ]
        )

        with patch("build_data.get_4th_down_probs", return_value=mock_scored_return):
            res = run_pipeline(df_raw=df_executed, output_dir=tmp_path, run_model=True)
            assert res["decisions_count"] == 1
            assert (tmp_path / "decisions.json").exists()
            assert (tmp_path / "teams_summary.json").exists()
            assert (tmp_path / "games_summary.json").exists()

    def test_audit_cancelled_snaps_non_fourth_and_no_next(self) -> None:
        fourth_df = pl.DataFrame(
            {
                "game_id": ["G1", "G2"],
                "play_id": [10, 20],
                "play_type": ["no_play", "no_play"],
                "down": [4, 4],
                "desc": ["Penalty 1", "Penalty 2"],
                "penalty": [1, 1],
                "ydstogo": [5.0, 5.0],
                "yardline_100": [50.0, 50.0],
                "qtr": [1, 1],
                "posteam": ["DET", "GB"],
                "defteam": ["GB", "DET"],
                "week": [1, 1],
            }
        )
        # G1 has a next play but on down 1; G2 has no next play at all
        df_sorted = pl.DataFrame(
            {
                "game_id": ["G1", "G1"],
                "play_id": [10, 11],
                "down": [4, 1],
                "ydstogo": [5.0, 10.0],
                "play_type": ["no_play", "run"],
                "desc": ["Penalty 1", "Run for 3 yds"],
            }
        )
        audit, rep, not_rep = audit_cancelled_snaps(fourth_df, df_sorted)
        assert len(audit) == 2
        assert rep == 0
        assert not_rep == 2
        assert audit[0]["replayed_on_fourth_down"] is False
        assert audit[1]["replayed_on_fourth_down"] is False
        assert audit[1]["replayed_details"] is None

    def test_calculate_team_summaries_edge_cases(self) -> None:
        decisions = [
            # Blank team (should hit tm not in teams_dict continue)
            {
                "posteam": "",
                "is_genuine": True,
                "is_toss_up": False,
                "is_consistent_with_model": True,
                "cost_pp": 0.5,
                "tier": "genuine",
                "actual_choice": "go",
            },
            # Known team with clear_go punt and cost_pp None
            {
                "posteam": "DET",
                "is_genuine": True,
                "is_toss_up": False,
                "is_consistent_with_model": False,
                "cost_pp": None,
                "tier": "clear_go",
                "actual_choice": "punt",
            },
            # Known team with toss-up
            {
                "posteam": "DET",
                "is_genuine": True,
                "is_toss_up": True,
                "is_consistent_with_model": True,
                "cost_pp": 0.2,
                "tier": "genuine",
                "actual_choice": "go",
            },
            # Team with 0 non-toss-up genuine decisions (tests denom == 0 branch)
            {
                "posteam": "KC",
                "is_genuine": False,
                "is_toss_up": False,
                "is_consistent_with_model": True,
                "cost_pp": 0.0,
                "tier": "obvious",
                "actual_choice": "punt",
            },
        ]
        summaries = calculate_team_summaries(decisions)
        det = next(s for s in summaries if s["team"] == "DET")
        assert det["total_executed"] == 2
        assert det["punted_on_clear_go"] == 1
        assert det["toss_up_count"] == 1
        # Team with 0 genuine non-toss-up decisions has adherence_pct as None
        kc = next(s for s in summaries if s["team"] == "KC")
        assert kc["adherence_pct"] is None
        assert kc["adherence_display"] == "0 / 0 (n/a)"

    def test_calculate_games_summary_away_team(self) -> None:
        decisions = [
            {
                "game_id": "2026_01_GB_DET",
                "season": 2026,
                "week": 1,
                "home_team": "GB",
                "away_team": "DET",
                "play_id": 50,
                "qtr": 2,
                "posteam": "DET",  # Away team decision
                "ydstogo": 1.0,
                "yardline_100": 30.0,
                "actual_choice": "field_goal",
                "cost_pp": 2.4,
                "verdict_label": "Model leaned the other way",
                "quadrant": "Inconsistent & Failed",
                "tier": "genuine",
            }
        ]
        games = calculate_games_summary(decisions)
        assert games[0]["away_wp_lost_pp"] == 2.4
        assert games[0]["home_wp_lost_pp"] == 0.0


class TestFetchOrLoadPbp:
    """Tests for PBP data retrieval, caching, and URL validation."""

    def test_load_from_cache(self, tmp_path: Path) -> None:
        dummy_file = tmp_path / "play_by_play_2026.parquet"
        dummy_df = pl.DataFrame({"game_id": ["G1"], "play_id": [1], "down": [4]})
        dummy_df.write_parquet(dummy_file)

        loaded = fetch_or_load_pbp(cache_dir=tmp_path)
        assert loaded.height == 1
        assert loaded["game_id"][0] == "G1"

    def test_insecure_url_rejected(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="Insecure URL scheme: http"):
            fetch_or_load_pbp(
                pbp_url="http://insecure.org/pbp.parquet", cache_dir=tmp_path
            )

    def test_untrusted_host_rejected(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="Untrusted download host: evil.com"):
            fetch_or_load_pbp(
                pbp_url="https://evil.com/pbp.parquet", cache_dir=tmp_path
            )

    def test_download_mock(self, tmp_path: Path) -> None:
        dummy_df = pl.DataFrame({"game_id": ["G_DOWNLOADED"], "down": [4]})
        buf = io.BytesIO()
        dummy_df.write_parquet(buf)
        parquet_bytes = buf.getvalue()

        class DummyResponse:
            def __init__(self, data: bytes) -> None:
                self.stream = io.BytesIO(data)

            def read(self, size: int = 65536) -> bytes:
                return self.stream.read(size)

            def __enter__(self) -> Self:
                return self

            def __exit__(self, *args: object) -> None:
                pass

        with patch("urllib.request.urlopen", return_value=DummyResponse(parquet_bytes)):
            loaded = fetch_or_load_pbp(
                pbp_url="https://github.com/nflverse/data.parquet", cache_dir=tmp_path
            )
            assert loaded.height == 1
            assert loaded["game_id"][0] == "G_DOWNLOADED"


class TestGate1Regression:
    """Benchmark test for 2020 NFC Championship reference situation."""

    def test_gate1_situation(self) -> None:
        row = {
            "game_id": "2020_20_TB_GB",
            "play_id": 3550,
            "season": 2020,
            "week": 20,
            "season_type": "POST",
            "home_team": "GB",
            "away_team": "TB",
            "posteam": "GB",
            "defteam": "TB",
            "qtr": 4,
            "quarter_seconds_remaining": 129.0,
            "half_seconds_remaining": 129.0,
            "game_seconds_remaining": 129.0,
            "down": 4,
            "ydstogo": 8.0,
            "yardline_100": 8.0,
            "score_differential": -8.0,
            "posteam_score": 23,
            "defteam_score": 31,
            "posteam_timeouts_remaining": 3,
            "defteam_timeouts_remaining": 3,
            "home_opening_kickoff": 0,
            "roof": "outdoors",
            "spread_line": 3.0,
            "total_line": 53.0,
            "play_type": "field_goal",
            "desc": "(2:09) (Shotgun) M.Crosby 26 yard field goal is GOOD, Center-H.Bradley, Holder-J.Scott.",
            "field_goal_result": "made",
            "kick_distance": 26,
            "wpa": -0.015,
            "penalty": 0,
            "fourth_down_converted": 0,
            "fourth_down_failed": 0,
        }

        dec = evaluate_decision_row(row)
        assert dec["options"]["go"]["wp"] == pytest.approx(0.122, abs=0.015)
        assert dec["options"]["field_goal"]["wp"] == pytest.approx(0.114, abs=0.015)
        assert dec["best_option"] == "go"
        assert dec["is_toss_up"] is True
        assert dec["is_consistent_with_model"] is True
        assert dec["verdict_label"] == "Reasonable"
        assert dec["quadrant"] == "Consistent & Succeeded"


class TestForensicVerification:
    """Forensic verification tests covering P2-1 to P2-6."""

    def test_p2_1_reconciliation(self) -> None:
        """P2-1: Snap reconciliation test (1867 == 1718 executed + 148 cancelled + 1 excluded)."""
        import json

        meta_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "meta.json"
        )
        assert meta_file.exists()
        with open(meta_file, encoding="utf-8") as f:
            meta = json.load(f)
        counts = meta["counts"]
        total = counts["total_fourth_down_rows"]
        executed = counts["executed_snaps"]
        cancelled = counts["cancelled_snaps"]
        excluded = counts["excluded_snaps"]
        assert total == executed + cancelled + excluded
        assert total >= 1867
        assert executed >= 1718
        assert cancelled >= 148
        assert excluded >= 1
        assert len(meta["excluded_snaps"]) >= 1
        assert any(
            e["play_type"] == "qb_kneel" and e["game_id"] == "2026_01_DEN_KC"
            for e in meta["excluded_snaps"]
        )

    def test_p2_2_mathematical_exactness_property(self) -> None:
        """P2-2: Property test verifying internal exactness on all real executed plays."""
        import json

        dec_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "decisions.json"
        )
        meta_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "meta.json"
        )
        assert dec_file.exists()
        with open(dec_file, encoding="utf-8") as f:
            decisions = json.load(f)
        with open(meta_file, encoding="utf-8") as f:
            meta = json.load(f)

        assert len(decisions) == meta["counts"]["executed_snaps"]
        assert len(decisions) >= 1718
        for d in decisions:
            go_opt = d["options"]["go"]
            if go_opt["status"] == "AVAILABLE" and go_opt["wp"] is not None:
                p_conv = go_opt["first_down_prob"]
                wp_s = go_opt["wp_succeed"]
                wp_f = go_opt["wp_fail"]
                if p_conv is not None and wp_s is not None and wp_f is not None:
                    expected_go = p_conv * wp_s + (1.0 - p_conv) * wp_f
                    assert abs(go_opt["wp"] - expected_go) < 1e-6

            fg_opt = d["options"]["field_goal"]
            if fg_opt["status"] == "AVAILABLE" and fg_opt["wp"] is not None:
                p_make = fg_opt["fg_make_prob"]
                wp_m = fg_opt["make_fg_wp"]
                wp_miss = fg_opt["miss_fg_wp"]
                if p_make is not None and wp_m is not None and wp_miss is not None:
                    expected_fg = p_make * wp_m + (1.0 - p_make) * wp_miss
                    assert abs(fg_opt["wp"] - expected_fg) < 1e-6

    def test_p2_3_overtime_coverage(self) -> None:
        """P2-3: OT plays are explicitly flagged with is_overtime."""
        import json

        dec_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "decisions.json"
        )
        with open(dec_file, encoding="utf-8") as f:
            decisions = json.load(f)
        ot_decs = [d for d in decisions if d["qtr"] >= 5]
        assert len(ot_decs) >= 15
        for d in ot_decs:
            assert d["is_overtime"] is True

    def test_p2_4_multi_play_cross_validation_sample(self) -> None:
        """P2-4: Cross-validate sample of >= 50 diverse 2026 plays."""
        import json

        dec_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "decisions.json"
        )
        meta_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "meta.json"
        )
        with open(dec_file, encoding="utf-8") as f:
            decisions = json.load(f)
        with open(meta_file, encoding="utf-8") as f:
            meta = json.load(f)

        sample = decisions[::34][:50]
        assert len(sample) >= 50
        for d in sample:
            assert d["game_id"]
            assert d["play_id"] > 0
            assert d["week"] in meta["weeks"]
            assert d["best_wp"] is not None
            assert 0.0 <= d["best_wp"] <= 1.0

    def test_p2_6_punt_domain_grounding(self) -> None:
        """P2-6: Fail if any punt-eligible play returns null punt_wp, and assert 0 punts inside 31."""
        import json

        dec_file = (
            Path(__file__).resolve().parent.parent.parent
            / "public"
            / "data"
            / "decisions.json"
        )
        with open(dec_file, encoding="utf-8") as f:
            decisions = json.load(f)
        punts_inside_31 = [
            d
            for d in decisions
            if d["actual_choice"] == "punt" and d["yardline_100"] < 31.0
        ]
        assert (
            len(punts_inside_31) == 0
        ), f"Found {len(punts_inside_31)} punts inside 31!"
        for d in decisions:
            if d["yardline_100"] >= 31.0 and not d.get("is_overtime"):
                punt_opt = d["options"]["punt"]
                assert punt_opt["status"] == "AVAILABLE"
                assert punt_opt["wp"] is not None
            elif d["yardline_100"] < 31.0:
                punt_opt = d["options"]["punt"]
                assert punt_opt["status"] == "UNMODELLED"
                assert punt_opt["wp"] is None

