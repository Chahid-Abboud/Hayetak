import json
from pathlib import Path


OUTPUT_PATH = Path("storage/app/ai/training/hayetak_qa_dataset_110x10.json")


def client_item(category: str, subject: str, base_question: str) -> dict:
    return {
        "audience": "client",
        "category": category,
        "subject": subject,
        "base_question": base_question,
    }


def trainer_item(subject: str, base_question: str) -> dict:
    return {
        "audience": "trainer",
        "category": "trainer_workflow",
        "subject": subject,
        "base_question": base_question,
    }


def nutritionist_item(subject: str, base_question: str) -> dict:
    return {
        "audience": "nutritionist",
        "category": "nutritionist_workflow",
        "subject": subject,
        "base_question": base_question,
    }


def admin_item(subject: str, base_question: str) -> dict:
    return {
        "audience": "admin",
        "category": "admin_workflow",
        "subject": subject,
        "base_question": base_question,
    }


CLIENT_DATA_SCOPE = {
    "profile_strategy": "my profile, goals, restrictions, saved plans, and recent Hayetak logs",
    "nutrition_analysis": "my recent meal entries, food choices, weekly eating pattern, and restrictions",
    "workout_analysis": "my current workout plan, workout logs, equipment, and injury history",
    "integrated_coaching": "my profile plus the last 7 days of meals, workouts, and progress trends",
    "recipe_support": "my goal, restrictions, available ingredients, and current meal pattern",
    "advanced_client": "my recent logs, measurements, saved plans, and current routine",
}


ITEMS = []


def add_items(items: list[dict]) -> None:
    ITEMS.extend(items)


add_items([
    client_item(
        "profile_strategy",
        "cutting fat without sacrificing muscle",
        "How should I balance fat loss with keeping muscle based on my current stats, workout frequency, and food logs?",
    ),
    client_item(
        "profile_strategy",
        "lean muscle gain without unnecessary fat gain",
        "What would be the smartest way for me to gain muscle without overshooting calories and adding extra body fat?",
    ),
    client_item(
        "profile_strategy",
        "balancing endurance improvement with weight-loss goals",
        "How can I improve endurance without letting it derail my weight-loss plan?",
    ),
    client_item(
        "profile_strategy",
        "picking a realistic workout frequency",
        "How many workout days per week are actually realistic for me right now based on my profile and consistency?",
    ),
    client_item(
        "profile_strategy",
        "choosing home, gym, or mixed training",
        "Should my current plan lean toward home workouts, gym sessions, or a mix of both?",
    ),
    client_item(
        "profile_strategy",
        "identifying the missing profile details that matter most",
        "Which missing or weak profile details are probably hurting the quality of my plans the most?",
    ),
    client_item(
        "profile_strategy",
        "turning past diet failures into a better strategy",
        "How should my past diet failures change the kind of plan you recommend for me now?",
    ),
    client_item(
        "profile_strategy",
        "setting a safer pace around medical history",
        "How should my medical history affect the pace and intensity of my current plan?",
    ),
    client_item(
        "profile_strategy",
        "using injury history to shape exercise selection",
        "How much should my injury history change the exercises and training volume in my plan?",
    ),
    client_item(
        "profile_strategy",
        "judging whether my calorie goal is too aggressive",
        "Does my current goal sound too aggressive for my profile and recent routine?",
    ),
    client_item(
        "profile_strategy",
        "matching diet style to actual habits",
        "Which diet style fits my logged habits better: Mediterranean, high-protein, low-carb, or something simpler?",
    ),
    client_item(
        "profile_strategy",
        "deciding whether body recomposition fits me",
        "Would body recomposition make more sense for me than a straight cut or bulk right now?",
    ),
    client_item(
        "profile_strategy",
        "restarting after an inconsistent week",
        "What is the smartest way to restart after a messy week without overcorrecting?",
    ),
    client_item(
        "profile_strategy",
        "knowing when a new AI plan is justified",
        "When does it actually make sense for me to regenerate my AI plan instead of just making small adjustments?",
    ),
    client_item(
        "profile_strategy",
        "finding the real bottleneck in my results",
        "What looks like my biggest bottleneck right now: nutrition quality, workout consistency, or plan fit?",
    ),
    client_item(
        "nutrition_analysis",
        "aligning weekly macros with goal",
        "Can you summarize my last 7 days of eating and tell me whether my calories and macros fit my goal?",
    ),
    client_item(
        "nutrition_analysis",
        "finding where protein is slipping",
        "Where am I most likely missing protein across the week, and how should I fix it?",
    ),
    client_item(
        "nutrition_analysis",
        "spotting calorie spikes and their causes",
        "Can you spot the biggest calorie spikes in my week and explain what may be causing them?",
    ),
    client_item(
        "nutrition_analysis",
        "judging which meal types are weakest",
        "Which meal types in my logs look the weakest for my goal, and why?",
    ),
    client_item(
        "nutrition_analysis",
        "improving breakfast for satiety and protein",
        "How should I change my breakfasts so I stay fuller and hit protein more easily?",
    ),
    client_item(
        "nutrition_analysis",
        "upgrading snacks without breaking the plan",
        "What snack changes would help me the most without fighting my diet type or allergies?",
    ),
    client_item(
        "nutrition_analysis",
        "making dinner work better for recovery and digestion",
        "How should I adjust dinner so it supports recovery without making me feel heavy or uncomfortable?",
    ),
    client_item(
        "nutrition_analysis",
        "leaner versions of usual foods",
        "Can you turn my usual foods into leaner, more goal-friendly choices without making the diet boring?",
    ),
    client_item(
        "nutrition_analysis",
        "reading the quality of my meal logging",
        "What does my meal logging pattern suggest about consistency, blind spots, or missing data?",
    ),
    client_item(
        "nutrition_analysis",
        "timing carbs around training",
        "How should I distribute carbs on training days versus rest days based on what I've been logging?",
    ),
    client_item(
        "nutrition_analysis",
        "fixing a low-fiber pattern",
        "Do my recent meals suggest a low-fiber pattern, and how would you improve it?",
    ),
    client_item(
        "nutrition_analysis",
        "reducing sodium while keeping meals practical",
        "How can I lower sodium without making my meals bland or losing too much protein?",
    ),
    client_item(
        "nutrition_analysis",
        "building a grocery list from plan and restrictions",
        "What should a realistic grocery list look like for my current goal, restrictions, and meal pattern?",
    ),
    client_item(
        "nutrition_analysis",
        "using available ingredients more intelligently",
        "What meals would you build from the ingredients I usually have while still respecting my goal and restrictions?",
    ),
    client_item(
        "nutrition_analysis",
        "staying on plan during restaurant or social meals",
        "How should I handle restaurant meals or social events without undoing my weekly progress?",
    ),
    client_item(
        "nutrition_analysis",
        "adapting meals for medical constraints",
        "How should my meals change if you factor in my medical history, allergies, and current goal together?",
    ),
    client_item(
        "nutrition_analysis",
        "finding patterns that suggest underplanned eating",
        "Do my logs suggest I'm underplanning meals and then compensating later in the day?",
    ),
    client_item(
        "nutrition_analysis",
        "redistributing macros when a meal keeps getting skipped",
        "If I keep skipping one meal, how should I redistribute calories and macros instead of forcing it?",
    ),
    client_item(
        "nutrition_analysis",
        "measuring the impact of drinks",
        "How much are drinks affecting my weekly calories and macro balance?",
    ),
    client_item(
        "nutrition_analysis",
        "comparing my meal logs with my saved diet plan",
        "How closely are my recent meals matching my saved plan, and where am I drifting the most?",
    ),
    client_item(
        "workout_analysis",
        "reading the last 7 days of training",
        "Can you summarize my recent workouts and tell me what they say about my training quality?",
    ),
    client_item(
        "workout_analysis",
        "matching workout volume to fat-loss goals",
        "Does my current workout volume make sense for fat loss, or am I underdoing it or overdoing it?",
    ),
    client_item(
        "workout_analysis",
        "matching workout volume to muscle-gain goals",
        "Does my current training setup actually support muscle gain, or is it missing enough stimulus?",
    ),
    client_item(
        "workout_analysis",
        "checking muscle-group balance",
        "Do my recent sessions or plan look imbalanced across muscle groups or movement patterns?",
    ),
    client_item(
        "workout_analysis",
        "making upper-body work shoulder-safe",
        "What shoulder-safe exercise substitutions make the most sense for my upper-body days?",
    ),
    client_item(
        "workout_analysis",
        "making lower-body work knee-friendly",
        "How would you make my lower-body training more knee-friendly without making it useless?",
    ),
    client_item(
        "workout_analysis",
        "making training back-friendly",
        "What back-friendly changes would you make to my plan if I still want strength or fat-loss progress?",
    ),
    client_item(
        "workout_analysis",
        "adapting training to this week's equipment",
        "How should I adapt my workouts if my available equipment changes this week?",
    ),
    client_item(
        "workout_analysis",
        "building a home version of a gym day",
        "Can you turn one of my gym-style training days into a solid home session?",
    ),
    client_item(
        "workout_analysis",
        "building a gym version of a home day",
        "How would you upgrade a home-style workout day if I have full gym access now?",
    ),
    client_item(
        "workout_analysis",
        "knowing when to progress weights or reps",
        "Based on my recent logs, when should I increase weight, reps, or total volume?",
    ),
    client_item(
        "workout_analysis",
        "spotting training frequency that is too high or low",
        "Do my recent workouts suggest that my current training frequency is too much, too little, or about right?",
    ),
    client_item(
        "workout_analysis",
        "shortening sessions without losing the point",
        "How can I shorten my workouts when time is tight without losing the point of the plan?",
    ),
    client_item(
        "workout_analysis",
        "choosing the right warm-up emphasis",
        "What kind of warm-up focus makes sense for me given my history and the way I train?",
    ),
    client_item(
        "workout_analysis",
        "returning after time off",
        "How should I come back after travel, illness, or missed workouts without jumping in too hard?",
    ),
    client_item(
        "workout_analysis",
        "checking whether recovery spacing is realistic",
        "Does the way my plan is spaced across the week give me enough recovery?",
    ),
    client_item(
        "workout_analysis",
        "flagging higher-risk exercises",
        "Which exercises in my current plan look like the biggest risk given my injuries or medical flags?",
    ),
    client_item(
        "workout_analysis",
        "combining cardio with strength intelligently",
        "How should I combine cardio and strength so they help my goal instead of competing with each other?",
    ),
    client_item(
        "workout_analysis",
        "choosing the best workout split",
        "Which workout split fits me better right now based on my schedule, recovery, and goal?",
    ),
    client_item(
        "workout_analysis",
        "salvaging low-energy training days",
        "What is the best low-energy version of my workout day so I don't fully skip it?",
    ),
    client_item(
        "integrated_coaching",
        "combining food and training into one weekly review",
        "Can you give me one weekly review that combines my meals, workouts, and goal instead of treating them separately?",
    ),
    client_item(
        "integrated_coaching",
        "picking the highest-impact change for next week",
        "If you could change only a few things next week, what would give me the biggest return?",
    ),
    client_item(
        "integrated_coaching",
        "training and eating during fasting periods",
        "How should I adapt my meals and workouts during fasting periods so performance and adherence do not collapse?",
    ),
    client_item(
        "integrated_coaching",
        "eating differently on training versus rest days",
        "What should change between my training days and rest days if I want better results without overcomplicating it?",
    ),
    client_item(
        "integrated_coaching",
        "preventing weekend derailment",
        "What does my weekly pattern suggest about weekends, and how can I stop them from undoing the rest of my week?",
    ),
    client_item(
        "integrated_coaching",
        "handling a scale stall despite logging",
        "If my weight feels stalled even though I'm logging, what should I check first?",
    ),
    client_item(
        "integrated_coaching",
        "reading weight trend alongside logs",
        "How should I interpret my weight trend when I compare it with my meals and workouts?",
    ),
    client_item(
        "integrated_coaching",
        "making the plan work with an inconsistent schedule",
        "How can I make this plan work if my week changes a lot and I can't train or eat on the same schedule every day?",
    ),
    client_item(
        "integrated_coaching",
        "solving meal-prep burden",
        "How can I reduce meal-prep burden without losing control of calories, protein, or food quality?",
    ),
    client_item(
        "integrated_coaching",
        "keeping the plan affordable",
        "What would a lower-budget version of my current plan look like without becoming nutritionally weak?",
    ),
    client_item(
        "integrated_coaching",
        "handling cravings without blowing the week",
        "How should I handle cravings so they stop wrecking my calories or food choices?",
    ),
    client_item(
        "integrated_coaching",
        "hitting protein on a vegetarian or vegan pattern",
        "How can I hit protein properly if I want my plan to stay vegetarian or vegan?",
    ),
    client_item(
        "integrated_coaching",
        "creating variety with heavy restrictions",
        "How do I keep enough variety if my allergies, diet type, or ingredients already limit me a lot?",
    ),
    client_item(
        "integrated_coaching",
        "deciding what to focus on first this month",
        "What should I focus on first this month: food quality, meal timing, workout adherence, or training intensity?",
    ),
    client_item(
        "integrated_coaching",
        "prioritizing conflicting goals",
        "Which of my goals or habits are pulling against each other, and how should I prioritize them?",
    ),
    client_item(
        "recipe_support",
        "recipe ideas from current ingredients",
        "Can you suggest recipe ideas using what I already have while staying inside my restrictions and goal?",
    ),
    client_item(
        "recipe_support",
        "quick post-workout meals from what is on hand",
        "What quick post-workout meals fit my goal and the ingredients I'm likely to have?",
    ),
    client_item(
        "recipe_support",
        "late-night hunger options",
        "What are smart late-night options if I'm hungry but still want to stay on plan?",
    ),
    client_item(
        "recipe_support",
        "packable meals for work or school",
        "What kinds of portable meals or snacks would fit my plan when I'm away from home most of the day?",
    ),
    client_item(
        "recipe_support",
        "ordering food more safely and intelligently",
        "How should I order food out while respecting my allergies, diet type, and calorie target?",
    ),
    client_item(
        "recipe_support",
        "finding nearby places that fit the goal",
        "Which nearby gyms or nutritionists would make the most sense for my current goal and situation?",
    ),
    client_item(
        "recipe_support",
        "deciding between trainer help and nutritionist help",
        "Based on my current bottleneck, would a trainer or a nutritionist help me more right now?",
    ),
    client_item(
        "recipe_support",
        "preparing the first appointment questions",
        "What should I ask before booking or attending a first appointment with a trainer or dietitian?",
    ),
    client_item(
        "recipe_support",
        "writing a useful first message to a professional",
        "How should I explain my goals, logs, injuries, and restrictions in a first message so a professional can help quickly?",
    ),
    client_item(
        "recipe_support",
        "knowing when outside help is worth it",
        "When does it make sense to bring in a trainer or nutritionist instead of trying to solve this only with the app?",
    ),
    trainer_item(
        "summarizing a client's recent training pattern",
        "As a trainer, how would you summarize a client's recent workout pattern and decide the next coaching focus?",
    ),
    trainer_item(
        "seeing a plateau in client progress",
        "What plateau pattern do you see in this client's recent workouts and measurements?",
    ),
    trainer_item(
        "responding to missed sessions constructively",
        "What should I say to a client who keeps missing sessions but still wants fat-loss progress?",
    ),
    trainer_item(
        "adjusting a client plan for joint limitations",
        "How should I adjust a client plan when knee, shoulder, or back issues are limiting exercise choice?",
    ),
    trainer_item(
        "turning recent data into a progress note",
        "How can I turn this client's recent logs and measurements into a clear trainer progress note?",
    ),
    trainer_item(
        "preparing for a trainer appointment or check-in",
        "What talking points should I prepare before a client check-in based on their latest data?",
    ),
    trainer_item(
        "deciding when to involve a nutritionist",
        "When should a trainer clearly refer a client to a nutritionist instead of guessing on food issues?",
    ),
    trainer_item(
        "making a program more progressive from logs",
        "How would you turn this client's logged workouts into a more progressive next phase?",
    ),
    nutritionist_item(
        "summarizing a client's weekly food pattern",
        "As a nutritionist, how would you summarize a client's weekly eating pattern and main nutrition issues?",
    ),
    nutritionist_item(
        "adapting a diet plan for health constraints",
        "How should I adjust a client's diet plan when conditions like PCOS, diabetes, reflux, or IBS are part of the picture?",
    ),
    nutritionist_item(
        "giving useful feedback when logging is inconsistent",
        "What should I say to a client whose meal logging is inconsistent but who still wants meaningful nutrition feedback?",
    ),
    nutritionist_item(
        "improving adherence using past failure reasons",
        "How would you use a client's past diet failure reasons to make the next plan more realistic?",
    ),
    nutritionist_item(
        "preparing for a first nutrition appointment",
        "What should I review before a first nutrition appointment so the conversation is grounded in the client's real data?",
    ),
    nutritionist_item(
        "holding boundaries around pain and training advice",
        "When should a nutritionist stop and redirect training pain or injury questions to a trainer or clinician?",
    ),
    admin_item(
        "flagging users who may need support",
        "As an admin, what patterns would suggest a user needs support rather than more generic reminders?",
    ),
    admin_item(
        "reviewing a professional verification request",
        "What should an admin look for when a trainer or nutritionist verification request seems incomplete or unclear?",
    ),
    admin_item(
        "reading operational signals from admin activity",
        "What do recent admin actions, notifications, and review patterns suggest about operational issues in the platform?",
    ),
    admin_item(
        "finding unsafe or inconsistent food entries",
        "How can an admin spot food catalog entries that may create unsafe allergy or diet-tag problems?",
    ),
    admin_item(
        "judging trust in a nearby place listing",
        "How should an admin decide whether a local gym or nutritionist listing is trustworthy enough to keep visible?",
    ),
    admin_item(
        "prioritizing admin cleanup work",
        "If the admin team can only fix a few data quality issues first, what should be prioritized and why?",
    ),
    client_item(
        "advanced_client",
        "reading measurements without overreacting to noise",
        "How should I use my measurements and weight trend without overreacting to normal short-term fluctuations?",
    ),
    client_item(
        "advanced_client",
        "adjusting when weight drops but strength also drops",
        "If my weight is going down but my strength is also dropping, what should change first?",
    ),
    client_item(
        "advanced_client",
        "deciding what to fix when workouts are good but food logs are not",
        "If my workouts are consistent but my nutrition data is messy, where should I intervene first?",
    ),
    client_item(
        "advanced_client",
        "deciding what to fix when food logs are good but workouts are not",
        "If my meals are fairly consistent but my workouts keep falling off, what should I change?",
    ),
    client_item(
        "advanced_client",
        "moving from beginner to intermediate safely",
        "How do I know when I'm ready to move from a beginner routine to something more advanced?",
    ),
    client_item(
        "advanced_client",
        "reducing intensity after hard weeks",
        "How should I dial intensity or volume down after a stretch of hard weeks without losing momentum?",
    ),
    client_item(
        "advanced_client",
        "choosing between an AI plan and a trainer plan",
        "If my trainer's workout plan and my AI plan do not fully match, how should I decide what to follow?",
    ),
    client_item(
        "advanced_client",
        "choosing between an AI meal plan and a nutritionist plan",
        "If my dietitian's plan and my AI meal suggestions differ, how should I reconcile them?",
    ),
    client_item(
        "advanced_client",
        "asking the AI a better question",
        "What information should I include when I ask the AI for help so the answer is actually useful?",
    ),
    client_item(
        "advanced_client",
        "moving from deficit to maintenance at the right time",
        "How do I know when it makes sense to move from a calorie deficit to maintenance?",
    ),
])


def infer_context() -> dict:
    return {
        "platform_theme": "A Lebanese fitness, nutrition, and coaching platform that combines AI planning, meal tracking, workout logging, nearby gym and nutritionist discovery, messaging, appointments, and professional workflows.",
        "user_roles": [
            "client",
            "trainer",
            "nutritionist",
            "admin",
        ],
        "key_features": [
            "profile-based workout and diet planning",
            "meal tracking with food macros, allergens, meal types, and favorites",
            "workout plans, workout logs, and set-level tracking",
            "measurements and weight trend tracking",
            "AI plans, AI conversations, and AI usage logging",
            "nearby place discovery for gyms and nutritionists",
            "trainer and nutritionist discovery, assignments, messaging, and appointments",
            "admin oversight for users, professionals, foods, places, notifications, and action logs",
        ],
        "key_data_types": [
            "users with age, sex, height, weight, goals, diet type, allergies, activity level, workout location, workout days, and medical history",
            "user preferences that hold injuries and available equipment",
            "foods with calories, macros, allergens, allowed diets, ingredients, cuisine, and meal types",
            "meal_entries, meal_logs, water_intakes, and measurements",
            "workout_plans, workout_logs, workout_log_sets, and exercises with equipment and condition tags",
            "ai_plans, ai_requests, ai_conversations, ai_messages, and ai_feedback",
            "professional_client_assignments, professional_verifications, conversations, messages, appointments, notifications, and admin_action_logs",
            "places_local records for gyms and nutritionists with location, metadata, rating, and verification fields",
        ],
    }


def client_variations(item: dict) -> list[str]:
    subject = item["subject"]
    scope = CLIENT_DATA_SCOPE[item["category"]]
    return [
        item["base_question"],
        f"Looking at {scope}, what stands out about {subject} for me right now?",
        f"Can you review {scope} and tell me what it suggests about {subject}?",
        f"I don't want a generic answer. Based on {scope}, how should I handle {subject}?",
        f"If you were coaching me from my current Hayetak data, what would you change first about {subject}?",
        f"Can you break down what I'm doing well, what's off, and what to fix around {subject}?",
        f"Given my restrictions, schedule, and recent logs, what's the safest practical approach to {subject}?",
        f"If we only had one week to improve this, where would you start with {subject}?",
        f"How would you explain {subject} to me using my actual meals, workouts, plans, and profile instead of general advice?",
        f"What does my current data say I should keep, stop, and change around {subject}?",
    ]


def trainer_variations(item: dict) -> list[str]:
    subject = item["subject"]
    return [
        item["base_question"],
        f"Review this client's recent workouts, measurements, and notes and tell me what stands out about {subject}.",
        f"As a trainer, what should I focus on first here when the issue is {subject}?",
        f"I'm preparing for a client check-in. How would you analyze {subject} from the logged data?",
        f"What would you actually say to the client next if the main issue is {subject}?",
        f"How would you turn the recent Hayetak data into an action plan around {subject}?",
        f"What progress pattern, recovery issue, or risk do you see here related to {subject}?",
        f"If I only changed one part of the program, what would you adjust for {subject}?",
        f"Can you help me phrase clear trainer feedback about {subject} without sounding generic?",
        f"What is the safest coaching response to {subject} given the client's profile and limitations?",
    ]


def nutritionist_variations(item: dict) -> list[str]:
    subject = item["subject"]
    return [
        item["base_question"],
        f"Review this client's recent meals, restrictions, and notes and tell me what stands out about {subject}.",
        f"As a nutritionist, what should I focus on first here when the issue is {subject}?",
        f"I'm preparing for a client consult. How would you analyze {subject} from the logged data?",
        f"What would you actually tell the client next if the main issue is {subject}?",
        f"How would you turn the recent Hayetak data into a nutrition action plan around {subject}?",
        f"What adherence pattern, food-quality issue, or safety concern do you see here related to {subject}?",
        f"If I only changed one part of the nutrition plan, what would you adjust for {subject}?",
        f"Can you help me phrase clear dietitian feedback about {subject} without sounding generic?",
        f"What is the safest nutrition response to {subject} given the client's medical and training context?",
    ]


def admin_variations(item: dict) -> list[str]:
    subject = item["subject"]
    return [
        item["base_question"],
        f"Looking at current platform data, what should an admin notice first about {subject}?",
        f"How would you analyze {subject} using the users, approvals, logs, foods, and place records we already store?",
        f"If the admin team needs a fast read on risk, what matters most about {subject}?",
        f"What operational signal would make {subject} feel urgent instead of cosmetic?",
        f"Can you break down the likely causes, impact, and best first fix for {subject}?",
        f"If we only had time for one admin intervention this week, what would you do about {subject}?",
        f"How would you explain {subject} to the admin team in plain language with a clear next action?",
        f"What data would you trust, what would you verify manually, and what would you avoid assuming about {subject}?",
        f"What should an admin keep, change, or audit first when the issue is {subject}?",
    ]


def build_variations(item: dict) -> list[str]:
    audience = item["audience"]
    if audience == "client":
        variations = client_variations(item)
    elif audience == "trainer":
        variations = trainer_variations(item)
    elif audience == "nutritionist":
        variations = nutritionist_variations(item)
    else:
        variations = admin_variations(item)

    deduped = []
    seen = set()
    for text in variations:
        cleaned = " ".join(text.split())
        if cleaned not in seen:
            deduped.append(cleaned)
            seen.add(cleaned)

    if len(deduped) != 10:
        raise ValueError(f"Expected 10 variations, got {len(deduped)} for: {item['base_question']}")

    return deduped


def client_answer_types(subject: str, category: str) -> list[dict]:
    if category == "nutrition_analysis":
        concise = (
            f"For {subject}, I'd review your meal entries and weekly pattern, identify the biggest nutrition gap, "
            "and recommend two or three safe food or meal-structure changes that match your goal and restrictions."
        )
        analytical = (
            f"The analytical answer should compare calories, macros, meal timing, meal types, allergens, diet style, "
            f"and the 7-day trend to explain whether {subject} is mainly a planning issue, a consistency issue, or both."
        )
        coaching = (
            f"The coaching version should turn {subject} into a practical next-week plan with specific swaps, prep ideas, "
            "and what to monitor next in the logs."
        )
    elif category == "workout_analysis":
        concise = (
            f"For {subject}, I'd compare your logs and current plan against your goal, recovery room, equipment, "
            "and injury history, then recommend the safest high-value adjustment."
        )
        analytical = (
            f"The analytical answer should separate exercise choice, training frequency, workload, plan design, and log quality "
            f"to explain what is really driving {subject}."
        )
        coaching = (
            f"The coaching version should convert {subject} into a clear instruction for the next session or next training week, "
            "including what to keep, reduce, swap, or progress."
        )
    else:
        concise = (
            f"For {subject}, I'd keep the recommendation grounded in your profile, restrictions, and recent consistency "
            "instead of chasing the most aggressive option."
        )
        analytical = (
            f"The analytical answer should compare your goal, diet type, allergies, injury history, workout setup, saved plans, "
            f"and recent logs to explain whether {subject} is limited by plan design or by adherence."
        )
        coaching = (
            f"The coaching version should translate {subject} into a short weekly action plan: what to keep, what to reduce, "
            "what to swap, and what to review next."
        )

    fallback = (
        "If the needed logs, measurements, plan data, or safety details are missing, the assistant should say that clearly, "
        "avoid overconfident advice, and give the safest default next steps until more data is available."
    )

    return [
        {
            "answer_type": "concise_answer",
            "user_role_or_context": "client",
            "answer": concise,
        },
        {
            "answer_type": "analytical_answer",
            "user_role_or_context": "client",
            "answer": analytical,
        },
        {
            "answer_type": "coaching_answer",
            "user_role_or_context": "client",
            "answer": coaching,
        },
        {
            "answer_type": "fallback_answer",
            "user_role_or_context": "missing_data",
            "answer": fallback,
        },
    ]


def trainer_answer_types(subject: str) -> list[dict]:
    return [
        {
            "answer_type": "role_specific_answer",
            "user_role_or_context": "trainer",
            "answer": (
                f"For {subject}, I'd summarize the client's recent workout pattern, measurements, and reported limits first, "
                "then give a coaching recommendation that is specific, progressive, and easy to communicate."
            ),
        },
        {
            "answer_type": "analytical_answer",
            "user_role_or_context": "trainer",
            "answer": (
                f"The analytical answer should separate plan-design issues from adherence issues, flag any injury or recovery risk, "
                f"and identify the one variable most worth changing next for {subject}."
            ),
        },
        {
            "answer_type": "coaching_message_answer",
            "user_role_or_context": "trainer",
            "answer": (
                f"The trainer-facing response should end with a short message you could actually send the client about {subject}: "
                "supportive, direct, and focused on the next action instead of blame."
            ),
        },
        {
            "answer_type": "fallback_or_boundary_answer",
            "user_role_or_context": "sparse_logs_or_out_of_scope",
            "answer": (
                "If logs are sparse or the issue clearly crosses into nutrition or medical territory, the assistant should say that "
                "explicitly and suggest referral or more data collection before making stronger calls."
            ),
        },
    ]


def nutritionist_answer_types(subject: str) -> list[dict]:
    return [
        {
            "answer_type": "role_specific_answer",
            "user_role_or_context": "nutritionist",
            "answer": (
                f"For {subject}, I'd summarize the client's recent meal pattern, restrictions, medical context, and adherence level first, "
                "then recommend the most realistic nutrition change."
            ),
        },
        {
            "answer_type": "analytical_answer",
            "user_role_or_context": "nutritionist",
            "answer": (
                f"The analytical answer should separate food-quality issues, energy balance issues, symptom triggers, and logging gaps "
                f"so the reasoning behind {subject} is transparent."
            ),
        },
        {
            "answer_type": "coaching_message_answer",
            "user_role_or_context": "nutritionist",
            "answer": (
                f"The nutritionist-facing response should end with language you could send to the client about {subject}: "
                "clear, practical, non-judgmental, and tied to the next step."
            ),
        },
        {
            "answer_type": "fallback_or_boundary_answer",
            "user_role_or_context": "sparse_logs_or_out_of_scope",
            "answer": (
                "If logging is too thin or the question turns into pain management, diagnosis, or exercise prescription, the assistant "
                "should say so and redirect to the right professional or ask for more evidence first."
            ),
        },
    ]


def admin_answer_types(subject: str) -> list[dict]:
    return [
        {
            "answer_type": "operational_summary_answer",
            "user_role_or_context": "admin",
            "answer": (
                f"For {subject}, I'd summarize the pattern in plain language, explain why it matters for safety, trust, or operations, "
                "and recommend the lowest-effort high-impact fix first."
            ),
        },
        {
            "answer_type": "analytical_answer",
            "user_role_or_context": "admin",
            "answer": (
                f"The analytical answer should separate isolated noise from systemic problems and explain what repeated signals "
                f"would make {subject} worth escalating."
            ),
        },
        {
            "answer_type": "action_plan_answer",
            "user_role_or_context": "admin",
            "answer": (
                f"The admin answer should end with a concrete review sequence, cleanup checklist, or escalation path for {subject} "
                "instead of a vague observation."
            ),
        },
        {
            "answer_type": "fallback_answer",
            "user_role_or_context": "insufficient_admin_data",
            "answer": (
                "If the available evidence is too thin, the assistant should avoid guessing intent and recommend which logs, samples, "
                "or records an admin should inspect next."
            ),
        },
    ]


def build_answer_types(item: dict) -> list[dict]:
    if item["audience"] == "client":
        return client_answer_types(item["subject"], item["category"])
    if item["audience"] == "trainer":
        return trainer_answer_types(item["subject"])
    if item["audience"] == "nutritionist":
        return nutritionist_answer_types(item["subject"])
    return admin_answer_types(item["subject"])


def build_dataset() -> dict:
    if len(ITEMS) != 110:
        raise ValueError(f"Expected 110 base items, found {len(ITEMS)}")

    base_questions = [item["base_question"] for item in ITEMS]
    if len(base_questions) != len(set(base_questions)):
        raise ValueError("Base questions must be unique.")

    records = []
    for index, item in enumerate(ITEMS, start=1):
        records.append(
            {
                "id": index,
                "category": item["category"],
                "audience": item["audience"],
                "base_question": item["base_question"],
                "variations": build_variations(item),
                "relevant_answer_types": build_answer_types(item),
            }
        )

    return {
        "inferred_context": infer_context(),
        "items": records,
    }


def main() -> None:
    dataset = build_dataset()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(dataset['items'])} items to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
