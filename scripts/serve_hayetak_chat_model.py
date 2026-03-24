import os
import json
from typing import Any

import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


MODEL_PATH = os.getenv("HAYETAK_CHAT_MODEL_PATH", "./hayetak_chatbot_model")
API_TOKEN = os.getenv("HAYETAK_CHAT_API_TOKEN", "")
MAX_INPUT_LENGTH = int(os.getenv("HAYETAK_CHAT_MAX_INPUT_LENGTH", "1024"))

app = FastAPI(title="Hayetak Chat Model API")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1200)
    context: dict[str, Any] = Field(default_factory=dict)
    options: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    answer: str
    model_name: str
    usage: dict[str, int]
    request_id: str | None = None


def build_prompt(question: str, context: dict[str, Any]) -> str:
    return "\n".join(
        [
            "You are Hayetak's in-app client fitness and nutrition assistant.",
            "Answer only post-registration client questions.",
            "Use the context below when it is relevant.",
            "Never recommend foods that violate allergies or diet type.",
            "Respect injuries and medical conditions.",
            f"Question: {question.strip()}",
            f"Context: {json.dumps(context, ensure_ascii=False, separators=(',', ':'), sort_keys=True)}",
            "Answer:",
        ]
    )


def check_auth(authorization: str | None):
    if API_TOKEN == "":
        return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    token = authorization.removeprefix("Bearer ").strip()
    if token != API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token.")


@app.get("/health")
def health():
    return {"ok": True, "model_path": MODEL_PATH, "device": str(device)}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, authorization: str | None = Header(default=None)):
    check_auth(authorization)

    prompt = build_prompt(request.question, request.context)
    input_ids = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_INPUT_LENGTH,
    ).input_ids.to(device)

    output_ids = model.generate(
        input_ids,
        min_length=16,
        max_new_tokens=180,
        num_beams=4,
        no_repeat_ngram_size=3,
        early_stopping=True,
    )

    answer = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()

    return ChatResponse(
        answer=answer,
        model_name=os.getenv("HAYETAK_CHAT_MODEL_NAME", "hayetak-flan-t5"),
        usage={
            "input_tokens": int(input_ids.shape[-1]),
            "output_tokens": int(output_ids.shape[-1]),
            "total_tokens": int(input_ids.shape[-1] + output_ids.shape[-1]),
        },
        request_id=None,
    )
