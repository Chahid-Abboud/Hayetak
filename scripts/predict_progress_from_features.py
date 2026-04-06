import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Hayetak progress predictor inference from feature JSON.")
    parser.add_argument(
        "--model-dir",
        default="storage/app/ai/models/progress_predictor_v1",
        help="Directory containing manifest.json and model .joblib files.",
    )
    return parser.parse_args()


def load_json_stdin() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        raise ValueError("Expected JSON payload on stdin.")
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object.")
    return payload


def main() -> None:
    args = parse_args()
    model_dir = Path(args.model_dir)
    manifest_path = model_dir / "manifest.json"
    weight_model_path = model_dir / "weight_change_model.joblib"
    strength_model_path = model_dir / "strength_progress_model.joblib"

    if not manifest_path.exists():
        raise FileNotFoundError(f"manifest.json not found in {model_dir}")
    if not weight_model_path.exists():
        raise FileNotFoundError(f"weight_change_model.joblib not found in {model_dir}")

    payload = load_json_stdin()
    features = payload.get("features")
    if not isinstance(features, dict):
        raise ValueError("Payload must include object field 'features'.")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    feature_columns = manifest.get("feature_columns") or []
    if not isinstance(feature_columns, list) or not feature_columns:
        raise ValueError("Manifest missing feature_columns.")

    row = {}
    for col in feature_columns:
        value = features.get(col)
        if isinstance(value, str):
            stripped = value.strip()
            if stripped == "":
                value = None
            else:
                try:
                    value = float(stripped)
                except ValueError:
                    value = stripped
        row[col] = value
    frame = pd.DataFrame([row])

    weight_model = joblib.load(weight_model_path)
    weight_pred = float(weight_model.predict(frame)[0])

    strength_pred = None
    if strength_model_path.exists():
        strength_model = joblib.load(strength_model_path)
        strength_pred = float(strength_model.predict(frame)[0])

    out = {
        "ok": True,
        "model_name": manifest.get("name", "hayetak_progress_predictor_v1"),
        "weight_change_kg": round(weight_pred, 4),
        "strength_progress_pct": round(strength_pred, 4) if strength_pred is not None else None,
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(exc),
                    "error_type": exc.__class__.__name__,
                },
                ensure_ascii=False,
            )
        )
        sys.exit(1)
