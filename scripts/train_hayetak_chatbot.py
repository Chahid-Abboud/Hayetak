import json
import os
import inspect
import sys
from datetime import datetime
from pathlib import Path

import torch
from datasets import Dataset
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)


DEFAULT_DATASET_PATH = "storage/app/ai/training/hayetak_client_qa_dataset_150x21.json"
DEFAULT_MODEL_NAME = "google/flan-t5-base"
DEFAULT_SAVE_PATH = "./hayetak_chatbot_model"
DEFAULT_RESULTS_DIR = "./results/hayetak_chatbot"
DEFAULT_LOGS_DIR = "./logs/hayetak_chatbot"
MAX_INPUT_LENGTH = 1024
MAX_TARGET_LENGTH = 320
os.environ.setdefault("WANDB_DISABLED", "true")


def compact_json(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def build_chat_prompt(question: str, context: dict | None = None) -> str:
    lines = [
        "You are Hayetak's in-app client fitness and nutrition assistant.",
        "You only answer post-registration client questions.",
        "Stay within client features like meals, workouts, progress, plans, nearby help, messages, appointments, and settings.",
        "Use the provided context when it is relevant to the exact wording.",
        "Keep the answer short, direct, practical, and safety-aware.",
    ]
    if context:
        lines.append(f"Context: {compact_json(context)}")
    lines.extend(
        [
            f"Question: {question.strip()}",
            "Answer:",
        ]
    )

    return "\n".join(lines)


def load_training_rows(file_path: str) -> Dataset:
    with open(file_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    dataset_context = payload.get("inferred_context", {})
    rows = []
    for item in payload.get("items", []):
        feature = item.get("feature", "general")
        intent = item.get("intent", "general_help")
        item_context = item.get("item_context", {})
        for variant in item.get("variants", []):
            question = str(variant.get("question", "")).strip()
            answer = str(variant.get("answer", "")).strip()
            if not question or not answer:
                continue

            variant_context = variant.get("context", {})
            prompt_context = {
                "feature": feature,
                "intent": intent,
                "dataset_context": {
                    "user_roles": dataset_context.get("user_roles", []),
                    "included_features": dataset_context.get("included_features", []),
                    "excluded_features": dataset_context.get("excluded_features", []),
                },
                "item_context": item_context,
                "variant_context": variant_context,
            }

            rows.append(
                {
                    "feature": feature,
                    "intent": intent,
                    "question": question,
                    "answer": answer,
                    "context": prompt_context,
                    "input_text": build_chat_prompt(question, prompt_context),
                    "target_text": answer,
                }
            )

    if not rows:
        raise ValueError("No question-answer pairs were found in the chatbot dataset.")

    return Dataset.from_list(rows)


def load_and_preprocess_data(file_path: str):
    dataset = load_training_rows(file_path).shuffle(seed=42)
    split = dataset.train_test_split(test_size=0.1, seed=42)
    return split["train"], split["test"]


def load_flan_t5_model(save_path: str = DEFAULT_SAVE_PATH):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    model_source = save_path if os.path.exists(save_path) else DEFAULT_MODEL_NAME
    if model_source == save_path:
        print(f"Loading saved model from {save_path}")
    else:
        print(f"No saved model found. Loading {DEFAULT_MODEL_NAME}.")

    model = AutoModelForSeq2SeqLM.from_pretrained(model_source).to(device)
    tokenizer = AutoTokenizer.from_pretrained(model_source)
    collator_signature = inspect.signature(DataCollatorForSeq2Seq.__init__)
    collator_kwargs = {"model": model}
    if "tokenizer" in collator_signature.parameters:
        collator_kwargs["tokenizer"] = tokenizer
    elif "processing_class" in collator_signature.parameters:
        collator_kwargs["processing_class"] = tokenizer

    data_collator = DataCollatorForSeq2Seq(**collator_kwargs)

    return model, tokenizer, data_collator


def tokenize_data(dataset, tokenizer):
    def tokenize_function(examples):
        model_inputs = tokenizer(
            examples["input_text"],
            truncation=True,
            max_length=MAX_INPUT_LENGTH,
            padding="max_length",
        )
        labels = tokenizer(
            text_target=examples["target_text"],
            truncation=True,
            max_length=MAX_TARGET_LENGTH,
            padding="max_length",
        )
        model_inputs["labels"] = [
            [token if token != tokenizer.pad_token_id else -100 for token in label]
            for label in labels["input_ids"]
        ]
        return model_inputs

    return dataset.map(tokenize_function, batched=True)


def write_metadata(save_path: str):
    target = Path(save_path)
    target.mkdir(parents=True, exist_ok=True)

    with open(target / "training_manifest.json", "w", encoding="utf-8") as handle:
        json.dump(
            {
                "project": "hayetak_chatbot",
                "base_model": DEFAULT_MODEL_NAME,
                "training_type": "fine_tune",
                "dataset_file": DEFAULT_DATASET_PATH,
                "max_input_length": MAX_INPUT_LENGTH,
                "max_target_length": MAX_TARGET_LENGTH,
                "date_trained": datetime.utcnow().isoformat() + "Z",
            },
            handle,
            indent=2,
        )

    with open(target / "prompt_format.json", "w", encoding="utf-8") as handle:
        json.dump(
            {
                "template": "Question: {question}\\nAnswer:",
            },
            handle,
            indent=2,
        )


def train_model(model, tokenizer, train_dataset, eval_dataset, data_collator):
    training_args_signature = inspect.signature(Seq2SeqTrainingArguments.__init__)
    training_kwargs = {
        "output_dir": DEFAULT_RESULTS_DIR,
        "save_strategy": "epoch",
        "per_device_train_batch_size": 2,
        "per_device_eval_batch_size": 2,
        "gradient_accumulation_steps": 2,
        "learning_rate": 2e-4,
        "weight_decay": 0.01,
        "num_train_epochs": 3,
        "logging_steps": 25,
        "predict_with_generate": True,
        "fp16": torch.cuda.is_available(),
    }

    if "eval_strategy" in training_args_signature.parameters:
        training_kwargs["eval_strategy"] = "epoch"
    elif "evaluation_strategy" in training_args_signature.parameters:
        training_kwargs["evaluation_strategy"] = "epoch"

    if "logging_dir" in training_args_signature.parameters:
        training_kwargs["logging_dir"] = DEFAULT_LOGS_DIR
    elif "TENSORBOARD_LOGGING_DIR" in training_args_signature.parameters:
        training_kwargs["TENSORBOARD_LOGGING_DIR"] = DEFAULT_LOGS_DIR

    if "report_to" in training_args_signature.parameters:
        training_kwargs["report_to"] = "none"

    training_args = Seq2SeqTrainingArguments(**training_kwargs)

    trainer_signature = inspect.signature(Seq2SeqTrainer.__init__)
    trainer_kwargs = {
        "model": model,
        "args": training_args,
        "train_dataset": train_dataset,
        "eval_dataset": eval_dataset,
        "data_collator": data_collator,
    }

    if "tokenizer" in trainer_signature.parameters:
        trainer_kwargs["tokenizer"] = tokenizer
    elif "processing_class" in trainer_signature.parameters:
        trainer_kwargs["processing_class"] = tokenizer

    trainer = Seq2SeqTrainer(**trainer_kwargs)

    trainer.train()
    model.save_pretrained(DEFAULT_SAVE_PATH)
    tokenizer.save_pretrained(DEFAULT_SAVE_PATH)
    write_metadata(DEFAULT_SAVE_PATH)
    print(f"Model saved at {DEFAULT_SAVE_PATH}")


def answer_question(model, tokenizer, question: str):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    prompt = build_chat_prompt(question)
    input_ids = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_INPUT_LENGTH,
    ).input_ids.to(device)

    output_ids = model.generate(
        input_ids,
        min_length=16,
        max_new_tokens=160,
        num_beams=4,
        no_repeat_ngram_size=3,
        early_stopping=True,
    )

    return tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()


if __name__ == "__main__":
    print("Step 1: Load and preprocess Hayetak chatbot training data")
    train_dataset, eval_dataset = load_and_preprocess_data(DEFAULT_DATASET_PATH)

    print("Step 2: Load the FLAN-T5 model and tokenizer")
    model, tokenizer, data_collator = load_flan_t5_model()
    train_dataset = tokenize_data(train_dataset, tokenizer)
    eval_dataset = tokenize_data(eval_dataset, tokenizer)

    if not os.path.exists(DEFAULT_SAVE_PATH):
        print("Step 3: Train the chatbot model")
        train_model(model, tokenizer, train_dataset, eval_dataset, data_collator)
    else:
        print("Step 3: Reusing the saved chatbot model")

    if sys.stdin.isatty():
        print("Step 4: Quick manual test")
        print("Type a client question. Type exit to stop.")
        while True:
            question = input("\nClient question: ").strip()
            if question.lower() in {"exit", "quit"}:
                break

            print(answer_question(model, tokenizer, question))
    else:
        print("Step 4: Skipping interactive test because stdin is not interactive.")
