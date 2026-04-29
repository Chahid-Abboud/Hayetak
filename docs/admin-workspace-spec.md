# Hayetak Admin Workspace Spec

Status: implementation guide for the admin workspace.

Purpose: define the page-by-page information architecture, wireframe logic, and UX rules for the Hayetak admin experience so implementation stays coherent across moderation, data stewardship, AI operations, and audit workflows.

## 1. Admin Product Direction

The Hayetak admin should feel like an operations workspace for a safety-aware health product, not a generic CRUD dashboard and not a raw developer console.

The visual and behavioral goals are:

- calm under pressure
- fast to scan
- clear about risk
- safe for destructive actions
- consistent with the Hayetak consumer product theme
- technical when needed, but not technical by default

The admin should help a moderator or operator answer three questions quickly:

1. What needs attention now?
2. What am I looking at?
3. What is the safest next action?

## 2. Theme And Visual Rules

Use the live Hayetak palette and surface language already defined in:

- `docs/brand-palette.md`
- `resources/css/app.css`
- `resources/js/components/admin/AdminShell.tsx`

### Color rules

- `primary` green is for the main action, selected state, and healthy progress.
- `secondary` and soft green fills are for supportive context and AI helper surfaces.
- `warning` is for review queues, expiring credentials, incomplete safety data, and soft blockers.
- `destructive` is only for truly unsafe content, rejected states, hard failures, or destructive actions.
- `info` is for audit, system metadata, and neutral technical status.

### Surface rules

- Use rounded panels in the `24px` to `30px` range.
- Keep the main working surfaces light and readable.
- Use accent surfaces for hero callouts, AI-specific callouts, and high-priority summary modules.
- Avoid heavy visual noise on dense admin pages. The hierarchy should come from spacing, type, and status chips before color.

### Typography rules

- Page title: strong display type.
- Section title: compact and clear.
- Detail labels: uppercase, small, calm.
- Metrics: bold and easy to compare.
- Body copy: concise and operational, never decorative.

## 3. Global UX Rules

### A. Consistent page anatomy

Every admin page should use the same baseline structure:

1. page shell header
2. summary metrics
3. filter and action toolbar
4. main workspace
5. detail surface or drawer
6. sticky action bar when editing or reviewing
7. audit footer or technical drill-down

### B. Context before action

Before the admin approves, deletes, edits, regenerates, or suspends anything, the page should surface:

- who is affected
- what changed
- why this page matters
- what risk exists
- what happens next

### C. Progressive disclosure

Technical and debugging information is required, but it should not dominate normal operations.

Rules:

- 90% of debugging information belongs in a separate diagnostics or audit page.
- Inline pages should show only short health signals such as `last run failed`, `schema mismatch`, `unsafe answer flagged`, or `sync delayed`.
- Raw prompts, traces, payloads, stack traces, and verbose metadata belong behind a `View technical details` action or in a dedicated diagnostics workspace.

### D. Mobile behavior

- All split views should collapse into list-first with a detail drawer.
- Sticky actions remain visible on mobile.
- Tables should reduce to card rows where needed.
- The admin should still be able to approve, reject, suspend, edit, and review from mobile without horizontal scroll for core flows.

### E. Admin-only actions

Admin-exclusive actions must be visually distinct and confirmation-safe:

- suspend or delete user
- approve or reject professional verification
- override safety data
- correct historical logs
- regenerate AI output
- publish AI safety rule changes
- bulk user actions
- export or delete regulated data

Use one confirmation step for normal destructive actions and two-step wording only for truly high-risk actions.

## 4. Routing And Page Map

### Existing admin pages

- `/dashboard` for admin command center
- `/admin/users`
- `/admin/users/:id`
- `/admin/professionals`
- `/admin/professional-verifications`
- `/admin/meals`
- `/admin/notifications`
- `/admin/places`
- `/admin/progress`
- `/admin/logs`

### Recommended next admin pages

- `/admin/assignments`
- `/admin/ai/planner`
- `/admin/ai/coach`
- `/admin/ai/safety-rules`
- `/admin/exercises`
- `/admin/cases`
- `/admin/analytics`
- `/admin/settings`
- `/admin/privacy`
- `/admin/diagnostics`

## 5. Page-By-Page Wireframe

## 5.1 Admin Command Center

Route: `/dashboard` for admin users

Primary goal: give the admin a single operational snapshot with direct entry into the highest-priority queues.

### Layout

1. Hero header
2. Admin pulse summary row
3. Priority queues
4. AI and safety workspace rail
5. Follow-up map
6. Recent admin activity
7. Diagnostics entrypoint

### Hero header

Must contain:

- title: `Admin Command Center`
- one-sentence operational summary
- primary actions:
  - `Open users`
  - `Review verifications`
  - `Open alerts`
  - `Open AI tools`
- current operating note:
  - primary queue
  - watchlist count
  - technical drill-down link

### Pulse summary row

Cards should include:

- total active accounts
- professionals
- pending verifications
- unread alerts
- audit events or flagged issues

Each card should include a short helper sentence explaining what action it represents.

### Priority queues

Display 3 main lanes:

- accounts needing attention
- professional verification queue
- unread alerts or interventions

Each lane should show:

- count
- plain-language description
- 3 to 5 recent items
- one direct CTA

### AI and safety workspace rail

This module groups admin-only AI actions:

- planner operations
- coach moderation
- safety rules
- diagnostics

These should feel like secondary workspaces, not mixed into the main queues.

### Benefit

The command center becomes the admin's daily launch surface and reduces tab-hopping across the workspace.

## 5.2 Users Directory

Route: `/admin/users`

Primary goal: investigate accounts quickly and decide whether to edit, verify, support, suspend, or drill into the full record.

### Layout

1. page header
2. stats row
3. filter toolbar
4. split view:
   - list on the left
   - investigation panel on the right
5. mobile detail drawer

### List columns

- user identity
- role
- status
- verification
- city
- recent activity counts
- AI activity signal

### Toolbar filters

- search
- role
- verification state
- account status
- include deleted
- sort by newest or risk

### Investigation panel

Sections:

- identity and account state
- safety profile summary
- current assignments
- recent appointments
- recent AI conversations
- plan change watch
- admin action shortcuts

### Admin-only actions

- verify or unverify
- update profile fields
- bulk update
- soft delete
- open full record
- optionally impersonate with audit

### Benefit

The admin can make fast triage decisions without leaving the directory and only open the full editor when necessary.

## 5.3 User Detail Page

Route: `/admin/users/:id`

Primary goal: provide the full user record editor with safety context and recent behavior visible throughout the page.

### Layout

1. hero with identity and status chips
2. sticky action bar
3. two-column body
4. sections:
   - account access
   - profile and onboarding data
   - safety profile
   - preferences
   - current plans
   - recent logs and conversations
   - audit context

### Safety profile section

Must show:

- allergies
- diet type
- medical history
- injury history
- available equipment
- workout location
- contradiction warnings

If the page supports editing these fields, the warning area should remain visible while editing.

### Technical rule

Do not show raw model metadata in the main body. Put it in a collapsible or secondary diagnostics tab.

### Benefit

This page becomes the trusted source of truth when a support, safety, or AI issue is tied to one specific user.

## 5.4 Professional Verifications

Route: `/admin/professional-verifications`

Primary goal: help the admin review submissions quickly and safely with enough evidence to make a high-confidence decision.

### Layout

1. queue stats
2. review filters
3. split view
4. decision rail

### Queue row content

- applicant name
- role
- review status
- expiry date
- account status
- review urgency

### Decision rail sections

- credential evidence summary
- expiry and authority
- current account state
- reviewer history
- risk banners
- status selection
- review notes
- save decision

### Mandatory UX rules

- require notes on reject and needs-info actions
- visually surface expired or expiring credentials
- show what approving or rejecting will do to the user account

### Benefit

This keeps a compliance-heavy flow readable and low-friction while preserving trust and traceability.

## 5.5 Professionals Directory

Route: `/admin/professionals`

Primary goal: maintain the quality of public trainer and nutritionist profiles independently from verification review.

### Layout

1. role switcher
2. profile quality stats
3. list plus editor split

### Editor sections

- public bio
- specialties
- city
- availability
- contact display
- verification snapshot
- public readiness signal

### Admin-only actions

- update public profile
- control visible quality
- align verification and directory readiness

### Benefit

Separating public profile editing from legal verification keeps both workflows cleaner and faster.

## 5.6 Assignments

Route: `/admin/assignments`

Primary goal: let admins assign clients to professionals with enough context to make a good fit.

### Layout

1. tabs:
   - unassigned
   - needs reassignment
   - mismatch
   - overloaded
2. selected user detail
3. candidate professional list
4. assignment notes and confirmation

### Candidate cards should show

- specialty fit
- city or remote compatibility
- current capacity
- verification state
- recent assignment load

### Benefit

This turns assignment into an explainable workflow instead of a hidden admin action.

## 5.7 Meals Admin

Route: `/admin/meals`

Primary goal: separate food catalog stewardship from meal-log correction.

### Layout

Tabs:

- `Food Catalog`
- `Meal Logs`

### Food Catalog tab

Contains:

- search
- category filtering
- macro completeness indicators
- selected food editor
- duplication and quality hints

### Meal Logs tab

Contains:

- search
- meal type filter
- recent rows
- selected entry editor
- correction reason on destructive actions

### Benefit

The admin can distinguish between fixing source nutrition data and fixing user history.

## 5.8 Exercise Catalog And Alternatives

Route: `/admin/exercises`

Primary goal: manage exercises, equipment tags, and injury-safe alternative mappings used by AI systems.

### Layout

Tabs:

- catalog
- alternative rules
- contraindications

### Main editor sections

- exercise identity
- muscle group
- equipment
- home vs gym support
- injury exclusions
- safe substitutions

### Benefit

This is required for injury-aware planning and safer coach suggestions.

## 5.9 Progress Logs

Route: `/admin/progress`

Primary goal: keep measurement history trustworthy and easy to correct.

### Layout

1. filter by user
2. summary metrics
3. trend snapshot
4. list plus editor split

### Editor sections

- measured date
- key metrics
- notes
- related user
- effect on AI note if relevant

### Benefit

Good progress data is essential for charts, projections, and plan trust.

## 5.10 Places

Route: `/admin/places`

Primary goal: curate local discovery data for nearby trainers, gyms, and nutritionists.

### Layout

1. search
2. list or map toggle
3. list view as default
4. place editor

### UX rule

Map view is for spatial review, not primary editing. The list/detail workflow should remain the fastest path.

### Benefit

This keeps nearby recommendations curated and avoids map-first moderation friction.

## 5.11 Notifications

Route: `/admin/notifications`

Primary goal: send precise user-facing alerts and verify how recipients responded.

### Layout

1. compose panel
2. recipient search and selection
3. delivery history
4. status filters

### Compose sections

- title
- body
- audience selection
- preview
- send

### History should show

- title
- target user
- sent time
- unread, read, or dismissed status

### Benefit

This page becomes a precise intervention tool instead of feeling like a marketing console.

## 5.12 AI Planner Operations

Route: `/admin/ai/planner`

Primary goal: review plan generation quality, safety compliance, schema correctness, and regeneration history.

### Layout

1. hero with planner health summary
2. stats row:
   - success rate
   - failed runs
   - schema issues
   - pending audits
3. recent plan runs table
4. selected run detail

### Selected run detail

- user summary
- restrictions summary
- generated plan preview
- version diff
- storage and schema status
- regeneration history
- admin actions

### Technical tab

- raw JSON
- schema validation messages
- model metadata
- prompt version
- tool traces

### Benefit

The planner stays governable and operational without forcing admins to read raw payloads every time.

## 5.13 AI Coach Moderation

Route: `/admin/ai/coach`

Primary goal: review flagged conversations against the user's real safety and behavior context.

### Layout

1. queue filters:
   - unsafe
   - low quality
   - unresolved
   - recently flagged
2. transcript viewer
3. moderation context rail

### Moderation context rail

- allergies and diet type
- injuries and medical notes
- today's meals
- last 7 days summary
- tools used by the coach
- prior moderation history

### Admin-only actions

- mark safe
- mark unsafe
- classify issue type
- escalate to rule update
- attach moderator note

### Benefit

This keeps moderation grounded in the actual contract the assistant has with the user.

## 5.14 AI Safety Rules

Route: `/admin/ai/safety-rules`

Primary goal: manage the admin-controlled safety layer that governs foods, exercises, and escalation behavior.

### Layout

1. grouped rules
2. change history
3. simulation or preview area
4. publish or rollback controls

### Rule groups

- food restrictions
- diet exclusions
- medical escalation rules
- injury substitution rules
- unsafe phrasing or claim blockers
- fallback response rules

### Benefit

Safety logic becomes visible and maintainable instead of hidden inside prompts and code only.

## 5.15 Cases / Incidents

Route: `/admin/cases`

Primary goal: track cross-page support or safety incidents in one workflow.

### Layout

1. case queue
2. case detail
3. linked entities
4. resolution notes

### Linked entities

- user
- plan run
- coach conversation
- professional verification
- admin action logs

### Benefit

This prevents important investigations from being scattered across multiple pages and chat threads.

## 5.16 Audit Logs

Route: `/admin/logs`

Primary goal: provide full traceability for admin actions.

### Layout

1. metrics
2. filters
3. activity feed
4. selected log detail

### Required detail content

- action
- actor
- target
- timestamp
- flattened metadata
- deep link to related record

### Benefit

This page is the first audit layer for moderation and operational trust.

## 5.17 Diagnostics

Route: `/admin/diagnostics`

Primary goal: house the raw technical details that should stay out of most day-to-day admin pages.

### Tabs

- AI
- jobs
- API
- imports
- traces
- system health

### Content

- raw prompt and response payloads
- tool call traces
- queue failures
- retry history
- latency charts
- exceptions
- degraded mode notices

### Rule

This page exists so the rest of the workspace can remain clean.

## 5.18 Analytics

Route: `/admin/analytics`

Primary goal: separate strategic reporting from operational moderation.

### Modules

- user growth
- retention
- planner success rate
- coach usage
- unsafe response rate
- verification funnel
- support load

### Benefit

Keeps trend analysis separate from action-taking pages.

## 5.19 Settings / Feature Flags / Permissions

Route: `/admin/settings`

Primary goal: manage access and rollout safely.

### Groups

- roles and permissions
- feature flags
- AI rollout controls
- emergency toggles

### Benefit

Reduces risk when shipping changes to sensitive AI and admin-only features.

## 5.20 Privacy And Compliance

Route: `/admin/privacy`

Primary goal: handle export and deletion requests with a traceable workflow.

### Sections

- export requests
- deletion requests
- consent references
- completion history

### Benefit

Rare but high-trust tasks have their own workflow instead of being mixed into generic user management.

## 6. Components To Reuse Across Pages

The current admin layer already has good primitives. Prefer reusing and extending:

- `AdminShell`
- `AdminSection`
- `AdminStatCard`
- `AdminToolbar`
- `AdminPanel`
- `AdminSplitView`
- `EntityDetailDrawer`
- `ReviewDecisionPanel`
- `StatusChip`
- `RiskBannerStack`

Add new shared patterns only when they will be reused across multiple admin pages.

## 7. Implementation Order

Recommended page-by-page build order:

1. admin command center
2. users directory polish
3. user detail polish
4. professional verifications
5. professionals directory
6. notifications
7. meals
8. progress
9. places
10. planner operations
11. coach moderation
12. safety rules
13. diagnostics

## 8. Success Criteria

The admin workspace is successful when:

- an admin can identify the highest-priority queue in under 5 seconds
- major actions can be completed without leaving the current context
- safety-critical information is visible before decisions are made
- raw technical detail is available but not intrusive
- pages feel visually related to the consumer product
- mobile admin interactions still work for the most important tasks
