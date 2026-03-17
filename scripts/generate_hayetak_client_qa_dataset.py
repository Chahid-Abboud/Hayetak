import importlib.util
import json
import re
from difflib import SequenceMatcher
from pathlib import Path


BASE_QUESTION_COUNT = 150
VARIANTS_PER_QUESTION = 21
OUTPUT_PATH = Path(f"storage/app/ai/training/hayetak_client_qa_dataset_{BASE_QUESTION_COUNT}x{VARIANTS_PER_QUESTION}.json")
EXCLUDED_CLIENT_IDS: set[int] = set()
EXCLUDED_PHRASES = {
    "sign up",
    "signup",
    "register",
    "registration",
    "create account",
    "email verification",
    "verify email",
    "trainer-only",
    "nutritionist-only",
    "admin workflow",
}
PROFILE_SCOPE = "my profile, goals, restrictions, saved plans, and recent Hayetak logs"
NUTRITION_SCOPE = "my recent meal entries, food choices, weekly eating pattern, and restrictions"
WORKOUT_SCOPE = "my current workout plan, workout logs, equipment, and injury history"
BLENDED_SCOPE = "my profile plus the last 7 days of meals, workouts, and progress trends"
SUPPORT_SCOPE = "my goal, restrictions, recent logs, nearby options, and current routine"

COMMON_ANSWER_RULES = [
    "Answer only as Hayetak's post-registration client assistant.",
    "Use only client-facing Hayetak features and tracked data that fit the question.",
    "Never recommend foods that violate allergies or diet type.",
    "Respect medical history, injury constraints, and safer alternatives.",
    "Prefer practical next steps over generic theory.",
]

EXPANDED_CLIENT_RECORDS = [
    {
        "feature": "dashboard",
        "intent": "dashboard_help",
        "family": "ui_explainer",
        "subject": "why edited historical logs can change how today's dashboard feels",
        "base_question": "My dashboard changed after I edited older meal logs. What should I pay attention to first when today's cards look different?",
        "core_answer": "Start by checking whether today's totals still match today's actual entries, then read the dashboard as a current snapshot instead of a permanent verdict. Historical edits can change rolling context or recent summaries, but the practical question is whether today's calories, protein, water, and active plans still support what you need to do now.",
    },
    {
        "feature": "goal_and_plan_strategy",
        "intent": "goals_preferences_help",
        "family": "ui_action",
        "action": "update my main goal so Hayetak stops using the old goal logic",
        "base_question": "If I change from fat loss to maintenance or muscle gain, where should I update that so Hayetak stops pushing the old goal?",
        "core_answer": "Update your main goal from the profile or preferences area that drives plan generation and guidance, then recheck the affected plan or dashboard screens afterward. The important part is changing the saved goal where Hayetak reads it from, not assuming one summary card updates everything by itself.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "ui_troubleshoot",
        "action": "why Hayetak still seems to use my old allergy or medical information after I updated it",
        "base_question": "What should I check if I updated allergies or medical notes but the advice still feels based on my old information?",
        "core_answer": "That usually means one of the safety fields did not save where the coach or planner actually reads it, or an older plan is still the active reference. Reopen the restriction and medical-history screen, confirm the latest values are saved there, then review the active plan or recent answer through the new safety data before judging the result.",
    },
    {
        "feature": "nutrition_plan_decisions",
        "intent": "nutrition_plan_help",
        "family": "strategy",
        "subject": "using an AI nutrition plan when the meal timing does not fit my day",
        "scope": PROFILE_SCOPE,
        "base_question": "How should I use an AI nutrition plan if the foods look fine but the meal timing does not fit my work schedule?",
        "core_answer": "Keep the plan's structure and targets, then move meals into time slots you can actually repeat instead of abandoning the whole plan. The best version is the one where protein, calories, restrictions, and appetite management still work inside your real day.",
    },
    {
        "feature": "workout_plan_decisions",
        "intent": "workout_plan_help",
        "family": "strategy",
        "subject": "using an AI workout plan that looks good but is not realistic for my week",
        "scope": WORKOUT_SCOPE,
        "base_question": "What should I do if my AI workout plan looks good on paper but the weekly schedule is not realistic for my life right now?",
        "core_answer": "Shrink the schedule before you abandon the plan. Keep the sessions that carry the most value for your goal, drop low-value extras first, and rebuild the week around the number of training days you can actually protect consistently.",
    },
    {
        "feature": "ai_assistant_usage",
        "intent": "ai_assistant_help",
        "family": "strategy",
        "subject": "asking the coach for specific help instead of generic answers",
        "scope": SUPPORT_SCOPE,
        "base_question": "How should I phrase a coach question inside Hayetak so the answer uses my logs and profile instead of sounding generic?",
        "core_answer": "Ask with a real decision, not a broad topic. Include your goal, the most relevant recent meals or workouts, your restrictions, and what you are trying to solve this week so the coach can respond to your actual pattern instead of filling gaps with generic advice.",
    },
    {
        "feature": "favorites",
        "intent": "favorites_help",
        "family": "ui_action",
        "action": "reuse my saved favorites while keeping portions accurate",
        "base_question": "What is the best way to use favorites so repeating meals is faster without losing accuracy on portions?",
        "core_answer": "Use favorites to pull common foods in quickly, then check the serving size or grams before you save the entry for that day. Favorites should remove search friction, but the final portion still needs to match what you actually ate.",
    },
    {
        "feature": "notifications",
        "intent": "notifications_help",
        "family": "ui_explainer",
        "subject": "which notifications need action now versus which ones I can clear later",
        "base_question": "How should I tell which notifications need action now versus the ones I can safely clear later?",
        "core_answer": "Treat notifications as a priority list, not just a feed. Messages, appointment updates, and anything tied to a blocked task matter first, while informational items can usually be read and cleared once they stop affecting your next step.",
    },
    {
        "feature": "nearby_professional_support",
        "intent": "nearby_help",
        "family": "ui_troubleshoot",
        "action": "why Nearby still is not showing useful gyms or professionals around me",
        "base_question": "What should I check if Nearby is on but I still do not see useful gyms or professionals around me?",
        "core_answer": "Start by checking location permission, your current map area, and whether the active filters are too narrow for the goal you chose. If those look right, widen the radius or refresh the search so you are not treating a filter mismatch like a true lack of options.",
    },
    {
        "feature": "messaging",
        "intent": "messaging_help",
        "family": "support",
        "subject": "writing a first message that gets a useful reply from a trainer or dietitian",
        "scope": SUPPORT_SCOPE,
        "base_question": "What kind of first message usually gets me a more useful reply from a trainer or dietitian?",
        "core_answer": "Lead with your goal, the main limit or restriction that matters, and the exact decision or problem you want help with now. A short specific message gets a better response than a vague hello followed by scattered details later.",
    },
    {
        "feature": "appointments",
        "intent": "appointments_help",
        "family": "support",
        "subject": "preparing the right context before I request an appointment",
        "scope": SUPPORT_SCOPE,
        "base_question": "How should I prepare before I request an appointment so the professional already has the right context?",
        "core_answer": "Prepare a short summary of your goal, current restriction or injury issues, the plan or habit that is not working, and the main outcome you want from the appointment. Clear context before booking usually leads to a more useful session and less back-and-forth afterward.",
    },
    {
        "feature": "settings",
        "intent": "settings_help",
        "family": "ui_troubleshoot",
        "action": "why a settings change seems saved on one page but not reflected across the app",
        "base_question": "What should I check if I changed a setting on one screen but the rest of the app still behaves like the old setup?",
        "core_answer": "That usually means the change was made in a page that displays the setting, not the one that owns it, or the latest value did not save completely. Recheck the source setting screen first, confirm the new value there, then reload the places that read from it.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "protein on target but calories drifting from small extras",
        "scope": NUTRITION_SCOPE,
        "base_question": "What does it usually suggest if my protein is close to target but calories still keep overshooting from small extras?",
        "core_answer": "It usually means the main meals are doing their job but the unplanned energy around them is quietly deciding the total. Drinks, sauces, bites while cooking, desserts, and repeated add-ons can erase a good protein structure if they happen often enough.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "recipe",
        "subject": "building a grocery list that supports repeatable weekday meals",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I build a grocery list that supports my diet type and makes weekday meals easier to log and repeat?",
        "core_answer": "Build the list around repeatable protein anchors, one or two easy carb bases, vegetables you actually use, and simple backups for busy days. The best grocery plan is the one that reduces decision fatigue and makes accurate logging easier, not the one with the longest ingredient list.",
    },
    {
        "feature": "recipe_and_food_support",
        "intent": "meal_tracking_help",
        "family": "recipe",
        "subject": "ordering a restaurant meal that stays high-protein and restriction-aware",
        "scope": NUTRITION_SCOPE,
        "base_question": "What is the smartest way to choose a restaurant meal when I want something high-protein but still inside my restrictions?",
        "core_answer": "Start with the protein and safety check first, then choose the simplest sides and cooking style that keep the meal workable. A slightly boring safe order that you can repeat is usually better than a risky option that fits your calories on paper but ignores allergies, diet type, or trigger foods.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "night hunger even when calories look reasonable",
        "scope": NUTRITION_SCOPE,
        "base_question": "If my calories look reasonable overall but I still stay hungry most nights, what does that usually say about my meal structure?",
        "core_answer": "It usually points to weak fullness earlier in the day, not necessarily a broken calorie target. Low protein, low fiber, long gaps between meals, or saving too much food for the evening often create night hunger even when the daily total looks acceptable.",
    },
    {
        "feature": "meal_tracking",
        "intent": "meal_tracking_help",
        "family": "ui_action",
        "action": "log repeated breakfasts and snacks faster without losing serving accuracy",
        "base_question": "How can I log the same breakfasts and snacks faster when I eat them often but still want accurate portions?",
        "core_answer": "Reuse familiar foods or favorites to save time, then adjust the serving size or grams before you finish the entry. The fast version should still reflect what you actually ate that day, not just a default portion you stopped checking.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "nutrition",
        "subject": "handling sugar cravings when strict restriction keeps backfiring with my medical context",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I think about sugar cravings when aggressive restriction keeps backfiring for me and I also have medical limits to respect?",
        "core_answer": "Treat the pattern, not just the craving. Extreme restriction often makes cravings rebound harder, so the safer move is to stabilize meals, include enough protein and planned satisfaction, and avoid strategies that clash with your medical context just to force fast control.",
    },
    {
        "feature": "nutrition_plan_decisions",
        "intent": "nutrition_plan_help",
        "family": "strategy",
        "subject": "deciding what to keep from AI meal suggestions versus foods I already tolerate",
        "scope": PROFILE_SCOPE,
        "base_question": "How do I compare an AI meal suggestion with the foods I already tolerate and decide what is actually worth keeping?",
        "core_answer": "Keep the parts that improve structure, protein, adherence, or safety, and swap out the rest for tolerated foods with a similar job. A plan becomes more useful when it respects what you can already repeat instead of pretending every good idea needs a full food overhaul.",
    },
    {
        "feature": "meal_tracking_and_food_support",
        "intent": "meal_tracking_help",
        "family": "support",
        "subject": "logging a local dish honestly when the exact food entry is missing",
        "scope": SUPPORT_SCOPE,
        "base_question": "What should I do when I cannot find the exact local dish I ate but I still want an honest log?",
        "core_answer": "Choose the closest reasonable match, adjust the portion honestly, and treat the goal as useful consistency rather than fake precision. A slightly rough but truthful entry is more valuable than skipping the meal because the catalog does not mirror the dish perfectly.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "whether low training energy is more likely from low carbs than general tiredness",
        "scope": NUTRITION_SCOPE,
        "base_question": "How can I tell if low energy in training is more likely from under-eating carbs than from just being generally tired?",
        "core_answer": "Look for a pattern between low-carb days and flatter training sessions, especially if recovery, sleep, and motivation are otherwise decent. If performance improves when carbs are placed better around training, the issue was probably fuel structure more than general fatigue alone.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "keeping protein up when meetings delay my normal meals",
        "scope": NUTRITION_SCOPE,
        "base_question": "What snack or meal pattern helps me protect protein when work meetings keep pushing my normal meals later?",
        "core_answer": "Keep a portable protein backup that does not depend on a perfect schedule, and use it before you get overly hungry. The point is to protect the day from sliding into random late eating, not to hold out for an ideal full meal that never happens.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "nutrition",
        "subject": "handling foods that fit calories but usually trigger digestion issues",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I handle foods that technically fit my calories but usually trigger digestion issues for me?",
        "core_answer": "Do not let calorie math overrule a predictable symptom pattern. If a food repeatedly causes digestive trouble, the better move is to replace it with something you tolerate and can sustain, especially when your profile already points to a sensitive gut or medical constraint.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "eating out weekly without distorting the whole calorie average",
        "scope": NUTRITION_SCOPE,
        "base_question": "If I want to eat out once or twice a week, how do I stop those meals from distorting the whole weekly calorie average?",
        "core_answer": "Protect the weekly average by keeping the rest of the week structured and by avoiding the mindset that one restaurant meal ruins everything. When the surrounding meals stay stable and the restaurant choices stay honest, eating out becomes part of the plan instead of the reason the plan falls apart.",
    },
    {
        "feature": "progress_and_measurements",
        "intent": "progress_help",
        "family": "strategy",
        "subject": "scale flat but performance and measurements improving",
        "scope": BLENDED_SCOPE,
        "base_question": "What should I focus on first if the scale is flat but my workout performance and measurements are improving?",
        "core_answer": "Trust the multi-signal picture before you panic over the scale alone. If performance and measurements are moving in the right direction, the better interpretation is often that body composition or retention is masking scale change, not that progress stopped.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "adapting the week to three sessions instead of five",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I adapt my training week if I can only make three sessions consistently instead of five?",
        "core_answer": "Compress the plan around the movements and days that carry the most value for your goal. Three consistent sessions with clear progression usually beat five planned sessions that you rarely complete the way they were written.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "starting strong early in the week and fading by the later sessions",
        "scope": WORKOUT_SCOPE,
        "base_question": "What do my logs usually suggest if I start strong early in the week and then every later session feels weaker?",
        "core_answer": "That pattern usually points to recovery or weekly structure, not a motivation problem. Too much early fatigue, poor exercise ordering, weak nutrition support, or not enough recovery spacing can leave the later sessions carrying the cost of the first ones.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "choosing home substitutes without losing the main training effect",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I choose home substitutes for gym exercises without losing the main training effect?",
        "core_answer": "Match the job of the exercise before you match the exact movement. If the original exercise built a squat pattern, horizontal push, hinge, or pull, choose a home version that still trains that pattern well enough to keep progressing safely.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "workout",
        "subject": "keeping lower-body training moving with a knee limitation",
        "scope": WORKOUT_SCOPE,
        "base_question": "What is the safest way to keep lower-body training moving when a knee issue limits some patterns?",
        "core_answer": "Keep training the lower body through tolerable ranges, stable patterns, and exercises that let you control pain and load. The goal is to preserve strength and confidence without forcing the exact movement that keeps provoking the knee.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "deciding between lowering volume and pushing closer to real effort",
        "scope": WORKOUT_SCOPE,
        "base_question": "How can I tell whether I need to lower volume or just push closer to real effort on the sets that matter?",
        "core_answer": "Look at whether fatigue is high without clear progression, or whether the work simply stays too comfortable to drive change. If you are doing a lot but not improving, volume may be the issue; if the important sets never get challenging enough, effort is probably the first lever.",
    },
    {
        "feature": "progress_and_measurements",
        "intent": "progress_help",
        "family": "strategy",
        "subject": "reading progress when water retention makes scale weight noisy",
        "scope": BLENDED_SCOPE,
        "base_question": "Which progress signal should I trust most when water retention is making scale weight noisy for a few days?",
        "core_answer": "Zoom out to trend, not day-to-day noise. Measurements, gym performance, how consistently the plan is being followed, and a multi-day weight average usually tell a better story than reacting to one short stretch of retention.",
    },
    {
        "feature": "workout_plan_decisions",
        "intent": "workout_plan_help",
        "family": "strategy",
        "subject": "judging whether an AI workout plan is too advanced or too easy",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I judge whether an AI workout plan is too advanced, too easy, or about right for my current level?",
        "core_answer": "Judge it by recoverable challenge, not by how impressive it looks. A good plan feels demanding but repeatable, lets you progress on key lifts or patterns, and does not keep colliding with your schedule, pain limits, or recovery reality.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "logging interrupted workouts honestly and usefully",
        "scope": WORKOUT_SCOPE,
        "base_question": "What is the smartest way to log a workout that I had to stop halfway through?",
        "core_answer": "Log what you actually completed, note the interruption if it changes how you want to read the session later, and move on without pretending it was either a full success or a total failure. Honest partial data is still useful for trend reading and plan adjustment.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "balancing core work and mobility without crowding out the main training",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I balance core work and mobility without letting them crowd out the main training that drives my goal?",
        "core_answer": "Treat core and mobility as support work with a clear job, not as a reason the main lifts disappear. Keep enough of them to improve control and movement quality, then protect the session time that actually moves your primary goal forward.",
    },
    {
        "feature": "progress_and_measurements",
        "intent": "progress_help",
        "family": "strategy",
        "subject": "training consistently without seeing much visual change yet",
        "scope": BLENDED_SCOPE,
        "base_question": "What does it usually mean if I am training consistently but not seeing much visual change yet?",
        "core_answer": "It usually means either the timeline is still short, the nutrition side is not aligned tightly enough with the goal, or the progress is showing up in ways you are not measuring well yet. Consistency matters, but it still has to be paired with the right food pattern and enough time for visible change.",
    },
    {
        "feature": "advanced_training_decisions",
        "intent": "workout_planner_help",
        "family": "strategy",
        "subject": "keeping motivation while using safer regressions for pain or low confidence",
        "scope": WORKOUT_SCOPE,
        "base_question": "How do I keep motivation up when the safest move right now is a regression or simpler exercise variation?",
        "core_answer": "Tie motivation to progress you can actually repeat, not to the ego of the harder version. A safer regression that lets you train consistently, rebuild trust, and improve over time is more useful than an advanced variation that keeps stalling you or flaring symptoms.",
    },
]

FAMILY_RELEVANT_CONTEXT = {
    "strategy": [
        "profile and goals",
        "saved nutrition and workout plans",
        "today's logs",
        "last 7 days of meals and workouts",
        "measurements or progress trend",
        "restrictions and recovery limits",
    ],
    "nutrition": [
        "diet type and allergies",
        "medical history that affects food choices",
        "today's meal logs and macro totals",
        "last 7 days of eating pattern",
        "available ingredients or meal timing constraints",
    ],
    "workout": [
        "goal and training frequency",
        "active workout plan",
        "recent workout logs",
        "equipment access",
        "injury history and pain triggers",
        "recovery pattern",
    ],
    "blended": [
        "profile and main goal",
        "restrictions and safety limits",
        "today's meals and workout status",
        "last 7 days summary",
        "active plans",
        "recent progress signals",
    ],
    "recipe": [
        "diet type and allergies",
        "available ingredients",
        "equipment or cooking limits",
        "meal timing",
        "current calorie and macro direction",
    ],
    "support": [
        "current goal and restriction summary",
        "relevant nearby, messaging, appointment, or settings state",
        "recent context that explains why the user is asking now",
    ],
    "ui_action": [
        "the screen that owns the feature",
        "the saved value or setting that drives the feature",
        "where the result should appear after saving",
    ],
    "ui_troubleshoot": [
        "the expected client flow",
        "the screen or saved state the feature depends on",
        "the missing or stale value most likely causing the issue",
    ],
    "ui_explainer": [
        "the card, metric, or status the user is viewing",
        "the related goal or target",
        "the next decision the user should make from that signal",
    ],
}

FAMILY_ANSWER_FOCUS = {
    "strategy": "coach-like interpretation of profile, plans, logs, and progress into one practical next move",
    "nutrition": "nutrition guidance tied to real logs, restrictions, meal structure, and sustainability",
    "workout": "training guidance tied to real logs, equipment, safety, and recoverable progression",
    "blended": "joined-up coaching that combines meals, workouts, restrictions, and recent consistency signals",
    "recipe": "realistic food or recipe guidance that fits restrictions, ingredients, and repeatability",
    "support": "practical client support that points to the right in-app feature or human support path",
    "ui_action": "the cleanest client action flow and the right source-of-truth screen",
    "ui_troubleshoot": "the likeliest missing input, stale state, or wrong screen causing the issue",
    "ui_explainer": "what the shown metric means and which signal matters first",
}

COACH_VARIANT_LENSES = [
    "direct_answer",
    "standout_signal_review",
    "full_profile_review",
    "real_data_not_generic",
    "first_change_if_coaching",
    "what_is_working_vs_blocking",
    "safest_practical_approach",
    "next_7_days_priority",
    "plain_language_explanation",
    "keep_stop_change_summary",
    "outside_observer_read",
    "pattern_priority_call",
    "simplify_the_plan",
    "main_adjustment_before_speed",
    "realistic_month_view",
    "smartest_short_summary",
    "blocking_pattern_to_fix",
    "first_priority_if_goal_stays_the_same",
    "main_risk_to_avoid",
    "tighten_without_more_complexity",
    "repeatable_habit_to_keep",
]

UI_ACTION_VARIANT_LENSES = [
    "direct_action",
    "open_the_right_screen",
    "source_of_truth_navigation",
    "check_saved_data_first",
    "most_likely_step_missed",
    "cleanest_flow",
    "verify_before_assuming_bug",
    "two_step_confirm_then_verify",
    "plain_language_action",
    "keep_stop_change_flow",
    "first_screen_that_matters",
    "confirm_the_result_saved",
    "edit_then_recheck_display",
    "stop_retrying_blindly",
    "quick_fix_path",
    "single_high_value_check",
    "owning_screen_first",
    "change_then_verify_pattern",
    "safest_way_to_retry",
    "short_version",
    "edit_the_real_source_of_truth",
]

UI_TROUBLESHOOT_VARIANT_LENSES = [
    "direct_troubleshooting_answer",
    "highest_value_first_check",
    "single_first_signal",
    "most_likely_reason",
    "common_missing_dependency",
    "clean_confirmation_step",
    "verify_linked_data_before_bug_assumption",
    "start_here_today",
    "plain_language_issue",
    "feature_input_page_state_check",
    "first_useful_signal",
    "partial_flow_mismatch",
    "basic_checks_before_escalation",
    "source_screen_then_display_screen",
    "common_missed_dependency",
    "short_troubleshooting_version",
    "stale_value_vs_real_bug",
    "trace_what_changed",
    "safest_assumption",
    "dependency_trace",
    "single_saved_state_check",
]

UI_EXPLAINER_VARIANT_LENSES = [
    "direct_metric_explanation",
    "what_to_watch_first",
    "main_signal_summary",
    "read_as_guidance_not_perfection",
    "most_useful_part",
    "what_matters_most",
    "plain_interpretation",
    "where_to_start_if_confusing",
    "plain_language_metric_read",
    "decision_support_frame",
    "use_for_next_decision",
    "avoid_overfocusing_on_volume",
    "today_vs_pattern_read",
    "guidance_not_score",
    "trust_the_interpretation_that_changes_action",
    "return_to_one_signal_if_noisy",
    "short_version",
    "why_context_matters",
    "read_as_priorities_not_pressure",
    "cleanest_interpretation_start",
    "smaller_smarter_adjustment",
]


def load_module(filename: str, module_name: str):
    source = Path(__file__).with_name(filename)
    spec = importlib.util.spec_from_file_location(module_name, source)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)

    return module


def clean(text: str) -> str:
    return " ".join(str(text).split())


def normalize(text: str) -> str:
    text = clean(text).lower()
    text = re.sub(r"[^a-z0-9 ]+", " ", text)

    return " ".join(text.split())


def similarity(left: str, right: str) -> float:
    return SequenceMatcher(None, normalize(left), normalize(right)).ratio()


def symmetric_token_difference(left: str, right: str) -> int:
    return len(set(normalize(left).split()) ^ set(normalize(right).split()))


def prefixed(prefix: str, text: str) -> str:
    return clean(f"{prefix} {text}")


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", clean(text))

    return [part.strip() for part in parts if part.strip()]


def lower_first(text: str) -> str:
    text = clean(text)
    if not text:
        return text

    return text[0].lower() + text[1:]


def ensure_period(text: str) -> str:
    text = clean(text)
    if not text:
        return text
    if text[-1] in ".!?":
        return text

    return f"{text}."


def merge_answer(lead: str, rest: str = "") -> str:
    lead = ensure_period(lead)
    if rest:
        return clean(f"{lead} {rest}")

    return lead


def strip_leading_condition(sentence: str) -> str:
    sentence = clean(sentence)
    for prefix in ("That usually means ", "This usually means ", "That means ", "This means "):
        if sentence.startswith(prefix):
            tail = sentence[len(prefix):].strip()
            if tail:
                return tail[0].upper() + tail[1:]
    for prefix in ("If ", "When ", "While ", "After "):
        if sentence.startswith(prefix) and "," in sentence:
            tail = sentence.split(",", 1)[1].strip()
            if tail:
                return tail[0].upper() + tail[1:]

    return sentence


def first_and_rest(core: str) -> tuple[str, str, str]:
    sentences = split_sentences(core)
    first = sentences[0]
    first_direct = strip_leading_condition(first)
    rest = " ".join(sentences[1:])

    return first, first_direct, rest


def that_clause(sentence: str) -> str:
    sentence = clean(sentence).rstrip(".!?")
    if not sentence:
        return sentence
    if is_imperative(sentence):
        return f"that you should {lower_first(sentence)}"

    return f"that {lower_first(sentence)}"


def is_imperative(sentence: str) -> bool:
    first_word = clean(sentence).split(" ", 1)[0].lower()
    return first_word in {
        "keep",
        "use",
        "move",
        "build",
        "choose",
        "pick",
        "handle",
        "turn",
        "focus",
        "restart",
        "lower",
        "increase",
        "reduce",
        "protect",
        "trust",
        "let",
        "update",
        "go",
        "find",
        "request",
        "edit",
        "open",
        "check",
        "read",
        "mark",
        "dismiss",
        "change",
        "set",
        "bring",
        "place",
        "compare",
        "treat",
        "dial",
        "ask",
        "review",
        "lead",
        "stock",
        "make",
        "do",
    }


def extract_focus_phrase(sentence: str) -> str:
    text = clean(sentence).rstrip(".!?")
    lowered = text.lower()
    if "; it is " in lowered:
        return text[lowered.index("; it is ") + len("; it is "):].strip()

    patterns = [
        "the fix is ",
        "the easiest fix is ",
        "the right answer is ",
        "the fastest upgrade is ",
        "the safest next step is ",
        "the best pattern is ",
        "the goal is ",
        "the first thing to check is ",
    ]
    for pattern in patterns:
        if pattern in lowered:
            return text[lowered.index(pattern) + len(pattern):].strip()

    return text


def coach_answers(core: str) -> list[str]:
    first, first_direct, rest = first_and_rest(core)
    if is_imperative(first_direct):
        action_source = first_direct
    elif rest:
        action_source = extract_focus_phrase(rest)
    else:
        action_source = extract_focus_phrase(first_direct)

    action = ensure_period(first_direct)
    suggestion = ensure_period(f"It suggests {that_clause(first_direct)}")
    plain = ensure_period(f"In simple terms, {lower_first(first_direct)}")
    safest = ensure_period(f"The safest practical answer is {first_direct}")
    weekly = ensure_period(f"For the next 7 days, make this the priority: {action_source}")
    first_change = ensure_period(f"Change this first: {action_source}")
    biggest = ensure_period(f"The biggest signal is {that_clause(first_direct)}")
    keep_stop_change = ensure_period(
        f"Keep the habits that already support this direction, stop the pattern that keeps pushing against it, and change the plan by doing this: {action_source}"
    )
    what_is_happening = ensure_period(
        f"What is helping is whatever already matches this direction. What is getting in the way is the pattern your logs keep repeating. Start with this: {action_source}"
    )

    return [
        ensure_period(core),
        merge_answer(biggest, rest),
        merge_answer(suggestion, rest),
        merge_answer(action, rest),
        first_change,
        what_is_happening,
        merge_answer(safest, rest),
        weekly,
        merge_answer(plain, rest),
        keep_stop_change,
        merge_answer(f"If you want the shortest answer, {lower_first(first_direct)}", rest),
        merge_answer(f"What your data is pointing to is {that_clause(first_direct)}", rest),
        ensure_period(f"The practical coaching call is this: {action_source}"),
        ensure_period(f"If this feels too complicated, simplify it to this: {action_source}"),
        ensure_period(f"The lever most likely to change your result is this: {action_source}"),
        ensure_period(f"What you should avoid is overcomplicating it when the main need is this: {action_source}"),
        ensure_period(f"For the next month, keep coming back to this: {action_source}"),
        ensure_period(f"The version most likely to stick is the one where you do this consistently: {action_source}"),
        merge_answer(f"The simplest coaching read is {that_clause(first_direct)}", rest),
        ensure_period(f"If you filter out the noise, the answer is this: {action_source}"),
        ensure_period(f"If you only protect one thing right now, protect this: {action_source}"),
    ]


def ui_action_answers(core: str) -> list[str]:
    first, first_direct, rest = first_and_rest(core)
    follow_up = rest or first

    return [
        ensure_period(core),
        ensure_period(f"Open the relevant screen and {lower_first(first_direct)}"),
        ensure_period(f"Go to the part of the app that controls this feature and {lower_first(first_direct)}"),
        ensure_period(f"Check the related setting or saved data first. {follow_up}"),
        ensure_period(f"The usual problem is outdated or incomplete data, or using the wrong screen. {follow_up}"),
        ensure_period(f"The cleanest way is to {lower_first(first_direct)}"),
        ensure_period(f"Before you assume it is broken, verify the related screen, saved value, or requirement. {follow_up}"),
        ensure_period(f"Start with the page that owns the feature, then confirm the result where it should appear. {follow_up}"),
        ensure_period(f"In simple terms, {lower_first(first_direct)}"),
        ensure_period(f"Keep the saved information accurate, stop repeating the same failed step, and check the screen or setting that controls this feature. {follow_up}"),
        ensure_period(f"The first place to look is the screen that stores this information. {follow_up}"),
        ensure_period(f"If the result is not showing, confirm the change was saved where this feature reads from. {follow_up}"),
        ensure_period(f"Use the page that actually controls this, then recheck the page that displays it. {follow_up}"),
        ensure_period(f"Do not repeat the step blindly. Open the right screen and {lower_first(first_direct)}"),
        ensure_period(f"The quickest fix is usually to update the source data, then reload the page that shows it. {follow_up}"),
        ensure_period(f"If you only do one check, make sure the latest value actually saved before you move on. {follow_up}"),
        ensure_period(f"This usually works best when you start from the owning screen instead of from a summary view. {follow_up}"),
        ensure_period(f"Treat it like a two-step job: make the change where it belongs, then verify where it should appear. {follow_up}"),
        ensure_period(f"The safest approach is to confirm the right screen, the right saved value, and the right requirement before retrying. {follow_up}"),
        ensure_period(f"If you want the short version, {lower_first(first_direct)}"),
        ensure_period(f"What matters most is editing the right source of truth in the app. {follow_up}"),
    ]


def ui_troubleshoot_answers(core: str) -> list[str]:
    first, first_direct, rest = first_and_rest(core)
    troubleshooting_step = ensure_period(rest or first_direct)

    return [
        ensure_period(core),
        troubleshooting_step,
        ensure_period(f"Check this first: {lower_first(strip_leading_condition(troubleshooting_step))}"),
        ensure_period(f"The most likely reason is this: {first_direct}"),
        ensure_period(f"The common cause is that one required piece of linked data or state is missing. {troubleshooting_step}"),
        ensure_period(f"To confirm it cleanly, {lower_first(strip_leading_condition(troubleshooting_step))}"),
        ensure_period(f"Before treating it like a bug, verify the linked page, saved value, or requirement. {troubleshooting_step}"),
        ensure_period(f"If you want to sort it out today, start here: {lower_first(strip_leading_condition(troubleshooting_step))}"),
        ensure_period(f"In simple terms, {lower_first(first_direct)}"),
        ensure_period(f"Check the feature input, the linked page, and the saved state before you retry it. {troubleshooting_step}"),
        ensure_period(f"The first useful signal is whether the linked value or requirement is actually present. {troubleshooting_step}"),
        ensure_period(f"If part of it works and part of it does not, the mismatch is usually in one missing saved input. {troubleshooting_step}"),
        ensure_period(f"Do the basic checks before you escalate it: page, saved value, requirement, and where the result should appear. {troubleshooting_step}"),
        ensure_period(f"The fastest troubleshooting path is to verify the source screen first and the display screen second. {troubleshooting_step}"),
        ensure_period(f"What usually gets missed is one dependency the feature expects. {troubleshooting_step}"),
        ensure_period(f"If you want the short answer, start by verifying the linked data and then reload the affected screen. {troubleshooting_step}"),
        ensure_period(f"This often looks like a bug when it is really a stale value or incomplete setup. {troubleshooting_step}"),
        ensure_period(f"To narrow it down quickly, confirm what changed, where it was saved, and where it should now appear. {troubleshooting_step}"),
        ensure_period(f"The safest assumption is that one input is missing until you prove the saved state is complete. {troubleshooting_step}"),
        ensure_period(f"What matters most is tracing the feature back to the page or value it depends on. {troubleshooting_step}"),
        ensure_period(f"If you only check one thing first, check whether the source data is current and actually saved. {troubleshooting_step}"),
    ]


def ui_explainer_answers(core: str) -> list[str]:
    first, first_direct, rest = first_and_rest(core)
    focus = rest or first_direct

    return [
        ensure_period(core),
        ensure_period(f"Pay attention first to {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"They are telling you this: {lower_first(first_direct)} {rest}".strip()),
        ensure_period(f"Read them as a quick check, not a perfect score. {focus}"),
        ensure_period(f"The useful part is {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"What matters most is {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"The simplest way to read them is this: {lower_first(first_direct)}"),
        ensure_period(f"Look at this first when they feel confusing: {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"In plain language, {lower_first(first_direct)} {rest}".strip()),
        ensure_period(f"They are helping if you use them to adjust what you do next. The key signal here is {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"If you only care about the decision-making part, use them to answer this: what should you do next? {focus}"),
        ensure_period(f"The main point is not the amount of data. It is whether {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"A useful way to read them is to separate today's signal from the longer pattern. {focus}"),
        ensure_period(f"Do not treat them like a score to chase. Treat them like guidance about the next adjustment. {focus}"),
        ensure_period(f"The first interpretation to trust is the one that changes a real decision for you. {focus}"),
        ensure_period(f"If they feel noisy, come back to the one signal that most affects your next step. {focus}"),
        ensure_period(f"The short version is this: {lower_first(first_direct)} {rest}".strip()),
        ensure_period(f"What makes them helpful is context. {focus}"),
        ensure_period(f"They are easiest to use when you read them as priorities, not as extra pressure. {focus}"),
        ensure_period(f"If you want the cleanest interpretation, start with {lower_first(strip_leading_condition(focus))}"),
        ensure_period(f"The real value is that they help you make a smaller, smarter adjustment. {focus}"),
    ]


COMMON_COACHING_EXPANSIONS = [
    "If someone looked only at {scope}, what would they say about {subject}?",
    "What does the pattern in {scope} tell you to prioritize for {subject}?",
    "If my current approach is too complicated, how would you simplify {subject} using {scope}?",
    "What is the main adjustment {scope} suggest for {subject} before I chase faster results?",
    "What would a realistic version of {subject} look like for me over the next month?",
    "How would you summarize the smartest approach to {subject} from {scope}?",
    "What pattern in my recent behavior is probably making {subject} harder than it needs to be?",
    "If my goal stays the same, what should I prioritize first for {subject}?",
    "What should I avoid right now if I want a safer approach to {subject}?",
    "How would you tighten my plan around {subject} without making it harder to follow?",
    "What in my recent Hayetak pattern should I repeat more consistently for {subject}?",
]
COMMON_UI_ACTION_EXPANSIONS = [
    "If I follow the right flow, what should I do after I {action} to confirm it worked?",
    "What is the first screen that matters when I need to {action}?",
    "If this is not behaving the way I expect, what is the most likely thing I missed while trying to {action}?",
    "What is the source-of-truth page for {action}?",
    "What part of this should I verify after saving when I try to {action}?",
    "If I want the short version, how do I {action} correctly?",
    "What is the clean two-step way to {action} and then verify the result?",
    "What should I stop doing if I keep retrying {action} without the right result?",
    "What is the safest way to {action} without reading the wrong screen afterward?",
    "If I only check one thing before I {action}, what should it be?",
    "What usually separates a clean {action} flow from a confusing one?",
]
COMMON_UI_TROUBLESHOOT_EXPANSIONS = [
    "If I want to narrow down {action} quickly, what signal matters most first?",
    "What kind of missing input usually explains {action}?",
    "How do I tell whether {action} is a setup issue or a real app problem?",
    "What screen or saved value should I verify before retrying {action}?",
    "If I want the short troubleshooting version for {action}, what should I do first?",
    "What usually gets missed when people try to diagnose {action} too quickly?",
    "What is the clean two-step way to check {action} without guessing?",
    "What should I rule out before I conclude {action} is a bug?",
    "If I only had a minute to inspect {action}, where would I look?",
    "What usually matters more than people expect when they troubleshoot {action}?",
    "How should I think about {action} so I stop retrying the wrong thing?",
]
COMMON_UI_EXPLAINER_EXPANSIONS = [
    "If I only cared about the decision-making part, what do {subject} help me decide?",
    "What is the shortest useful way to read {subject}?",
    "How do I separate today's signal from the bigger pattern when I look at {subject}?",
    "What do people usually overfocus on when reading {subject}?",
    "If {subject} feel noisy, what is the one thing I should return to first?",
    "How should I use {subject} to make a better next decision instead of just collecting data?",
    "What is the practical meaning of {subject} for my day-to-day choices?",
    "How do I know when {subject} are helping me versus just adding pressure?",
    "What is the cleanest way to interpret {subject} without turning them into a score?",
    "If I wanted one takeaway from {subject}, what should it be?",
    "What is the main signal inside {subject} that should change what I do next?",
]


FAMILY_TEMPLATES = {
    "strategy": [
        "{base}",
        "From {scope}, what stands out most about {subject} for me right now?",
        "If you review {scope}, what does it really suggest about {subject}?",
        "I want advice based on my real Hayetak data, not generic tips. How should I handle {subject} right now?",
        "If you were coaching me this week, what would you change first about {subject}?",
        "What am I probably doing right, what is getting in my way, and what should I fix first with {subject}?",
        "What is the safest practical way for me to approach {subject} with my current goal and limitations?",
        "If I only focus on improving one part of this over the next 7 days, what should it be for {subject}?",
        "Can you explain {subject} in plain language using my meals, workouts, plans, and profile?",
        "Based on what Hayetak already knows about me, what should I keep, stop, and change around {subject}?",
    ]
    + COMMON_COACHING_EXPANSIONS,
    "nutrition": [
        "{base}",
        "Looking at {scope}, what stands out most about {subject}?",
        "What does my recent eating pattern really suggest about {subject}?",
        "Based on my logged foods and diet limits, how should I handle {subject}?",
        "If you were fixing my food plan first, what would you change about {subject}?",
        "What pattern in my meal logs is probably driving {subject}?",
        "What is the safest practical nutrition fix for {subject} with my allergies, diet type, and goal?",
        "If I wanted a simple 7-day fix for {subject}, where would you start?",
        "Can you explain {subject} using the kind of meals I actually log instead of generic nutrition advice?",
        "Looking at my food entries, what should I keep, stop, and change about {subject}?",
    ]
    + COMMON_COACHING_EXPANSIONS,
    "workout": [
        "{base}",
        "What do {scope} suggest about {subject} right now?",
        "Looking at my logs, equipment, and injury history, what stands out about {subject}?",
        "Based on how I have actually been training, how should I handle {subject}?",
        "If you were adjusting my training this week, what would you change first about {subject}?",
        "What in my current workout setup is probably driving {subject}?",
        "What is the safest practical training approach to {subject} with my current limitations?",
        "If I only had one week to improve {subject}, where would you start?",
        "Can you explain {subject} in plain language using my plan, logs, and recovery context?",
        "Based on my current training data, what should I keep, stop, and change around {subject}?",
    ]
    + COMMON_COACHING_EXPANSIONS,
    "blended": [
        "{base}",
        "When you look at {scope}, what stands out most about {subject}?",
        "What do my meals, workouts, and recent progress together suggest about {subject}?",
        "How should I handle {subject} if you base the answer on my real app data instead of general advice?",
        "If you were coaching me through the next week, what would you change first about {subject}?",
        "What is probably going well, what is probably clashing, and what should I fix first around {subject}?",
        "What is the safest practical way to deal with {subject} while keeping my restrictions and routine in mind?",
        "If I only cleaned up one habit for the next 7 days, what would matter most for {subject}?",
        "Can you explain {subject} in simple language using the way my food, training, and progress fit together?",
        "Looking at the whole picture, what should I keep, stop, and change about {subject}?",
    ]
    + COMMON_COACHING_EXPANSIONS,
    "recipe": [
        "{base}",
        "Based on {scope}, what would you do about {subject}?",
        "If you were building this around the foods or ingredients I actually use, how would you handle {subject}?",
        "I want the practical version, not the fancy one. How should I deal with {subject}?",
        "If you were planning my next few meals, what would you change first about {subject}?",
        "What simple food pattern would solve {subject} without making the plan hard to follow?",
        "What is the safest practical option for {subject} with my diet type, allergies, and goal?",
        "If I needed a workable version of this for the next 7 days, where would you start with {subject}?",
        "Can you explain {subject} using the kind of meals I realistically make or order?",
        "What should I keep, stop, and change in my food choices around {subject}?",
    ]
    + COMMON_COACHING_EXPANSIONS,
    "support": [
        "{base}",
        "Based on {scope}, what stands out most about {subject}?",
        "If you review my current goal, recent logs, and restrictions, what does it suggest about {subject}?",
        "How should I handle {subject} if I want the most useful support and not wasted time?",
        "If you were guiding me this week, what would you do first around {subject}?",
        "What probably matters most for {subject} in my situation?",
        "What is the safest practical approach to {subject} with my restrictions and current routine?",
        "If I wanted to sort this out in the next 7 days, where would you start with {subject}?",
        "Can you explain {subject} in plain language using my current goals, logs, and limits?",
        "Based on my current Hayetak data, what should I keep, stop, and change around {subject}?",
    ]
    + COMMON_COACHING_EXPANSIONS,
    "ui_action": [
        "{base}",
        "What is the fastest way to {action} inside Hayetak?",
        "Where in the app should I go if I need to {action}?",
        "If I want to {action}, what should I check first?",
        "What usually causes trouble when I try to {action}?",
        "Can you walk me through the cleanest way to {action}?",
        "What should I verify before I assume something is broken while I try to {action}?",
        "If I wanted to sort this out today, what exact step would you start with to {action}?",
        "Can you explain, in simple terms, how to {action}?",
        "What should I keep, stop, and check when I need to {action} in the app?",
    ]
    + COMMON_UI_ACTION_EXPANSIONS,
    "ui_troubleshoot": [
        "{base}",
        "What is the fastest way to figure out {action} in Hayetak?",
        "What should I check first if I am trying to figure out {action}?",
        "What usually causes {action} inside the app?",
        "If part of the feature is showing up but not all of it, how should I troubleshoot {action}?",
        "Can you walk me through the cleanest way to confirm {action}?",
        "What should I verify before I assume the app is broken when I am checking {action}?",
        "If I want to sort this out today, what exact first step would you take around {action}?",
        "Can you explain, in simple terms, why {action} might be happening?",
        "What should I keep, stop, and check while I troubleshoot {action}?",
    ]
    + COMMON_UI_TROUBLESHOOT_EXPANSIONS,
    "ui_explainer": [
        "{base}",
        "When I look at {subject}, what should I pay attention to first?",
        "Can you break down what {subject} are actually telling me?",
        "How should I read {subject} without overthinking them?",
        "If I only care about the useful part, what do {subject} really mean for me?",
        "What part of {subject} matters most for day-to-day decisions?",
        "What is the simplest way to interpret {subject} in the app?",
        "What should I look at first when {subject} seem confusing?",
        "Can you explain {subject} in plain language?",
        "How do I know whether {subject} are helping me or just giving me extra data?",
    ]
    + COMMON_UI_EXPLAINER_EXPANSIONS,
}


SCENARIO_POOLS = {
    "strategy": [
        {
            "scenario_summary": "the user is a 31-year-old woman focused on fat loss, prefers home training 3 times per week, uses dumbbells and bands, avoids shellfish, manages mild reflux, and previously quit strict low-carb plans because they led to skipped lunches and overeating at night",
            "sample_user_context": {
                "profile": {
                    "age": 31,
                    "sex": "female",
                    "goal": "fat loss",
                    "diet_type": "mediterranean",
                    "allergies": ["shellfish"],
                    "medical_history": ["mild acid reflux"],
                    "injury_history": ["old right knee flare with deep knee flexion"],
                },
                "preferences": {
                    "workout_location": "home",
                    "workout_days_per_week": 3,
                    "equipment": ["adjustable dumbbells", "long resistance bands", "exercise mat"],
                    "meal_style": "repeatable workday meals with one social dinner",
                },
                "recent_pattern": {
                    "today": "light breakfast, delayed lunch, strong evening cravings",
                    "last_7_days": "protein target met on 3 of 7 days, 2 completed workouts, calories drifted high on weekend dinners",
                    "past_failures": ["strict low-carb", "overly aggressive calorie cuts"],
                },
            },
            "answer_target": "Turn past failure patterns into a simpler structure the client can repeat safely.",
            "example_direction": "a better plan is three full-body home sessions, two repeatable protein-first lunches, a planned afternoon snack, and a lighter dinner after training instead of another aggressive low-carb reset",
        },
        {
            "scenario_summary": "the user is a 27-year-old man trying to gain muscle, trains in a gym 4 days per week, is lactose intolerant, gets shoulder irritation from high pressing volume, and previously overshot calories during dirty-bulk attempts",
            "sample_user_context": {
                "profile": {
                    "age": 27,
                    "sex": "male",
                    "goal": "muscle gain",
                    "diet_type": "high-protein omnivore",
                    "allergies": [],
                    "medical_history": ["lactose intolerance"],
                    "injury_history": ["left shoulder irritation with repeated overhead pressing"],
                },
                "preferences": {
                    "workout_location": "gym",
                    "workout_days_per_week": 4,
                    "equipment": ["full commercial gym"],
                    "meal_style": "three meals and one shake",
                },
                "recent_pattern": {
                    "today": "hit protein but added extra calories from desserts and sweet drinks",
                    "last_7_days": "4 training sessions logged, body weight up quickly, waist measurement also up",
                    "past_failures": ["dirty bulk", "copying advanced bro splits"],
                },
            },
            "answer_target": "Keep muscle-gain guidance specific, moderate, and shoulder-aware.",
            "example_direction": "the better direction is a controlled surplus, a 4-day upper-lower split with shoulder-friendly pressing, and lactose-free protein anchors instead of pushing calories up blindly",
        },
        {
            "scenario_summary": "the user is a 38-year-old father aiming for maintenance and body recomposition, can realistically train 2 to 3 times per week, prefers simple halal meals, has mild low-back sensitivity, and tends to abandon plans that demand perfect weekdays",
            "sample_user_context": {
                "profile": {
                    "age": 38,
                    "sex": "male",
                    "goal": "maintenance with body recomposition",
                    "diet_type": "halal omnivore",
                    "allergies": [],
                    "medical_history": [],
                    "injury_history": ["recurring low-back stiffness during rushed training blocks"],
                },
                "preferences": {
                    "workout_location": "mixed home and gym",
                    "workout_days_per_week": 3,
                    "equipment": ["bench", "dumbbells", "occasional gym access"],
                    "meal_style": "family meals plus one packed lunch",
                },
                "recent_pattern": {
                    "today": "ate well early, but missed planned training because of work overrun",
                    "last_7_days": "2 workouts, mostly solid lunches, one social meal overshoot, sleep inconsistent",
                    "past_failures": ["6-day training split", "meal plans with too many separate recipes"],
                },
            },
            "answer_target": "Reward realism over perfection and protect the minimum effective structure.",
            "example_direction": "the smarter setup is two main strength sessions plus one optional short session, one repeatable packed lunch, and family dinners adjusted by portion and protein instead of trying to run a rigid fitness lifestyle every day",
        },
    ],
    "nutrition": [
        {
            "scenario_summary": "the user is a 29-year-old office worker aiming for fat loss, follows a Mediterranean style, avoids shellfish, manages reflux, and logs light lunches followed by late-night snacking on most workdays",
            "sample_user_context": {
                "profile": {
                    "age": 29,
                    "sex": "female",
                    "goal": "fat loss",
                    "diet_type": "mediterranean",
                    "allergies": ["shellfish"],
                    "medical_history": ["acid reflux"],
                },
                "preferences": {
                    "meal_timing": "office hours with after-work training",
                    "available_ingredients": ["eggs", "labneh", "chicken breast", "rice", "cucumber", "bananas", "yogurt"],
                    "cooking_limit": "20 minutes on weekdays",
                },
                "recent_pattern": {
                    "today": "coffee, pastry, small lunch, strong evening hunger",
                    "last_7_days": "protein low at breakfast on 5 of 7 days, calories cluster late, water below target on training days",
                },
            },
            "answer_target": "Fix meal structure without violating reflux and allergy limits.",
            "example_direction": "a suitable structure is eggs or yogurt with fruit in the morning, a chicken-rice-labneh lunch, a planned protein snack before leaving work, and a lighter post-workout dinner instead of letting the whole day collapse into late snacking",
        },
        {
            "scenario_summary": "the user is a 26-year-old vegetarian trying to gain muscle, trains early in the morning, is lactose intolerant, and struggles to eat enough protein without relying on one huge dinner",
            "sample_user_context": {
                "profile": {
                    "age": 26,
                    "sex": "male",
                    "goal": "muscle gain",
                    "diet_type": "vegetarian",
                    "allergies": [],
                    "medical_history": ["lactose intolerance"],
                },
                "preferences": {
                    "meal_timing": "early training before work",
                    "available_ingredients": ["tofu", "eggs", "oats", "soy yogurt", "lentils", "rice", "pita"],
                    "cooking_limit": "batch cook twice weekly",
                },
                "recent_pattern": {
                    "today": "trained fasted and under-ate protein before lunch",
                    "last_7_days": "training consistent, protein target missed on 4 days, dinner disproportionately large",
                },
            },
            "answer_target": "Distribute protein better across the day with vegetarian options.",
            "example_direction": "the better pattern is oats and soy yogurt after training, lentils or tofu at lunch, a portable protein snack, and a balanced dinner rather than waiting for one oversized evening meal",
        },
        {
            "scenario_summary": "the user is a 35-year-old man aiming for maintenance, eats halal family meals, trains three evenings per week, and keeps overshooting calories from drinks, sauces, and tasting while cooking",
            "sample_user_context": {
                "profile": {
                    "age": 35,
                    "sex": "male",
                    "goal": "maintenance",
                    "diet_type": "halal omnivore",
                    "allergies": [],
                    "medical_history": ["borderline high LDL"],
                },
                "preferences": {
                    "meal_timing": "family dinner after work",
                    "available_ingredients": ["chicken", "beef", "rice", "potatoes", "salad vegetables", "hummus"],
                    "cooking_limit": "shared household meals",
                },
                "recent_pattern": {
                    "today": "main meals reasonable, extra calories came from sweet coffee and sauces",
                    "last_7_days": "protein on target, calorie average high mostly from non-meal extras",
                },
            },
            "answer_target": "Keep nutrition advice practical and focused on the hidden calories driving drift.",
            "example_direction": "the smart change is to keep the main meals similar, swap sweet drinks for zero-calorie or lower-calorie options, portion sauces deliberately, and anchor snacks to protein instead of random extras",
        },
    ],
    "workout": [
        {
            "scenario_summary": "the user prefers home workouts 3 times per week, has adjustable dumbbells and bands, wants fat loss with muscle retention, and needs lower-body work that does not flare an old knee issue",
            "sample_user_context": {
                "profile": {
                    "goal": "fat loss with muscle retention",
                    "training_level": "beginner to early intermediate",
                    "injury_history": ["right knee pain with deep knee flexion"],
                },
                "preferences": {
                    "workout_location": "home",
                    "workout_days_per_week": 3,
                    "equipment": ["adjustable dumbbells", "long resistance bands", "bench"],
                    "session_length_minutes": 45,
                },
                "recent_pattern": {
                    "today": "motivated but worried about aggravating the knee",
                    "last_7_days": "2 of 3 sessions completed, lower-body confidence dipped after one painful session",
                },
            },
            "answer_target": "Offer an actual home plan with safe substitutions and clear weekly structure.",
            "example_direction": "a suitable week is full-body on Monday, Wednesday, and Saturday with goblet box squat or split squat to tolerance, dumbbell Romanian deadlift, floor or bench press, one-arm row, band pull-aparts, and core work, progressing reps before load",
        },
        {
            "scenario_summary": "the user trains in a gym 4 days per week for muscle gain, has shoulder irritation when pressing volume gets too high, and still wants enough upper-body work to progress",
            "sample_user_context": {
                "profile": {
                    "goal": "muscle gain",
                    "training_level": "intermediate",
                    "injury_history": ["left shoulder irritation from repeated heavy pressing"],
                },
                "preferences": {
                    "workout_location": "gym",
                    "workout_days_per_week": 4,
                    "equipment": ["full gym", "cables", "machines", "dumbbells"],
                    "session_length_minutes": 60,
                },
                "recent_pattern": {
                    "today": "upper-body session planned but shoulder feels irritated after heavy benching earlier this week",
                    "last_7_days": "4 sessions done, chest and shoulder volume high, pulling volume lower than pressing volume",
                },
            },
            "answer_target": "Preserve growth while reducing shoulder irritation risk.",
            "example_direction": "a better split is upper-lower-upper-lower with two press slots instead of four, more chest-supported rows and pulldowns, neutral-grip dumbbell or machine pressing, and shoulder-isolation volume kept moderate",
        },
        {
            "scenario_summary": "the user is traveling for a week, only has hotel dumbbells and bodyweight options, wants to stay close to the main goal, and usually loses momentum when the normal gym routine breaks",
            "sample_user_context": {
                "profile": {
                    "goal": "general fitness with fat loss",
                    "training_level": "intermediate",
                    "injury_history": ["none currently active"],
                },
                "preferences": {
                    "workout_location": "hotel gym",
                    "workout_days_per_week": 3,
                    "equipment": ["light to moderate dumbbells", "bench", "treadmill"],
                    "session_length_minutes": 30,
                },
                "recent_pattern": {
                    "today": "travel day with limited time",
                    "last_7_days": "routine broke after work travel started, step count high but structured training low",
                },
            },
            "answer_target": "Keep the plan portable, short, and tied to the user's real equipment.",
            "example_direction": "the right travel week is three short full-body sessions built around split squats, dumbbell Romanian deadlifts, push-ups or dumbbell press, rows, carries, and incline walking instead of trying to recreate the full normal gym split",
        },
    ],
    "blended": [
        {
            "scenario_summary": "the user has a history of strict diets failing after social weekends, currently trains at home 3 times per week, misses weekday lunches, and sees the same overeating pattern return when stress rises",
            "sample_user_context": {
                "profile": {
                    "goal": "fat loss",
                    "diet_type": "mediterranean",
                    "allergies": [],
                    "medical_history": ["mild reflux"],
                    "injury_history": ["old knee flare"],
                },
                "preferences": {
                    "workout_location": "home",
                    "workout_days_per_week": 3,
                    "equipment": ["dumbbells", "bands"],
                },
                "recent_pattern": {
                    "today": "under-ate early, craved high-calorie foods at night",
                    "last_7_days": "2 workouts completed, weekend calories high, weekday protein inconsistent, water low on 4 days",
                    "saved_plan_issue": "current plan is stricter than the user can maintain socially",
                },
            },
            "answer_target": "Connect diet history, logs, and training into one realistic correction.",
            "example_direction": "the better strategy is a simpler 3-day training week, two repeatable weekday lunches, a planned social-meal buffer, and protein plus hydration targets that can survive weekends instead of another perfect-on-paper cut",
        },
        {
            "scenario_summary": "the user is trying to recomp, weight is flat, measurements are slowly improving, but sleep is poor and protein falls short on the days when training performance drops",
            "sample_user_context": {
                "profile": {
                    "goal": "body recomposition",
                    "diet_type": "high-protein omnivore",
                    "allergies": [],
                    "medical_history": [],
                    "injury_history": ["mild low-back stiffness"],
                },
                "preferences": {
                    "workout_location": "gym",
                    "workout_days_per_week": 4,
                    "equipment": ["full gym"],
                },
                "recent_pattern": {
                    "today": "slept poorly and feels flat for training",
                    "last_7_days": "weight stable, waist down slightly, strength mixed, protein low on 3 days, step count high",
                    "saved_plan_issue": "chasing scale change despite other progress signals",
                },
            },
            "answer_target": "Teach the model to prioritize the joined-up signal, not just body weight.",
            "example_direction": "the right move is to protect protein and sleep first, keep the current plan structure, and judge progress from weekly averages, waist, and gym performance instead of forcing a harsher calorie change immediately",
        },
        {
            "scenario_summary": "the user wants a restart after a month of inconsistency, has both meal and workout logs in Hayetak, and needs a two-week plan that feels achievable rather than motivational for one day",
            "sample_user_context": {
                "profile": {
                    "goal": "return to consistency",
                    "diet_type": "halal omnivore",
                    "allergies": ["peanuts"],
                    "medical_history": ["mild iron deficiency"],
                    "injury_history": ["none currently active"],
                },
                "preferences": {
                    "workout_location": "mixed home and gym",
                    "workout_days_per_week": 3,
                    "equipment": ["dumbbells", "gym access twice weekly"],
                },
                "recent_pattern": {
                    "today": "motivated to restart but worried about slipping again",
                    "last_7_days": "meals inconsistently logged, only 1 workout completed, bedtime late, water under target on most days",
                    "saved_plan_issue": "old plan assumes more capacity than the current week allows",
                },
            },
            "answer_target": "Ground restart advice in a specific short block with food and training together.",
            "example_direction": "a better 14-day reset is three full-body sessions per week, two repeated breakfasts, one packed lunch default, a nightly wind-down target, and zero peanut-based snack recommendations so the user rebuilds momentum before expanding anything",
        },
    ],
    "recipe": [
        {
            "scenario_summary": "the user wants simple high-protein meals from eggs, labneh, chicken, lentils, rice, cucumber, tomatoes, pita, and fruit, with a Mediterranean pattern and no shellfish",
            "sample_user_context": {
                "profile": {
                    "goal": "fat loss with good adherence",
                    "diet_type": "mediterranean",
                    "allergies": ["shellfish"],
                    "medical_history": ["acid reflux"],
                },
                "preferences": {
                    "equipment": ["stovetop", "oven", "blender"],
                    "available_ingredients": ["eggs", "labneh", "chicken", "lentils", "rice", "cucumber", "tomatoes", "pita", "bananas"],
                },
                "recent_pattern": {
                    "today": "needs dinner after training and a logged breakfast for tomorrow",
                    "last_7_days": "best adherence came from simple repeated meals, not from complex cooking",
                },
            },
            "answer_target": "Suggest realistic meals the user can actually cook and log.",
            "example_direction": "a suitable rotation is eggs with labneh and pita for breakfast, chicken rice bowls with cucumber-tomato salad for lunch, lentil soup with yogurt or labneh on easier days, and a lighter chicken or egg-based dinner after training",
        },
        {
            "scenario_summary": "the user is vegetarian, needs easy protein, has tofu, eggs, oats, yogurt alternatives, lentils, and fruit at home, and wants meals that are simple to repeat and log",
            "sample_user_context": {
                "profile": {
                    "goal": "muscle gain",
                    "diet_type": "vegetarian",
                    "allergies": [],
                    "medical_history": ["lactose intolerance"],
                },
                "preferences": {
                    "equipment": ["stovetop", "microwave"],
                    "available_ingredients": ["tofu", "eggs", "oats", "soy yogurt", "lentils", "rice", "berries"],
                },
                "recent_pattern": {
                    "today": "needs breakfast and lunch ideas before early training tomorrow",
                    "last_7_days": "protein consistency better when meals were repeated",
                },
            },
            "answer_target": "Keep meal ideas vegetarian, protein-aware, and easy to batch.",
            "example_direction": "the practical options are oats with soy yogurt and fruit, tofu and rice bowls, lentil-egg plates, and simple yogurt-alternative snacks rather than elaborate recipes that make logging harder",
        },
    ],
    "support": [
        {
            "scenario_summary": "the user wants help deciding whether to ask the coach, message a professional, or request an appointment based on active restrictions, recent logs, and a stalled plan",
            "sample_user_context": {
                "profile": {
                    "goal": "fat loss",
                    "allergies": ["peanuts"],
                    "medical_history": ["mild reflux"],
                    "injury_history": ["knee irritation"],
                },
                "app_state": {
                    "active_plan": "present but low adherence",
                    "messages": "none yet",
                    "appointments": "none booked",
                    "nearby_results": "several trainers and dietitians available",
                },
                "recent_pattern": {
                    "today": "needs a decision on food and training adjustments",
                    "last_7_days": "coach questions asked twice, same issue still unresolved because lifestyle context is changing",
                },
            },
            "answer_target": "Clarify the right support path and the context worth sending.",
            "example_direction": "use the coach for a fast in-app adjustment, but escalate to a professional when repeated safety, pain, or adherence issues keep showing up despite accurate profile and log data, and include your goal, restriction summary, recent pattern, and exact block in the message",
        },
        {
            "scenario_summary": "the user wants recipe or meal-help responses that respect allergies, available ingredients, and today's logged macros instead of generic suggestions",
            "sample_user_context": {
                "profile": {
                    "goal": "maintenance",
                    "allergies": ["shellfish"],
                    "medical_history": ["acid reflux"],
                },
                "app_state": {
                    "coach_screen": "open",
                    "today_macros": {"protein_remaining_g": 45, "calories_remaining": 620},
                    "available_ingredients": ["eggs", "chicken", "rice", "labneh", "cucumber"],
                },
                "recent_pattern": {
                    "today": "dinner still unlogged and needs a suitable suggestion",
                    "last_7_days": "better adherence when the question included ingredients and remaining macros",
                },
            },
            "answer_target": "Show the model what usable support context looks like for recipe questions.",
            "example_direction": "the right request includes the remaining calories and protein, the shellfish and reflux limits, and the ingredients on hand so the answer can suggest a chicken-rice-labneh plate or egg-based option instead of generic meal ideas",
        },
    ],
    "ui_action": [
        {
            "scenario_summary": "the client already changed a profile value once in a summary view, but the actual source-of-truth screen still holds the old data and the app keeps using it",
            "sample_user_context": {
                "profile": {
                    "goal": "maintenance",
                    "allergies": ["peanuts"],
                    "injury_history": ["low-back sensitivity"],
                },
                "app_state": {
                    "problem": "saved value appears unchanged in plan logic",
                    "likely_cause": "the wrong screen was edited or the save did not complete",
                },
            },
            "answer_target": "Teach the model to point users back to the owning screen and verification step.",
            "example_direction": "the clean fix is to edit the source profile or preferences screen, save there, and then recheck the dashboard or plan page that reads from that value",
        },
    ],
    "ui_troubleshoot": [
        {
            "scenario_summary": "the client updated allergies and injury notes, but the coach still sounds generic because the active plan or stale saved state is being read instead of the new safety data",
            "sample_user_context": {
                "profile": {
                    "allergies": ["peanuts"],
                    "injury_history": ["right knee flare"],
                },
                "app_state": {
                    "problem": "coach answer still ignores new safety details",
                    "likely_cause": "the linked restriction or plan state is stale",
                },
            },
            "answer_target": "Make troubleshooting advice check saved safety data before calling it a bug.",
            "example_direction": "the first check is whether the latest allergy and injury values were saved in the profile and whether the active plan or coach context has been refreshed from those values",
        },
    ],
    "ui_explainer": [
        {
            "scenario_summary": "the client is trying to read today's cards, the saved plan, and the 7-day trend together without panicking over one noisy day",
            "sample_user_context": {
                "profile": {
                    "goal": "fat loss",
                    "active_plan": "present",
                },
                "app_state": {
                    "viewed_metrics": ["today's macros", "today's water", "active plans", "last 7 days"],
                    "main_confusion": "one bad day feels larger than the weekly pattern",
                },
            },
            "answer_target": "Frame app metrics as decision support, not as a pass-fail score.",
            "example_direction": "read today's cards for the next action, use the saved plan as the intended structure, and let the 7-day trend decide whether there is a real pattern that needs a change",
        },
    ],
}


def stable_index(text: str, size: int) -> int:
    if size <= 0:
        raise ValueError("size must be positive")

    return sum(ord(char) for char in normalize(text)) % size


def scenario_for_record(record: dict) -> dict:
    pool = SCENARIO_POOLS[record["family"]]
    return pool[stable_index(record["base_question"], len(pool))]


def grounded_core_answer(record: dict) -> str:
    scenario = scenario_for_record(record)

    return merge_answer(
        record["core_answer"],
        (
            f"For example, in this training context, {scenario['scenario_summary']}, "
            f"so a suitable direction is {scenario['example_direction']}."
        ),
    )


def infer_meta(question: str, category: str) -> tuple[str, str, str]:
    q = question.lower()
    if category == "profile_strategy":
        if any(token in q for token in ["allerg", "medical history", "injury history"]):
            return ("profile_safety", "allergies_medical_help", "strategy")
        if any(token in q for token in ["diet style", "goal", "muscle", "fat loss", "body recomposition", "workout days", "home workouts", "gym sessions"]):
            return ("goal_and_plan_strategy", "goals_preferences_help", "strategy")
        return ("profile_strategy", "profile_help", "strategy")
    if category == "nutrition_analysis":
        if any(token in q for token in ["calorie", "macro", "protein", "fiber", "sodium", "drinks"]):
            return ("macro_and_nutrition_analysis", "macro_help", "nutrition")
        if any(token in q for token in ["grocery", "ingredients", "restaurant", "portable", "breakfast", "snack", "dinner"]):
            return ("meal_planning_support", "meal_tracking_help", "nutrition")
        return ("meal_tracking_and_food_support", "meal_tracking_help", "nutrition")
    if category == "workout_analysis":
        if any(token in q for token in ["volume", "split", "gym", "home", "equipment", "plan", "workout days"]):
            return ("workout_planning", "workout_planner_help", "workout")
        return ("workout_logging_and_adjustment", "workout_log_help", "workout")
    if category == "integrated_coaching":
        return ("blended_meal_workout_coaching", "coaching_review_help", "blended")
    if category == "recipe_support":
        if "nearby" in q:
            return ("nearby_professional_support", "nearby_help", "support")
        if "appointment" in q or "booking" in q:
            return ("appointments", "appointments_help", "support")
        if "message" in q:
            return ("messaging", "messaging_help", "support")
        if "trainer or a nutritionist" in q or "trainer or nutritionist" in q:
            return ("professional_support", "professional_support_help", "support")
        return ("recipe_and_food_support", "meal_tracking_help", "recipe")
    if category == "advanced_client":
        if "measurements" in q or "weight trend" in q or "strength is also dropping" in q:
            return ("progress_and_measurements", "progress_help", "strategy")
        if "trainer's workout plan" in q:
            return ("workout_plan_decisions", "workout_plan_help", "strategy")
        if "dietitian's plan" in q or "ai meal suggestions" in q:
            return ("nutrition_plan_decisions", "nutrition_plan_help", "strategy")
        if "ask the ai" in q:
            return ("ai_assistant_usage", "ai_assistant_help", "strategy")
        if "beginner routine" in q or "intensity or volume" in q:
            return ("advanced_training_decisions", "workout_planner_help", "strategy")
        if "maintenance" in q:
            return ("goal_transition", "goals_preferences_help", "strategy")
        return ("advanced_client_support", "advanced_client_help", "strategy")
    raise ValueError(f"Unsupported category: {category}")


def build_variations(record: dict) -> list[str]:
    template_values = {
        "base": record["base_question"],
        "subject": record.get("subject", ""),
        "scope": record.get("scope", ""),
        "action": record.get("action", ""),
    }
    templates = FAMILY_TEMPLATES[record["family"]]
    if len(templates) != VARIANTS_PER_QUESTION:
        raise ValueError(f"Family {record['family']} must define {VARIANTS_PER_QUESTION} templates.")

    return [clean(template.format(**template_values)) for template in templates]


def build_answers(record: dict) -> list[str]:
    family = record["family"]
    core_answer = grounded_core_answer(record)
    if family == "ui_action":
        answers = ui_action_answers(core_answer)
    elif family == "ui_troubleshoot":
        answers = ui_troubleshoot_answers(core_answer)
    elif family == "ui_explainer":
        answers = ui_explainer_answers(core_answer)
    else:
        answers = coach_answers(core_answer)
    if len(answers) != VARIANTS_PER_QUESTION:
        raise ValueError(f"Family {family} must define {VARIANTS_PER_QUESTION} answers.")

    return [clean(answer) for answer in answers]


def variant_lenses_for_family(family: str) -> list[str]:
    if family == "ui_action":
        return UI_ACTION_VARIANT_LENSES
    if family == "ui_troubleshoot":
        return UI_TROUBLESHOOT_VARIANT_LENSES
    if family == "ui_explainer":
        return UI_EXPLAINER_VARIANT_LENSES

    return COACH_VARIANT_LENSES


def build_item_context(record: dict) -> dict:
    topic = clean(record.get("subject") or record.get("action") or record["base_question"])
    family = record["family"]
    scenario = scenario_for_record(record)

    return {
        "audience": "post_registration_client",
        "feature": record["feature"],
        "intent": record["intent"],
        "question_family": family,
        "topic": topic,
        "scope_hint": clean(record.get("scope") or "the client's current Hayetak profile, plans, and recent app activity"),
        "relevant_context": FAMILY_RELEVANT_CONTEXT[family],
        "answer_focus": FAMILY_ANSWER_FOCUS[family],
        "answer_rules": COMMON_ANSWER_RULES,
        "sample_user_context": scenario["sample_user_context"],
        "sample_context_summary": scenario["scenario_summary"],
        "answer_target": scenario["answer_target"],
        "example_direction": scenario["example_direction"],
    }


def build_variant_context(record: dict, question: str, variant_id: int) -> dict:
    lenses = variant_lenses_for_family(record["family"])
    if len(lenses) != VARIANTS_PER_QUESTION:
        raise ValueError(f"Family {record['family']} must define {VARIANTS_PER_QUESTION} context lenses.")
    scenario = scenario_for_record(record)

    return {
        "variant_lens": lenses[variant_id - 1],
        "question_scope": clean(record.get("scope") or "current Hayetak client context"),
        "question_focus": clean(record.get("subject") or record.get("action") or question),
        "prompt_goal": "Answer this exact wording directly while using the allowed Hayetak context and safety rules.",
        "sample_user_context": scenario["sample_user_context"],
        "sample_context_summary": scenario["scenario_summary"],
        "answer_target": scenario["answer_target"],
        "example_direction": scenario["example_direction"],
    }


def build_source_records() -> list[dict]:
    base_module = load_module("generate_hayetak_question_dataset.py", "hayetak_client_base")
    concrete_module = load_module("generate_hayetak_question_dataset_concrete.py", "hayetak_client_concrete")

    client_items = [item for item in base_module.ITEMS if item["audience"] == "client"]
    if len(client_items) != 90:
        raise ValueError(f"Expected 90 client items, found {len(client_items)}")

    records = []
    for client_id, item in enumerate(client_items, start=1):
        if client_id in EXCLUDED_CLIENT_IDS:
            continue
        feature, intent, family = infer_meta(item["base_question"], item["category"])
        records.append(
            {
                "feature": feature,
                "intent": intent,
                "family": family,
                "subject": item["subject"],
                "scope": base_module.CLIENT_DATA_SCOPE[item["category"]],
                "base_question": clean(item["base_question"]),
                "core_answer": clean(concrete_module.PRIMARY_ANSWERS[client_id]),
            }
        )

    if len(records) != 90:
        raise ValueError(f"Expected 90 reused client items, found {len(records)}")

    return records


APP_SUPPORT_RECORDS = [
    {
        "feature": "dashboard",
        "intent": "dashboard_help",
        "family": "ui_troubleshoot",
        "action": "why my dashboard shows today's macros and water but no active nutrition or workout plan",
        "base_question": "Why is my dashboard showing today's macros and water but no active nutrition or workout plan?",
        "core_answer": "That usually means Hayetak has tracking data for today, but it does not currently have an active plan record ready to display on the dashboard. Open your workout and nutrition plan pages to confirm whether a plan exists there, and if both are empty, update the profile inputs that drive planning before you regenerate anything.",
    },
    {
        "feature": "dashboard",
        "intent": "dashboard_help",
        "family": "ui_explainer",
        "subject": "the dashboard macro cards and water target",
        "base_question": "What do the dashboard macro cards and water target actually tell me, and what should I pay attention to first?",
        "core_answer": "The dashboard cards show how much you have logged today for calories, protein, carbs, fat, and water compared with your target or current profile data. Focus first on whether protein is consistently landing, whether total calories are drifting far from your goal, and whether water intake is staying close to target, because those signals usually affect the rest of the day fastest.",
    },
    {
        "feature": "profile",
        "intent": "profile_help",
        "family": "ui_action",
        "action": "update my height, weight, and goals so Hayetak uses the right numbers",
        "base_question": "Where should I update my height, weight, and goals so Hayetak uses the right numbers for my guidance?",
        "core_answer": "Update those details from the profile or settings area so Hayetak can use your newest body metrics and goals for plans, BMI, and day-to-day guidance. Change them whenever your body data or main goal shifts enough that the current plan no longer matches real life.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "ui_action",
        "action": "update my allergies, diet type, and medical history so the app stays safe",
        "base_question": "Where do I edit allergies, diet type, or medical history so the app stops giving me unsafe suggestions?",
        "core_answer": "Edit allergies, diet type, and medical history in the profile or preferences section before you ask the AI for help or follow new meal suggestions. Those fields are part of the safety filter, so leaving them outdated makes it easier for advice to fit your goal but miss your restrictions.",
    },
    {
        "feature": "meal_tracking",
        "intent": "meal_tracking_help",
        "family": "ui_action",
        "action": "log a meal for a previous day and read the correct totals",
        "base_question": "How do I log a meal for a previous day and make sure it changes that day's totals instead of today's?",
        "core_answer": "Go to Meal Tracker, switch the date to the day you want, and then add the meal while that date is selected so the entry stays attached to the right day. After you save it, review that day's entries and totals instead of today's screen so you do not misread the update.",
    },
    {
        "feature": "favorites",
        "intent": "favorites_help",
        "family": "ui_action",
        "action": "save foods to favorites and reuse them faster later",
        "base_question": "How do I save foods I log often and use them faster later without searching the whole list again?",
        "core_answer": "Use favorites for foods you log often so you can get back to them quickly without searching the full food list every time. Save the correct food entry when you find it, then pull it from favorites the next time you log a similar meal.",
    },
    {
        "feature": "messaging",
        "intent": "messaging_help",
        "family": "ui_action",
        "action": "start a conversation with a professional after I find them in Nearby",
        "base_question": "What is the fastest way to message a trainer or dietitian after I find them in Nearby?",
        "core_answer": "Find the approved professional in Nearby or the professionals section, open a conversation from there, and send one clear first message with your goal, limits, and what you need help with now. Keep that first message specific so the professional can respond with something useful instead of asking for basic context first.",
    },
    {
        "feature": "appointments",
        "intent": "appointments_help",
        "family": "ui_action",
        "action": "request an appointment with a trainer or dietitian from inside the app",
        "base_question": "How do I request an appointment with a trainer or dietitian from inside the app?",
        "core_answer": "Request the appointment from the professional flow in the app, choose the right professional role, and send a clear date or time request that matches what you actually need help with. After that, watch the appointments page for status changes like requested, accepted, declined, or completed.",
    },
    {
        "feature": "notifications",
        "intent": "notifications_help",
        "family": "ui_action",
        "action": "read, clear, or dismiss notifications without losing track of important items",
        "base_question": "How should I handle notifications so I can clear them without missing anything important?",
        "core_answer": "Use notifications as a short action list, not just a feed. Mark items as read once you have handled them, dismiss the ones you no longer need, and leave the important ones visible until the related task or message is actually done.",
    },
    {
        "feature": "two_factor",
        "intent": "two_factor_help",
        "family": "ui_action",
        "action": "turn on two-factor authentication later from settings",
        "base_question": "How do I turn on two-factor authentication later if I skipped it at first?",
        "core_answer": "Turn on two-factor authentication from settings when you want extra account protection without changing how the rest of the app works. Open the two-factor page, follow the authenticator setup steps, keep the recovery codes somewhere safe, and test one code before you rely on it.",
    },
    {
        "feature": "password",
        "intent": "password_help",
        "family": "ui_action",
        "action": "change my password from inside the app settings",
        "base_question": "Where do I change my password from inside the app, and what should I check if it fails?",
        "core_answer": "Change your password from the password section in settings or profile while you are already inside the app, and use a unique password you are willing to keep. If the change fails, the first thing to check is whether the current password entry or confirmation field is wrong.",
    },
    {
        "feature": "appearance",
        "intent": "appearance_help",
        "family": "ui_action",
        "action": "change the app theme or appearance mode",
        "base_question": "How do I change the app theme, and what should I do if the new appearance does not show right away?",
        "core_answer": "Change the app theme from the appearance setting and pick the mode you will actually stick with, whether that is light, dark, or system. If it does not look different right away, refresh the page or reopen the app so the saved preference re-applies cleanly.",
    },
]


EXPANDED_CLIENT_RECORDS = [
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "recovering from a high-calorie day without overcorrecting",
        "scope": NUTRITION_SCOPE,
        "base_question": "If I overshoot calories for one day, how should I recover without turning the next few days into an overcorrection cycle?",
        "core_answer": "Return to your normal structure at the next meal instead of trying to erase the day. Keep protein, vegetables, hydration, and your usual routine steady, then let the weekly average absorb the overshoot rather than creating more hunger and rebound eating with a harsh correction.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "judging whether my water target fits my routine",
        "scope": NUTRITION_SCOPE,
        "base_question": "How can I tell whether my current water target actually fits my training, climate, and daily routine?",
        "core_answer": "Judge it by consistency, thirst, urine color, training sweat loss, and whether the target is easy to repeat without force. In Beirut heat or harder training blocks you may need more, but the best target is the one that keeps hydration stable without making the plan feel like a separate job.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "structuring meals around late-night training",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I structure meals on days when I train late at night and still want steady energy and good sleep?",
        "core_answer": "Keep the day anchored with regular protein meals, use a digestible carb and protein meal before training, and keep the post-workout meal lighter and easier to digest instead of turning it into a huge dinner. The goal is enough fuel to train well without carrying heavy digestion into sleep.",
    },
    {
        "feature": "meal_tracking_and_food_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "understanding weekend logging drift",
        "scope": NUTRITION_SCOPE,
        "base_question": "What does it usually mean if my meal logs are solid on weekdays but messy or incomplete on weekends?",
        "core_answer": "It usually means the plan works when structure is provided but breaks when decisions get more social and open-ended. Instead of demanding perfect weekend logging, build a smaller weekend structure with a few anchor meals, one social strategy, and honest logging of the high-risk meals that shape the weekly average.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "building a repeatable workday lunch rotation",
        "scope": NUTRITION_SCOPE,
        "base_question": "What kind of simple workday lunch rotation would make it easier for me to hit protein without overthinking every afternoon?",
        "core_answer": "Use two or three lunches you can repeat with very little friction, each built around a clear protein anchor, a manageable carb base, and vegetables you will actually eat. Repetition at lunch usually improves protein consistency faster than chasing variety in the meal most people rush through.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "nutrition",
        "subject": "handling family or restaurant meals safely with restrictions",
        "scope": NUTRITION_SCOPE,
        "base_question": "How do I stay flexible with family meals or restaurants without drifting outside my allergies, diet type, or medical limits?",
        "core_answer": "Lead with the non-negotiables first: known allergens, diet boundaries, and trigger foods that reliably cause symptoms. After that, be flexible with portions, cooking style, and extras so the meal can stay social without gambling on foods your profile already flags as unsafe.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "keeping energy steady on busy days",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I eat on very busy days so I do not end up under-eating early and snacking randomly late?",
        "core_answer": "Front-load the day with a real breakfast or early protein anchor, keep one portable backup meal or snack with you, and avoid saving most of your food for the evening. Busy days usually go wrong because the first half of the day is too light, not because dinner was imperfect.",
    },
    {
        "feature": "meal_tracking_and_food_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "eating enough protein when appetite is low",
        "scope": NUTRITION_SCOPE,
        "base_question": "What is the smartest way to keep protein high when my appetite is low and big meals feel hard?",
        "core_answer": "Use smaller protein doses more often instead of forcing huge meals. Softer or easy-to-finish options like yogurt, eggs, labneh, shakes, tuna, tofu, or smaller plated meals are usually better than waiting for one large meal that never sounds appealing.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "judging whether breakfast is helping appetite control",
        "scope": NUTRITION_SCOPE,
        "base_question": "How can I tell whether my breakfast is actually helping my appetite control or just checking a box?",
        "core_answer": "Judge breakfast by what it does to the next few hours, not by whether it looks healthy on paper. If it improves fullness, reduces grazing, and makes lunch easier to manage, it is helping; if you are hungry again quickly or it leads to cravings, the balance of protein, fiber, or total food probably needs work.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "using meal timing to reduce evening overeating",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I use meal timing to reduce evening overeating without becoming rigid about the clock?",
        "core_answer": "Use timing as structure, not a rulebook. The most helpful move is to avoid long gaps that set up late hunger, keep protein distributed across the day, and make sure the meals before your high-risk evening window are substantial enough to prevent rebound eating.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "choosing pre-workout meals I already tolerate",
        "scope": NUTRITION_SCOPE,
        "base_question": "What kind of pre-workout meal makes the most sense if I want better training energy from foods I already tolerate?",
        "core_answer": "Pick something you digest well that gives you protein and easy carbs without excess fat or fiber right before training. The best option is the one you can repeat without stomach issues, because consistency beats a perfect sports-nutrition idea you never actually use.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "nutrition",
        "subject": "increasing fiber without upsetting digestion",
        "scope": NUTRITION_SCOPE,
        "base_question": "How should I increase fiber if I want better fullness and digestion but I also do not want stomach issues from rushing it?",
        "core_answer": "Increase fiber gradually, spread it across the day, and choose sources that fit your medical history and diet pattern. Fast jumps in legumes, bran, large salads, or supplements can backfire if your gut is sensitive, so pace the change and let tolerance guide the next step.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "deciding whether drinks and add-ons are quietly raising calories",
        "scope": NUTRITION_SCOPE,
        "base_question": "How can I tell whether drinks and add-ons are quietly doing more damage to my calories than my actual meals?",
        "core_answer": "Look for items that add energy without much fullness: sweetened coffee, juices, shakes, sauces, dressings, and repeated tasting or sipping that never feels like a meal. If your main meals look reasonable but the weekly average still runs high, these extras are often the missing part of the story.",
    },
    {
        "feature": "recipe_and_food_support",
        "intent": "meal_tracking_help",
        "family": "recipe",
        "subject": "making a realistic post-workout dinner with local foods",
        "scope": NUTRITION_SCOPE,
        "base_question": "What would a realistic post-workout dinner look like for me using foods I would actually make or order here?",
        "core_answer": "Build it around a clear protein, a digestible carb, and vegetables or a lighter side so recovery stays high without turning the meal into a heavy late-night event. The practical answer is a meal you can repeat with local staples, not a perfect bodybuilder plate you only follow once.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "training well with only dumbbells and bands for a short block",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I change my plan if I only have dumbbells and bands for the next two weeks?",
        "core_answer": "Keep the same movement patterns and training goals, then use dumbbells, bands, unilateral work, tempo, and tighter rest periods to preserve intensity. A short equipment change does not require a new identity for the plan; it requires a cleaner substitute for each session's main job.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "reading logs when progress stalls but soreness stays high",
        "scope": WORKOUT_SCOPE,
        "base_question": "What do my workout logs usually reveal when progress stalls even though I still feel busy and sore all the time?",
        "core_answer": "They often reveal that fatigue is high but productive progression is low. If soreness stays high while loads, reps, or exercise quality do not improve, the plan may need better recovery, better exercise selection, or less junk volume rather than more effort.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "choosing between more rest days and better session structure",
        "scope": WORKOUT_SCOPE,
        "base_question": "How do I decide whether I need more rest days or just better structure inside the sessions I already have?",
        "core_answer": "Check whether the problem is recovery between sessions or wasted effort within them. If you finish sessions exhausted but unfocused, structure is probably the issue; if performance keeps dropping even when sessions are reasonable, you may need more recovery space.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "maintaining muscle during a busy month",
        "scope": WORKOUT_SCOPE,
        "base_question": "What is the minimum effective way to protect muscle during a month when work is busy and my training time drops?",
        "core_answer": "Protect intensity and consistency before volume. A few well-executed strength sessions built around major patterns and enough protein will hold onto muscle better than trying to squeeze full programming into a schedule that cannot support it.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "balancing step count or cardio with leg recovery",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I balance step count or cardio with leg training so recovery stays good?",
        "core_answer": "Use cardio and steps to support the plan, not compete with it. Keep harder conditioning away from your heaviest lower-body work, and if leg performance or soreness keeps getting worse, lower the cardio load before assuming the lifting plan is the only problem.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "training after poor sleep",
        "scope": WORKOUT_SCOPE,
        "base_question": "What is the smartest way to handle training after a night of poor sleep without throwing off the whole week?",
        "core_answer": "Keep the session, but lower the demand if needed. Good options are fewer hard sets, slightly lighter loading, or treating the day as a technique and consistency session so you protect the habit without pretending recovery is normal.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "whether exercise order is hurting performance or pain",
        "scope": WORKOUT_SCOPE,
        "base_question": "How can I tell whether the order of my exercises is making my performance or pain worse?",
        "core_answer": "If the lifts that matter most keep happening after fatigue, or the movements that irritate you feel worse when they are placed late, order may be part of the problem. Put priority lifts earlier, and place demanding or risky patterns where you can do them with the best control.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "adjusting upper-body training when elbows or wrists get irritated",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I adjust upper-body training if my elbows or wrists start getting irritated from the current setup?",
        "core_answer": "Keep the training effect while reducing the positions and loading styles that keep provoking the joint. Neutral grips, cable or machine variations, better exercise sequencing, and a temporary pullback in volume usually work better than trying to grind through irritation.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "workout",
        "subject": "rebuilding confidence after an injury flare",
        "scope": WORKOUT_SCOPE,
        "base_question": "What is the safest way for me to rebuild confidence after an injury flare without stopping training completely?",
        "core_answer": "Return with movements you can tolerate predictably, keep effort controlled, and let successful sessions rebuild trust before you chase load or volume. The goal early on is repeated safe exposure, not proving that the injury is gone in one workout.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "knowing whether home workouts are intense enough",
        "scope": WORKOUT_SCOPE,
        "base_question": "How do I know whether my home workouts are actually hard enough to support my goal?",
        "core_answer": "Judge them by progression, not by sweat alone. If you can track reps, load, tempo, range, or density and those are moving in the right direction while recovery stays reasonable, the home training is doing its job.",
    },
]

CONTEXT_RICH_BATCH_RECORDS = [
    {
        "feature": "blended_meal_workout_coaching",
        "intent": "coaching_review_help",
        "family": "blended",
        "subject": "turning past diet failures into a strategy that is more sustainable",
        "scope": BLENDED_SCOPE,
        "base_question": "If you review my profile, goals, restrictions, saved plans, and recent Hayetak logs, what does it really suggest about turning past diet failures into a better strategy I can actually stick to?",
        "core_answer": "Treat past diet failures as pattern data, not as a character flaw. If aggressive rules keep breaking under work stress, social meals, or hunger rebounds, the better strategy is a calmer calorie target, repeatable meals, and a training schedule that survives imperfect weeks.",
    },
    {
        "feature": "goal_and_plan_strategy",
        "intent": "goals_preferences_help",
        "family": "strategy",
        "subject": "choosing between a home plan and a gym plan based on what I can actually sustain",
        "scope": PROFILE_SCOPE,
        "base_question": "How do I decide whether a home plan or a gym plan gives me the best chance of finally sticking to training?",
        "core_answer": "Choose the setup you can repeat under your real schedule, energy, and travel pattern, not the one that sounds more serious. A simpler plan in the place you actually show up to usually beats the ideal plan that loses to commute time, friction, or missed sessions.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "building an actual weekly home plan with three sessions and injury-aware exercise choices",
        "scope": WORKOUT_SCOPE,
        "base_question": "Given that I prefer home workouts three times a week and have some knee and lower-back history, what kind of actual weekly plan would fit me best?",
        "core_answer": "Use a three-day full-body structure with joint-friendly squat, hinge, push, pull, and core work instead of chasing a bodybuilding split at home. The right week is the one that lets you train hard enough to progress while staying inside tolerable movement ranges.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "using a workday meal structure that stops missed meals from turning into evening overeating",
        "scope": NUTRITION_SCOPE,
        "base_question": "If my workday is busy, I train after work, and past diets failed because I skipped meals then overate at night, what meal structure should I use now?",
        "core_answer": "Build the day around earlier protein anchors and one planned bridge snack before training so the evening is not forced to fix the whole day. The goal is to arrive at dinner hungry but still in control, not to white-knuckle the afternoon and then overeat at night.",
    },
    {
        "feature": "recipe_and_food_support",
        "intent": "meal_tracking_help",
        "family": "recipe",
        "subject": "creating a realistic three-day meal-prep setup from safe ingredients already at home",
        "scope": NUTRITION_SCOPE,
        "base_question": "What would a realistic 3-day meal-prep setup look like for my diet type, allergies, and the ingredients I already have at home?",
        "core_answer": "Keep the prep built around one or two protein anchors, a carb base you tolerate well, and vegetables or sides that are easy to rotate. The best setup is short enough to cook and easy enough to repeat without turning logging into another project.",
    },
    {
        "feature": "blended_meal_workout_coaching",
        "intent": "coaching_review_help",
        "family": "blended",
        "subject": "breaking the restart cycle after social weekends and missed structure",
        "scope": BLENDED_SCOPE,
        "base_question": "If I keep restarting after one off-plan weekend, what does my recent Hayetak pattern suggest I should change in both food and training?",
        "core_answer": "The pattern usually says your structure is too fragile for weekends, not that the whole goal is wrong. Tighten the defaults you can carry into busy or social days and make the training week small enough that one missed session does not collapse the whole plan.",
    },
    {
        "feature": "workout_plan_decisions",
        "intent": "workout_plan_help",
        "family": "workout",
        "subject": "using a four-day gym plan for muscle gain without letting shoulder irritation build up",
        "scope": WORKOUT_SCOPE,
        "base_question": "What should a minimum effective gym plan look like if I can train four days, want muscle gain, and get shoulder irritation from too much pressing?",
        "core_answer": "Use a four-day structure that keeps pressing productive but not dominant, and balance it with enough pulling, leg work, and recovery spacing. The goal is not to remove upper-body training but to make the volume recoverable and shoulder-friendly.",
    },
    {
        "feature": "macro_and_nutrition_analysis",
        "intent": "macro_help",
        "family": "nutrition",
        "subject": "structuring carbs in a way that supports training and fat loss after strict low-carb kept failing",
        "scope": NUTRITION_SCOPE,
        "base_question": "If strict low-carb keeps failing for me, how should I structure carbs in a way that still supports fat loss and training?",
        "core_answer": "Use carbs where they solve real problems like training energy, adherence, and appetite control instead of treating them like the enemy. A moderate, placed-carb approach is usually more sustainable than swinging between restriction and rebound eating.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "planning a travel week with only hotel-dumbbell workouts",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I plan a travel week if I only have hotel-dumbbell workouts and still want to stay close to my main goal?",
        "core_answer": "Keep the week short, full-body, and centered on the movement patterns that matter most to your goal. Travel training works best when it protects momentum instead of trying to copy the full normal program under worse conditions.",
    },
    {
        "feature": "goal_and_plan_strategy",
        "intent": "goals_preferences_help",
        "family": "strategy",
        "subject": "recognizing when my plan is failing because it is too ambitious for my current life",
        "scope": PROFILE_SCOPE,
        "base_question": "How do I know whether my plan keeps failing because it is too ambitious, not because I am inconsistent?",
        "core_answer": "If the plan only works on ideal weeks, the plan is probably the problem. A realistic plan survives work stress, social meals, and lower-energy days without needing you to become a different person first.",
    },
    {
        "feature": "blended_meal_workout_coaching",
        "intent": "coaching_review_help",
        "family": "blended",
        "subject": "resetting after under-eating early, overeating late, and missing two workouts",
        "scope": BLENDED_SCOPE,
        "base_question": "What is the smartest reset if my last 7 days show under-eating early, overeating late, and two missed workouts?",
        "core_answer": "Reset the rhythm before you change the goal. Put food earlier in the day, reduce decision fatigue with repeated meals, and return to the minimum training week you can complete before you ask whether the goal itself needs adjustment.",
    },
    {
        "feature": "professional_support",
        "intent": "professional_support_help",
        "family": "support",
        "subject": "deciding when the coach is enough versus when I should book a trainer or dietitian",
        "scope": SUPPORT_SCOPE,
        "base_question": "When should I keep asking the coach versus booking a trainer or dietitian based on my current logs and limits?",
        "core_answer": "Use the coach for fast in-app guidance when the issue is mostly about day-to-day adjustments, but escalate to a professional when pain, repeated adherence failures, or safety limits keep showing up despite accurate profile data and recent logs.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "ui_troubleshoot",
        "action": "why the coach still answers as if I have no restrictions after I saved new allergy and injury details",
        "base_question": "Why does the coach still answer as if I have no restrictions after I saved new allergy and injury details?",
        "core_answer": "That usually means the latest safety details are not being read from the place you updated, or an older active plan is still shaping the answer context. Check the saved allergy and injury fields first, then confirm the relevant plan or coach context refreshed from them.",
    },
    {
        "feature": "progress_and_measurements",
        "intent": "progress_help",
        "family": "ui_explainer",
        "subject": "comparing my saved plan, today's logs, and the last-7-day trend without misreading one bad day",
        "base_question": "How should I compare my saved plan, today's logs, and the last-7-day trend without misreading one bad day?",
        "core_answer": "Treat the saved plan as the intended structure, today's logs as the current snapshot, and the 7-day trend as the better judge of whether there is a real pattern. One messy day matters far less than whether the overall week still points in the right direction.",
    },
    {
        "feature": "meal_planning_support",
        "intent": "meal_tracking_help",
        "family": "nutrition",
        "subject": "building a repeatable breakfast and lunch setup that improves fullness with limited morning time",
        "scope": NUTRITION_SCOPE,
        "base_question": "What kind of repeatable breakfast and lunch setup would fit fat loss if I get hungry fast and only have 10 minutes in the morning?",
        "core_answer": "Use a breakfast that quickly covers protein and some fullness, then pair it with a lunch you can pack or buy consistently without guesswork. The right pair reduces late hunger and lowers the chances that the afternoon turns chaotic.",
    },
    {
        "feature": "recipe_and_food_support",
        "intent": "meal_tracking_help",
        "family": "recipe",
        "subject": "making simple high-protein meals from eggs, labneh, chicken, lentils, rice, cucumber, and pita",
        "scope": NUTRITION_SCOPE,
        "base_question": "What are realistic high-protein meal ideas from ingredients like eggs, labneh, chicken, lentils, rice, cucumber, and pita if I need simple logging?",
        "core_answer": "Build meals from combinations you can repeat and estimate easily instead of inventing a new recipe each time. Simple plates with a clear protein anchor and easy side choices usually log better and keep adherence higher.",
    },
    {
        "feature": "workout_planning",
        "intent": "workout_planner_help",
        "family": "workout",
        "subject": "structuring 30-minute home sessions so they still support the goal",
        "scope": WORKOUT_SCOPE,
        "base_question": "If I only have 30 minutes per session at home, how should I structure training so it still moves my goal?",
        "core_answer": "Protect the main lifts or patterns first, trim the extras, and keep transitions short. A short session can still work well when it has a clear focus and enough effort, rather than trying to cover every exercise category at once.",
    },
    {
        "feature": "blended_meal_workout_coaching",
        "intent": "coaching_review_help",
        "family": "blended",
        "subject": "reading flat weight and flat strength when sleep and protein consistency are also weak",
        "scope": BLENDED_SCOPE,
        "base_question": "What does my data suggest if weight is flat, strength is flat, and my logs show weak sleep plus inconsistent protein?",
        "core_answer": "It suggests recovery and structure are probably limiting the result before the goal itself needs a dramatic change. Tightening sleep and protein consistency usually gives you a clearer read on whether the current calories and training are actually working.",
    },
    {
        "feature": "goal_and_plan_strategy",
        "intent": "goals_preferences_help",
        "family": "strategy",
        "subject": "moving from an all-or-nothing mindset to a plan that can survive work stress and social meals",
        "scope": PROFILE_SCOPE,
        "base_question": "How should I transition from an all-or-nothing mindset to a plan I can follow during work stress and social meals?",
        "core_answer": "Replace perfect-week rules with anchor habits that still count on imperfect days. The best transition is from rigid intensity to repeatable structure, not from effort to no standards at all.",
    },
    {
        "feature": "profile_safety",
        "intent": "allergies_medical_help",
        "family": "nutrition",
        "subject": "using an evening meal setup that respects both reflux and late-night hunger",
        "scope": NUTRITION_SCOPE,
        "base_question": "What kind of evening meal setup helps if reflux and late-night hunger are both part of my pattern?",
        "core_answer": "Aim for a meal that is filling without being overly heavy, and avoid turning the last meal into a rebound from under-eating earlier. When reflux and night hunger are both in the picture, meal timing, size, and food choice all matter more than chasing a perfect macro split.",
    },
    {
        "feature": "workout_logging_and_adjustment",
        "intent": "workout_log_help",
        "family": "workout",
        "subject": "rebuilding the week after missing three sessions without trying to cram everything back in",
        "scope": WORKOUT_SCOPE,
        "base_question": "How should I rebuild a week after missing three sessions without trying to cram everything back in?",
        "core_answer": "Restart from the next useful session instead of treating the missed work like debt. Protect the current week, keep the important patterns, and let the old missed volume go so the recovery cost does not spill into the next week too.",
    },
    {
        "feature": "ai_assistant_usage",
        "intent": "ai_assistant_help",
        "family": "support",
        "subject": "sending the right context when I want recipe help that matches allergies, ingredients, and today's macros",
        "scope": SUPPORT_SCOPE,
        "base_question": "What context should I send when I want recipe help that matches my allergies, ingredients, and today's macros?",
        "core_answer": "Send the goal, the relevant allergies or diet type, the ingredients you actually have, and the main calorie or protein room left for the day. Recipe questions become much more useful when the coach can see the safety limits and the real decision at the same time.",
    },
    {
        "feature": "goal_and_plan_strategy",
        "intent": "goals_preferences_help",
        "family": "strategy",
        "subject": "choosing a diet style that fits my history better after keto, fasting, or meal skipping all failed",
        "scope": PROFILE_SCOPE,
        "base_question": "How do I choose a diet style that fits my history better if keto, fasting, or meal skipping all ended badly for me?",
        "core_answer": "Pick the diet style that best matches the foods, schedule, and hunger pattern you can sustain, not the one that sounds most disciplined. Past failures usually tell you more about the structure you cannot repeat than about what will work long term.",
    },
    {
        "feature": "blended_meal_workout_coaching",
        "intent": "coaching_review_help",
        "family": "blended",
        "subject": "building a practical 14-day restart plan after a month of inconsistency",
        "scope": BLENDED_SCOPE,
        "base_question": "Given my saved logs and current profile, what would a practical 14-day restart plan look like after a month of inconsistency?",
        "core_answer": "Keep the reset short, specific, and intentionally easier than your old best weeks. A strong 14-day restart protects consistency first with simple meals, a realistic training split, and a few measurable habits you can actually complete.",
    },
]

def build_records() -> list[dict]:
    records = build_source_records() + APP_SUPPORT_RECORDS + EXPANDED_CLIENT_RECORDS + CONTEXT_RICH_BATCH_RECORDS
    if len(records) != BASE_QUESTION_COUNT:
        raise ValueError(f"Expected {BASE_QUESTION_COUNT} records, found {len(records)}")
    return records


def validate_dataset(dataset: dict) -> None:
    items = dataset["items"]
    if len(items) != BASE_QUESTION_COUNT:
        raise ValueError(f"Expected {BASE_QUESTION_COUNT} items, found {len(items)}")

    base_questions = [clean(item["base_question"]) for item in items]
    if len(base_questions) != len(set(base_questions)):
        raise ValueError("Base questions must be unique.")

    for item in items:
        variants = item["variants"]
        if len(variants) != VARIANTS_PER_QUESTION:
            raise ValueError(f"Item {item['id']} must have {VARIANTS_PER_QUESTION} variants.")

        questions = [clean(variant["question"]) for variant in variants]
        answers = [clean(variant["answer"]) for variant in variants]

        if len(questions) != len(set(questions)):
            raise ValueError(f"Item {item['id']} has duplicate variant questions.")
        if any(not answer for answer in answers):
            raise ValueError(f"Item {item['id']} has an empty answer.")
        if len(set(answers)) == 1:
            raise ValueError(f"Item {item['id']} cannot use the same answer for every variant.")

        base_question = item["base_question"]
        for idx, question in enumerate(questions, start=1):
            if idx != 1:
                if similarity(base_question, question) > 0.92:
                    raise ValueError(f"Variant {idx} of item {item['id']} is too close to the base question.")
                if symmetric_token_difference(base_question, question) < 4:
                    raise ValueError(f"Variant {idx} of item {item['id']} changes too little from the base question.")
            for phrase in EXCLUDED_PHRASES:
                if phrase in normalize(question):
                    raise ValueError(f"Excluded phrase '{phrase}' found in question: {question}")
                if phrase in normalize(answers[idx - 1]):
                    raise ValueError(f"Excluded phrase '{phrase}' found in answer: {answers[idx - 1]}")

        for left in range(len(questions)):
            for right in range(left + 1, len(questions)):
                if similarity(questions[left], questions[right]) > 0.95:
                    raise ValueError(f"Variants {left + 1} and {right + 1} of item {item['id']} are too similar.")

        if "item_context" not in item or "sample_user_context" not in item["item_context"]:
            raise ValueError(f"Item {item['id']} is missing item-level context.")
        for variant in variants:
            if "context" not in variant or "sample_user_context" not in variant["context"]:
                raise ValueError(f"Variant {variant['id']} of item {item['id']} is missing variant context.")


def build_dataset() -> dict:
    items = []
    for item_id, record in enumerate(build_records(), start=1):
        questions = [clean(question) for question in build_variations(record)]
        answers = [clean(answer) for answer in build_answers(record)]
        items.append(
            {
                "id": item_id,
                "feature": record["feature"],
                "intent": record["intent"],
                "base_question": record["base_question"],
                "item_context": build_item_context(record),
                "variants": [
                    {
                        "id": variant_id,
                        "question": question,
                        "answer": answers[variant_id - 1],
                        "context": build_variant_context(record, question, variant_id),
                    }
                    for variant_id, question in enumerate(questions, start=1)
                ],
            }
        )

    dataset = {
        "inferred_context": {
            "platform_theme": "Hayetak is a Lebanon-focused post-registration fitness, nutrition, and coaching platform that combines AI plans, meal tracking, workout tracking, progress monitoring, nearby discovery, messaging, and appointments.",
            "user_roles": ["client"],
            "included_features": [
                "dashboard",
                "profile and preferences",
                "allergies and medical-history-aware guidance",
                "AI nutrition and workout plans",
                "meal tracking, food search, and favorites",
                "calories, macros, and water tracking",
                "workout planning and workout logging",
                "progress and measurements",
                "nearby gyms and approved professionals",
                "messaging and appointments",
                "notifications, settings, and appearance",
                "optional post-signup two-factor authentication",
                "in-app password changes",
                "blended coaching grounded in recent logs, plans, restrictions, and progress",
            ],
            "excluded_features": [
                "registration and account creation",
                "login flow",
                "email verification",
                "trainer-only workflows",
                "nutritionist-only workflows",
                "admin workflows",
            ],
            "dataset_shape": {
                "base_questions": BASE_QUESTION_COUNT,
                "variants_per_question": VARIANTS_PER_QUESTION,
                "answer_per_variant": 1,
                "item_context_per_question": 1,
                "variant_context_per_variant": 1,
            },
        },
        "items": items,
    }
    validate_dataset(dataset)

    return dataset


def main() -> None:
    dataset = build_dataset()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(dataset['items'])} client items to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
