"""Unit and regression tests for Fourth Down Lab data pipeline and model engine."""

import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from model_engine import (
    CLEAR_GO_GAP_PP,
    GENUINE_GAP_PP,
    LOW_MAKE_PROB_THRESHOLD,
    TOSS_UP_PP,
    evaluate_decision_row,
    process_scored_row,
)


def create_mock_scored_row(
    yardline_100=50.0,
    ydstogo=2.0,
    play_type="run",
    go_wp=0.55,
    fg_wp=0.50,
    punt_wp=0.52,
    first_down_prob=0.60,
    fg_make_prob=0.75,
    wp_succeed=0.62,
    wp_fail=0.45,
    wpa=0.03,
    penalty=0,
    game_sec=1800.0,
    qtr=2,
    fourth_down_converted=1,
    fourth_down_failed=0,
    yards_gained=3,
):
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


class TestOptionStatusRules:
    """Tests for option status rules and reason codes."""

    def test_ordinary_fourth_down_statuses(self):
        row = create_mock_scored_row(yardline_100=50.0)
        dec = process_scored_row(row)
        assert dec["options"]["go"]["status"] == "AVAILABLE"
        assert dec["options"]["field_goal"]["status"] == "AVAILABLE"
        assert dec["options"]["punt"]["status"] == "AVAILABLE"

    def test_punt_inside_31_is_unmodelled(self):
        row = create_mock_scored_row(yardline_100=15.0, punt_wp=float("nan"))
        dec = process_scored_row(row)
        assert dec["options"]["punt"]["status"] == "UNMODELLED"
        assert "not viable punt territory" in dec["options"]["punt"]["reason"]
        # Comparison remains complete because punt is not feasible inside 31
        assert dec["is_complete_comparison"] is True

    def test_low_make_probability_flag(self):
        # 60-yard FG with 0.08 make probability
        row = create_mock_scored_row(yardline_100=42.0, fg_make_prob=0.08)
        dec = process_scored_row(row)
        assert dec["options"]["field_goal"]["low_make_probability"] is True
        assert dec["options"]["field_goal"]["status"] == "AVAILABLE"

    def test_unsupported_clock_context(self):
        row = create_mock_scored_row(game_sec=-5.0)
        dec = process_scored_row(row)
        assert dec["options"]["go"]["status"] == "UNSUPPORTED"
        assert dec["is_complete_comparison"] is False

    def test_model_failure_raises(self):
        # If go_wp is missing on ordinary play, must raise model failure
        row = create_mock_scored_row(go_wp=float("nan"))
        with pytest.raises(ValueError, match="MODEL FAILURE"):
            process_scored_row(row)


class TestVerdictAndBoundaries:
    """Tests tolerance, toss-ups, ties, and exact boundary behaviour."""

    def test_toss_up_within_1pp(self):
        # go_wp = 0.505, fg_wp = 0.500 (diff 0.5 pp <= 1.0 pp)
        row = create_mock_scored_row(
            yardline_100=20.0,
            go_wp=0.505,
            fg_wp=0.500,
            punt_wp=float("nan"),
            play_type="field_goal"
        )
        dec = process_scored_row(row)
        assert dec["is_toss_up"] is True
        assert "go" in dec["preferred_options"]
        assert "field_goal" in dec["preferred_options"]
        assert dec["is_consistent_with_model"] is True
        assert dec["verdict_label"] == "Reasonable"

    def test_exact_tie(self):
        row = create_mock_scored_row(
            yardline_100=20.0,
            go_wp=0.500,
            fg_wp=0.500,
            punt_wp=float("nan"),
            play_type="run"
        )
        dec = process_scored_row(row)
        assert dec["is_toss_up"] is True
        assert len(dec["preferred_options"]) == 2
        assert dec["cost_pp"] == pytest.approx(0.0)
        assert dec["verdict_label"] == "Reasonable"

    def test_cost_boundary_1pp(self):
        # Case 1: unrounded cost = 0.96 pp (displayed as 1.0) -> Reasonable
        row_under = create_mock_scored_row(
            yardline_100=20.0,
            go_wp=0.5096,
            fg_wp=0.5000,
            punt_wp=float("nan"),
            play_type="field_goal"
        )
        dec_under = process_scored_row(row_under)
        assert dec_under["display_cost_pp"] == 1.0
        assert dec_under["verdict_label"] == "Reasonable"
        assert dec_under["is_near_boundary"] is True

        # Case 2: unrounded cost = 1.04 pp (displayed as 1.0) -> Model leaned the other way
        row_over = create_mock_scored_row(
            yardline_100=20.0,
            go_wp=0.5104,
            fg_wp=0.5000,
            punt_wp=float("nan"),
            play_type="field_goal"
        )
        dec_over = process_scored_row(row_over)
        assert dec_over["display_cost_pp"] == 1.0
        assert dec_over["verdict_label"] == "Model leaned the other way"
        assert dec_over["is_near_boundary"] is True

    def test_cost_boundary_3pp(self):
        # Case 1: unrounded cost = 2.96 pp (displayed as 3.0) -> Model leaned the other way
        row_under = create_mock_scored_row(
            yardline_100=20.0,
            go_wp=0.5296,
            fg_wp=0.5000,
            punt_wp=float("nan"),
            play_type="field_goal"
        )
        dec_under = process_scored_row(row_under)
        assert dec_under["display_cost_pp"] == 3.0
        assert dec_under["verdict_label"] == "Model leaned the other way"
        assert dec_under["is_near_boundary"] is True

        # Case 2: unrounded cost = 3.04 pp (displayed as 3.0) -> Model strongly preferred
        row_over = create_mock_scored_row(
            yardline_100=20.0,
            go_wp=0.5304,
            fg_wp=0.5000,
            punt_wp=float("nan"),
            play_type="field_goal"
        )
        dec_over = process_scored_row(row_over)
        assert dec_over["display_cost_pp"] == 3.0
        assert dec_over["verdict_label"] == "Model strongly preferred another option"
        assert dec_over["is_near_boundary"] is True


class TestDecisionTiers:
    """Tests the genuine vs obvious decision classification."""

    def test_clear_go_tier(self):
        # go beats alternative by 5.0 pp
        row = create_mock_scored_row(
            yardline_100=40.0,
            go_wp=0.60,
            fg_wp=0.55,
            punt_wp=0.50,
            play_type="pass"
        )
        dec = process_scored_row(row)
        assert dec["tier"] == "clear_go"
        assert dec["is_genuine"] is True

    def test_genuine_tier(self):
        # go trails best by 2.0 pp (within 3.0 pp)
        row = create_mock_scored_row(
            yardline_100=40.0,
            go_wp=0.50,
            fg_wp=0.52,
            punt_wp=0.48,
            play_type="field_goal"
        )
        dec = process_scored_row(row)
        assert dec["tier"] == "genuine"
        assert dec["is_genuine"] is True

    def test_obvious_tier(self):
        # 4th & 20 from own 10: go_wp trails punt by 15 pp
        row = create_mock_scored_row(
            yardline_100=90.0,
            go_wp=0.20,
            fg_wp=0.05,
            punt_wp=0.35,
            play_type="punt"
        )
        dec = process_scored_row(row)
        assert dec["tier"] == "obvious"
        assert dec["is_genuine"] is False


class TestHonest2x2Separation:
    """Tests that good calls that fail and bad calls that succeed are judged honestly."""

    def test_good_call_failed(self):
        # Model prefers go, team went for it, but failed
        row = create_mock_scored_row(
            yardline_100=30.0,
            go_wp=0.55,
            fg_wp=0.50,
            punt_wp=float("nan"),
            play_type="run",
            fourth_down_converted=0,
            fourth_down_failed=1,
            yards_gained=0
        )
        dec = process_scored_row(row)
        assert dec["is_consistent_with_model"] is True
        assert dec["play_succeeded"] is False
        assert dec["quadrant"] == "Consistent & Failed"
        # Never call it a mistake
        assert "mistake" not in dec["verdict_label"].lower()
        assert "blunder" not in dec["verdict_label"].lower()

    def test_bad_call_succeeded(self):
        # Model strongly preferred FG, team went for it and converted
        row = create_mock_scored_row(
            yardline_100=25.0,
            go_wp=0.40,
            fg_wp=0.52,
            punt_wp=float("nan"),
            play_type="pass",
            fourth_down_converted=1,
            fourth_down_failed=0,
            yards_gained=10
        )
        dec = process_scored_row(row)
        assert dec["is_consistent_with_model"] is False
        assert dec["play_succeeded"] is True
        assert dec["quadrant"] == "Against Model & Succeeded"
        assert dec["verdict_label"] == "Model strongly preferred another option"


class TestGate1Regression:
    """Regression test for the 2020 NFC Championship published benchmark."""

    def test_gate1_situation(self):
        row = {
            "game_id": "2020_20_TB_GB",
            "play_id": 3728,
            "season": 2020,
            "week": 20,
            "season_type": "POST",
            "home_team": "GB",
            "away_team": "TB",
            "posteam": "GB",
            "defteam": "TB",
            "roof": "outdoors",
            "qtr": 4,
            "quarter_seconds_remaining": 129.0,
            "half_seconds_remaining": 129.0,
            "game_seconds_remaining": 129.0,
            "down": 4,
            "ydstogo": 8.0,
            "yardline_100": 8.0,
            "score_differential": -8.0,
            "posteam_timeouts_remaining": 3.0,
            "defteam_timeouts_remaining": 3.0,
            "home_opening_kickoff": 0.0,
            "spread_line": 3.0,
            "total_line": 53.0,
            "play_type": "field_goal",
            "desc": "(2:09) 2-M.Crosby 26 yard field goal is GOOD.",
            "field_goal_result": "made",
            "kick_distance": 26,
            "wpa": -0.007,
            "penalty": 0,
        }
        dec = evaluate_decision_row(row)
        assert dec["options"]["go"]["wp"] == pytest.approx(0.122, abs=0.015)
        assert dec["options"]["field_goal"]["wp"] == pytest.approx(0.114, abs=0.015)
        assert dec["best_option"] == "go"
        # In this updated model, go_boost is 0.79 pp, which is <= TOSS_UP_PP (1.0 pp)
        # So field_goal is in the preferred set (toss-up), making actual choice consistent (cost <= 1.0 is Reasonable)
        assert dec["is_toss_up"] is True
        assert dec["is_consistent_with_model"] is True
        assert dec["verdict_label"] == "Reasonable"
        assert dec["quadrant"] == "Consistent & Succeeded"  # kick was good
