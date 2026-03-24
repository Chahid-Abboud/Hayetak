# AI Plan Checklist

This checklist compares the plan from `c:\Users\User\Downloads\message.txt` against the current implementation in the Hayetak repo.

| Plan item | Status | What we have now | What's next |
|---|---|---|---|
| 1. Lock chatbot contract | Partial | Chat already returns `intent`, `warnings`, `used_context_keys`, `provider`, and `model` via `app/Http/Controllers/Ai/ChatController.php`. | Add a stable reply shape with `sources_used`, `suggested_actions`, and `follow_up_questions`. |
| 2. Add backend chat module | Done | Controller, route, orchestrator, classifier, context builder, and safety guard already exist. | Mostly refinement, not greenfield work. |
| 3. Build recommender/context selector | Partial | Context is pulled from profile, meals, macros, workouts, plans, and memory in the current chat context builders. | Make context selection more intent-specific instead of always building a broad bundle. |
| 4. Add hard safety rules | Partial | Emergency preflight plus allergy and diet checks exist for chat; planner validation also blocks unsafe outputs. | Add stronger injury and medical refusal logic plus safer alternatives. |
| 5. Store chat conversations properly | Done | Dedicated AI chat tables, models, and resources exist for conversations and messages. | Could enrich metadata further, but the base is there. |
| 6. Make model pipeline hybrid | Partial | There is a provider layer and an HTTP chat client scaffold. | Real hybrid runtime with tools is still missing. |
| 7. Prepare training data correctly | Missing | No fully wired context-aware chat dataset flow was found. | Create `instruction + user_question + context + expected_answer` dataset format. |
| 8. Train or fine-tune chatbot model | Partial | `scripts/train_hayetak_chatbot.py` already exists. | Verify it uses context-aware data and a separate chatbot model artifact. |
| 9. Add prompt builder for runtime | Missing | Planner prompts exist, but no dedicated chat prompt builder was found. | Add a `ChatPrompt` or similar with scope, safety, and context rules. |
| 10. Build frontend chat UI | Done | The AI Coach page is already built in React. | Optional polish: richer warnings, citations, follow-ups, streaming. |
| 11. Connect chat UI to app navigation | Done | `/coach` exists and is linked from navigation. | Could add smarter entry points from meal and workout screens. |
| 12. Add tests before rollout | Partial | Chat feature tests exist. | Add safety, intent, planner, and UI edge-case coverage. |
| 13. Add monitoring and feedback | Partial | AI usage logging exists. | Add thumbs up/down, fallback rate, and safety block analytics. |
| 14. Roll out in stages | Partial | The current build already looks like a stage-1 rollout. | Formalize rollout gates and later-stage upgrades. |

## Biggest gaps

- Tool calling is still the biggest missing chunk. The interface exists, but concrete tools like `search_recipes` and `suggest_exercise_alternatives` are not implemented.
- The planner exists, but not with the exact `POST /api/ai/plan` contract from the plan.
- Restrictions and history are not normalized into dedicated tables yet; much of that data still lives on `users` or `user_prefs`.

## Suggested next steps

1. Build the real chat tool layer.
2. Add a dedicated chat prompt builder and fixed response contract.
3. Strengthen safety for injury and medical constraints.
4. Normalize restriction and history storage if we want cleaner long-term AI logic.
5. Expand tests around chat safety, tool usage, and planner generation.
