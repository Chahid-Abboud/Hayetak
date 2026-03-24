import json
import importlib.util
from pathlib import Path


OUTPUT_PATH = Path("storage/app/ai/training/hayetak_qa_dataset_110x10_concrete.json")


def load_base_module():
    source = Path(__file__).with_name("generate_hayetak_question_dataset.py")
    spec = importlib.util.spec_from_file_location("hayetak_base_dataset", source)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)

    return module


PRIMARY_ANSWERS = {
    1: "Keep the calorie deficit moderate instead of aggressive, keep protein high at every meal, and make resistance training the anchor of the week. The fastest way to lose muscle on Hayetak is to stack a hard deficit, inconsistent protein, and extra cardio on top of missed strength sessions, so the safer move is steady fat loss with repeatable meals and progressive training.",
    2: "Use a small calorie surplus, not a bulk mindset. Aim for gradual weight gain, keep protein consistently high, and only push calories up when your workout logs show you are recovering well and still failing to progress on strength or reps; if waist size climbs faster than performance, the surplus is too large.",
    3: "Keep endurance work focused and scheduled, not random. Two short zone-2 sessions and one harder conditioning session are usually enough to improve endurance while protecting a fat-loss phase, especially if you place most of your carbs near those sessions and avoid turning every workout into cardio.",
    4: "Your realistic weekly training target is the number you can hit even on a busy week, not your most motivated week. If your recent pattern is inconsistent, lock in two or three training days you can actually repeat, because a smaller plan completed every week beats an ambitious plan you miss half the time.",
    5: "Lean toward the setup that gives you the best adherence first, then add the other environment only if it clearly solves a problem. Home training is usually better for consistency and low-friction sessions, the gym is better when you need heavier loading or more exercise options, and a mixed approach works best when your schedule changes week to week.",
    6: "The profile details that most often weaken plan quality are missing allergies, vague medical or injury notes, unclear available equipment, and thin recent logs. If Hayetak does not know what foods are unsafe, what movements flare pain, and what your real week looks like, the plan has to stay more generic than it should.",
    7: "Your past diet failures should make the next plan simpler and more realistic, not stricter. If your history shows cravings, confusing guidance, time pressure, social conflict, or cost issues, the right answer is fewer moving parts, more repeatable meals, and a structure built around your known failure points instead of around ideal behavior.",
    8: "Medical history should slow down the pace of change and tighten the safety filter. That means steadier calories, more predictable meal timing when needed, a lower jump in training load, and quicker escalation to a clinician or verified professional if symptoms, dizziness, reflux, blood sugar issues, or pain start to increase.",
    9: "Injury history should meaningfully change exercise selection, volume, and progression, especially if the same joint keeps getting irritated. Keep the training effect, but swap to lower-risk patterns, reduce provocative ranges or loading, and let your logs prove that the new version is tolerable before you build volume again.",
    10: "If your recent routine is inconsistent, your recovery is shaky, or your logs already show missed targets, the current goal is probably too aggressive. A safer plan is one that preserves sleep, hunger control, workout quality, and adherence for several weeks instead of forcing a fast result that falls apart.",
    11: "Choose the diet style that already resembles the foods and meal rhythm you can sustain. For most Hayetak users, Mediterranean or a simple high-protein structure beats a highly restrictive approach unless low-carb, keto, fasting, or another style already matches their logs, medical context, and food preferences.",
    12: "Body recomposition makes the most sense when you still have room to improve consistency, protein intake, and training quality at the same time. If you are newer, detrained, or carrying enough body fat that better habits alone could improve both strength and body composition, recomp is usually smarter than forcing a hard cut or surplus.",
    13: "Restart by going straight back to your normal structure at the next meal and next session. Do not punish yourself with extreme cardio or an over-tight diet; just re-establish two anchors, usually one protein-forward eating pattern and one scheduled workout, and let momentum come back before you optimize anything else.",
    14: "Regenerate your AI plan when the inputs have meaningfully changed: a new goal, new injury, different equipment, different training location, a major schedule shift, or repeated drift between the saved plan and your real life. If the structure is still mostly right and only one habit is off, adjust the habit instead of rebuilding everything.",
    15: "Your biggest bottleneck is usually the part of the system that breaks most often and creates the biggest downstream mess. If meals are chaotic, nutrition becomes the bottleneck; if workouts keep disappearing, consistency becomes the bottleneck; if both are fairly solid but progress still feels wrong, then the plan itself needs adjustment.",
    16: "Your weekly eating pattern fits your goal when average calories are close to target, protein is consistently strong, and the biggest deviations are small enough that one day does not erase the others. If Hayetak shows large calorie swings, low protein on several days, or heavy weekend drift, the weekly pattern needs more consistency before you chase macro perfection.",
    17: "Protein usually slips first at breakfast, snacks, and meals built mostly around carbs or convenience foods. The easiest fix is to attach one dependable protein source to the meals you repeat most often, such as eggs, Greek yogurt, labneh, tofu, chicken, tuna, cottage cheese, tempeh, or a protein shake that fits your diet style and allergies.",
    18: "The biggest calorie spikes usually come from unplanned restaurant meals, calorie-dense snacks after under-eating earlier, and drinks or sauces that do not feel like a full meal. The fix is not to eat perfectly every day; it is to identify the one or two situations that blow up your weekly average and build a specific plan for those moments.",
    19: "The weakest meal type is usually the one that creates the most hunger, cravings, or logging drift later in the day. In practice that is often a low-protein breakfast, an unstructured snack window, or a dinner that is too heavy, so fix the meal that is driving the next bad decision rather than the meal that simply looks least healthy on paper.",
    20: "Build breakfast around satiety, not speed alone. A better template is 25 to 35 grams of protein, some fiber, and a predictable structure, like eggs with vegetables and toast, Greek yogurt with oats and berries, or tofu with fruit and nuts, because that makes the rest of the day easier instead of leaving you hungry by mid-morning.",
    21: "The best snack changes are the ones that protect protein and portion control without violating your diet style or allergies. Swap open-ended grazing for planned options like fruit plus yogurt, hummus with vegetables, nuts in a measured portion, a protein shake, roasted chickpeas, or a safe sandwich half that actually moves the day forward.",
    22: "Dinner should help recovery without turning into a digestion problem. That usually means a lean protein source, cooked vegetables, a moderate carb portion sized to the day, and less heavy fat, spice, or trigger foods late at night, especially if your profile includes reflux, IBS, or a history of poor sleep after large dinners.",
    23: "Make your usual foods leaner by changing the cooking method, the sauce load, and the plate balance before you remove the food itself. Grilling, baking, air-frying, adding vegetables, choosing higher-protein versions, and keeping the same flavors with fewer extras is a better long-term move than replacing every favorite with bland diet food.",
    24: "Meal logging patterns often reveal more than macro totals do. If you mostly log clean days, skip weekends, forget drinks and extras, or only log after a good workout, the issue is not just food choice; it is data quality, and Hayetak can only coach accurately when the messy parts of the week are visible too.",
    25: "Keep protein stable every day, then move carbs based on training demand. On training days, place more of your carbs before and after the session so performance and recovery stay strong; on rest days, pull carbs down slightly if needed and let vegetables, protein, and routine do more of the work.",
    26: "A low-fiber pattern usually shows up as lots of processed foods, too few vegetables, and not enough fruit, legumes, or whole-food carb sources. Improve it gradually with foods that fit your diet style and medical context, because the right move for a Mediterranean client is not the same as the right move for someone doing keto, Whole30, or low FODMAP.",
    27: "Lower sodium by targeting the obvious hidden sources first: packaged meats, sauces, restaurant foods, instant items, and repeated processed snacks. Keep meals practical by using herbs, lemon, yogurt-based sauces, and plain protein staples instead of trying to make every meal perfectly low sodium.",
    28: "A realistic grocery list should make your best week easier to repeat. Stock two or three safe proteins, two carb bases, enough vegetables and fruit you will actually use, one or two quick breakfast options, one emergency snack, and the condiments or spices that make the plan livable within your allergies, diet type, and budget.",
    29: "Build repeatable meals from what you usually keep on hand instead of chasing novelty. Hayetak works best when you can turn your regular ingredients into simple bowls, scrambles, sheet-pan meals, wraps, soups, or rice-and-protein plates that already fit your calories, restrictions, and cooking reality.",
    30: "Handle restaurant meals by deciding the structure before you arrive: lead with protein, check allergen or trigger-food risks early, choose one indulgent piece instead of turning the whole meal into a free-for-all, and return to your normal plan at the next meal. Social flexibility should live inside the week, not replace it.",
    31: "When medical history, allergies, and goal all matter at once, the safest meal strategy is the one that removes known trigger foods, keeps meal timing steady when that helps symptoms or appetite control, and still protects protein and energy balance. If your condition changes what is safe or tolerated, the medical constraint wins over the ideal macro split.",
    32: "Your logs suggest underplanning when mornings are light, afternoon hunger spikes, and the evening becomes compensation. The fix is to give the day more structure early, especially with protein and a real lunch, so dinner and snack decisions stop carrying the whole burden of the plan.",
    33: "If one meal keeps getting skipped, stop forcing a perfect meal schedule and redistribute its calories and protein into the meals you actually eat. The goal is still to hit your daily targets safely, not to keep a meal slot alive just because it looks tidy on paper.",
    34: "Drinks matter more than most users expect because they can add energy without satiety or, in some cases, displace food that should have contained protein and fiber. Hayetak should treat liquid calories, sweetened coffee, juices, smoothies, and even frequent healthy drinks as part of the weekly pattern, not as background noise.",
    35: "Recent meals match your saved plan when the structure is recognizable even if the exact foods change. The important drift to catch is not a different lunch choice; it is repeated misses on protein, skipped meals the plan assumed you would eat, or recurring restaurant and social patterns that the saved plan never accounted for.",
    36: "Training quality is not just whether you exercised; it is whether the week had enough structure, completion, effort, and recovery to create progress. A week of random hard sessions can look busy in the logs and still be lower quality than three repeatable sessions that hit the right patterns and leave room to recover.",
    37: "For fat loss, volume only helps up to the point where it supports muscle retention and adherence. If your logs show enough lifting to train the major patterns two to four times a week and recovery is still good, you are probably in the useful range; if soreness, fatigue, or missed sessions rise, the extra volume is no longer helping.",
    38: "Muscle gain needs enough hard work per muscle group, clear progression, and enough food to recover from it. If your current setup is mostly maintenance-level effort, the best fix is not adding endless exercises; it is adding high-quality hard sets, tracking them, and making sure the plan gives you a reason to improve week to week.",
    39: "An imbalanced plan usually shows up as too much pressing or quad work, not enough pulling or hinging, or too little single-leg and core work. The fastest upgrade is to audit the week by movement pattern instead of by how hard the sessions felt and fill the biggest gap rather than adding more of what you already like.",
    40: "Shoulder-safe substitutions should preserve the training goal while lowering irritation. Neutral-grip pressing, landmine work, machine or cable options, chest-supported rows, and lateral raises inside a tolerated range usually let upper-body days stay productive without forcing overhead work that your profile already flags as risky.",
    41: "A knee-friendly lower-body plan should reduce the movements that repeatedly trigger deep flexion pain and keep the work that trains the legs without the same joint cost. Box squats, split-squat variations, hip hinges, glute bridges, sled work, step-ups, cycling, and controlled tempo work are far more useful than just avoiding leg training entirely.",
    42: "Back-friendly training still works when you protect spinal loading and keep your bracing honest. Use chest-supported rows, goblet or front-loaded squat options, controlled hinges you can tolerate, carries, and core work that builds stability; the goal is not to remove effort but to remove the patterns that keep poking the same area.",
    43: "When equipment changes, keep the movement pattern and the session objective before you worry about the exact exercise. Match each squat, hinge, push, pull, carry, or conditioning slot with the best available option for the new setup, and keep progression alive by adjusting reps, tempo, pauses, or density instead of canceling the workout.",
    44: "A good home version of a gym day keeps the same job description for the session. If the gym day was lower-body strength, the home day should still be lower-body strength using dumbbells, bands, tempo, unilateral work, and shorter rest, not a random cardio circuit that leaves the plan with a missing strength stimulus.",
    45: "When full gym access becomes available, upgrade the home day by improving load progression and exercise stability, not by doubling the exercise count. Machines, cables, barbells, and better dumbbell options should make it easier to progress safely and precisely, especially if your home version was limited by load or awkward setup.",
    46: "Increase load, reps, or total volume when your logs show that the current prescription is no longer challenging enough but technique and recovery are still solid. A simple rule is to add a little when you hit the top of the rep target with clean form for at least two exposures, and only push one variable at a time.",
    47: "Your frequency is too high if performance trends down, soreness overlaps into the next session, or pain and skipped days keep rising. It is too low if you recover easily, want more structure, and the current schedule does not give enough weekly exposure to the lifts or muscle groups that matter for your goal.",
    48: "Shorten tight-schedule workouts by protecting the first one or two highest-value movements and trimming the fluff. A main lift, two useful accessories, and a fast conditioning or core finish will preserve the point of the day far better than trying to rush through the full session badly.",
    49: "Your warm-up should solve the problems your profile and training style actually create. Start with a few minutes to raise body temperature, then give extra attention to the joints or ranges that your history flags, and finish with ramp-up sets so the first working set is not the real warm-up by accident.",
    50: "After travel, illness, or missed sessions, treat the first week back as a re-entry week. Use lighter loads or fewer sets, stop a little farther from failure, and let the logs prove that you have your rhythm and recovery back before you try to make up for the time you missed.",
    51: "Recovery spacing is realistic when similar muscle groups and stressed joints get enough time between harder sessions and your weekly schedule still feels sustainable. If the plan keeps stacking the same stressors back to back, you do not need more motivation; you need smarter sequencing.",
    52: "The highest-risk exercises are the ones that directly load a joint, range, or movement your profile already marks as sensitive and that your logs keep associating with setbacks. If an exercise is hard to recover from, easy to substitute, and not essential to the goal, it should lose the argument quickly.",
    53: "Combine cardio and strength by giving each one a job. Lift first when strength or muscle retention matters most, use cardio to support recovery or conditioning instead of turning every session into a hybrid blur, and separate the hardest conditioning from the heaviest lower-body work when your recovery margin is small.",
    54: "Pick the split that fits the number of days you can repeat, not the one that sounds advanced. Full body usually wins for two or three days, upper-lower often wins for four, and high-frequency splits only make sense when recovery, equipment, and consistency all support them.",
    55: "Your low-energy version should still preserve identity. Do the warm-up, hit the main movement, add one or two helpful accessories, and stop; that keeps the habit alive and preserves training intent without pretending a drained day needs the same volume as a strong day.",
    56: "Your weekly review should read like one story: how well your meals supported your training, whether training matched the goal, where recovery got tight, and which habit did the most damage. When food, workouts, and the goal are read together, the next step usually becomes much clearer than when each log is judged separately.",
    57: "If I could only change a few things next week, I would change the levers that reduce friction and compound the fastest: one repeatable protein-forward meal pattern, one realistic workout schedule, and one recovery habit like sleep or hydration. Small changes that happen every day beat a perfect one-day reset.",
    58: "During fasting periods, lower the need for willpower by simplifying both food and training. Keep hydration and electrolytes tighter, place the hardest sessions near the feeding window when possible, prioritize protein and digestible carbs when you break the fast, and accept that maintenance-quality training can be a win if adherence stays intact.",
    59: "Training days and rest days should feel different only where it matters. Keep protein and basic meal structure stable, give training days more carbs and a little more total food if needed, and make rest days slightly lighter without turning them into under-eating days that trigger cravings later.",
    60: "If weekends keep undoing the week, the issue is rarely one bad meal; it is the loss of structure. Keep one morning routine, one planned movement session or long walk, and one strategy for social eating, and you will usually protect your weekly average without trying to make weekends feel like weekdays.",
    61: "When weight feels stalled, check data quality before you assume the plan stopped working. Incomplete logging, higher sodium, menstrual-cycle effects, constipation, poor sleep, lower activity, and short time windows all create fake stalls, so verify the basics before you cut calories harder.",
    62: "Interpret weight trend against workouts, meals, and measurements over a few weeks, not a few days. If weight is flat but gym performance, waist, pictures, or consistency are improving, the trend may be healthier than it feels; if weight is dropping but recovery and strength are collapsing, the trend may be too aggressive.",
    63: "Make an inconsistent week work by switching from a rigid calendar to a modular system. Use two or three anchor meals you can repeat in different time slots, keep a small menu of fallback workouts for home and gym, and judge the week by total completed work and average intake rather than by whether every day looked identical.",
    64: "Reduce meal-prep burden by deciding what must be homemade and what simply needs to be safe and good enough. Batch-cook proteins and carb bases, keep frozen vegetables and quick breakfast options ready, and allow some convenience foods that fit your plan so the system survives real-life busy days.",
    65: "A lower-budget version of your plan should lean harder on affordable protein, simple staples, and fewer waste-prone foods. Eggs, yogurt, legumes, canned fish, chicken, rice, oats, potatoes, frozen vegetables, fruit in rotation, and a small set of seasonings usually keep nutrition strong without making the plan expensive.",
    66: "Cravings are easier to manage when the plan removes the conditions that create them. Regular protein, enough total food, fewer long gaps between meals, a planned treat instead of repeated restriction, and an environment with less decision fatigue will usually beat trying to win the same hunger fight every evening.",
    67: "To hit protein on a vegetarian or vegan pattern, distribute protein across the day instead of trying to rescue it at dinner. Use repeatable anchors like eggs, dairy, soy foods, legumes, lentil or chickpea meals, tofu, tempeh, edamame, high-protein yogurt, or a suitable supplement if your current foods alone are not closing the gap.",
    68: "Variety under heavy restrictions comes from rotating safe building blocks, not from forcing risky foods back in. Change cuisine, seasoning, texture, cooking method, and meal format while keeping the core proteins, carbs, and vegetables inside your safe list so the plan feels different without becoming unsafe.",
    69: "Focus first on the lever that gives you the biggest return with the least friction. For most users that means food quality and meal structure before advanced meal timing, or workout adherence before training intensity, because the plan only gets to be sophisticated after it becomes stable.",
    70: "The habits that usually pull against each other are aggressive fat loss with muscle-gain expectations, high training frequency with poor recovery, or a restrictive diet with a highly social week. Pick one main adaptation to chase for the next block, then let the other goals be maintained instead of optimized at the same time.",
    71: "A good recipe from current ingredients should solve your next meal, not impress you. Think protein-first bowls, skillet meals, lentil soups, sheet-pan trays, wraps, omelets, or stir-fries built from what is already in the kitchen, then adjust the carb and fat load to the day while keeping allergens and trigger foods out.",
    72: "Quick post-workout meals should be easy to digest and easy to repeat. The best pattern is a clear protein source plus digestible carbs, like yogurt and fruit, rice with chicken, eggs with toast, tofu and rice, or a shake with a simple carb add-on, rather than a heavy high-fat meal that slows recovery.",
    73: "Late-night options should calm hunger without turning into a second dinner. Choose something protein-forward, portioned, and low on known trigger foods, like yogurt, cottage cheese, a small sandwich, fruit with a measured nut portion, or a light tofu or egg option that fits your diet pattern.",
    74: "Portable meals work when they survive your day without needing perfect timing or equipment. Wraps, rice bowls, overnight oats, fruit plus a protein source, chickpea salads, yogurt cups, safe sandwiches, and pre-portioned snacks are all better than hoping you will find something suitable once you are already hungry.",
    75: "Order food out by leading with what must be respected first: allergies, diet type, and obvious medical triggers. After that, choose a protein-centered dish, ask for sauces and add-ons on the side, use portions strategically, and avoid turning one takeout meal into a full-day derailment.",
    76: "The best nearby place depends on the bottleneck. If your problem is training consistency or exercise quality, compare nearby gyms by location, equipment fit, and whether getting there would actually increase adherence; if your problem is food restrictions, symptoms, or meal structure, compare approved dietitians or nutrition clinics in cities like Beirut, Tripoli, Saida, Jounieh, Byblos, or Zahle by specialty and practical access.",
    77: "Choose a trainer when the main problem is exercise selection, progression, pain-safe programming, or accountability with workouts. Choose a nutritionist when the main problem is calorie control, protein, meal structure, allergies, diet type, symptom triggers, or medical nutrition questions; if both are limiting progress, use both instead of making one person guess outside their lane.",
    78: "Before a first appointment, ask how they use your logged meals or workouts, how they handle allergies and medical constraints, how often they adjust the plan, what kind of follow-up to expect, and what would make them escalate or refer out. A good first appointment should feel specific to your data, not like a generic template.",
    79: "Your first message should do the sorting work for the professional. Include your goal, schedule, available equipment, injuries or medical history, diet type, allergies, what the last 7 days looked like, and one clear sentence about what you want help with now so they can respond with something useful quickly.",
    80: "Bring in a trainer or nutritionist when the issue is staying stuck despite honest effort, when safety matters because of medical or injury history, or when your logs show the same pattern repeating and you still do not know what to change. External help is worth it when it shortens trial-and-error, not only when things are going badly.",
    81: "Start the trainer summary with the simplest truth: how often the client actually trained, what quality the sessions had, and whether recovery or pain is limiting progression. The next coaching focus should then narrow to one thing, usually adherence, load progression, or safer exercise selection, instead of trying to fix everything at once.",
    82: "A plateau pattern usually looks like stable or declining performance across similar sessions, unchanged volume, and body measurements or body weight moving without a matching improvement in strength or work capacity. That points to a need for either better progression, better recovery, or a tighter plan, not just more motivation.",
    83: "Say this: 'We do not need perfect weeks to make progress, but we do need a version of the plan you can actually complete. For the next two weeks, let us shrink the target to the minimum you can hit even on a busy day, then build from consistency instead of chasing missed sessions.'",
    84: "Adjust the client plan by removing the movements that repeatedly irritate the knee, shoulder, or back while keeping the same movement category in a safer form. Lower the cost of the session first, then rebuild confidence and progression from pain-free patterns instead of asking the client to push through a warning signal.",
    85: "A clear trainer progress note should include attendance, what the client completed, how their effort and recovery looked, what pain or limitation showed up, and the single adjustment you are making next. If the note cannot explain why the next block is changing, it is too vague to guide coaching.",
    86: "Prepare talking points around four things: what improved, what was missed, what felt risky or unrecovered, and what one change will matter most before the next check-in. That keeps the appointment focused on coaching decisions instead of turning it into a general recap of everything in the app.",
    87: "Refer clearly to a nutritionist when the limiting factor is food quantity, protein, meal timing, allergies, restrictive diets, GI symptoms, blood sugar concerns, or repeated questions about what the client should eat. Trainers help most when the barrier is training; they should not improvise medical nutrition advice because the client asked confidently.",
    88: "Turn the next phase progressive by keeping the plan recognizable and adding only the smallest next demand the client can recover from. That might be one extra set on key lifts, a tighter rep target, a modest load increase, or a cleaner weekly structure, but it should be earned by recent consistency in the logs.",
    89: "Summarize the client's week by looking for meal rhythm, protein consistency, calorie drift, trigger foods, and how the week changes under stress or social pressure. The main nutrition issue is usually the pattern that repeats across days, not the single meal that looked the worst.",
    90: "With PCOS, diabetes, reflux, or IBS in the picture, the plan has to prioritize symptom control and safety before idealized macros. That usually means more stable meal timing, less reliance on trigger foods, more deliberate fiber and protein distribution, and a willingness to keep the plan simple enough that the client can actually observe what helps and what aggravates symptoms.",
    91: "Say this: 'I can still give useful feedback from partial logs, but I am not going to fake precision from incomplete data. Let us use what is visible to improve one or two habits now, then collect a more representative three- to seven-day log so the next adjustment is based on a truer picture.'",
    92: "Past diet failures should directly shape the next plan. If the client repeatedly fails on cost, hunger, confusion, meal prep, or social situations, build the next diet around cheaper staples, simpler meals, clearer rules, and planned flexibility instead of assuming more discipline will solve the same old failure mode.",
    93: "Before a first nutrition appointment, review the client's allergies, diet type, medical history, past failure reasons, recent meal logs, and schedule constraints so you can start with the real friction points. A strong first session should make the client feel understood quickly and should identify one immediately actionable nutrition change.",
    94: "Stop and redirect when the client asks for pain diagnosis, rehab direction, or exercise selection that depends on an injury assessment outside your scope. A nutritionist can note the issue, avoid food advice that worsens recovery, and direct the client to a trainer or clinician instead of crossing into training or medical decision-making.",
    95: "A user probably needs support instead of generic reminders when the same drop-off pattern repeats after onboarding, when logs suddenly go silent after previously active use, when appointments are repeatedly missed, or when messages and notifications suggest confusion rather than avoidance. That is the moment for a targeted human nudge, not a broader reminder blast.",
    96: "An incomplete or unclear verification request should be checked for identity mismatch, missing or expired licensing details, unclear authority, documents that do not match the requested role, and contact or location data that cannot be trusted. The admin goal is not speed alone; it is protecting users from false credibility.",
    97: "Admin actions, notifications, and review timing can expose operational bottlenecks long before users complain directly. If approvals are delayed, the same records are being edited repeatedly, or support actions cluster around one workflow like professional reviews or food corrections, the issue is probably systemic and worth fixing at the process level.",
    98: "Unsafe food records usually reveal themselves through contradictions: allergens missing from ingredient lists, diet tags that conflict with the ingredients, macros that are implausible, duplicate names with different safety metadata, or vague items that make portioning or restriction checks impossible. Those records should be reviewed before cosmetic catalog work.",
    99: "Keep a place listing visible when the category is clear, the location is believable, contact or metadata is consistent, and there is some signal of recent verification or ownership rather than a stale duplicate. If the listing looks ambiguous, duplicated, or poorly sourced, it is safer to review it manually than to leave a low-trust recommendation live.",
    100: "If the team can only fix a few issues first, start with anything that can create unsafe coaching or unsafe discovery: food allergen and diet-tag accuracy, professional verification quality, and obviously wrong place or contact data. After that, clean duplicate records and incomplete metadata that hurt user trust but do not create immediate safety risk.",
    101: "Use measurements and weight trend like a pattern, not a verdict. Weekly averages, waist or hip changes, progress photos, and training performance tell a truer story than a single scale reading, so let short-term noise exist without changing the plan every time it appears.",
    102: "If weight is dropping but strength is falling too, ease the plan before you push harder. Increase food slightly or reduce the deficit, protect protein, check sleep and training volume, and make sure cardio is not eating the recovery needed to hold performance.",
    103: "If workouts are consistent but nutrition data is messy, fix the nutrition structure first because it is probably masking what the training is doing. Better logging, one repeatable breakfast or lunch, and a more predictable protein intake will usually unlock better recovery and body-composition feedback without changing the training block yet.",
    104: "If meals are fairly consistent but workouts keep falling off, reduce the training barrier instead of rewriting the food plan. Shorter sessions, fewer required days, more flexible home-or-gym options, and a minimum effective version of each day will usually recover adherence faster than adding more exercise detail.",
    105: "You are ready to move beyond a beginner routine when the basics are no longer the limiting factor: your technique is stable, your recovery is predictable, your logs show consistent execution, and progress is starting to stall even though you are doing the plan honestly. Until then, more complexity usually just hides inconsistency.",
    106: "After a hard stretch, dial volume or intensity down on purpose instead of waiting for a breakdown. Keep the same training days if you want to preserve routine, but cut total work by roughly a third to a half, stay farther from failure, and let the deload restore momentum rather than treating it like lost progress.",
    107: "If your trainer's plan and the AI plan do not match, trust the trainer first on exercise choice, pain history, technique, and progression because they are accountable for the training relationship. Use the AI plan as a support tool for structure, travel substitutions, or home versions unless it conflicts with your trainer's clear safety reasoning.",
    108: "If your dietitian's plan and AI meal suggestions differ, let the dietitian's plan lead whenever the issue touches medical history, symptom control, allergies, or a specific therapeutic strategy. Use AI suggestions to create variety, shopping ideas, and safer substitutions inside those boundaries rather than treating both sources as equal when they conflict.",
    109: "Ask the AI like a coach, not like a search box. Include your goal, recent meals or workouts, allergies, medical or injury limits, available equipment or ingredients, and the exact decision you are stuck on, because specific context turns a generic answer into something you can actually use.",
    110: "Move from a deficit to maintenance when the cut has done its job or when the cost of staying in it is getting too high. Persistent hunger, slipping training performance, poor recovery, stalled adherence, or enough progress already achieved are all signs that maintenance may help you protect results better than continuing to squeeze the deficit.",
}


CLIENT_FALLBACK = (
    "I can still help, but without updated meal logs, workout logs, or profile details I would stay conservative. "
    "The safest next step is to protect allergies and injury limits, keep one repeatable food habit and one realistic workout habit, "
    "and log three to seven honest days before making a bigger change."
)

TRAINER_FALLBACK = (
    "With sparse workout logs or weak client notes, I would avoid pretending there is a clear pattern. "
    "Ask for one representative training week, current pain or recovery notes, and confirmation of available equipment before changing the program aggressively."
)

NUTRITIONIST_FALLBACK = (
    "If the meal data is incomplete, I would give only low-risk guidance and say that clearly. "
    "Use the visible pattern to make one practical change, then ask the client for a more representative three- to seven-day log before tightening the plan."
)

ADMIN_FALLBACK = (
    "If the evidence is thin, the safer admin move is to review more records instead of guessing intent. "
    "Check the linked logs, related entities, timestamps, and repeated patterns before escalating or taking a permanent action."
)


def inferred_context() -> dict:
    return {
        "platform_theme": "Hayetak is a Lebanon-focused fitness, nutrition, and coaching platform that combines AI planning, food logging, workout logging, professional support, and nearby gym or nutritionist discovery.",
        "user_roles": ["client", "trainer", "nutritionist", "admin"],
        "key_features": [
            "profile-driven diet and workout planning",
            "meal tracking with macros, allergens, diet tags, and favorites",
            "workout plans, workout logs, set-level tracking, and progress notes",
            "AI plans, AI conversations, feedback, and usage logs",
            "trainer and nutritionist discovery, assignments, messaging, and appointments",
            "nearby gym and nutritionist listings from curated places data and map search",
            "admin review flows for users, professionals, foods, places, notifications, and action logs",
        ],
        "key_data_types": [
            "users with role, verification status, age, gender, height, weight, goals, diet type, allergies, activity level, workout days, workout location, past diet failures, and medical history",
            "user preferences with daily targets, activity factor, notifications, injuries, and available equipment stored in settings",
            "foods with serving info, calories, macros, allergens, diet allowances, ingredients, tags, and meal types",
            "meal entries, meal logs, water intakes, and measurements",
            "workout plans, workout plan days, workout plan exercises, workout logs, and workout log sets",
            "AI plans, AI requests, AI conversations, AI messages, AI feedback, and AI usage logs",
            "professional assignments, professional verifications, conversations, messages, appointments, notifications, and admin action logs",
            "places_local records for gyms and nutritionists with city, coordinates, descriptions, metadata, and verification timestamps",
        ],
        "observed_realistic_entities": {
            "cities": ["Beirut", "Tripoli", "Saida", "Jounieh", "Byblos", "Jbeil", "Zahle"],
            "diet_styles": ["Mediterranean", "High-Protein", "Low-Carb", "Vegetarian", "Vegan", "Keto", "Paleo", "Whole30", "Low FODMAP", "DASH", "Intermittent Fasting"],
            "common_restrictions_and_conditions": [
                "PCOS",
                "type 2 diabetes",
                "acid reflux",
                "IBS",
                "hypothyroidism",
                "iron-deficiency anemia",
                "sleep apnea",
                "high triglycerides",
                "fatty liver disease",
                "asthma",
                "shoulder impingement",
                "knee pain",
                "wrist strain",
                "ankle sprain history",
                "postpartum core weakness",
            ],
        },
    }


def build_concrete_answers(index: int, item: dict) -> list[dict]:
    primary = PRIMARY_ANSWERS[index]
    audience = item["audience"]

    if audience == "client":
        return [
            {"context": "client_with_profile_and_recent_logs", "answer": primary},
            {"context": "missing_recent_logs_or_incomplete_profile", "answer": CLIENT_FALLBACK},
        ]

    if audience == "trainer":
        return [
            {"context": "trainer", "answer": primary},
            {"context": "sparse_client_training_data", "answer": TRAINER_FALLBACK},
        ]

    if audience == "nutritionist":
        return [
            {"context": "nutritionist", "answer": primary},
            {"context": "sparse_client_nutrition_data", "answer": NUTRITIONIST_FALLBACK},
        ]

    return [
        {"context": "admin", "answer": primary},
        {"context": "insufficient_operational_evidence", "answer": ADMIN_FALLBACK},
    ]


def build_dataset() -> dict:
    module = load_base_module()
    if len(module.ITEMS) != 110:
        raise ValueError(f"Expected 110 base items, found {len(module.ITEMS)}")

    if len(PRIMARY_ANSWERS) != 110:
        raise ValueError(f"Expected 110 primary answers, found {len(PRIMARY_ANSWERS)}")

    items = []
    for index, item in enumerate(module.ITEMS, start=1):
        items.append(
            {
                "id": index,
                "audience": item["audience"],
                "category": item["category"],
                "base_question": item["base_question"],
                "variations": module.build_variations(item),
                "concrete_answers": build_concrete_answers(index, item),
            }
        )

    return {"inferred_context": inferred_context(), "items": items}


def main() -> None:
    dataset = build_dataset()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(dataset['items'])} items to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
