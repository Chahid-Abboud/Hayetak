import json
import os

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)


DEFAULT_DATASET_PATH = "storage/app/ai/training/train.jsonl"
DEFAULT_MODEL_NAME = "google/flan-t5-small"
DEFAULT_SAVE_PATH = "./hayetak_planner_model"
DEFAULT_RESULTS_DIR = "./results/hayetak_planner"
DEFAULT_LOGS_DIR = "./logs/hayetak_planner"
MAX_INPUT_LENGTH = 1024
MAX_TARGET_LENGTH = 1024


def build_planner_prompt(example):
    instruction = (
        example.get("instruction")
        or "Generate a safe workout and nutrition plan as strict JSON."
    )
    context = example.get("input_context") or {}

    return "\n".join(
        [
            "You are Hayetak AI, a fitness and nutrition planner.",
            "Respect allergies, diet type, medical history, injuries, and equipment limits.",
            "Return JSON only.",
            f"Task: {instruction}",
            f"Context: {json.dumps(context, ensure_ascii=False, separators=(',', ':'))}",
        ]
    )


def load_and_preprocess_data(file_path):
    dataset = load_dataset("json", data_files=file_path, split="train")

    def preprocess_function(examples):
        inputs = []
        outputs = []

        for index in range(len(examples["target_json"])):
            row = {key: values[index] for key, values in examples.items()}
            inputs.append(build_planner_prompt(row))
            outputs.append(
                json.dumps(
                    row["target_json"],
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )

        return {"input_text": inputs, "target_text": outputs}

    dataset = dataset.map(
        preprocess_function,
        batched=True,
        remove_columns=dataset.column_names,
    )

    split = dataset.train_test_split(test_size=0.2, seed=42)
    train_dataset = split["train"].shuffle(seed=42)
    eval_dataset = split["test"]

    return train_dataset, eval_dataset


def load_flan_t5_model(save_path=DEFAULT_SAVE_PATH):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    model_source = save_path if os.path.exists(save_path) else DEFAULT_MODEL_NAME
    if model_source == save_path:
        print(f"Loading saved model from {save_path}")
    else:
        print(f"No saved model found. Loading {DEFAULT_MODEL_NAME}.")

    model = AutoModelForSeq2SeqLM.from_pretrained(model_source).to(device)
    tokenizer = AutoTokenizer.from_pretrained(model_source)
    data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

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


def train_model(model, tokenizer, train_dataset, eval_dataset, data_collator):
    training_args = Seq2SeqTrainingArguments(
        output_dir=DEFAULT_RESULTS_DIR,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        learning_rate=3e-4,
        weight_decay=0.01,
        num_train_epochs=3,
        logging_dir=DEFAULT_LOGS_DIR,
        logging_steps=25,
        predict_with_generate=True,
        fp16=torch.cuda.is_available(),
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    trainer.train()

    model.save_pretrained(DEFAULT_SAVE_PATH)
    tokenizer.save_pretrained(DEFAULT_SAVE_PATH)
    print(f"Model saved at {DEFAULT_SAVE_PATH}")


def generate_plan(model, tokenizer, planner_context_json):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    try:
        planner_context = json.loads(planner_context_json)
    except json.JSONDecodeError as exc:
        raise ValueError("Planner context must be valid JSON.") from exc

    input_text = build_planner_prompt(
        {
            "instruction": "Generate a workout and nutrition plan as strict JSON.",
            "input_context": planner_context,
        }
    )
    input_ids = tokenizer(
        input_text,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_INPUT_LENGTH,
    ).input_ids.to(device)

    output_ids = model.generate(
        input_ids,
        min_length=128,
        max_new_tokens=512,
        num_beams=6,
        length_penalty=1.0,
        no_repeat_ngram_size=3,
        early_stopping=True,
    )

    return tokenizer.decode(output_ids[0], skip_special_tokens=True)


if __name__ == "__main__":
    print("Step 1: Load and preprocess Hayetak training data")
    train_dataset, eval_dataset = load_and_preprocess_data(DEFAULT_DATASET_PATH)

    print("Step 2: Load the Flan-T5 model and tokenizer")
    model, tokenizer, data_collator = load_flan_t5_model()
    train_dataset = tokenize_data(train_dataset, tokenizer)
    eval_dataset = tokenize_data(eval_dataset, tokenizer)

    if not os.path.exists(DEFAULT_SAVE_PATH):
        print("Step 3: Train the model")
        train_model(model, tokenizer, train_dataset, eval_dataset, data_collator)
    else:
        print("Step 3: Reusing the saved model")

    print("Step 4: Test the model")
    print("Paste a planner context JSON object. Type exit to stop.")
    while True:
        context_json = input("\nPlanner context JSON: ").strip()
        if context_json.lower() in {"exit", "quit"}:
            break

        try:
            generated_plan = generate_plan(model, tokenizer, context_json)
            print(f"Generated plan JSON:\n{generated_plan}")
        except ValueError as exc:
            print(f"Input error: {exc}")
