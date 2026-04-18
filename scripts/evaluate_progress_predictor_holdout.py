import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


EXCLUDED_COLUMNS = {
    "ai_request_id",
    "user_id",
    "plan_generated_at",
    "label_end_weight_kg",
    "label_actual_weight_change_kg",
    "label_actual_weekly_weight_change_kg",
    "label_prediction_error_kg",
    "label_strength_progress_pct",
    "has_weight_label",
    "has_strength_label",
    "baseline_measurement_date",
    "end_measurement_date",
    "is_synthetic_baseline_measurement",
    "is_synthetic_end_measurement",
    "is_synthetic_weight_label",
    "is_synthetic_workout_window",
    "is_synthetic_strength_label",
    "is_synthetic_row",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate progress predictor on user-group holdout split.")
    parser.add_argument(
        "--data",
        default="tmp/progress_predictor_dataset_real_only.jsonl",
        help="JSONL dataset path exported for training.",
    )
    parser.add_argument(
        "--out-dir",
        default="tmp",
        help="Directory for evaluation artifacts.",
    )
    parser.add_argument(
        "--tag",
        default="",
        help="Optional suffix tag for output filenames (defaults to UTC timestamp).",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="User-group holdout ratio.",
    )
    parser.add_argument(
        "--min-rows",
        type=int,
        default=30,
        help="Minimum rows required for each target evaluation.",
    )
    return parser.parse_args()


def build_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str], List[str]]:
    features = [col for col in df.columns if col not in EXCLUDED_COLUMNS]
    x = df[features].copy()
    numeric_cols: List[str] = []
    categorical_cols: List[str] = []

    for col in x.columns:
        series = x[col]
        if pd.api.types.is_numeric_dtype(series):
            numeric_cols.append(col)
            continue

        converted = pd.to_numeric(series, errors="coerce")
        non_null = int(series.notna().sum())
        convertible = int(converted.notna().sum())

        if non_null > 0 and (convertible / non_null) >= 0.8:
            x[col] = converted
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)

    return x, numeric_cols, categorical_cols


def make_pipeline(numeric_cols: List[str], categorical_cols: List[str]) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric_cols),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_cols,
            ),
        ],
        remainder="drop",
    )

    model = RandomForestRegressor(
        n_estimators=600,
        max_depth=10,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1,
    )

    return Pipeline(steps=[("preprocess", preprocessor), ("model", model)])


def evaluate_group_holdout(
    df: pd.DataFrame,
    target_col: str,
    min_rows: int,
    test_size: float,
) -> Dict:
    x, n_cols, c_cols = build_features(df)
    y = pd.to_numeric(df[target_col], errors="coerce")
    valid = y.notna()
    x = x[valid]
    y = y[valid]
    groups = df.loc[valid, "user_id"]

    if len(x) < min_rows:
        return {
            "status": "skipped_not_enough_rows",
            "rows": int(len(x)),
            "min_required": min_rows,
        }

    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=42)
    train_idx, test_idx = next(splitter.split(x, y, groups=groups))

    x_train = x.iloc[train_idx]
    y_train = y.iloc[train_idx]
    x_test = x.iloc[test_idx]
    y_test = y.iloc[test_idx]
    g_train = groups.iloc[train_idx]
    g_test = groups.iloc[test_idx]

    pipeline = make_pipeline(n_cols, c_cols)
    pipeline.fit(x_train, y_train)
    preds = pipeline.predict(x_test)

    mae = float(mean_absolute_error(y_test, preds))
    r2 = float(r2_score(y_test, preds))

    return {
        "status": "ok",
        "rows": int(len(x)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "train_users": int(g_train.nunique()),
        "test_users": int(g_test.nunique()),
        "mae": round(mae, 5),
        "r2": round(r2, 5),
    }


def main() -> None:
    args = parse_args()
    data_path = Path(args.data)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    tag = args.tag.strip() or datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    out_json = out_dir / f"progress_predictor_holdout_eval_{tag}.json"
    out_md = out_dir / f"progress_predictor_holdout_eval_{tag}.md"

    df = pd.read_json(data_path, lines=True)
    for col in [
        "has_weight_label",
        "has_strength_label",
        "is_synthetic_weight_label",
        "is_synthetic_strength_label",
        "is_synthetic_row",
    ]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    weight_df = df[(df["has_weight_label"] == 1) & (df["is_synthetic_weight_label"] == 0)].copy()
    strength_df = df[(df["has_strength_label"] == 1) & (df["is_synthetic_strength_label"] == 0)].copy()

    weight_eval = evaluate_group_holdout(
        weight_df,
        target_col="label_actual_weight_change_kg",
        min_rows=int(args.min_rows),
        test_size=float(args.test_size),
    )
    strength_eval = evaluate_group_holdout(
        strength_df,
        target_col="label_strength_progress_pct",
        min_rows=int(args.min_rows),
        test_size=float(args.test_size),
    )

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(data_path),
        "rows_total": int(len(df)),
        "weight_rows_real_only": int(len(weight_df)),
        "strength_rows_real_only": int(len(strength_df)),
        "weight_holdout_eval": weight_eval,
        "strength_holdout_eval": strength_eval,
    }

    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Progress Predictor Holdout Evaluation",
        "",
        f"- Generated at UTC: `{payload['generated_at_utc']}`",
        f"- Dataset: `{data_path}`",
        f"- Total rows: `{len(df)}`",
        f"- Weight real-only rows: `{len(weight_df)}`",
        f"- Strength real-only rows: `{len(strength_df)}`",
        "",
        "## Weight (group holdout by user_id)",
        f"- Status: `{weight_eval.get('status')}`",
    ]
    if weight_eval.get("status") == "ok":
        lines.extend(
            [
                f"- Train rows/users: `{weight_eval['train_rows']}` / `{weight_eval['train_users']}`",
                f"- Test rows/users: `{weight_eval['test_rows']}` / `{weight_eval['test_users']}`",
                f"- MAE: `{weight_eval['mae']}`",
                f"- R2: `{weight_eval['r2']}`",
            ]
        )
    else:
        lines.append(f"- Details: `{json.dumps(weight_eval)}`")

    lines.extend(
        [
            "",
            "## Strength (group holdout by user_id)",
            f"- Status: `{strength_eval.get('status')}`",
        ]
    )
    if strength_eval.get("status") == "ok":
        lines.extend(
            [
                f"- Train rows/users: `{strength_eval['train_rows']}` / `{strength_eval['train_users']}`",
                f"- Test rows/users: `{strength_eval['test_rows']}` / `{strength_eval['test_users']}`",
                f"- MAE: `{strength_eval['mae']}`",
                f"- R2: `{strength_eval['r2']}`",
            ]
        )
    else:
        lines.append(f"- Details: `{json.dumps(strength_eval)}`")

    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps({"json": str(out_json), "md": str(out_md)}, indent=2))


if __name__ == "__main__":
    main()

