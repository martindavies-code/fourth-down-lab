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
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sportsdataverse.nfl.nfl_fourth_down import get_4th_down_probs

# Core constants
TOSS_UP_PP: float = 1.0
GENUINE_GAP_PP: float = 3.0
CLEAR_GO_GAP_PP: float = 3.0
LOW_MAKE_PROB_THRESHOLD: float = 0.10
PUNT_MIN_YARDLINE: float = 31.0  # inside opponent 31, punting is unmodelled in nfl4th


def evaluate_decision_row(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Pure function evaluating a single fourth-down situation.

    Suitable for single-play execution, tests, and future live streaming feeds.
    """
    df = pd.DataFrame([row_dict])
    scored_df = get_4th_down_probs(df)
    return process_scored_row(scored_df.iloc[0].to_dict())


def process_scored_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Applies option status rules, verdict thresholds, cost calculations,

    and the 2x2 decision-vs-outcome classification to a model-scored row.
    """
    yl = float(row.get("yardline_100", 50.0))
    qtr = int(row.get("qtr", 1))
    game_sec = float(row.get("game_seconds_remaining", 3600.0))

    # 1. Option Status Assignment
    go_status = "AVAILABLE"
    go_reason = "Standard fourth down go option"
    if game_sec < 0 or qtr > 5:
        go_status = "UNSUPPORTED"
        go_reason = "Overtime or invalid game clock state"

    fg_status = "AVAILABLE"
    fg_reason = "Field goal attempt is possible"

    punt_status = "AVAILABLE"
    punt_reason = "Standard punt territory"
    if yl < PUNT_MIN_YARDLINE:
        punt_status = "UNMODELLED"
        punt_reason = f"Inside opponent 31-yard line (yardline_100 = {yl:.0f}); not viable punt territory"

    # Raw model probabilities
    go_wp = row.get("go_wp")
    fg_wp = row.get("fg_wp")
    punt_wp = row.get("punt_wp")
    first_down_prob = row.get("first_down_prob")
    fg_make_prob = row.get("fg_make_prob")
    wp_succeed = row.get("wp_succeed")
    wp_fail = row.get("wp_fail")

    # Sanity validation on model outputs
    if go_status == "AVAILABLE" and (go_wp is None or math.isnan(go_wp)):
        raise ValueError(f"MODEL FAILURE: go_wp is missing for play {row.get('play_id')}")
    if fg_status == "AVAILABLE" and (fg_wp is None or math.isnan(fg_wp)):
        raise ValueError(f"MODEL FAILURE: fg_wp is missing for play {row.get('play_id')}")
    if punt_status == "AVAILABLE" and (punt_wp is None or math.isnan(punt_wp)):
        raise ValueError(f"MODEL FAILURE: punt_wp is missing at yardline_100={yl} for play {row.get('play_id')}")

    # Build options dictionary
    options: Dict[str, Dict[str, Any]] = {}

    options["go"] = {
        "status": go_status,
        "reason": go_reason,
        "wp": float(go_wp) if go_wp is not None and not math.isnan(go_wp) else None,
        "first_down_prob": float(first_down_prob) if first_down_prob is not None and not math.isnan(first_down_prob) else None,
        "wp_succeed": float(wp_succeed) if wp_succeed is not None and not math.isnan(wp_succeed) else None,
        "wp_fail": float(wp_fail) if wp_fail is not None and not math.isnan(wp_fail) else None,
    }

    low_make_prob = False
    if fg_make_prob is not None and not math.isnan(fg_make_prob):
        low_make_prob = float(fg_make_prob) < LOW_MAKE_PROB_THRESHOLD

    options["field_goal"] = {
        "status": fg_status,
        "reason": fg_reason,
        "wp": float(fg_wp) if fg_wp is not None and not math.isnan(fg_wp) else None,
        "fg_make_prob": float(fg_make_prob) if fg_make_prob is not None and not math.isnan(fg_make_prob) else None,
        "low_make_probability": low_make_prob,
    }

    options["punt"] = {
        "status": punt_status,
        "reason": punt_reason,
        "wp": float(punt_wp) if punt_wp is not None and not math.isnan(punt_wp) else None,
    }

    # 2. Feasible Options & Comparison Completeness
    # Feasible options are those legally and practically viable in this territory.
    # Inside opponent 31-yard line, punting is unmodelled and non-feasible, so feasible set is [go, field_goal].
    # Beyond 31-yard line, feasible set is [go, field_goal, punt].
    if yl < PUNT_MIN_YARDLINE:
        feasible_option_names = ["go", "field_goal"]
    else:
        feasible_option_names = ["go", "field_goal", "punt"]

    is_complete_comparison = True
    missing_feasible_option = None
    for opt_name in feasible_option_names:
        opt_data = options[opt_name]
        if opt_data["status"] != "AVAILABLE" or opt_data["wp"] is None:
            is_complete_comparison = False
            missing_feasible_option = opt_name
            break

    # 3. Verdict, Preferred Set, and Recommendation
    preferred_options: List[str] = []
    is_toss_up = False
    best_option: Optional[str] = None
    best_wp: Optional[float] = None
    go_boost: Optional[float] = None

    if is_complete_comparison:
        # Find best WP among feasible options
        feasible_wps = {opt: options[opt]["wp"] for opt in feasible_option_names}
        best_option = max(feasible_wps, key=lambda k: feasible_wps[k])
        best_wp = feasible_wps[best_option]

        # Preferred set: every option within TOSS_UP_PP (1.0 pp) of best
        for opt, wp_val in feasible_wps.items():
            if (best_wp - wp_val) * 100.0 <= TOSS_UP_PP + 1e-9:
                preferred_options.append(opt)

        if len(preferred_options) > 1:
            is_toss_up = True

        # Compute go_boost relative to best non-go alternative
        non_go_feasible = [opt for opt in feasible_option_names if opt != "go"]
        if non_go_feasible:
            best_non_go_wp = max(options[opt]["wp"] for opt in non_go_feasible)
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
    is_consistent_with_model: Optional[bool] = None
    cost_pp: Optional[float] = None
    display_cost_pp: Optional[float] = None
    cost_reason: Optional[str] = None
    verdict_label: str = "Incomplete comparison"
    is_near_boundary: bool = False
    exact_cost_display: Optional[str] = None

    if not is_complete_comparison:
        cost_reason = f"Incomplete comparison: {missing_feasible_option} not modelled"
        verdict_label = f"Incomplete: {missing_feasible_option} not modelled"
    else:
        actual_opt_data = options.get(actual_choice)
        if actual_opt_data is None or actual_opt_data["wp"] is None:
            cost_reason = f"Actual choice ({actual_choice}) has no model value"
            verdict_label = f"Actual choice unmodelled"
        else:
            actual_wp = actual_opt_data["wp"]
            is_consistent_with_model = actual_choice in preferred_options

            # Unrounded cost in percentage points
            cost_pp = (best_wp - actual_wp) * 100.0
            display_cost_pp = round(cost_pp, 1)
            exact_cost_display = f"{cost_pp:.2f}"

            # Boundary checks (near 1.0 or 3.0 within 0.05 pp)
            if abs(cost_pp - 1.0) <= 0.05 or abs(cost_pp - 3.0) <= 0.05:
                is_near_boundary = True

            # Boundary labels strictly evaluated on UNROUNDED cost_pp
            if cost_pp <= 1.0 + 1e-9:
                verdict_label = "Reasonable"
            elif cost_pp <= 3.0 + 1e-9:
                verdict_label = "Model leaned the other way"
            else:
                verdict_label = "Model strongly preferred another option"

    # 6. "Genuine Decision" Tier Tagging
    # Tier classification:
    # - "incomplete": if comparison is incomplete
    # - "clear_go": if go beats next best by > 3.0 pp and complete
    # - "genuine": if go is within 3.0 pp of best, or go is preferred
    # - "obvious": everything else (hidden by default)
    if not is_complete_comparison:
        tier = "incomplete"
        is_genuine = True  # Keep visible
    else:
        go_val = options["go"]["wp"]
        if go_boost is not None and go_boost > CLEAR_GO_GAP_PP:
            tier = "clear_go"
            is_genuine = True
        elif (best_wp - go_val) * 100.0 <= GENUINE_GAP_PP + 1e-9 or "go" in preferred_options:
            tier = "genuine"
            is_genuine = True
        else:
            tier = "obvious"
            is_genuine = False

    # 7. "What Happened" Block (Separate from Decision)
    desc = str(row.get("desc", ""))
    yards_gained = row.get("yards_gained")
    wpa = row.get("wpa")
    penalty_affected = bool(row.get("penalty") == 1)

    outcome: Dict[str, Any] = {
        "play_type": play_type,
        "desc": desc,
        "yards_gained": int(yards_gained) if yards_gained is not None and not math.isnan(yards_gained) else 0,
        "realised_wpa": float(wpa) if wpa is not None and not math.isnan(wpa) else 0.0,
        "realised_wpa_note": "Realised WPA from nflverse (different post-play model measuring shift in WP)",
        "penalty_affected": penalty_affected,
    }

    play_succeeded = False

    if actual_choice == "go":
        converted = bool(row.get("fourth_down_converted") == 1)
        failed = bool(row.get("fourth_down_failed") == 1)
        # If both are false or unrecorded, check yards gained vs ydstogo
        if not converted and not failed:
            ytg = float(row.get("ydstogo", 1.0))
            yg = float(yards_gained or 0.0)
            converted = yg >= ytg
            failed = not converted

        outcome["converted"] = converted
        outcome["failed"] = failed
        outcome["touchdown"] = bool(row.get("touchdown") == 1)
        outcome["interception"] = bool(row.get("interception") == 1)
        outcome["fumble_lost"] = bool(row.get("fumble_lost") == 1)
        outcome["summary"] = f"Converted (+{outcome['yards_gained']} yds)" if converted else f"Failed (+{outcome['yards_gained']} yds, turnover on downs)"
        play_succeeded = converted

    elif actual_choice == "field_goal":
        fg_res = str(row.get("field_goal_result", "")).lower()
        dist = row.get("kick_distance")
        kick_dist = int(dist) if dist is not None and not math.isnan(dist) else int(yl + 18)
        outcome["field_goal_result"] = fg_res
        outcome["kick_distance"] = kick_dist
        made = fg_res == "made"
        outcome["summary"] = f"{kick_dist}-yd field goal {fg_res.upper()}"
        play_succeeded = made

    elif actual_choice == "punt":
        dist = row.get("kick_distance")
        blocked = bool(row.get("punt_blocked") == 1)
        outcome["gross_yards"] = int(dist) if dist is not None and not math.isnan(dist) else None
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
        "play_id": int(row.get("play_id", 0)),
        "season": int(row.get("season", 2026)),
        "week": int(row.get("week", 1)),
        "season_type": str(row.get("season_type", "REG")),
        "home_team": str(row.get("home_team", "")),
        "away_team": str(row.get("away_team", "")),
        "posteam": str(row.get("posteam", "")),
        "defteam": str(row.get("defteam", "")),
        "qtr": qtr,
        "quarter_seconds_remaining": float(row.get("quarter_seconds_remaining", 0.0)),
        "half_seconds_remaining": float(row.get("half_seconds_remaining", 0.0)),
        "game_seconds_remaining": game_sec,
        "down": 4,
        "ydstogo": float(row.get("ydstogo", 1.0)),
        "yardline_100": yl,
        "score_differential": float(row.get("score_differential", 0.0)),
        "posteam_score": int(row.get("posteam_score", 0)) if row.get("posteam_score") is not None and not math.isnan(row.get("posteam_score")) else 0,
        "defteam_score": int(row.get("defteam_score", 0)) if row.get("defteam_score") is not None and not math.isnan(row.get("defteam_score")) else 0,
        "posteam_timeouts_remaining": int(row.get("posteam_timeouts_remaining", 3)),
        "defteam_timeouts_remaining": int(row.get("defteam_timeouts_remaining", 3)),
        "roof": str(row.get("roof", "outdoors")),
        "spread_line": float(row.get("spread_line", 0.0)),
        "total_line": float(row.get("total_line", 45.0)),
        # Decision comparison (Before the snap)
        "options": options,
        "is_complete_comparison": is_complete_comparison,
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
