# Hayetak Defense-Ready Short Version (Slide Script)

Use this as a concise presentation outline.  
Format: 1 slide title + short bullets.

## Slide 1: Project Title
- Hayetak: AI-Powered Fitness and Nutrition Platform
- Personalized planning + adaptive coaching + safe recommendations
- Built with Laravel + React + self-hosted AI stack

## Slide 2: Problem
- Generic plans ignore user allergies, injuries, and medical constraints
- Users need continuous, context-aware guidance, not one-time PDFs
- Existing trackers are often data-only, not action-oriented

## Slide 3: Solution
- AI Planner generates structured workout + diet plans from user context
- AI Coach answers daily questions using profile + logs + restrictions
- Safety-first logic blocks unsafe recommendations

## Slide 4: Core Features
- Signup wizard captures profile, goals, restrictions, activity context
- Planner page generates and stores active plans
- Coach page provides contextual chat recommendations
- Meal/workout/water/progress modules feed AI context continuously

## Slide 5: System Architecture
- Backend: Laravel services, controllers, validation, persistence
- Frontend: React + Inertia pages
- AI Runtime:
  - Ollama (`llama3.1:8b`) for planner and coach text generation
  - Qdrant for vector retrieval
  - `nomic-embed-text` for embeddings
  - scikit-learn regressor for progress prediction

## Slide 6: Planner Pipeline (High-Level)
- Input validation (`POST /api/ai/plan`) + profile normalization
- Context build from user profile, restrictions, and recent history
- Structured JSON generation with strict schema
- Safety/business validation and persistence to normalized plan tables
- Response includes provider/model/usage/quality metadata

## Slide 7: Coach Pipeline (High-Level)
- Intent classification + emergency preflight safety check
- Context assembly: today logs, last 7 days, plans, restrictions, memory
- Deterministic tool calls + deterministic response overrides when possible
- Self-hosted retrieval + model generation when needed
- Post-response safety sanitization + logging + quality scoring

## Slide 8: Safety and Governance
- Hard allergy and diet-type boundaries
- Injury/medical condition-aware alternatives
- Emergency symptom preflight guard
- Output sanitization to remove unsafe/internal model phrasing
- Usage logs and quality checks for traceability

## Slide 9: Data and Model Engineering
- Dedicated AI tables: requests, plans, conversations, messages, usage logs
- Normalized restriction/history tables for reliable safety context
- Progress predictor uses:
  - heuristic baseline
  - adherence correction
  - optional ML blend with guardrails

## Slide 10: Why This Is Real AI (Not Just Rules)
- LLM inference in production planner and coach flows
- Retrieval-augmented generation with embeddings + vector search
- Structured generation and schema-constrained outputs
- Supervised ML model integrated in runtime forecasting
- Multi-layer orchestration with safety and evaluation

## Slide 11: Technical Achievements
- End-to-end AI pipelines integrated into real product flows
- Context sync architecture keeps retrieval data fresh
- Strong separation of concerns via service-layer design
- Practical deployment path using self-hosted models

## Slide 12: Current Limits and Honest Assessment
- Planner currently forced to Ollama-only mode
- Fallback pathways configured but disabled in current env
- Coach transport is JSON response (not token-streaming yet)
- Additional evaluation metrics can be expanded

## Slide 13: Future Work
- Add streaming chat responses
- Enable controlled fallback strategy and A/B quality comparisons
- Expand automated safety eval datasets
- Add longitudinal personalization and recommendation tuning

## Slide 14: Final Defense Statement
- Hayetak is a complete applied AI system:
  - generation + retrieval + tooling + safety + ML forecasting
- It demonstrates production-oriented AI engineering complexity
- It is suitable as a strong capstone-level AI project

