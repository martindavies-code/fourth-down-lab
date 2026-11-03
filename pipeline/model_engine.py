"""Fourth Down Lab - Core Decision Model Engine.

Implements the official nfl4th decision surface via sportsdataverse,
strictly applying:
- Expected win probability comparison (WP) from pre-snap baseline.
- Option status rules: AVAILABLE, UNMODELLED, UNSUPPORTED, MODEL_FAILURE.
- Feasible option handling: inside opponent 31-yard line, punting is unmodelled
  as it is not a viable option in modern NFL play.
- Toss-up and tie handling: TOSS_UP_PP = 1.0 percentage point.
- Unrounded cost boundaries: <= 1.0 (Reasonable), (1.0, 3.0] (Model leaned), > 3.0 (Model strongly preferred).
- Honest 2x2 separation between pre-snap decision and post-snap outcome.
"""

from __future__ import annotations

import math
from typing import Any

# External package sportsdataverse does not supply inline type stubs
from sportsdataverse.nfl.nfl_fourth_down import get_4th_down_probs  # type: ignore[import-untyped]

# Core constants
TOSS_UP_PP: float = 1.0
GENUINE_GAP_PP: float = 3.0
CLEAR_GO_GAP_PP: float = 3.0
LOW_MAKE_PROB_THRESHOLD: float = 0.10
PUNT_MIN_YARDLINE: float = 31.0  # inside opponent 31, punting is unmodelled in nfl4th empirical table (0 punts in 2026 dataset)
EPS: float = (
    1e-9  # numerical precision tolerance to prevent floating point boundary noise
)


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Safely converts a value to float, converting NaN/None to default."""
    if val is None:
        return default
    try:
        fval = float(val)
        return default if math.isnan(fval) else fval
    except (ValueError, TypeError):
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    """Safely converts a value to int, converting NaN/None to default."""
    if val is None:
        return default
    try:
        fval = float(val)
        return default if math.isnan(fval) else int(fval)
    except (ValueError, TypeError):
        return default


def evaluate_decision_row(row_dict: dict[str, Any]) -> dict[str, Any]:
    """Pure function evaluating a single fourth-down situation.

    Suitable for single-play execution, tests, and future live streaming feeds.
    """
    import pandas as pd  # type: ignore[import-untyped] # Local import avoids top-level pandas stub dependency

    df = pd.DataFrame([row_dict])
    scored_df = get_4th_down_probs(df)
    return process_scored_row(scored_df.iloc[0].to_dict())


def process_scored_row(row: dict[str, Any]) -> dict[str, Any]:
    """Applies option status rules, verdict thresholds, cost calculations,

    and the 2x2 decision-vs-outcome classification to a model-scored row.
    """
    yl = _safe_float(row.get("yardline_100"), 50.0)
    qtr = _safe_int(row.get("qtr"), 1)
    game_sec = _safe_float(row.get("game_seconds_remaining"), 3600.0)

    # 1. Option Status Assignment
    go_status = "AVAILABLE"
    go_reason = "Standard fourth down go option"
    is_overtime = qtr >= 5
    if game_sec < 0 or qtr > 5:
        go_status = "UNSUPPORTED"
        go_reason = "Invalid game clock state"
    elif is_overtime:
        go_reason = "Overtime play (outside validated regulation model domain)"

    fg_status = "AVAILABLE"
    fg_reason = "Field goal attempt is possible"

    punt_status = "AVAILABLE"
    punt_reason = "Standard punt territory"
    is_partial_comparison = yl < PUNT_MIN_YARDLINE
    modeled_options_count = 2 if is_partial_comparison else 3
    if is_partial_comparison:
        # Punting inside opponent's 31 has zero support in nfl4th empirical tables (0 punts in 2026 data)
        punt_status = "UNMODELLED"
        punt_reason = f"Inside opponent {int(PUNT_MIN_YARDLINE)}-yard line (yardline_100 = {int(yl)}); not modelled in nfl4th punt landing distribution (0 punts in 2026 dataset)"

    go_wp = row.get("go_wp")
    fg_wp = row.get("fg_wp")
    punt_wp = row.get("punt_wp")
    first_down_prob = row.get("first_down_prob")
    fg_make_prob = row.get("fg_make_prob")
    make_fg_wp = row.get("make_fg_wp")
    miss_fg_wp = row.get("miss_fg_wp")
    wp_succeed = row.get("wp_succeed")
    wp_fail = row.get("wp_fail")

    # Sanity validation on model outputs
    if go_status == "AVAILABLE" and (
        go_wp is None or math.isnan(_safe_float(go_wp, float("nan")))
    ):
        raise ValueError(
            f"MODEL FAILURE: go_wp is missing for play {row.get('play_id')}"
        )
    if fg_status == "AVAILABLE" and (
        fg_wp is None or math.isnan(_safe_float(fg_wp, float("nan")))
    ):
        raise ValueError(
            f"MODEL FAILURE: fg_wp is missing for play {row.get('play_id')}"
        )
    if punt_status == "AVAILABLE" and (
        punt_wp is None or math.isnan(_safe_float(punt_wp, float("nan")))
    ):
        raise ValueError(
            f"MODEL FAILURE: punt_wp is missing at yardline_100={yl} for play {row.get('play_id')}"
        )

    # Build options dictionary
    options: dict[str, dict[str, Any]] = {}

    options["go"] = {
        "status": go_status,
        "reason": go_reason,
        "wp": float(go_wp)
        if go_wp is not None and not math.isnan(_safe_float(go_wp, float("nan")))
        else None,
        "first_down_prob": float(first_down_prob)
        if first_down_prob is not None
        and not math.isnan(_safe_float(first_down_prob, float("nan")))
        else None,
        "wp_succeed": float(wp_succeed)
        if wp_succeed is not None
        and not math.isnan(_safe_float(wp_succeed, float("nan")))
        else None,
        "wp_fail": float(wp_fail)
        if wp_fail is not None and not math.isnan(_safe_float(wp_fail, float("nan")))
        else None,
    }

    low_make_prob = False
    if fg_make_prob is not None and not math.isnan(
        _safe_float(fg_make_prob, float("nan"))
    ):
        low_make_prob = float(fg_make_prob) < LOW_MAKE_PROB_THRESHOLD

    options["field_goal"] = {
        "status": fg_status,
        "reason": fg_reason,
        "wp": float(fg_wp)
        if fg_wp is not None and not math.isnan(_safe_float(fg_wp, float("nan")))
        else None,
        "fg_make_prob": float(fg_make_prob)
        if fg_make_prob is not None
        and not math.isnan(_safe_float(fg_make_prob, float("nan")))
        else None,
        "make_fg_wp": float(make_fg_wp)
        if make_fg_wp is not None
        and not math.isnan(_safe_float(make_fg_wp, float("nan")))
        else None,
        "miss_fg_wp": float(miss_fg_wp)
        if miss_fg_wp is not None
        and not math.isnan(_safe_float(miss_fg_wp, float("nan")))
        else None,
        "low_make_probability": low_make_prob,
    }

    options["punt"] = {
        "status": punt_status,
        "reason": punt_reason,
        "wp": float(punt_wp)
        if punt_wp is not None and not math.isnan(_safe_float(punt_wp, float("nan")))
        else None,
    }

    # 2. Feasible Set & Complete Comparison Check
    feasible_option_names = ["go", "field_goal"]
    if yl >= PUNT_MIN_YARDLINE:
        feasible_option_names.append("punt")

    is_complete_comparison = True
    missing_feasible_option = None
    for opt_name in feasible_option_names:
        if (
            options[opt_name]["status"] != "AVAILABLE"
            or options[opt_name]["wp"] is None
        ):
            is_complete_comparison = False
            missing_feasible_option = opt_name
            break

    # 3. Decision Comparison (Before the Snap)
    preferred_options: list[str] = []
    is_toss_up = False
    best_option: str | None = None
    best_wp: float | None = None
    go_boost: float | None = None
    tier = "incomplete"
    is_genuine = False

    if is_complete_comparison:
        available_opts = [
            (k, options[k]["wp"])
            for k in feasible_option_names
            if options[k]["wp"] is not None
        ]
        available_opts.sort(key=lambda x: x[1], reverse=True)
        best_option = available_opts[0][0]
        best_wp = available_opts[0][1]

        # Any option within TOSS_UP_PP (1.0 pp) of the best option is in the preferred set
        # Using numerical precision tolerance (1e-9) to guard against binary floating point noise
        EPS = 1e-9
        for opt_name, wp in available_opts:
            if (best_wp - wp) * 100.0 <= TOSS_UP_PP + EPS:
                preferred_options.append(opt_name)

        is_toss_up = len(preferred_options) > 1

        # Classify decision tier
        if len(available_opts) >= 2:
            gap_pp = (available_opts[0][1] - available_opts[1][1]) * 100.0
            if available_opts[0][0] == "go" and gap_pp > CLEAR_GO_GAP_PP:
                tier = "clear_go"
                is_genuine = True
            elif gap_pp <= GENUINE_GAP_PP:
                tier = "genuine"
                is_genuine = True
            else:
                tier = "obvious"
                is_genuine = False

        # Compute go_boost relative to best non-go alternative
        non_go_feasible = [opt for opt in feasible_option_names if opt != "go"]
        if non_go_feasible:
            best_non_go_wp = max(
                options[opt]["wp"]
                for opt in non_go_feasible
                if options[opt]["wp"] is not None
            )
            go_boost = (options["go"]["wp"] - best_non_go_wp) * 100.0

    # 4. Actual Choice
    play_type = str(row.get("play_type", "")).lower()
    if play_type in ("run", "pass"):
        actual_choice = "go"
    elif play_type == "field_goal":
        actual_choice = "field_goal"
    elif play_type == "punt":
        actual_choice = "punt"
    else:
        actual_choice = play_type

    # 5. Cost of Actual Choice & Adherence
    is_consistent_with_model: bool | None = None
    cost_pp: float | None = None
    display_cost_pp: float | None = None
    cost_reason: str | None = None
    verdict_label: str = "Incomplete comparison"
    is_near_boundary: bool = False
    exact_cost_display: str | None = None

    if not is_complete_comparison:
        cost_reason = f"Incomplete comparison: {missing_feasible_option} not modelled"
        verdict_label = f"Incomplete: {missing_feasible_option} not modelled"
    else:
        actual_opt_data = options.get(actual_choice)
        if actual_opt_data is None or actual_opt_data["wp"] is None:
            cost_reason = f"Actual choice ({actual_choice}) has no model value"
            verdict_label = "Actual choice unmodelled"
        else:
            actual_wp = actual_opt_data["wp"]
            is_consistent_with_model = actual_choice in preferred_options

            # Unrounded cost in percentage points
            cost_pp = (best_wp - actual_wp) * 100.0
            display_cost_pp = round(cost_pp, 1)

            # Check boundary proximity (within 0.05 pp of 1.0 or 3.0)
            dist_1 = abs(cost_pp - 1.0)
            dist_3 = abs(cost_pp - 3.0)
            if dist_1 <= 0.05 or dist_3 <= 0.05:
                is_near_boundary = True
                exact_cost_display = f"{cost_pp:.2f}"

            # Unrounded cost boundaries (with epsilon to prevent IEEE 754 float precision flips)
            if cost_pp <= 1.0 + EPS:
                verdict_label = "Reasonable"
                cost_reason = "Within model preferred set (cost <= 1.0 pp)"
            elif cost_pp <= 3.0 + EPS:
                verdict_label = "Model leaned the other way"
                cost_reason = (
                    f"Alternative preferred by {cost_pp:.1f} pp (leaned: 1.0 to 3.0 pp)"
                )
            else:
                verdict_label = "Model strongly preferred another option"
                cost_reason = f"Alternative preferred by {cost_pp:.1f} pp (strongly preferred: > 3.0 pp)"

    # 6. What Happened (Outcome & Realised WPA)
    desc = str(row.get("desc", ""))
    yards_gained = row.get("yards_gained")
    wpa = row.get("wpa")
    realised_wpa = (
        float(wpa)
        if wpa is not None and not math.isnan(_safe_float(wpa, float("nan")))
        else 0.0
    )
    penalty_affected = bool(row.get("penalty") == 1)

    outcome: dict[str, Any] = {
        "play_type": play_type,
        "desc": desc,
        "yards_gained": int(yards_gained)
        if yards_gained is not None
        and not math.isnan(_safe_float(yards_gained, float("nan")))
        else 0,
        "realised_wpa": realised_wpa,
        "realised_wpa_note": "Realised WPA from nflverse (different post-play model measuring shift in WP)",
        "penalty_affected": penalty_affected,
    }

    play_succeeded = False

    if actual_choice == "go":
        converted = bool(row.get("fourth_down_converted") == 1)
        failed = bool(row.get("fourth_down_failed") == 1)
        # If both are false or unrecorded, check yards gained vs ydstogo
        if not converted and not failed:
            ytg = _safe_float(row.get("ydstogo"), 1.0)
            yg = _safe_float(yards_gained, 0.0)
            converted = yg >= ytg
            failed = not converted

        outcome["converted"] = converted
        outcome["failed"] = failed
        outcome["touchdown"] = bool(row.get("touchdown") == 1)
        outcome["interception"] = bool(row.get("interception") == 1)
        outcome["fumble_lost"] = bool(row.get("fumble_lost") == 1)
        outcome["summary"] = (
            f"Converted (+{outcome['yards_gained']} yds)"
            if converted
            else f"Failed (+{outcome['yards_gained']} yds, turnover on downs)"
        )
        play_succeeded = converted

    elif actual_choice == "field_goal":
        fg_res = str(row.get("field_goal_result", "")).lower()
        dist = row.get("kick_distance")
        kick_dist = (
            int(dist)
            if dist is not None and not math.isnan(_safe_float(dist, float("nan")))
            else int(yl + 18)
        )
        outcome["field_goal_result"] = fg_res
        outcome["kick_distance"] = kick_dist
        made = fg_res == "made"
        outcome["summary"] = f"{kick_dist}-yd field goal {fg_res.upper()}"
        play_succeeded = made

    elif actual_choice == "punt":
        dist = row.get("kick_distance")
        blocked = bool(row.get("punt_blocked") == 1)
        outcome["gross_yards"] = (
            int(dist)
            if dist is not None and not math.isnan(_safe_float(dist, float("nan")))
            else None
        )
        outcome["blocked"] = blocked
        outcome["summary"] = f"{dist or 0} yd punt" + (" (BLOCKED)" if blocked else "")
        play_succeeded = not blocked

    # Honest 2x2 Classification
    # Never describe a failed good call as a mistake, or a successful bad call as smart.
    if is_consistent_with_model is True and play_succeeded:
        quadrant = "Consistent & Succeeded"
        quadrant_slug = "consistent_succeeded"
    elif is_consistent_with_model is True and not play_succeeded:
        quadrant = "Consistent & Failed"
        quadrant_slug = "consistent_failed"
    elif is_consistent_with_model is False and play_succeeded:
        quadrant = "Against Model & Succeeded"
        quadrant_slug = "against_succeeded"
    elif is_consistent_with_model is False and not play_succeeded:
        quadrant = "Against Model & Failed"
        quadrant_slug = "against_failed"
    else:
        quadrant = "Unclassified (Incomplete)"
        quadrant_slug = "incomplete"

    return {
        "game_id": str(row.get("game_id", "")),
        "play_id": _safe_int(row.get("play_id"), 0),
        "season": _safe_int(row.get("season"), 2026),
        "week": _safe_int(row.get("week"), 1),
        "season_type": str(row.get("season_type", "REG")),
        "home_team": str(row.get("home_team", "")),
        "away_team": str(row.get("away_team", "")),
        "posteam": str(row.get("posteam", "")),
        "defteam": str(row.get("defteam", "")),
        "qtr": qtr,
        "quarter_seconds_remaining": _safe_float(
            row.get("quarter_seconds_remaining"), 0.0
        ),
        "half_seconds_remaining": _safe_float(row.get("half_seconds_remaining"), 0.0),
        "game_seconds_remaining": game_sec,
        "down": 4,
        "ydstogo": _safe_float(row.get("ydstogo"), 1.0),
        "yardline_100": yl,
        "score_differential": _safe_float(row.get("score_differential"), 0.0),
        "posteam_score": _safe_int(row.get("posteam_score"), 0),
        "defteam_score": _safe_int(row.get("defteam_score"), 0),
        "posteam_timeouts_remaining": _safe_int(
            row.get("posteam_timeouts_remaining"), 3
        ),
        "defteam_timeouts_remaining": _safe_int(
            row.get("defteam_timeouts_remaining"), 3
        ),
        "roof": str(row.get("roof", "outdoors")),
        "spread_line": _safe_float(row.get("spread_line"), 0.0),
        "total_line": _safe_float(row.get("total_line"), 45.0),
        # Decision comparison (Before the snap)
        "options": options,
        "is_complete_comparison": is_complete_comparison,
        "is_partial_comparison": is_partial_comparison,
        "modeled_options_count": modeled_options_count,
        "is_overtime": is_overtime,
        "preferred_options": preferred_options,
        "is_toss_up": is_toss_up,
        "best_option": best_option,
        "best_wp": best_wp,
        "go_boost": go_boost,
        "tier": tier,
        "is_genuine": is_genuine,
        # Verdict on Actual Choice
        "actual_choice": actual_choice,
        "is_consistent_with_model": is_consistent_with_model,
        "cost_pp": cost_pp,
        "display_cost_pp": display_cost_pp,
        "exact_cost_display": exact_cost_display,
        "is_near_boundary": is_near_boundary,
        "verdict_label": verdict_label,
        "cost_reason": cost_reason,
        # What happened (Outcome)
        "outcome": outcome,
        "play_succeeded": play_succeeded,
        "quadrant": quadrant,
        "quadrant_slug": quadrant_slug,
    }
