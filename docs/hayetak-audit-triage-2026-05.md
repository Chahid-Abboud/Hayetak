# Hayetak Audit Triage - May 2026

Source audit: `C:\Users\User\Downloads\hayetak_audit_report.md`

This triage reflects the codebase check performed after reading the audit. The current AI runtime remains local/self-hosted.

## Addressed In This Pass

- Kept current AI runtime local:
  - Planner still resolves to `ollama`.
  - Chat still resolves only to `self_hosted`, `http`, or `stub`.
  - No OpenAI client, SDK, or API-key path was added.
- Removed hosted/OpenAI key examples from `.env.example`.
- Removed duplicate public route definitions from `routes/api.php`.
- Moved `/api/places` and `/api/places-local` behind the existing authenticated and verified web route group.
- Added coordinate/radius validation to `PlacesController` and `PlacesLocalController`.
- Removed internal exception leakage from `ChatController::stream()`.
- Expanded `.gitignore` for backup files, app ZIPs, local SQL dumps, private storage, session files, testing storage, and the root debug script.
- Removed tracked leftover artifacts from the working tree:
  - `app/Http/Controllers/AppointmentController.php.backup`
  - `app/Models.zip`
  - `test_places.php`
  - `database/seeders/Legacy/hayetak_5-1-26.sql`
  - `database/seeders/data/hayetak.sql`
- Checked removed artifacts for sensitive data indicators:
  - the SQL dumps contained user rows, email addresses, password hashes, session payloads, remember tokens, and two-factor fields,
  - no OpenAI runtime key path was introduced while doing this cleanup.
- Added user-facing measurement APIs and a `/progress` page.
- Added prompt-injection sanitization before coach classification, context assembly, tool planning, and model calls.
- Added tests proving:
  - planner stays on Ollama even if hosted provider config is present,
  - chat does not resolve to OpenAI in the current runtime,
  - nearby APIs require authentication,
  - invalid nearby coordinates return validation errors,
  - stream errors do not expose exception details.

## Confirmed Already OK Or Partly Stale In Audit

- `.env` is ignored and was not returned by `git ls-files .env`.
- `ai_conversations` already has an index covering `user_id` via `index(['user_id', 'last_message_at'])`.
- `ai_messages` already has `index(['conversation_id', 'id'])`.
- `meal_entries` already has `index(['user_id', 'eaten_at'])`.
- `workout_logs` uses `performed_at`, not `started_at`, and already has `index(['user_id', 'performed_at'])`.
- The current absence of OpenAI Responses API code is intentional for now, not a launch blocker for local-hosted development.

## Still High Priority

- Remove the deleted sensitive artifacts from git history before public submission or deployment.
- Check whether any real session or verification files are present in working copies or deployment bundles:
  - `storage/framework/sessions/*`
  - `storage/app/private/professional_verifications/*`
  - `storage/framework/testing/*`
- Rotate any credentials that were ever present in shared ZIPs or previous commits.
- Purge sensitive tracked history before public submission or deployment.
- Add `AiConversationPolicy` so conversation ownership is centralized rather than inline.
- Resolve the dual allergy/diet storage source of truth:
  - either keep `users.allergies` / `users.diet_name` canonical,
  - or migrate fully to `user_dietary_restrictions`.

## Important But Not Immediate

- Refactor `AdminUserController` into focused controllers.
- Add coach feedback UI using the existing `AiFeedback` model.
- Add user-facing measurement deletion and chart history outside settings.
- Add water intake history/read APIs.
- Add consent tracking for sensitive health data and any future hosted AI processing.
- Add hard-delete/erasure flow for user health data, AI conversations, measurements, meal logs, and workout logs.
- Move research/training scripts and generated audit artifacts out of deployable app scope.
- Replace committed SQL dumps with factory/seed data that contains no real users.

## Future Launch Provider Work

The detailed hosted-provider/OpenAI launch structure is documented separately in:

- `docs/ai-launch-provider-migration-structure.md`

That document is intentionally future-only. It describes required config, services, consent, rollout flags, tests, and deployment steps without changing the current runtime.
