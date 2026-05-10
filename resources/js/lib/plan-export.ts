type ExportKind = 'diet' | 'workout' | 'both';

type PrintableDietMealItem = {
    name?: string | null;
    portion?: string | null;
    calories_kcal?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
};

type PrintableDietMealOption = {
    title?: string | null;
    target_kcal?: number | null;
    items?: PrintableDietMealItem[];
};

type PrintableDietMealOptions = Partial<
    Record<'breakfast' | 'lunch' | 'dinner' | 'snack', PrintableDietMealOption[]>
>;

type PrintableDietDay = {
    day_index?: number | null;
    theme?: string | null;
    meals?: Array<{
        meal_code?: string | null;
        title?: string | null;
        target_kcal?: number | null;
        items?: PrintableDietMealItem[];
    }>;
};

type PrintableWorkoutDay = {
    day_index?: number | null;
    day_label?: string | null;
    session_type?: string | null;
    focus?: string | null;
    duration_min?: number | null;
    location?: string | null;
    exercises?: Array<{
        name?: string | null;
        sets?: number | null;
        reps?: string | null;
        rest_sec?: number | null;
        equipment?: string | null;
        safer_alternative?: string | null;
    }>;
};

type PrintablePlan = {
    overview?: {
        summary?: string | null;
        key_constraints?: string[];
        assumptions?: string[];
    };
    safety?: {
        hard_rules_observed?: string[];
        food_avoidances?: string[];
        exercise_cautions?: string[];
    };
    diet?: {
        daily_targets?: Record<string, number | string | null>;
        meal_options?: PrintableDietMealOptions;
        days?: PrintableDietDay[];
        grocery_list?: Array<{
            category?: string | null;
            name?: string | null;
            quantity?: string | null;
        }>;
        meal_prep_notes?: string[];
        adherence_notes?: string[];
    };
    workout?: {
        weekly_schedule?: PrintableWorkoutDay[];
        progression_rules?: string[];
        recovery_rules?: string[];
        coach_notes?: string[];
    };
    adaptive_review?: {
        review_after_days?: number | null;
        checkpoints?: string[];
        replanning_triggers?: string[];
        next_data_to_collect?: string[];
    };
    progress_prediction?: {
        horizon_days?: number | null;
        baseline_weight_kg?: number | null;
        expected_weight_change_kg?: number | null;
        projected_body_weight_kg?: number | null;
    };
};

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function titleCase(value: string): string {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return escapeHtml(value);
}

function listHtml(
    items: Array<string | null | undefined>,
    empty = 'Nothing recorded.',
): string {
    const cleanItems = items
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);

    if (cleanItems.length === 0) {
        return `<p class="muted">${escapeHtml(empty)}</p>`;
    }

    return `
        <ul class="clean-list">
            ${cleanItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
    `;
}

function statGridHtml(items: Array<{ label: string; value: unknown }>): string {
    return `
        <div class="stat-grid">
            ${items
                .map(
                    (item) => `
                        <div class="stat-card">
                            <div class="stat-label">${escapeHtml(item.label)}</div>
                            <div class="stat-value">${formatValue(item.value)}</div>
                        </div>
                    `,
                )
                .join('')}
        </div>
    `;
}

function sectionHtml(
    title: string,
    subtitle: string | null,
    body: string,
): string {
    return `
        <section class="section">
            <div class="section-header">
                <h2>${escapeHtml(title)}</h2>
                ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
            </div>
            ${body}
        </section>
    `;
}

function buildMealCodeHtml(
    mealOptions: NonNullable<PrintablePlan['diet']>['meal_options'],
    mealCode: keyof PrintableDietMealOptions,
): string {
    const options = mealOptions?.[mealCode] ?? [];
    if (options.length === 0) {
        return '';
    }

    return `
        <div class="box">
            <h3>${titleCase(mealCode)}</h3>
            <div class="stack">
                ${options
                    .map((option, optionIndex) => {
                        const items = option.items ?? [];

                        const totalCalories = items.reduce(
                            (sum, item) => sum + Number(item.calories_kcal ?? 0),
                            0,
                        );
                        const totalProtein = items.reduce(
                            (sum, item) => sum + Number(item.protein_g ?? 0),
                            0,
                        );
                        const totalCarbs = items.reduce(
                            (sum, item) => sum + Number(item.carbs_g ?? 0),
                            0,
                        );
                        const totalFat = items.reduce(
                            (sum, item) => sum + Number(item.fat_g ?? 0),
                            0,
                        );

                        return `
                            <div class="mini-card">
                                <div class="mini-card-top">
                                    <strong>
                                        ${escapeHtml(
                                            option.title ||
                                                `${titleCase(mealCode)} option ${optionIndex + 1}`,
                                        )}
                                    </strong>
                                    <span>${Math.round(totalCalories)} kcal</span>
                                </div>
                                <div class="macro-row">
                                    <span>P ${Math.round(totalProtein)}g</span>
                                    <span>C ${Math.round(totalCarbs)}g</span>
                                    <span>F ${Math.round(totalFat)}g</span>
                                </div>
                                <ul class="item-list">
                                    ${items
                                        .map(
                                            (item) => `
                                                <li>
                                                    <span>${escapeHtml(item.name ?? 'Food item')}</span>
                                                    <small>
                                                        ${escapeHtml(item.portion ?? '')}
                                                        ${item.calories_kcal ? ` · ${Math.round(Number(item.calories_kcal))} kcal` : ''}
                                                    </small>
                                                </li>
                                            `,
                                        )
                                        .join('')}
                                </ul>
                            </div>
                        `;
                    })
                    .join('')}
            </div>
        </div>
    `;
}

function buildDietMealOptions(plan: PrintablePlan): string {
    const mealOptions = plan.diet?.meal_options;

    const order: Array<keyof PrintableDietMealOptions> = [
        'breakfast',
        'lunch',
        'dinner',
        'snack',
    ];

    if (
        mealOptions &&
        order.some((mealCode) => (mealOptions[mealCode] ?? []).length > 0)
    ) {
        const breakfastContent = buildMealCodeHtml(mealOptions, 'breakfast');
        const lunchContent = buildMealCodeHtml(mealOptions, 'lunch');
        const dinnerContent = buildMealCodeHtml(mealOptions, 'dinner');
        const snackContent = buildMealCodeHtml(mealOptions, 'snack');

        return `
            <div class="meal-row">
                ${breakfastContent}
                ${lunchContent}
            </div>
            <div class="meal-row">
                ${dinnerContent}
                ${snackContent}
            </div>
        `;
    }

    const days = plan.diet?.days ?? [];

    if (days.length === 0) {
        return `<p class="muted">No meal options were included in this plan.</p>`;
    }

    return `
        <div class="day-grid">
            ${days
                .map(
                    (day) => `
                        <div class="box avoid-break diet-day-box">
                            <h3>
                                Day ${day.day_index ?? '-'}
                                ${day.theme ? ` · ${escapeHtml(day.theme)}` : ''}
                            </h3>

                            <div class="stack">
                                ${(day.meals ?? [])
                                    .map(
                                        (meal) => `
                                            <div class="mini-card diet-meal-card">
                                                <div class="mini-card-top">
                                                    <strong>${escapeHtml(
                                                        meal.title ||
                                                            titleCase(
                                                                meal.meal_code ??
                                                                    'Meal',
                                                            ),
                                                    )}</strong>
                                                    <span>${formatValue(
                                                        meal.target_kcal,
                                                    )} kcal target</span>
                                                </div>

                                                <ul class="item-list diet-item-list">
                                                    ${(meal.items ?? [])
                                                        .map(
                                                            (item) => `
                                                                <li class="diet-item-row">
                                                                    <span class="diet-item-name">${escapeHtml(item.name ?? 'Food item')}</span>
                                                                    <span class="diet-item-detail">
                                                                        ${escapeHtml(item.portion ?? '')}
                                                                        ${
                                                                            item.calories_kcal
                                                                                ? ` · ${Math.round(
                                                                                      Number(
                                                                                          item.calories_kcal,
                                                                                      ),
                                                                                  )} kcal`
                                                                                : ''
                                                                        }
                                                                    </span>
                                                                </li>
                                                            `,
                                                        )
                                                        .join('')}
                                                </ul>
                                            </div>
                                        `,
                                    )
                                    .join('')}
                            </div>
                        </div>
                    `,
                )
                .join('')}
        </div>
    `;
}

function buildDietHtml(plan: PrintablePlan): string {
    const targets = plan.diet?.daily_targets ?? {};

    const groceryItems = (plan.diet?.grocery_list ?? []).map(
        (item) =>
            `${item.category ? `${item.category}: ` : ''}${item.name ?? 'Item'}${
                item.quantity ? ` (${item.quantity})` : ''
            }`,
    );

    return `
        ${sectionHtml(
            'Daily targets',
            'Energy and macro targets for this plan.',
            `
                <div class="targets-scroll">
                    ${
                        Object.keys(targets).length > 0
                            ? statGridHtml(
                                  Object.entries(targets).map(([key, value]) => ({
                                      label: titleCase(key),
                                      value,
                                  })),
                              )
                            : `<p class="muted">No daily targets were included.</p>`
                    }
                </div>
            `,
        )}

        <div class="notes-row">
            <div class="box compact-box">
                <h3>Grocery list</h3>
                ${listHtml(groceryItems)}
            </div>
            <div class="box compact-box">
                <h3>Meal prep notes</h3>
                ${listHtml(plan.diet?.meal_prep_notes ?? [])}
            </div>
            <div class="box compact-box">
                <h3>Adherence notes</h3>
                ${listHtml(plan.diet?.adherence_notes ?? [])}
            </div>
        </div>

        ${sectionHtml(
            'Meal options',
            'Meal cards use the full printable width so food options are easier to scan.',
            buildDietMealOptions(plan),
        )}
    `;
}

function buildWorkoutHtml(plan: PrintablePlan): string {
    const days = plan.workout?.weekly_schedule ?? [];
    const trainingDays = days.filter((day) => (day.exercises ?? []).length > 0);
    const restDays = days.filter((day) => (day.exercises ?? []).length === 0);

    return `
        ${sectionHtml(
            'Workout schedule',
            'Training days are shown in balanced cards, while rest days are compact so the PDF stays neat.',
            days.length
                ? `
                    ${
                        trainingDays.length
                            ? `
                                <div class="day-grid training-grid">
                                    ${trainingDays
                                        .map((day) => {
                                            const exercises = day.exercises ?? [];
                                            const isDaySeven = (day.day_index ?? -1) >= 7;

                                            return `
                                                <div class="box avoid-break training-day-box${isDaySeven ? ' full-width-day' : ''}">
                                                    <div class="day-header">
                                                        <div>
                                                            <div class="eyebrow">
                                                                Day ${formatValue(day.day_index)}
                                                                ${
                                                                    day.day_label
                                                                        ? ` · ${escapeHtml(day.day_label)}`
                                                                        : ''
                                                                }
                                                            </div>
                                                            <h3>${escapeHtml(day.focus ?? 'Workout day')}</h3>
                                                        </div>

                                                        <span class="pill">${escapeHtml(day.session_type ?? 'Session')}</span>
                                                    </div>

                                                    <div class="tag-row">
                                                        ${
                                                            day.duration_min
                                                                ? `<span>${day.duration_min} min</span>`
                                                                : ''
                                                        }
                                                        ${
                                                            day.location
                                                                ? `<span>${escapeHtml(day.location)}</span>`
                                                                : ''
                                                        }
                                                    </div>

                                                    <div class="stack exercise-stack">
                                                        ${exercises
                                                            .map(
                                                                (exercise) => `
                                                                    <div class="exercise-row">
                                                                        <div>
                                                                            <strong>${escapeHtml(
                                                                                exercise.name ?? 'Exercise',
                                                                            )}</strong>

                                                                            <small>
                                                                                ${
                                                                                    exercise.equipment
                                                                                        ? `${escapeHtml(
                                                                                              exercise.equipment,
                                                                                          )} · `
                                                                                        : ''
                                                                                }
                                                                                ${
                                                                                    exercise.rest_sec
                                                                                        ? `${exercise.rest_sec}s rest`
                                                                                        : 'Controlled pace'
                                                                                }
                                                                            </small>

                                                                            ${
                                                                                exercise.safer_alternative
                                                                                    ? `<small class="safe-alt">Safer alternative: ${escapeHtml(
                                                                                          exercise.safer_alternative,
                                                                                      )}</small>`
                                                                                    : ''
                                                                            }
                                                                        </div>

                                                                        <span>
                                                                            ${formatValue(exercise.sets)} sets
                                                                            ${
                                                                                exercise.reps
                                                                                    ? ` · ${escapeHtml(exercise.reps)}`
                                                                                    : ''
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                `,
                                                            )
                                                            .join('')}
                                                    </div>
                                                </div>
                                            `;
                                        })
                                        .join('')}
                                </div>
                            `
                            : ''
                    }

                    ${
                        restDays.length
                            ? `
                                <div class="rest-section avoid-break">
                                    <h3>Rest and recovery days</h3>
                                    <div class="rest-grid">
                                        ${restDays
                                            .map(
                                                (day) => `
                                                    <div class="rest-box">
                                                        <div class="eyebrow">
                                                            Day ${formatValue(day.day_index)}
                                                            ${
                                                                day.day_label
                                                                    ? ` · ${escapeHtml(day.day_label)}`
                                                                    : ''
                                                            }
                                                        </div>
                                                        <strong>${escapeHtml(day.focus ?? 'Rest day')}</strong>
                                                        <small>Rest or recovery day. No exercises scheduled.</small>
                                                    </div>
                                                `,
                                            )
                                            .join('')}
                                    </div>
                                </div>
                            `
                            : ''
                    }
                `
                : `<p class="muted">No workout schedule was included.</p>`,
        )}

        <div class="three-column">
            ${sectionHtml(
                'Progression rules',
                null,
                listHtml(plan.workout?.progression_rules ?? []),
            )}
            ${sectionHtml(
                'Recovery rules',
                null,
                listHtml(plan.workout?.recovery_rules ?? []),
            )}
            ${sectionHtml(
                'Coach notes',
                null,
                listHtml(plan.workout?.coach_notes ?? []),
            )}
        </div>
    `;
}

function buildDocumentHtml(
    plan: PrintablePlan,
    kind: ExportKind,
    planHorizonDays: number,
): string {
    const now = new Date();

    const title =
        kind === 'diet'
            ? 'Diet Plan'
            : kind === 'workout'
              ? 'Workout Plan'
              : 'Diet & Workout Plan';

    const subtitle =
        plan.overview?.summary ??
        'Generated Hayetak plan exported for easy reading and printing.';

    const includeDiet = kind === 'diet' || kind === 'both';
    const includeWorkout = kind === 'workout' || kind === 'both';

    return `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>${escapeHtml(title)}</title>

                <style>
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        background: #f3f6ef;
                        color: #17200f;
                        font-family:
                            Inter,
                            ui-sans-serif,
                            system-ui,
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            sans-serif;
                    }

                    .page {
                        width: 100%;
                        max-width: 1080px;
                        margin: 0 auto;
                        padding: 24px;
                    }

                    .cover {
                        border-radius: 28px;
                        background:
                            linear-gradient(135deg, #10170d 0%, #1f2c18 62%, #8fc73f 170%);
                        color: white;
                        padding: 28px;
                        margin-bottom: 16px;
                    }

                    .brand-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 24px;
                    }

                    .brand {
                        font-size: 13px;
                        letter-spacing: 0.28em;
                        text-transform: uppercase;
                        color: #b9db82;
                        font-weight: 800;
                    }

                    h1 {
                        margin: 12px 0 10px;
                        font-size: 42px;
                        line-height: 1.05;
                        letter-spacing: -0.04em;
                    }

                    .subtitle {
                        max-width: 760px;
                        margin: 0;
                        color: rgba(255, 255, 255, 0.78);
                        font-size: 15px;
                        line-height: 1.7;
                    }

                    .export-meta {
                        min-width: 230px;
                        border: 1px solid rgba(255, 255, 255, 0.14);
                        border-radius: 22px;
                        padding: 16px;
                        background: rgba(255, 255, 255, 0.08);
                        font-size: 12px;
                        line-height: 1.7;
                    }

                    .section {
                        background: white;
                        border: 1px solid #dfe8d5;
                        border-radius: 24px;
                        padding: 18px;
                        margin: 14px 0;
                        page-break-inside: avoid;
                    }

                    .section-header {
                        margin-bottom: 12px;
                    }

                    .section h2 {
                        margin: 0;
                        font-size: 22px;
                        line-height: 1.2;
                        letter-spacing: -0.02em;
                    }

                    .section-header p {
                        margin: 8px 0 0;
                        color: #64715c;
                        font-size: 13px;
                        line-height: 1.6;
                    }

                    .box {
                        border: 1px solid #e3eadb;
                        background: #fbfdf8;
                        border-radius: 20px;
                        padding: 16px;
                    }

                    .box h3 {
                        margin: 0 0 12px;
                        font-size: 16px;
                        line-height: 1.25;
                    }

                    .compact-box {
                        padding: 14px;
                    }

                    /* Diet day cards — full width, not cramped */
                    .diet-day-box {
                        min-height: 0;
                    }

                    .diet-meal-card {
                        padding: 10px 12px;
                    }

                    .diet-item-list {
                        margin: 6px 0 0;
                    }

                    .diet-item-row {
                        display: flex !important;
                        justify-content: space-between;
                        align-items: baseline;
                        gap: 8px;
                        margin: 3px 0 !important;
                        line-height: 1.4 !important;
                    }

                    .diet-item-name {
                        font-size: 12px;
                        font-weight: 500;
                    }

                    .diet-item-detail {
                        font-size: 11px;
                        color: #65725d;
                        white-space: nowrap;
                    }

                    /* Rest day compact layout */
                    .rest-section {
                        margin-top: 14px;
                        border: 1px dashed #d9e5ce;
                        border-radius: 20px;
                        background: #fbfdf8;
                        padding: 12px 14px;
                    }

                    .rest-section h3 {
                        margin: 0 0 10px;
                        font-size: 15px;
                    }

                    .rest-grid {
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                        gap: 10px;
                    }

                    .rest-box {
                        border: 1px solid #e3eadb;
                        border-radius: 14px;
                        background: white;
                        padding: 8px 12px;
                    }

                    .rest-box .eyebrow {
                        font-size: 9px;
                    }

                    .rest-box strong {
                        display: block;
                        margin-top: 4px;
                        font-size: 12px;
                    }

                    .rest-box small {
                        font-size: 10px;
                        margin-top: 2px;
                    }

                    .training-day-box {
                        min-height: 0;
                    }

                    .exercise-stack {
                        margin-top: 10px;
                        gap: 8px;
                    }

                    .compact-box {
                        padding: 14px;
                    }

                    .stat-grid {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 12px;
                    }

                    .stat-card {
                        border: 1px solid #e4eadc;
                        border-radius: 18px;
                        padding: 14px;
                        background: #fbfdf8;
                    }

                    .stat-label {
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: 0.16em;
                        color: #6c7863;
                        text-transform: uppercase;
                    }

                    .stat-value {
                        margin-top: 8px;
                        font-size: 19px;
                        font-weight: 800;
                    }

                    .two-column,
                    .three-column,
                    .day-grid,
                    .diet-overview-grid,
                    .rest-grid {
                        display: grid;
                        gap: 14px;
                    }

                    .two-column {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .three-column {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    .day-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    /* Day 7 spans full width in workout grid */
                    .full-width-day {
                        grid-column: 1 / -1;
                    }

                    .diet-overview-grid {
                        grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
                    }

                    /* Notes row — grocery list + meal prep + adherence on one line */
                    .notes-row {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 14px;
                        margin: 0 0 12px;
                    }

                    .targets-scroll {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }

                    /* Meal layout: breakfast+lunch on row 1, dinner+snack on row 2, each box full column width */
                    .meal-row {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 14px;
                        margin-bottom: 10px;
                    }

                    .meal-row .box {
                        min-width: 0;
                    }

                    .rest-grid {
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                    }

                    .stack {
                        display: grid;
                        gap: 10px;
                    }

                    .mini-card,
                    .exercise-row {
                        border: 1px solid #e4eadc;
                        border-radius: 16px;
                        background: white;
                        padding: 12px;
                    }

                    .mini-card-top,
                    .exercise-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 12px;
                        align-items: flex-start;
                    }

                    .mini-card-top span,
                    .exercise-row span {
                        color: #617057;
                        font-size: 12px;
                        white-space: nowrap;
                    }

                    .macro-row,
                    .tag-row {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                        margin-top: 10px;
                    }

                    .macro-row span,
                    .tag-row span,
                    .pill {
                        border: 1px solid #dde7d2;
                        background: #f3f8ec;
                        border-radius: 999px;
                        padding: 5px 9px;
                        font-size: 11px;
                        font-weight: 700;
                        color: #38492f;
                    }

                    .item-list,
                    .clean-list {
                        margin: 12px 0 0;
                        padding: 0;
                        list-style: none;
                    }

                    .item-list li,
                    .clean-list li {
                        margin: 8px 0;
                        line-height: 1.45;
                        font-size: 13px;
                    }

                    .item-list li {
                        display: grid;
                        gap: 2px;
                    }

                    small {
                        display: block;
                        color: #65725d;
                        font-size: 11px;
                        line-height: 1.45;
                    }

                    .safe-alt {
                        color: #2f5d20;
                        font-weight: 700;
                    }

                    .day-header {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 12px;
                        margin-bottom: 10px;
                    }

                    .eyebrow {
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: 0.16em;
                        color: #6c7863;
                        text-transform: uppercase;
                    }

                    .rest-note,
                    .muted {
                        color: #64715c;
                        font-size: 13px;
                        line-height: 1.6;
                    }

                    .avoid-break {
                        page-break-inside: avoid;
                    }

                    .footer {
                        margin: 16px 0 0;
                        color: #66745d;
                        font-size: 12px;
                        text-align: center;
                    }

                    @media print {
                        body {
                            background: white;
                        }

                        .page {
                            padding: 0;
                            max-width: none;
                        }

                        .cover,
                        .section {
                            border-radius: 0;
                        }

                        .section {
                            margin: 14px 0;
                        }

                        .print-button {
                            display: none;
                        }
                    }

                    @page {
                        size: A4;
                        margin: 11mm;
                    }
                </style>
            </head>

            <body>
                <main class="page">
                    <section class="cover avoid-break">
                        <div class="brand-row">
                            <div>
                                <div class="brand">Hayetak Daily Health System</div>
                                <h1>${escapeHtml(title)}</h1>
                                <p class="subtitle">${escapeHtml(subtitle)}</p>
                            </div>

                            <div class="export-meta">
                                <strong>Export details</strong><br />
                                Check-in window: ${planHorizonDays} days<br />
                                Exported: ${escapeHtml(now.toLocaleString())}<br />
                                Format: Printable PDF
                            </div>
                        </div>
                    </section>

                    ${includeDiet ? buildDietHtml(plan) : ''}

                    ${includeWorkout ? buildWorkoutHtml(plan) : ''}

                    <p class="footer">
                        Generated by Hayetak. This export is for personal fitness and nutrition tracking and does not replace professional medical advice.
                    </p>
                </main>

                <script>
                    window.addEventListener('load', () => {
                        setTimeout(() => window.print(), 350);
                    });
                </script>
            </body>
        </html>
    `;
}

function printHtmlWithHiddenIframe(html: string): void {
    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';

    document.body.appendChild(iframe);

    const iframeWindow = iframe.contentWindow;
    const iframeDocument = iframe.contentDocument ?? iframeWindow?.document;

    if (!iframeWindow || !iframeDocument) {
        document.body.removeChild(iframe);
        window.alert('Could not prepare the PDF export. Please try again.');
        return;
    }

    iframeDocument.open();
    iframeDocument.write(html);
    iframeDocument.close();

    window.setTimeout(() => {
        iframeWindow.focus();
        iframeWindow.print();

        window.setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1000);
    }, 500);
}

export function exportPlanToPdf(
    plan: PrintablePlan | null | undefined,
    kind: ExportKind,
    planHorizonDays: number,
): void {
    if (!plan) {
        window.alert('No plan is available to export yet.');
        return;
    }

    if (kind === 'diet' && !plan.diet) {
        window.alert('No diet plan is available to export yet.');
        return;
    }

    if (kind === 'workout' && !plan.workout) {
        window.alert('No workout plan is available to export yet.');
        return;
    }

    const html = buildDocumentHtml(plan, kind, planHorizonDays);

    /*
     * Do not use "noopener,noreferrer" here.
     * Some browsers return null when those flags are used,
     * which makes the app think the popup was blocked.
     */
    const printWindow = window.open('', '_blank', 'width=1100,height=800');

    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        return;
    }

    /*
     * Fallback: if the browser blocks the new tab/window,
     * print from a hidden iframe instead.
     */
    printHtmlWithHiddenIframe(html);
}
