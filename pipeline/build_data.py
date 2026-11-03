"""Fourth Down Lab - Data Pipeline Build Script.

Processes the nflverse play-by-play parquet dataset, calculates model
decision surfaces via sportsdataverse, builds the audit file for cancelled
snaps, generates team adherence summaries, and writes optimised static JSON files.
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import polars as pl
from sportsdataverse.nfl.nfl_fourth_down import get_4th_down_probs

from model_engine import (
    CLEAR_GO_GAP_PP,
    GENUINE_GAP_PP,
    TOSS_UP_PP,
    process_scored_row,
)

PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.parquet"
CACHE_DIR = Path(__file__).resolve().parent.parent / "scratch"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"


def fetch_or_load_pbp() -> pl.DataFrame:
    """Retrieves 2026 play-by-play data, caching locally."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    local_pbp = CACHE_DIR / "play_by_play_2026.parquet"

    # Also check the conversation scratch directory if already downloaded
    global_scratch_file = Path("C:/Users/Martin/.gemini/antigravity/brain/e8449929-3890-40d8-ae5d-8a2754980a7c/scratch/play_by_play_2026.parquet")
    if not local_pbp.exists():
        if global_scratch_file.exists():
            import shutil
            shutil.copy(global_scratch_file, local_pbp)
            print(f"Loaded existing parquet from scratch: {local_pbp}")
        else:
            print(f"Downloading {PBP_URL}...")
            urllib.request.urlretrieve(PBP_URL, local_pbp)
            print("Download complete.")

    return pl.read_parquet(local_pbp)


def run_pipeline() -> Dict[str, Any]:
    print("=" * 60)
    print("Starting Fourth Down Lab data pipeline...")
    print("=" * 60)

    df_raw = fetch_or_load_pbp()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Filter 4th downs
    df_sorted = df_raw.sort(["game_id", "play_id"])
    fourth_raw = df_sorted.filter(pl.col("down") == 4)
    total_fourth_down_rows = fourth_raw.height
    print(f"Total fourth-down rows: {total_fourth_down_rows}")

    # 2. Cancelled Snaps Audit (play_type == 'no_play')
    no_play_snaps = fourth_raw.filter(pl.col("play_type") == "no_play")
    print(f"Cancelled snaps (play_type == 'no_play'): {no_play_snaps.height}")

    cancelled_audit: List[Dict[str, Any]] = []
    replayed_count = 0
    not_replayed_count = 0

    for row in no_play_snaps.iter_rows(named=True):
        gid = row["game_id"]
        pid = row["play_id"]
        # Look ahead for next play in game
        next_plays = df_sorted.filter((pl.col("game_id") == gid) & (pl.col("play_id") > pid)).sort("play_id")
        replayed = False
        next_play_info = None

        if next_plays.height > 0:
            np_row = next_plays.row(0, named=True)
            if np_row["down"] == 4:
                replayed = True
                replayed_count += 1
                next_play_info = {
                    "next_play_id": int(np_row["play_id"]),
                    "next_down": 4,
                    "next_ydstogo": float(np_row["ydstogo"] or 0),
                    "next_play_type": str(np_row["play_type"]),
                    "next_desc": str(np_row["desc"]),
                }
            else:
                not_replayed_count += 1
                next_play_info = {
                    "next_play_id": int(np_row["play_id"]),
                    "next_down": np_row["down"],
                    "next_play_type": str(np_row["play_type"]),
                    "next_desc": str(np_row["desc"]),
                }
        else:
            not_replayed_count += 1

        cancelled_audit.append({
            "game_id": gid,
            "play_id": int(pid),
            "week": int(row["week"]),
            "posteam": str(row["posteam"]),
            "defteam": str(row["defteam"]),
            "qtr": int(row["qtr"]),
            "ydstogo": float(row["ydstogo"] or 0),
            "yardline_100": float(row["yardline_100"] or 0),
            "desc": str(row["desc"]),
            "penalty": bool(row["penalty"] == 1),
            "replayed_on_fourth_down": replayed,
            "replayed_details": next_play_info,
            "status_label": "Not executed (penalty or cancelled snap)",
        })

    with open(OUTPUT_DIR / "audit_cancelled_snaps.json", "w", encoding="utf-8") as f:
        json.dump(cancelled_audit, f, indent=2)
    print(f"Wrote {len(cancelled_audit)} cancelled snaps to audit_cancelled_snaps.json (Replayed: {replayed_count}, Not replayed: {not_replayed_count})")

    # 3. Executed Snaps
    # Only run, pass, punt, field_goal. Exclude qb_kneel, qb_spike, play_deleted == 1
    executed_raw = fourth_raw.filter(
        pl.col("play_type").is_in(["run", "pass", "punt", "field_goal"])
        & ((pl.col("play_deleted") == 0) | pl.col("play_deleted").is_null())
    )
    print(f"Executed snaps count: {executed_raw.height}")

    # Excluded snaps count (qb_kneel etc.)
    excluded_snaps_count = total_fourth_down_rows - no_play_snaps.height - executed_raw.height

    # 4. Score Executed Snaps with Model
    print("Running sportsdataverse win probability models on executed snaps...")
    executed_pd = executed_raw.to_pandas()
    scored_df = get_4th_down_probs(executed_pd)

    # 5. Process Scored Rows
    decisions: List[Dict[str, Any]] = []
    for _, row in scored_df.iterrows():
        dec = process_scored_row(row.to_dict())
        decisions.append(dec)

    # Sort decisions: newest week first, then game_id, then play_id descending
    decisions.sort(key=lambda d: (-d["week"], d["game_id"], -d["play_id"]))

    with open(OUTPUT_DIR / "decisions.json", "w", encoding="utf-8") as f:
        json.dump(decisions, f, indent=2)
    print(f"Wrote {len(decisions)} decisions to decisions.json")

    # 6. Team Adherence Summary
    # Adherence = share of NON-toss-up genuine decisions where actual choice was model's single preferred option.
    teams_dict: Dict[str, Dict[str, Any]] = {}

    # Initialise all 32 NFL teams
    all_teams = sorted(list(set(d["posteam"] for d in decisions if d["posteam"])))
    for team in all_teams:
        teams_dict[team] = {
            "team": team,
            "total_executed": 0,
            "genuine_count": 0,
            "toss_up_count": 0,
            "non_toss_up_genuine": 0,
            "adherent_count": 0,
            "adherence_pct": None,
            "adherence_display": "0 / 0 (n/a)",
            "punted_on_clear_go": 0,
            "total_wp_lost_pp": 0.0,
            "low_sample_warning": False,
        }

    for d in decisions:
        tm = d["posteam"]
        if tm not in teams_dict:
            continue
        t_stat = teams_dict[tm]
        t_stat["total_executed"] += 1

        if d.get("cost_pp") is not None:
            t_stat["total_wp_lost_pp"] += d["cost_pp"]

        if d.get("is_genuine"):
            t_stat["genuine_count"] += 1
            if d.get("is_toss_up"):
                t_stat["toss_up_count"] += 1
            else:
                t_stat["non_toss_up_genuine"] += 1
                if d.get("is_consistent_with_model"):
                    t_stat["adherent_count"] += 1

        if d.get("tier") == "clear_go" and d.get("actual_choice") == "punt":
            t_stat["punted_on_clear_go"] += 1

    team_summary_list: List[Dict[str, Any]] = []
    for team, stat in teams_dict.items():
        denom = stat["non_toss_up_genuine"]
        num = stat["adherent_count"]
        if denom > 0:
            pct = round((num / denom) * 100.0, 1)
            stat["adherence_pct"] = pct
            stat["adherence_display"] = f"{num} / {denom} ({pct}%)"
        else:
            stat["adherence_pct"] = None
            stat["adherence_display"] = f"0 / 0 (n/a)"

        stat["total_wp_lost_pp"] = round(stat["total_wp_lost_pp"], 1)
        stat["low_sample_warning"] = stat["genuine_count"] < 5
        team_summary_list.append(stat)

    # Sort teams by adherence percentage descending, then genuine count
    team_summary_list.sort(key=lambda t: (t["adherence_pct"] if t["adherence_pct"] is not None else -1, t["genuine_count"]), reverse=True)

    with open(OUTPUT_DIR / "teams_summary.json", "w", encoding="utf-8") as f:
        json.dump(team_summary_list, f, indent=2)
    print(f"Wrote {len(team_summary_list)} teams to teams_summary.json")

    # 7. Games Summary
    games_map: Dict[str, Dict[str, Any]] = {}
    for d in decisions:
        gid = d["game_id"]
        if gid not in games_map:
            games_map[gid] = {
                "game_id": gid,
                "season": d["season"],
                "week": d["week"],
                "home_team": d["home_team"],
                "away_team": d["away_team"],
                "decisions_count": 0,
                "decisions": [],
                "home_wp_lost_pp": 0.0,
                "away_wp_lost_pp": 0.0,
            }
        g = games_map[gid]
        g["decisions_count"] += 1
        g["decisions"].append({
            "play_id": d["play_id"],
            "qtr": d["qtr"],
            "posteam": d["posteam"],
            "ydstogo": d["ydstogo"],
            "yardline_100": d["yardline_100"],
            "actual_choice": d["actual_choice"],
            "cost_pp": d["cost_pp"],
            "verdict_label": d["verdict_label"],
            "quadrant": d["quadrant"],
            "tier": d["tier"],
        })
        if d.get("cost_pp") is not None:
            if d["posteam"] == d["home_team"]:
                g["home_wp_lost_pp"] += d["cost_pp"]
            else:
                g["away_wp_lost_pp"] += d["cost_pp"]

    games_list = list(games_map.values())
    for g in games_list:
        g["home_wp_lost_pp"] = round(g["home_wp_lost_pp"], 1)
        g["away_wp_lost_pp"] = round(g["away_wp_lost_pp"], 1)
        # Sort decisions in game chronologically
        g["decisions"].sort(key=lambda x: x["play_id"])

    games_list.sort(key=lambda g: (-g["week"], g["game_id"]))

    with open(OUTPUT_DIR / "games_summary.json", "w", encoding="utf-8") as f:
        json.dump(games_list, f, indent=2)
    print(f"Wrote {len(games_list)} games to games_summary.json")

    # 8. Meta JSON
    weeks_list = sorted(list(set(d["week"] for d in decisions)))
    meta = {
        "title": "Fourth Down Lab",
        "build_time": datetime.now(timezone.utc).isoformat(),
        "data_source": "nflverse play-by-play (2026)",
        "data_as_of": "2026-11-03",
        "data_licence": "CC-BY 4.0 (Creative Commons Attribution 4.0 International)",
        "model_route": "Route A (sportsdataverse 0.1.4 / nfl4th)",
        "season": 2026,
        "weeks": weeks_list,
        "total_games": len(games_list),
        "counts": {
            "total_fourth_down_rows": total_fourth_down_rows,
            "executed_snaps": len(decisions),
            "cancelled_snaps": len(cancelled_audit),
            "cancelled_replayed": replayed_count,
            "cancelled_not_replayed": not_replayed_count,
            "excluded_snaps": excluded_snaps_count,
        },
        "thresholds": {
            "toss_up_pp": TOSS_UP_PP,
            "genuine_gap_pp": GENUINE_GAP_PP,
            "clear_go_gap_pp": CLEAR_GO_GAP_PP,
        },
        "credits": [
            {"entity": "nflverse", "details": "Play-by-play data and win probability models", "licence": "CC-BY 4.0"},
            {"entity": "nfl4th (Ben Baldwin)", "details": "Reference 4th down decision surface", "licence": "MIT"},
            {"entity": "sportsdataverse (Saiem Gilani)", "details": "Python nfl4th port and model artifacts", "licence": "MIT"},
        ],
        "validation_summary": "Validated against 2020 NFC Championship published benchmark, strict [0, 1] probability constraints, and physical monotonicity checks.",
    }

    with open(OUTPUT_DIR / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("Wrote meta.json")

    print("=" * 60)
    print("Data pipeline build complete successfully!")
    print("=" * 60)
    return meta


if __name__ == "__main__":
    run_pipeline()
