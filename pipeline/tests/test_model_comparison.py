"""Unit and regression tests for the model comparison layer build.

The comparison layer classifies REFERENCE (nfl4th dev rebuild) win
probabilities with the site's own verdict rules, so these tests pin both the
classification contract and the end-to-end reproduction against the committed
data files.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Add pipeline dir to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build_model_comparison import (
    VERDICT_LEANED,
    VERDICT_REASONABLE,
    VERDICT_STRONGLY,
    build_comparison,
    classify_reference_verdict,
)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"


class TestClassifyReferenceVerdict:
    """Verdict rules must mirror model_engine thresholds exactly."""

    def test_reasonable_within_1pp(self) -> None:
        verdict, cost, pref = classify_reference_verdict(
            go_wp=0.50, fg_wp=0.505, punt_wp=0.49, yardline_100=50.0, actual_choice="go"
        )
        assert verdict == VERDICT_REASONABLE
        assert cost is not None and cost <= 1.0 + 1e-9
        assert "go" in pref

    def test_leaned_band(self) -> None:
        verdict, cost, _ = classify_reference_verdict(
            go_wp=0.50, fg_wp=0.52, punt_wp=0.48, yardline_100=50.0, actual_choice="go"
        )
        assert verdict == VERDICT_LEANED
        assert cost is not None and 1.0 < cost <= 3.0

    def test_strongly_preferred_band(self) -> None:
        verdict, cost, _ = classify_reference_verdict(
            go_wp=0.45,
            fg_wp=0.55,
            punt_wp=0.40,
            yardline_100=50.0,
            actual_choice="punt",
        )
        assert verdict == VERDICT_STRONGLY
        assert cost is not None and cost > 3.0

    def test_punt_unmodelled_inside_31(self) -> None:
        """Inside the opponent 31 the punt is excluded from the feasible set,
        exactly like the primary pipeline (PUNT_MIN_YARDLINE grounding)."""
        verdict, _, pref = classify_reference_verdict(
            go_wp=0.60, fg_wp=0.62, punt_wp=0.30, yardline_100=25.0, actual_choice="go"
        )
        # fg beats go by 2.0 pp with punt excluded from the feasible set
        assert verdict == VERDICT_LEANED
        assert "punt" not in pref

    def test_punt_modelled_at_31(self) -> None:
        _, _, pref = classify_reference_verdict(
            go_wp=0.40,
            fg_wp=0.35,
            punt_wp=0.45,
            yardline_100=31.0,
            actual_choice="punt",
        )
        assert "punt" in pref

    def test_actual_choice_unmodelled_returns_none(self) -> None:
        verdict, cost, pref = classify_reference_verdict(
            go_wp=0.50,
            fg_wp=0.55,
            punt_wp=None,
            yardline_100=20.0,
            actual_choice="punt",
        )
        assert verdict is None and cost is None and pref == []

    def test_nan_inputs_are_missing(self) -> None:
        verdict, _, _ = classify_reference_verdict(
            go_wp=float("nan"),
            fg_wp=0.55,
            punt_wp=0.40,
            yardline_100=50.0,
            actual_choice="go",
        )
        assert verdict is None

    def test_toss_up_preferred_set(self) -> None:
        verdict, _, pref = classify_reference_verdict(
            go_wp=0.505,
            fg_wp=0.50,
            punt_wp=0.40,
            yardline_100=50.0,
            actual_choice="field_goal",
        )
        assert verdict == VERDICT_REASONABLE
        assert set(pref) == {"go", "field_goal"}


class TestCommittedComparisonArtifact:
    """Regression: the committed comparison JSON must be internally consistent
    with the committed decisions data it describes."""

    @classmethod
    def setup_class(cls) -> None:
        cls.comparison = json.loads((DATA_DIR / "model_comparison.json").read_text())
        cls.decisions = json.loads((DATA_DIR / "decisions.json").read_text())
        cls.plays = {(p["game_id"], p["play_id"]): p for p in cls.comparison["plays"]}

    def test_provenance_fields_present(self) -> None:
        ref = self.comparison["reference"]
        assert ref["stage"] == "development"
        assert ref["snapshot"] and ref["snapshot"] != "unknown"
        assert ref["source_url"].startswith("https://github.com/nflverse/nfl4th")
        assert len(ref["sha256"]) == 64
        assert ref["cran_released_version"]

    def test_summary_counts_reconcile(self) -> None:
        s = self.comparison["summary"]
        assert s["decisions_total"] == len(self.decisions)
        assert s["matched"] == len(self.comparison["plays"])
        assert s["matched"] == s["matched_regulation"] + s["matched_overtime"]
        assert (
            s["matched"] + s["fdl_only_not_scored_by_reference"] == s["decisions_total"]
        )

    def test_every_play_joins_a_decision(self) -> None:
        decision_keys = {(d["game_id"], d["play_id"]) for d in self.decisions}
        for key in self.plays:
            assert key in decision_keys

    def test_reference_verdicts_reproduce_from_reference_wps(self) -> None:
        """Stored ref_verdict must equal classify_reference_verdict applied to
        the stored reference WPs under the same yardline rule."""
        mismatches = 0
        for d in self.decisions:
            p = self.plays.get((d["game_id"], d["play_id"]))
            if p is None:
                continue
            verdict, _, _ = classify_reference_verdict(
                p["ref_go_wp"],
                p["ref_fg_wp"],
                p["ref_punt_wp"],
                float(d["yardline_100"]),
                d["actual_choice"],
            )
            # rounding to stored precision can nudge boundary costs; compare labels only
            if verdict != p["ref_verdict"]:
                mismatches += 1
        assert mismatches == 0

    def test_verdict_change_count_reproduces(self) -> None:
        flips = 0
        for d in self.decisions:
            if d.get("is_overtime") or int(d["qtr"]) >= 5:
                continue
            p = self.plays.get((d["game_id"], d["play_id"]))
            if (
                p is not None
                and p["ref_verdict"] is not None
                and p["ref_verdict"] != d["verdict_label"]
            ):
                flips += 1
        assert flips == self.comparison["summary"]["verdict_changes_regulation"]

    def test_build_comparison_minimal_synthetic(self) -> None:
        decisions = [
            {
                "game_id": "2026_01_A_B",
                "play_id": 1,
                "qtr": 2,
                "yardline_100": 45.0,
                "actual_choice": "punt",
                "verdict_label": VERDICT_REASONABLE,
                "is_overtime": False,
                "go_boost": -0.02,
            },
            {
                "game_id": "2026_01_A_B",
                "play_id": 2,
                "qtr": 5,
                "yardline_100": 45.0,
                "actual_choice": "go",
                "verdict_label": VERDICT_REASONABLE,
                "is_overtime": True,
                "go_boost": 0.01,
            },
        ]
        ref_rows = {
            ("2026_01_A_B", 1): {
                "go_wp": 0.50,
                "fg_wp": 0.40,
                "punt_wp": 0.45,
                "go_boost": 2.5,
                "boot_pct": 90.0,
            },
            # play 2 deliberately absent from reference
        }
        out = build_comparison(
            decisions,
            ref_rows,
            sha256="x" * 64,
            snapshot="test",
            primary_model="test-model",
        )
        s = out["summary"]
        assert s["decisions_total"] == 2
        assert s["matched"] == 1
        assert s["matched_regulation"] == 1
        assert s["matched_overtime"] == 0
        assert s["fdl_only_not_scored_by_reference"] == 1
        play = out["plays"][0]
        # ref cost: best 0.50 (go) vs punt 0.45 -> 5.0 pp -> strongly preferred
        assert play["ref_verdict"] == VERDICT_STRONGLY
        assert play["ref_go_boost_pp"] == 2.5
        assert s["verdict_changes_regulation"] == 1
