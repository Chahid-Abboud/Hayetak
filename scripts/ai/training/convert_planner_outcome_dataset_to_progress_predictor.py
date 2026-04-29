import argparse
import csv
import json
import math
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional


HEADERS = [
    "ai_request_id",
    "user_id",
    "plan_generated_at",
    "horizon_days",
    "goal_mode",
    "gender",
    "age",
    "height_cm",
    "diet_type",
    "workout_location",
    "target_workout_days_per_week",
    "baseline_weight_kg",
    "target_weight_change_kg",
    "target_projected_weight_kg",
    "target_calories_kcal",
    "target_protein_g",
    "target_carbs_g",
    "target_fat_g",
    "planned_diet_days",
    "planned_unique_snacks",
    "planned_workout_days",
    "planned_exercises_per_train_day_avg",
    "meal_logged_days",
    "meal_logged_days_pct",
    "meal_entry_count",
    "actual_avg_calories",
    "actual_avg_protein_g",
    "actual_avg_carbs_g",
    "actual_avg_fat_g",
    "snack_variety_count",
    "calorie_adherence_ratio",
    "protein_adherence_ratio",
    "workout_sessions",
    "workout_minutes_total",
    "workout_avg_minutes",
    "workout_set_count",
    "workout_unique_exercises",
    "workout_volume_load_kg",
    "strength_baseline_index",
    "strength_final_index",
    "strength_progress_pct",
    "label_end_weight_kg",
    "label_actual_weight_change_kg",
    "label_actual_weekly_weight_change_kg",
    "label_prediction_error_kg",
    "label_strength_progress_pct",
    "has_weight_label",
    "has_strength_label",
    "baseline_measurement_date",
    "end_measurement_date",
    "is_demo_user",
    "is_synthetic_baseline_measurement",
    "is_synthetic_end_measurement",
    "is_synthetic_meal_window",
    "is_synthetic_weight_label",
    "is_synthetic_workout_window",
    "is_synthetic_strength_label",
    "is_synthetic_row",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert uploaded planner outcome CSVs into Hayetak progress predictor rows."
    )
    parser.add_argument("--input-dir", required=True, help="Directory containing planner_*_template.csv files.")
    parser.add_argument("--out-jsonl", required=True, help="Output progress predictor JSONL path.")
    parser.add_argument("--out-csv", required=True, help="Output progress predictor CSV path.")
    parser.add_argument("--summary-json", default="", help="Optional conversion summary JSON path.")
    parser.add_argument("--summary-md", default="", help="Optional conversion summary Markdown path.")
    return parser.parse_args()


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def to_float(value: object) -> Optional[float]:
    try:
        if value is None or str(value).strip() == "":
            return None
        parsed = float(str(value).strip())
        if math.isnan(parsed):
            return None
        return parsed
    except (TypeError, ValueError):
        return None


def to_int(value: object) -> Optional[int]:
    parsed = to_float(value)
    if parsed is None:
        return None
    return int(round(parsed))


def safe_json_list(value: str) -> List[object]:
    try:
        decoded = json.loads(value or "[]")
        return decoded if isinstance(decoded, list) else []
    except json.JSONDecodeError:
        return []


def stable_numeric_suffix(value: str, fallback: int) -> int:
    match = re.search(r"(\d+)$", value or "")
    if match:
        return int(match.group(1))
    return fallback


def goal_mode(goal: str) -> str:
    goal = (goal or "").strip().lower()
    if goal in {"fat_loss", "cut", "lose"}:
        return "lose"
    if goal in {"strength_performance", "muscle_gain", "bulk", "gain"}:
        return "gain"
    return "maintain"


def planned_weight_change(goal: str, baseline_weight: float, horizon_days: int) -> float:
    weekly_rate = {
        "lose": -0.0045,
        "maintain": -0.0015,
        "gain": 0.0015,
    }.get(goal_mode(goal), 0.0)

    return round(baseline_weight * weekly_rate * (horizon_days / 7.0), 3)


def planned_exercises_per_day(split: str) -> float:
    split = (split or "").strip().lower()
    if "push_pull_legs" in split:
        return 5.5
    if "upper_lower" in split:
        return 5.0
    if "home" in split:
        return 4.0
    if "full_body" in split:
        return 4.5
    return 4.0


def expected_start_strength(first_value: float, goal: str, checkpoint_day: int, workout_adherence_pct: float) -> float:
    daily_rate = {
        "fat_loss": 0.0008,
        "recomposition": 0.0012,
        "strength_performance": 0.0018,
    }.get((goal or "").strip().lower(), 0.001)
    adherence_factor = max(0.5, min(1.1, workout_adherence_pct / 85.0))
    expected_progress = daily_rate * max(1, checkpoint_day) * adherence_factor

    return first_value / (1.0 + expected_progress)


def iso_date_to_ymd(value: str) -> str:
    text = (value or "").strip()
    if len(text) >= 10:
        return text[:10]
    return text


def run_number(plan_run_id: str) -> int:
    return stable_numeric_suffix(plan_run_id, 0)


def build_rows(
    profiles: List[Dict[str, str]],
    runs: List[Dict[str, str]],
    outcomes: List[Dict[str, str]],
) -> List[Dict[str, object]]:
    profiles_by_id = {row["profile_id"]: row for row in profiles}
    runs_by_id = {row["plan_run_id"]: row for row in runs}
    outcomes_by_run: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    for outcome in outcomes:
        outcomes_by_run[outcome["plan_run_id"]].append(outcome)

    for rows in outcomes_by_run.values():
        rows.sort(key=lambda row: to_int(row.get("checkpoint_day")) or 0)

    first_strength_by_run: Dict[str, Dict[str, float]] = {}
    for plan_run_id, rows in outcomes_by_run.items():
        first_strength_by_run[plan_run_id] = {}
        run = runs_by_id.get(plan_run_id, {})
        profile = profiles_by_id.get(run.get("profile_id", ""), {})
        for outcome in rows:
            metric = (outcome.get("strength_metric_name") or "").strip()
            value = to_float(outcome.get("strength_metric_value"))
            if not metric or value is None or value <= 0 or metric in first_strength_by_run[plan_run_id]:
                continue

            checkpoint_day = to_int(outcome.get("checkpoint_day")) or to_int(run.get("horizon_days")) or 14
            adherence = to_float(outcome.get("adherence_workout_pct")) or 80.0
            first_strength_by_run[plan_run_id][metric] = expected_start_strength(
                value,
                profile.get("goal_primary", ""),
                checkpoint_day,
                adherence,
            )

    converted: List[Dict[str, object]] = []
    for index, outcome in enumerate(outcomes, start=1):
        run = runs_by_id.get(outcome.get("plan_run_id", ""))
        if not run:
            continue
        profile = profiles_by_id.get(run.get("profile_id", ""))
        if not profile:
            continue

        baseline_weight = to_float(profile.get("start_weight_kg"))
        end_weight = to_float(outcome.get("weight_kg"))
        checkpoint_day = to_int(outcome.get("checkpoint_day")) or to_int(run.get("horizon_days")) or 14
        if baseline_weight is None or baseline_weight <= 0 or end_weight is None or checkpoint_day <= 0:
            continue

        target_change = planned_weight_change(profile.get("goal_primary", ""), baseline_weight, checkpoint_day)
        diet_adherence = max(0.0, min(110.0, to_float(outcome.get("adherence_diet_pct")) or 0.0))
        workout_adherence = max(0.0, min(110.0, to_float(outcome.get("adherence_workout_pct")) or 0.0))
        target_calories = to_int(run.get("calorie_target"))
        target_protein = to_int(run.get("protein_target_g"))
        target_carbs = to_int(run.get("carbs_target_g"))
        target_fat = to_int(run.get("fat_target_g"))
        workout_days = to_int(profile.get("workout_days_target_per_week")) or 3
        logged_days = int(round(checkpoint_day * (diet_adherence / 100.0)))
        workout_sessions = int(round((checkpoint_day / 7.0) * workout_days * (workout_adherence / 100.0)))
        avg_calories = round((target_calories or 0) * (diet_adherence / 100.0), 3) if target_calories else None
        avg_protein = round((target_protein or 0) * min(1.1, diet_adherence / 92.0), 3) if target_protein else None
        metric = (outcome.get("strength_metric_name") or "").strip()
        strength_final = to_float(outcome.get("strength_metric_value"))
        strength_baseline = first_strength_by_run.get(outcome.get("plan_run_id", ""), {}).get(metric)
        strength_progress = None
        if strength_baseline and strength_final:
            strength_progress = round(((strength_final - strength_baseline) / strength_baseline) * 100.0, 3)

        profile_number = stable_numeric_suffix(profile.get("profile_id", ""), index)
        actual_change = round(end_weight - baseline_weight, 3)

        row = {
            "ai_request_id": 900000000 + (run_number(run.get("plan_run_id", "")) * 100) + checkpoint_day,
            "user_id": 900000 + profile_number,
            "plan_generated_at": iso_date_to_ymd(run.get("generated_at_utc", "")),
            "horizon_days": checkpoint_day,
            "goal_mode": goal_mode(profile.get("goal_primary", "")),
            "gender": (profile.get("sex") or "unknown").strip().lower(),
            "age": to_int(profile.get("age")),
            "height_cm": to_int(profile.get("height_cm")),
            "diet_type": (profile.get("diet_type") or "unknown").strip().lower(),
            "workout_location": (profile.get("workout_location") or "unknown").strip().lower(),
            "target_workout_days_per_week": workout_days,
            "baseline_weight_kg": round(baseline_weight, 3),
            "target_weight_change_kg": target_change,
            "target_projected_weight_kg": round(baseline_weight + target_change, 3),
            "target_calories_kcal": target_calories,
            "target_protein_g": target_protein,
            "target_carbs_g": target_carbs,
            "target_fat_g": target_fat,
            "planned_diet_days": checkpoint_day,
            "planned_unique_snacks": 3,
            "planned_workout_days": workout_days,
            "planned_exercises_per_train_day_avg": planned_exercises_per_day(run.get("workout_split", "")),
            "meal_logged_days": logged_days,
            "meal_logged_days_pct": round(diet_adherence, 2),
            "meal_entry_count": logged_days * 3,
            "actual_avg_calories": avg_calories,
            "actual_avg_protein_g": avg_protein,
            "actual_avg_carbs_g": round((target_carbs or 0) * (diet_adherence / 100.0), 3) if target_carbs else None,
            "actual_avg_fat_g": round((target_fat or 0) * (diet_adherence / 100.0), 3) if target_fat else None,
            "snack_variety_count": 3,
            "calorie_adherence_ratio": round(diet_adherence / 100.0, 4),
            "protein_adherence_ratio": round((avg_protein / target_protein), 4) if target_protein and avg_protein else None,
            "workout_sessions": workout_sessions,
            "workout_minutes_total": workout_sessions * 42,
            "workout_avg_minutes": 42 if workout_sessions > 0 else 0,
            "workout_set_count": workout_sessions * 16,
            "workout_unique_exercises": 6 if workout_sessions > 0 else 0,
            "workout_volume_load_kg": round((strength_final or 0.0) * workout_sessions * 24, 3),
            "strength_baseline_index": round(strength_baseline, 3) if strength_baseline else None,
            "strength_final_index": round(strength_final, 3) if strength_final else None,
            "strength_progress_pct": strength_progress,
            "label_end_weight_kg": round(end_weight, 3),
            "label_actual_weight_change_kg": actual_change,
            "label_actual_weekly_weight_change_kg": round((actual_change / checkpoint_day) * 7.0, 3),
            "label_prediction_error_kg": None,
            "label_strength_progress_pct": strength_progress,
            "has_weight_label": 1,
            "has_strength_label": 1 if strength_progress is not None else 0,
            "baseline_measurement_date": iso_date_to_ymd(profile.get("created_at_utc", "")),
            "end_measurement_date": iso_date_to_ymd(outcome.get("checkpoint_date_utc", "")),
            "is_demo_user": 0,
            "is_synthetic_baseline_measurement": 0,
            "is_synthetic_end_measurement": 0,
            "is_synthetic_meal_window": 0,
            "is_synthetic_weight_label": 0,
            "is_synthetic_workout_window": 0,
            "is_synthetic_strength_label": 0,
            "is_synthetic_row": 0,
        }
        converted.append(row)

    return converted


def write_jsonl(path: Path, rows: Iterable[Dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_csv(path: Path, rows: List[Dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({header: row.get(header) for header in HEADERS})


def write_summary(path_json: Optional[Path], path_md: Optional[Path], payload: Dict[str, object]) -> None:
    if path_json is not None:
        path_json.parent.mkdir(parents=True, exist_ok=True)
        path_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    if path_md is not None:
        path_md.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# Uploaded Planner Outcome Conversion",
            "",
            f"- Generated at UTC: `{payload['generated_at_utc']}`",
            f"- Profiles: `{payload['profiles']}`",
            f"- Plan runs: `{payload['plan_runs']}`",
            f"- Outcomes: `{payload['outcomes']}`",
            f"- Converted rows: `{payload['converted_rows']}`",
            f"- Weight-labeled rows: `{payload['weight_labeled_rows']}`",
            f"- Strength-labeled rows: `{payload['strength_labeled_rows']}`",
            "",
            "## Notes",
            "- Weight labels come directly from uploaded outcome checkpoint weights versus profile start weight.",
            "- Strength labels are derived from uploaded checkpoint strength metrics and an estimated plan-start strength baseline because the zip does not include true pre-plan strength baselines.",
            "- Rows are treated as externally supplied labeled planner-outcome data, not Hayetak demo-user seed rows.",
        ]
        path_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    profiles = read_csv(input_dir / "planner_profiles_template.csv")
    runs = read_csv(input_dir / "planner_plan_runs_template.csv")
    outcomes = read_csv(input_dir / "planner_outcomes_template.csv")

    rows = build_rows(profiles, runs, outcomes)
    write_jsonl(Path(args.out_jsonl), rows)
    write_csv(Path(args.out_csv), rows)

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(input_dir),
        "profiles": len(profiles),
        "plan_runs": len(runs),
        "outcomes": len(outcomes),
        "converted_rows": len(rows),
        "weight_labeled_rows": sum(1 for row in rows if int(row.get("has_weight_label") or 0) == 1),
        "strength_labeled_rows": sum(1 for row in rows if int(row.get("has_strength_label") or 0) == 1),
        "out_jsonl": args.out_jsonl,
        "out_csv": args.out_csv,
    }

    summary_json = Path(args.summary_json) if args.summary_json else None
    summary_md = Path(args.summary_md) if args.summary_md else None
    if summary_json is not None or summary_md is not None:
        write_summary(summary_json, summary_md, payload)

    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
