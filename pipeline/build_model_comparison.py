"""Fourth Down Lab - Model Comparison Layer Build Script.

Builds a static comparison file between the site's published decision surface
(produced by the RELEASED nfl4th models via the sportsdataverse port) and the
reference output of nfl4th's DEVELOPMENT rebuild (master branch), which the
nflverse project publishes daily as precomputed go-boost numbers.

Design rules:
- The comparison never replaces published verdicts. It is a labelled,
  side-by-side reference layer.
- The reference is development-stage: CRAN's released nfl4th still ships the
  older models. The JSON records snapshot, source URL and sha256 so the UI can
  present provenance honestly.
- Reference verdicts are computed with the EXACT classification rules of the
  site's own model engine (same feasible-set rule, same 1.0 pp toss-up band,
  same cost thresholds), so a verdict difference reflects model output
  differences, not classification drift.
"""

from __future__ import annotations

import hashlib
import json
import math
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyreadr  # type: ignore[import-untyped]
from model_engine import PUNT_MIN_YARDLINE, TOSS_UP_PP

REF_BASE = "https://github.com/nflverse/nfl4th/releases/download/nfl4th_infrastructure"
REF_RDS_URL = f"{REF_BASE}/pre_computed_go_boost_2026.rds"
REF_TIMESTAMP_URL = f"{REF_BASE}/timestamp.json"
REF_RELEASE_PAGE = (
    "https://github.com/nflverse/nfl4th/releases/tag/nfl4th_infrastructure"
)
REF_NEWS_URL = "https://github.com/nflverse/nfl4th/blob/master/NEWS.md"
CRAN_RELEASED_VERSION = "1.0.7"

CACHE_DIR = Path(__file__).resolve().parent.parent / "scratch"
DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
OUTPUT_PATH = DATA_DIR / "model_comparison.json"

VERDICT_REASONABLE = "Reasonable"
VERDICT_LEANED = "Model leaned the other way"
VERDICT_STRONGLY = "Model strongly preferred another option"


def _validated_https_get(url: str, timeout: int = 60) -> bytes:
    """Downloads a URL after strict scheme/host validation (mirrors build_data)."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Insecure URL scheme: {parsed.scheme}")
    if not (
        parsed.netloc.endswith("github.com")
        or parsed.netloc.endswith("githubusercontent.com")
    ):
        raise ValueError(f"Untrusted download host: {parsed.netloc}")
    req = urllib.request.Request(url, headers={"User-Agent": "FourthDownLab/1.0"})
    # Scheme and domain verified above via urllib.parse
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec B310
        return resp.read()


def fetch_reference(cache_dir: Path = CACHE_DIR) -> tuple[Path, str, str]:
    """Downloads (or loads cached) reference RDS + timestamp; returns path, sha256, snapshot."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    local_rds = cache_dir / "pre_computed_go_boost_2026.rds"
    rds_bytes = _validated_https_get(REF_RDS_URL)
    local_rds.write_bytes(rds_bytes)
    sha256 = hashlib.sha256(rds_bytes).hexdigest()
    try:
        ts_payload = json.loads(_validated_https_get(REF_TIMESTAMP_URL, timeout=30))
        snapshot = str(ts_payload.get("last_updated", "unknown"))
    except (OSError, ValueError):
        snapshot = "unknown"
    return local_rds, sha256, snapshot


def _is_missing(val: Any) -> bool:
    """None or NaN check for optional numeric model outputs."""
    if val is None:
        return True
    try:
        return math.isnan(float(val))
    except (TypeError, ValueError):
        return False


def classify_reference_verdict(
    go_wp: Any,
    fg_wp: Any,
    punt_wp: Any,
    yardline_100: float,
    actual_choice: str,
) -> tuple[str | None, float | None, list[str]]:
    """Classifies a decision from REFERENCE win probabilities using the site's
    own verdict rules (model_engine thresholds).

    Feasible set mirrors the site pipeline: go + field goal, plus punt iff
    yardline_100 >= PUNT_MIN_YARDLINE with modelled punt WP.
    Returns (verdict_label, cost_pp, preferred_options); verdict None when the
    actual choice is unmodelled in the reference output.
    """
    wps: dict[str, float] = {}
    if not _is_missing(go_wp):
        wps["go"] = float(go_wp)
    if not _is_missing(fg_wp):
        wps["field_goal"] = float(fg_wp)
    if yardline_100 >= PUNT_MIN_YARDLINE and not _is_missing(punt_wp):
        wps["punt"] = float(punt_wp)
    if not wps or actual_choice not in wps:
        return None, None, []
    best_wp = max(wps.values())
    preferred = sorted(
        name for name, wp in wps.items() if (best_wp - wp) * 100.0 <= TOSS_UP_PP + 1e-9
    )
    cost_pp = (best_wp - wps[actual_choice]) * 100.0
    if cost_pp <= 1.0 + 1e-9:
        verdict = VERDICT_REASONABLE
    elif cost_pp <= 3.0 + 1e-9:
        verdict = VERDICT_LEANED
    else:
        verdict = VERDICT_STRONGLY
    return verdict, cost_pp, preferred


def _round_or_none(val: Any, digits: int) -> float | None:
    if _is_missing(val):
        return None
    return round(float(val), digits)


def build_comparison(
    decisions: list[dict[str, Any]],
    ref_rows: dict[tuple[str, int], dict[str, Any]],
    *,
    sha256: str,
    snapshot: str,
    primary_model: str,
) -> dict[str, Any]:
    """Joins published decisions to reference rows and builds the output object."""
    plays: list[dict[str, Any]] = []
    matched_regulation = 0
    matched_overtime = 0
    flips_regulation = 0
    flips_overtime = 0
    go_rec_primary = 0
    go_rec_reference = 0

    for d in decisions:
        key = (d["game_id"], int(d["play_id"]))
        ref = ref_rows.get(key)
        if ref is None:
            continue  # e.g. final-seconds plays nfl4th deliberately does not score
        verdict, cost_pp, preferred = classify_reference_verdict(
            ref.get("go_wp"),
            ref.get("fg_wp"),
            ref.get("punt_wp"),
            float(d["yardline_100"]),
            d["actual_choice"],
        )
        is_ot = bool(d.get("is_overtime")) or int(d["qtr"]) >= 5
        if is_ot:
            matched_overtime += 1
        else:
            matched_regulation += 1
            if d.get("go_boost") is not None and float(d["go_boost"]) > 0:
                go_rec_primary += 1
            if not _is_missing(ref.get("go_boost")) and float(ref["go_boost"]) > 0:
                go_rec_reference += 1
        if verdict is not None and verdict != d.get("verdict_label"):
            if is_ot:
                flips_overtime += 1
            else:
                flips_regulation += 1
        plays.append(
            {
                "game_id": d["game_id"],
                "play_id": int(d["play_id"]),
                # nfl4th's go_boost is already expressed in percentage points
                "ref_go_boost_pp": _round_or_none(ref.get("go_boost"), 2),
                "ref_go_wp": _round_or_none(ref.get("go_wp"), 6),
                "ref_punt_wp": _round_or_none(ref.get("punt_wp"), 6),
                "ref_fg_wp": _round_or_none(ref.get("fg_wp"), 6),
                "boot_pct": _round_or_none(ref.get("boot_pct"), 1),
                "ref_verdict": verdict,
                "ref_cost_pp": _round_or_none(cost_pp, 2),
                "ref_preferred": preferred,
            }
        )

    matched = len(plays)
    decisions_total = len(decisions)
    summary = {
        "decisions_total": decisions_total,
        "matched": matched,
        "matched_regulation": matched_regulation,
        "matched_overtime": matched_overtime,
        "fdl_only_not_scored_by_reference": decisions_total - matched,
        "reference_only_rows": len(ref_rows) - matched,
        "verdict_changes_regulation": flips_regulation,
        "verdict_changes_overtime": flips_overtime,
        "verdict_change_pct_regulation": (
            round(100.0 * flips_regulation / matched_regulation, 1)
            if matched_regulation
            else None
        ),
        "go_recommendation_pct_primary": (
            round(100.0 * go_rec_primary / matched_regulation, 1)
            if matched_regulation
            else None
        ),
        "go_recommendation_pct_reference": (
            round(100.0 * go_rec_reference / matched_regulation, 1)
            if matched_regulation
            else None
        ),
    }
    return {
        "generated_at_utc": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "primary_model": primary_model,
        "reference": {
            "name": "nfl4th development rebuild (master branch)",
            "stage": "development",
            "snapshot": snapshot,
            "source_url": REF_RELEASE_PAGE,
            "news_url": REF_NEWS_URL,
            "sha256": sha256,
            "cran_released_version": CRAN_RELEASED_VERSION,
        },
        "summary": summary,
        "plays": plays,
    }


def load_reference_rows(rds_path: Path) -> dict[tuple[str, int], dict[str, Any]]:
    """Reads the reference RDS into a {(game_id, play_id): row} mapping."""
    parsed = pyreadr.read_r(str(rds_path))
    df = next(iter(parsed.values()))
    rows: dict[tuple[str, int], dict[str, Any]] = {}
    for record in df.to_dict(orient="records"):
        rows[(str(record["game_id"]), int(record["play_id"]))] = record
    return rows


def run(output_path: Path = OUTPUT_PATH, data_dir: Path = DATA_DIR) -> dict[str, Any]:
    """Full build: fetch reference, join with committed decisions, write JSON."""
    decisions = json.loads((data_dir / "decisions.json").read_text())
    meta = json.loads((data_dir / "meta.json").read_text())
    rds_path, sha256, snapshot = fetch_reference()
    ref_rows = load_reference_rows(rds_path)
    result = build_comparison(
        decisions,
        ref_rows,
        sha256=sha256,
        snapshot=snapshot,
        primary_model=str(meta.get("model_version", "unknown")),
    )
    output_path.write_text(json.dumps(result, separators=(",", ":")))
    s = result["summary"]
    print(
        "Model comparison written:",
        f"{s['matched']} matched of {s['decisions_total']} decisions",
        f"({s['verdict_changes_regulation']} regulation verdict changes,",
        f"{s['verdict_change_pct_regulation']}%).",
    )
    return result


if __name__ == "__main__":
    run()
