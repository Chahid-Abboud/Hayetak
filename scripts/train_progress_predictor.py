import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DEFAULT_DATA_PATH = "storage/app/ai/training/progress_predictor_dataset.jsonl"
DEFAULT_OUTPUT_DIR = "storage/app/ai/models/progress_predictor_v1"
RANDOM_STATE = 42

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
    parser = argparse.ArgumentParser(description="Train Hayetak progress predictor models.")
    parser.add_argument("--data", default=DEFAULT_DATA_PATH, help="Path to JSONL/CSV dataset export.")
    parser.add_argument("--out", default=DEFAULT_OUTPUT_DIR, help="Directory to save trained models.")
    parser.add_argument(
        "--target",
        default="label_actual_weight_change_kg",
        choices=[
            "label_actual_weight_change_kg",
            "label_actual_weekly_weight_change_kg",
        ],
        help="Primary weight target column.",
    )
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio.")
    parser.add_argument(
        "--real-only",
        type=int,
        default=0,
        help="When 1, train using only non-synthetic labels (weight + strength each use their own synthetic flags).",
    )
    return parser.parse_args()


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path)
    if suffix == ".jsonl":
        return pd.read_json(path, lines=True)

    raise ValueError("Unsupported dataset format. Use .jsonl or .csv.")


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

        # Treat mostly-convertible columns as numeric (helps with CSV/object drift).
        if non_null > 0 and (convertible / non_null) >= 0.8:
            x[col] = converted
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)

    return x, numeric_cols, categorical_cols


def make_pipeline(numeric_cols: List[str], categorical_cols: List[str]) -> Pipeline:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ],
        remainder="drop",
    )

    model = RandomForestRegressor(
        n_estimators=600,
        max_depth=10,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=1,
    )

    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )


def train_and_eval(
    x: pd.DataFrame,
    y: pd.Series,
    numeric_cols: List[str],
    categorical_cols: List[str],
    test_size: float,
) -> Tuple[Pipeline, Dict[str, float], int, int]:
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=test_size,
        random_state=RANDOM_STATE,
    )

    pipeline = make_pipeline(numeric_cols, categorical_cols)
    pipeline.fit(x_train, y_train)

    preds = pipeline.predict(x_test)
    mae = float(mean_absolute_error(y_test, preds))
    r2 = float(r2_score(y_test, preds))

    metrics = {
        "mae": round(mae, 5),
        "r2": round(r2, 5),
    }

    return pipeline, metrics, len(x_train), len(x_test)


def save_manifest(out_dir: Path, manifest: Dict) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "manifest.json", "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)


def main() -> None:
    args = parse_args()
    data_path = Path(args.data)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = load_dataset(data_path)
    if df.empty:
        raise ValueError("Dataset is empty.")

    for col in ["has_weight_label", "has_strength_label", "is_synthetic_weight_label", "is_synthetic_strength_label", "is_synthetic_row"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    weight_df = df[df["has_weight_label"] == 1].copy()
    if int(args.real_only) == 1 and "is_synthetic_weight_label" in weight_df.columns:
        weight_df = weight_df[weight_df["is_synthetic_weight_label"] != 1].copy()
    print(f"Training mode: {'real-only' if int(args.real_only) == 1 else 'all-labels'}")
    print(f"Weight labeled rows before feature filtering: {len(weight_df)}")

    if weight_df.empty:
        raise ValueError("No labeled rows for weight targets.")

    x_weight, numeric_cols, categorical_cols = build_features(weight_df)
    y_weight = pd.to_numeric(weight_df[args.target], errors="coerce")
    valid_weight_mask = y_weight.notna()
    x_weight = x_weight[valid_weight_mask]
    y_weight = y_weight[valid_weight_mask]

    if len(x_weight) < 30:
        mode = "real-only" if int(args.real_only) == 1 else "all-labels"
        raise ValueError(f"Need at least 30 labeled rows for weight target training (mode={mode}, rows={len(x_weight)}).")

    weight_model, weight_metrics, weight_train_n, weight_test_n = train_and_eval(
        x_weight,
        y_weight,
        numeric_cols,
        categorical_cols,
        args.test_size,
    )
    joblib.dump(weight_model, out_dir / "weight_change_model.joblib")

    strength_artifact = None
    strength_df = df[df["has_strength_label"] == 1].copy()
    if int(args.real_only) == 1 and "is_synthetic_strength_label" in strength_df.columns:
        strength_df = strength_df[strength_df["is_synthetic_strength_label"] != 1].copy()
    print(f"Strength labeled rows before feature filtering: {len(strength_df)}")
    if not strength_df.empty and len(strength_df) >= 30:
        x_strength, n_strength, c_strength = build_features(strength_df)
        y_strength = pd.to_numeric(strength_df["label_strength_progress_pct"], errors="coerce")
        valid_strength_mask = y_strength.notna()
        x_strength = x_strength[valid_strength_mask]
        y_strength = y_strength[valid_strength_mask]

        if len(x_strength) >= 30:
            strength_model, strength_metrics, strength_train_n, strength_test_n = train_and_eval(
                x_strength,
                y_strength,
                n_strength,
                c_strength,
                args.test_size,
            )
            joblib.dump(strength_model, out_dir / "strength_progress_model.joblib")
            strength_artifact = {
                "rows": int(len(x_strength)),
                "train_rows": int(strength_train_n),
                "test_rows": int(strength_test_n),
                "metrics": strength_metrics,
            }

    manifest = {
        "name": "hayetak_progress_predictor_v1",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(data_path),
        "real_only": int(args.real_only) == 1,
        "weight_target": args.target,
        "weight_rows": int(len(x_weight)),
        "weight_train_rows": int(weight_train_n),
        "weight_test_rows": int(weight_test_n),
        "weight_metrics": weight_metrics,
        "strength_model": strength_artifact,
        "feature_columns": [col for col in x_weight.columns],
        "numeric_feature_count": len(numeric_cols),
        "categorical_feature_count": len(categorical_cols),
        "notes": [
            "Model is fully open source (scikit-learn RandomForestRegressor).",
            "Retrain periodically after new logs are added to keep prediction drift low.",
            "For user-level adaptation, combine this with runtime feedback adjustment in ProgressPredictionModel.",
        ],
    }
    save_manifest(out_dir, manifest)

    print("Training complete.")
    print(f"Weight model saved: {out_dir / 'weight_change_model.joblib'}")
    print(f"Manifest saved: {out_dir / 'manifest.json'}")
    print(f"Weight MAE: {weight_metrics['mae']}")
    print(f"Weight R2: {weight_metrics['r2']}")
    if strength_artifact:
        print(f"Strength model saved: {out_dir / 'strength_progress_model.joblib'}")
        print(f"Strength MAE: {strength_artifact['metrics']['mae']}")
        print(f"Strength R2: {strength_artifact['metrics']['r2']}")
    else:
        print("Strength model skipped (not enough labeled rows).")


if __name__ == "__main__":
    main()
