# Project: Hayetak (Laravel + React)
Goal: Two AI features:
1) Planner: generate optimal workout + diet plan at signup based on user variables (age, sex, height/weight, goals, allergies/diet type, medical + injury history, workout days/week, home vs gym, equipment, past diet failures).
2) Coach Chatbot: answers nutrition + fitness questions using user profile + restrictions + meal/workout history (today + last 7 days). Must avoid unsafe suggestions (allergies, injuries). Should recommend real recipes and alternatives based on available ingredients/equipment.

Hard rules:
- Never suggest foods that violate allergies/diet type.
- Respect medical/injury constraints; provide safer alternatives.
- Coach must consider today's logged meals and last 7 days summary when relevant.
- Planner output must be strict JSON matching our schema (store in DB, render in React).

Implementation expectations:
- Add DB tables for: dietary_restrictions/allergies, medical/injury history, meal_logs, workout_logs, plans, chat_sessions/messages.
- Add API endpoints:
  - POST /api/ai/plan -> generates plan JSON and stores it.
  - POST /api/ai/chat -> chatbot response (streaming if possible), uses tools/functions.
- Prefer OpenAI Responses API; planner uses structured outputs (JSON schema). Coach uses tool calling to:
  - search_recipes(query, constraints, available_ingredients)
  - get_day_macros(date)
  - summarize_last_7_days()
  - suggest_exercise_alternatives(target, equipment, injuries)
  - find_gyms_or_nutritionists(lat,lng,goal) (Places API or our curated DB)

When working:
- Always inspect relevant Laravel files (routes, controllers, services) before changes.
- Keep code clean, reusable services under app/Services/Ai/.
- Add validation and tests where practical.