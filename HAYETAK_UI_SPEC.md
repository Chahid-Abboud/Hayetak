# Hayetak UI Spec

Status: design/product spec only. No code changes are included in this document.

Purpose: turn the product inspiration references into a concrete UI direction for:

- `resources/js/pages/welcome.tsx`
- `resources/js/pages/dashboard.tsx`
- `resources/js/pages/track_meal/track_meals.tsx`
- `resources/js/pages/workouts/log.tsx`

## 1. Product Direction

Hayetak should not feel like a generic calorie counter and it should not feel like a hardcore lifting app.

The strongest blend for this product is:

- Visual tone: Lifesum + FoodNoms
- Nutrition credibility: MacroFactor + Cronometer
- Meal logging speed: MyFitnessPal + Lose It!
- Workout logging feel: Hevy + Strong
- Planner framing: Eat This Much

What Hayetak should communicate:

- Real-life nutrition and training
- AI that helps, not AI that performs
- Safe guidance for allergies, injuries, and medical constraints
- A clean today-first workflow
- Lebanese and regional relevance without becoming visually niche

What to avoid:

- Dense walls of data as the default state
- Too many equal-priority cards on the dashboard
- Workout logging that feels like a spreadsheet
- Overly medical nutrition UI
- Overly bro gym branding

## 2. Core UX Principles

### Today First

Every core screen should answer:

- What matters today?
- What should I do next?
- What is the fastest safe action I can take?

### Log Fast, Explain Later

Primary actions should be fast and lightweight. Details, charts, and nutrient depth should sit one layer deeper.

### Safety Is Visible

Allergy, diet, injury, and equipment constraints should appear as helpful context chips and safe alternatives, not only as blocking error messages.

### AI Is Assistive

The planner and coach should appear as guidance layers attached to real workflows:

- after signup
- on the dashboard daily brief
- during meal swaps
- during workout substitutions

### Mobile Matters Most

Meal logging and workout logging should be designed as phone-first flows with desktop expansion, not desktop screens collapsed into mobile.

## 3. Visual System

Hayetak already has good base tokens in `resources/css/app.css`: mint/teal, green, warm gold, and soft neutral surfaces. The UI pass should refine hierarchy rather than replace the palette.

### Color Use

- Use `primary` for progress and main action.
- Use `secondary` for supporting success states and wellness cues.
- Use `accent` for coach insights, highlights, and planner moments.
- Use muted surfaces for default cards so charts and action buttons stand out.

### Surface Style

- Prefer rounded cards in the `24px-28px` range for hero and main modules.
- Keep subtle gradients and soft glows only for hero zones and AI modules.
- Use plain white/light card surfaces for logging flows so inputs stay legible.

### Typography

- Keep the current sans stack.
- Use heavier, larger page headlines.
- Use smaller and calmer secondary copy.
- Keep stat numbers bold and tabular wherever possible.

### Motion

- Use short reveal and loading transitions.
- Avoid decorative animation during logging.
- Use motion only to confirm progress, open detail, or guide the eye.

## 4. Homepage Spec

Target file: `resources/js/pages/welcome.tsx`

### Homepage Goals

- Explain the product in one scroll
- Make the AI planner feel credible
- Show that Hayetak covers meals, workouts, and coaching together
- Show safety and personalization as differentiators
- Replace placeholder illustration blocks with real product proof

### Homepage Wireframe

```text
[Nav]

[Hero]
Left:
- Eyebrow: AI nutrition + training
- Headline
- Short value prop
- Primary CTA
- Secondary CTA
- Trust chips

Right:
- Product collage
  - planner preview
  - meal logging card
  - workout logging card
  - coach chat bubble

[Proof Strip]
- Calories + macros
- Workout logging
- AI coach
- Safety-aware planning

[How It Works]
1. Tell Hayetak about your goals, restrictions, and routine
2. Track meals and workouts in a fast daily flow
3. Get an AI plan and coach guidance that adapts safely

[Safety Block]
- Allergies respected
- Injury-aware exercise alternatives
- Meal swaps based on real ingredients/equipment

[Feature Sections]
- Planner
- Meal tracking
- Workout logging
- Coach chat

[Final CTA]
```

### Homepage Content Rules

- Headline should be benefit-first, not feature-first.
- Show actual screens instead of abstract placeholders.
- Use short proof points with numbers or outcomes.
- Treat AI as a utility layer, not the hero by itself.

### Homepage UI Notes

- The hero should become a two-column product story on desktop.
- On mobile, stack copy first and product collage second.
- Add a small trust row under CTAs: "allergy-aware", "injury-aware", "AI plans", "meal + gym tracking".
- Use real UI screenshots from Hayetak or polished mocks of real Hayetak flows.

### Homepage Implementation Checklist

- Replace the three feature placeholders with real screen imagery.
- Add a "Why Hayetak is safer" block.
- Make the "3 easy steps" section visually stronger with numbered cards.
- Add a coach/chat preview so the AI feature feels tangible.

## 5. Dashboard Spec

Target file: `resources/js/pages/dashboard.tsx`

### Dashboard Goals

- Make the first 10 seconds useful
- Surface today's priorities before historical data
- Connect meals, workouts, hydration, and AI guidance
- Reduce the feeling of stacked unrelated cards

### Dashboard Module Order

1. Welcome header with one-line daily brief
2. Quick actions row
3. Top metrics row
4. Primary content row
5. Weekly trends row
6. Plan preview row

### Dashboard Wireframe

```text
[Header]
- Welcome back, Name
- Daily brief from AI
- Quick actions: Log meal / Start workout / Open coach

[Top Metrics]
- Calories left
- Protein progress
- Workout status
- Water progress

[Primary Row]
Left:
- Today's meals summary
- Per-meal progress

Center:
- Today's workout card
- Start or continue session

Right:
- AI coach brief
- Safe reminder
- Suggested next action

[Weekly Trends]
- 7-day calories/macros
- 7-day workout consistency
- Weight/progress trend

[Plan Preview]
- Today's nutrition plan
- Today's workout plan
```

### Dashboard Behavior

- Show one main AI card, not multiple AI widgets.
- Use quick actions with clear verbs.
- Collapse secondary admin-like detail below the fold.
- Put "today" above "this week", and "this week" above "plan preview".

### Dashboard Empty States

- No meals logged: show quick meal CTA and suggested breakfast/lunch/dinner entry point.
- No workout today: show plan day and "Start workout".
- No plan yet: show a planner CTA rather than a blank section.

### Dashboard Implementation Checklist

- Add a compact quick actions row near the top.
- Turn macros into stronger visual progress modules.
- Add one clear AI daily brief card.
- Reorder sections so meals/workout appear before longer plan previews.
- Keep plan previews compact and expandable.

## 6. Meal Logging Spec

Target file: `resources/js/pages/track_meal/track_meals.tsx`

### Meal Logging Goals

- Let users log food with very little friction
- Make the day's progress obvious
- Keep safety visible but not annoying
- Connect the log to the AI planner and coach

### Meal Logging Layout

```text
[Header]
- Date picker
- Today button
- Add meal action

[Top Summary]
- Calories
- Protein
- Carbs
- Fat
- Plan alignment badge

[Main Body]
Left:
- Meal timeline
  - Breakfast
  - Lunch
  - Dinner
  - Snacks
  - Drinks

Right:
- Search/add panel
- Recent foods
- Favorites
- Safe swaps
- Portion controls

[Secondary Row]
- Allergy and diet chips
- AI swap suggestions
- Daily note or coach prompt
```

### Meal Logging Interaction Rules

- Default to the last-used meal type when adding.
- Make search available immediately.
- Keep recent and favorite foods close to the search bar.
- Keep "servings" and "grams" as parallel entry modes.
- After add, confirm success and return the user to the current meal section.

### Safety UX

- Unsafe foods should show a clear visual warning before add.
- Safe alternatives should be shown beside warnings when possible.
- Diet/allergy/injury context should be visible as chips near the top of the page.
- If a user asks for alternatives, route them into AI swaps rather than raw blocking.

### Meal Logging Visual Direction

- Make meal sections feel like a diary timeline, not a form.
- Keep the top summary compact and scannable.
- Use soft progress bars rather than heavy chart chrome.
- Use calm surfaces and let food names, macro values, and actions carry the emphasis.

### Meal Logging Implementation Checklist

- Introduce a stronger meal timeline layout.
- Add recent/favorite food shortcuts near search.
- Add visible profile safety chips.
- Add a compact safe swaps module tied to the selected meal.
- Make plan alignment visible with simple labels such as "on target", "protein low", or "fat high".

## 7. Gym Logging Spec

Target file: `resources/js/pages/workouts/log.tsx`

### Workout Logging Goals

- Start fast
- Log sets with minimal typing
- Show previous performance at the right time
- Distinguish "plan mode" and "freestyle mode" clearly
- Make exercise alternatives feel native, not bolted on

### Workout Logging Layout

```text
[Header]
- Date
- Start / continue workout
- Plan day selector

[Session Strip]
- Active workout name
- Duration
- Sets logged
- Estimated volume
- Finish workout

[Main Logging Area]
Left:
- Exercise stack
  - Exercise card
  - Previous best / last set
  - Set rows
  - Add set
  - Rest timer

Right:
- Today's plan
- Freestyle library
- AI alternatives
- Equipment/injury note

[Bottom Actions on Mobile]
- Add exercise
- Rest timer
- Finish workout
```

### Exercise Card Structure

Each exercise card should include:

- Exercise name
- Muscle group
- Equipment
- Previous set or previous best
- Quick add set controls
- Ability to repeat last set
- One-tap access to swap exercise

### Workout Interaction Rules

- One tap should repeat a previous set into the next row.
- Auto-increment set number.
- Keep last performance visible while entering the next set.
- Collapse completed exercises to reduce visual noise.
- Make rest timer persistent but non-blocking.

### Plan vs Freestyle

- If logging from a plan, show the plan day clearly at the top.
- If logging freestyle, show the exercise library as a helper panel.
- The switch between modes should feel deliberate and easy to understand.

### AI Alternatives

Add a compact inline alternative module:

- "Knee pain? Try this instead."
- "No cable machine available? Swap to bands or dumbbells."
- "Shoulder irritation? Use a safer variation."

This should sit inside the workout flow, not in a separate assistant-only page.

### Workout Logging Implementation Checklist

- Strengthen the active session strip.
- Turn exercise logging into cleaner cards with last-set memory.
- Add a visible plan/freestyle mode label.
- Add a persistent rest timer area.
- Add inline exercise swap actions for equipment/injury constraints.

## 8. Shared Component Checklist

These components will likely pay off across multiple pages:

- `DailyBriefCard`
- `QuickActionRow`
- `ProgressStatCard`
- `MealTimelineCard`
- `SafetyChipRow`
- `SafeSwapCard`
- `WorkoutSessionStrip`
- `ExerciseLogCard`
- `PreviousPerformanceBadge`
- `RestTimerPill`
- `PlanAlignmentBadge`

## 9. Suggested Implementation Order

### Phase 1: Highest Impact

- Upgrade homepage hero and product proof
- Reorder and simplify dashboard modules
- Improve meal timeline and quick-add flow
- Improve active workout logging cards

### Phase 2: Product Differentiation

- Add AI daily brief to dashboard
- Add safe meal swaps in the meal logger
- Add exercise alternatives in the workout logger
- Add plan alignment labels in meal tracking

### Phase 3: Premium Layer

- Add richer weekly trend visuals
- Add better progress history and PR surfaces
- Add more polished loading and transition states
- Add deeper social/professional visibility if desired later

## 10. Reference Stack

Nutrition and meal planning references:

- MyFitnessPal: https://www.myfitnesspal.com/
- Cronometer: https://mobile.cronometer.com/
- Lose It!: https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629
- Lifesum: https://lifesum.com/
- MacroFactor: https://macrofactor.com/macrofactor/
- MyNetDiary: https://www.mynetdiary.com/
- YAZIO: https://www.yazio.com/en
- Carb Manager: https://www.carbmanager.com/feature-summary
- Eat This Much: https://www.eatthismuch.com/meal-planner/
- FoodNoms: https://foodnoms.com/

Workout references:

- Hevy: https://www.hevyapp.com/
- Strong: https://www.strong.app/
- JEFIT: https://www.jefit.com/
- Fitbod: https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543
- Alpha Progression: https://apps.apple.com/us/app/gym-workout-alpha-progression/id1462277793
- Boostcamp: https://apps.apple.com/us/app/boostcamp-gym-workout-fitness/id1529354455
- GRAVL: https://www.gravl.ai/
- Hardy: https://hardy.app/
- RYSE: https://www.ryseapp.io/

## 11. Final Direction

If Hayetak follows this spec well, it should feel:

- clearer than MyFitnessPal
- calmer than Cronometer
- more premium than generic trackers
- more helpful than standalone gym loggers
- safer and more personalized than broad AI wellness products

That is the right product position for Hayetak.
