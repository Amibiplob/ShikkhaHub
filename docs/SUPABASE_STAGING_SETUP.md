# Supabase staging setup and verification

27 October 2026, Asia/Dhaka. This run targets only the explicitly approved disposable **ShikkhaHub** project, masked reference **`pdg…zrs`**, region `ap-northeast-1`. The authenticated project record, configured API URL and CLI link matched exactly. The original Lovable-connected project's database, Auth, Storage, Realtime and functions were not queried or changed.

## Target and migration evidence

The Supabase CLI was initially absent. The official npm runner installed **2.122.0** into a temporary npm cache; no application dependency or lockfile was changed. The user completed the supported browser login. Initial read-only commands correctly refused to operate without a login/link. After identity verification, the checkout was linked to the approved target.

The initial hosted inventory contained no public application tables or policies, no buckets or objects, and **one pre-existing Auth account**. It was not an entirely empty Auth project. The account and its credentials were preserved. The old `project_id` string in `supabase/config.toml` was replaced with the local namespace `shikkhahub`; that field is a local identifier, not a hosted link. CLI link/cache files are ignored.

The canonical history now contains **43 files**: 29 historical files, seven October 26 repairs, five original Phase 3 files, and two additive corrections discovered in this setup. All 43 were applied with `supabase db push --linked`, including the two historical empty files. The hosted ledger matches source, and the final dry run reports no pending migrations, seeds or role files. Historical SQL and generated database types were not rewritten.

| New migration | Confirmed problem and correction |
| --- | --- |
| `202610270006_existing_auth_profiles.sql` | An Auth account created before the signup trigger receives no profile from the old chain. Backfill only missing profiles from signup metadata, preserving existing profiles and role decisions. Metadata never grants staff roles. |
| `202610270007_private_notification_channels.sql` | A public notification subscription cannot join a private-only Realtime project. The UI now uses a private per-recipient topic; the additive receive policy permits only that recipient's topic, while notification-row RLS and the ban on client broadcast writes remain. |

Both corrections have failing-before/passing-after regressions. The read-only [postflight](../tests/staging-postflight.sql) produces one JSON report so the CLI Management API retains every result set. Its drift regression removes a booking index, disables ticket RLS and grants unsafe intake execution in an isolated database, then verifies detection.

## Hosted database verification

The catalog contains **35 application tables, all with RLS; 64 indexes; 46 foreign keys; 115 public policies; 15 Storage policies; and two Realtime receive policies**. The 47 application functions and the provider's existing helper are present. Required lifecycle RPCs and unique booking/submission/certificate indexes exist. No public security-definer function lacks a fixed search path, and neither `anon` nor `authenticated` can create objects in `public`.

Direct client role deletion, certificate insertion, booking mutation, quiz-attempt insertion, notification insertion, answer-key reads and support-intake execution are denied by the checked grants. Full policy definitions, function owners/ACLs, indexes and triggers were inventoried. Catalog checks supplement the role/JWT tests; their counts alone do not prove authorization.

The four deliberately deferred checks (`quiz_question_valid`, `quiz_pass_valid`, `submissions_student_id_fkey`, `course_reviews_user_id_fkey`) were validated on staging with bounded lock/statement timeouts, and PostgREST's schema cache was refreshed. No unvalidated public constraints remain. The existing Auth account has a profile and only its default student role; it was not made a teacher or administrator.

`pg_cron` **1.6.4** and `pg_net` **0.20.4** are installed. There are **no scheduled cron jobs**. `expire_old_live_classes` exists, but automatic expiry scheduling and observed job execution remain operational acceptance items; installing the extension does not schedule the function.

## Authentication

Public settings confirmed email/password enabled, confirmation required, signup enabled and Google disabled. The old Site URL was `http://localhost:3000` with no extra redirects. A reviewed sparse CLI config push changed only these two fields:

- Site URL: `http://localhost:8080`.
- Redirect allowlist: roots and `/reset-password` for `http://localhost:8080`, `http://127.0.0.1:8080` and the real acceptance runner `http://127.0.0.1:18081`.

Email confirmations, MFA, OTP settings, password protections and providers were left unchanged. Confirmation/recovery mail delivery and Google OAuth were not exercised. No deployed frontend origin is known: add its exact origin and recovery URL only after that deployment is separately approved. Google requires real provider client credentials and the staging project's Auth callback URL; no OAuth credentials were invented.

The actual local `.env` uses `VITE_SUPABASE_URL` and **`VITE_SUPABASE_PUBLISHABLE_KEY`**, matching `src/integrations/supabase/client.ts`. `VITE_SUPABASE_ANON_KEY` is not read by this application. The configured key is a modern publishable key. No environment file was rewritten; Vite's `.env.local` and mode-specific precedence must still be checked on every checkout.

After explicit additional approval, three distinct dedicated test identities were created through Auth Admin without sending emails. Generated passwords remain only in ignored `artifacts/staging/staging-accounts.env` with mode 0600. Teacher/admin grants used trusted SQL and only the new IDs. Public signup still creates students. The original account was not modified by test provisioning. These accounts are retained for repeat acceptance, not production use.

## Storage, Realtime and functions

| Bucket | Visibility | Configured limit |
| --- | --- | --- |
| `avatars`, `course-thumbnails` | Public raster images; owner-scoped writes | 5 MiB; PNG/JPEG/WebP |
| `lesson-files` | Private course-participant reads / owner writes | 50 MiB; migration-defined document/video MIME allowlist |
| `submissions` | Private student/assignment-owner paths | 10 MiB; migration-defined document/archive MIME allowlist |
| `class-recordings` | Private class-participant reads / teacher writes | No per-bucket size/MIME override in the existing migration |

The private-only channel toggle was set by the user in the verified staging dashboard. Early probes still accepted public channels; after the saved correction, a fresh public join returned **PrivateOnly** and an anonymous private join was denied. A real signed-in student joined its own private notification topic and was denied the teacher's topic. The grading scenario also received the actual teacher-triggered grade notification through private Postgres Changes, after waiting for subscription readiness. The supported CLI config push did not manage this dashboard toggle; it must be checked separately when reproducing setup.

All three configured Edge Functions are deployed and active: **`certificate-pdf`**, **`support-contact`**, **`course-assistant`**. Deployment used the API bundler and existing per-function import maps. Both font TTFs and their OFL notice were uploaded with the PDF function. `verify_jwt=false` is intentional at the gateway: the PDF and signed-in handlers explicitly validate user sessions; guest support challenge/intake uses the reviewed proof protocol.

Server secrets configured: `APP_ALLOWED_ORIGINS`, `APP_PUBLIC_ORIGIN`, `SUPPORT_CHALLENGE_SECRET`. The signing secret was generated cryptographically and never placed in `VITE_*`, Git or reports. Supabase injects its own `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; only support intake code uses the service key. `APP_PUBLIC_ORIGIN` currently points to the known local app, so PDF verification links are local until an approved hosted origin is supplied.

The optional assistant's `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL` and `AI_API_KEY` remain unset. A real dedicated-user invocation returned the intended **HTTP 503, assistant not configured**, without a provider request. Its adapter is deployed, but AI is unavailable until real provider configuration and rate/spend controls are approved. No provider service or frontend was purchased, deployed or published.

## Reproduction and evidence boundaries

Authenticate with the official CLI, externally set the independently verified `STAGING_PROJECT_REF`, and compare it with the API URL before linking. Never infer a hosted target from `project_id` or reuse an old link.

```sh
npx supabase@2.122.0 login
npx supabase@2.122.0 link --project-ref "$STAGING_PROJECT_REF"
npx supabase@2.122.0 migration list --linked
npx supabase@2.122.0 db push --linked --dry-run
# Only on the reviewed disposable target, after preflight and approval:
npx supabase@2.122.0 db push --linked
npx supabase@2.122.0 db query --linked --file tests/staging-postflight.sql
npx supabase@2.122.0 db lint --linked
```

Existing-data projects require the data/policy/backup review in [the migration plan](STAGING_MIGRATION_PLAN.md). Its old-schema preflights assume their respective predecessor schemas and cannot be run on a completely fresh database before those tables exist. Never manually replay SQL and then blindly push an unreconciled ledger, reset a hosted database, delete academic history, or reopen private buckets to recover access.

The dedicated acceptance runner reads explicit process variables, not `.env` as authorization. See [TESTING.md](../TESTING.md) for their names. Load the ignored test credential file through protected local tooling; enable function/Realtime opt-ins only after their prerequisites are verified. Keep reports/manifests private and review exact-ID cleanup. Certificate, tutoring, support, notification and audit history can intentionally survive course cleanup.

Final read-only cleanup verification found **zero remaining course rows or Storage objects for every recorded test/diagnostic ID**, three dedicated accounts, one other/original account, no staff roles on that original account, and zero missing profiles or unvalidated constraints. Dedicated identities and intentional certificate/tutoring/support/notification/audit history remain isolated for repeat testing. Credential/report files are mode 0600 and hosted result directories are 0700; neither values nor raw reports are committed.

The first actual hosted run passed 13 scenarios, failed the PDF request and did not run its final two scenarios. Diagnosis generated a genuine 399,734-byte PDF and proved active-session **200 → global logout 403 → fresh login 200** for the same certificate. The runner had reused a globally revoked SDK session after its earlier UI logout tests; it now reauthenticates that role's test driver. The deployed session checks were not weakened. Initial failed evidence is retained privately in `artifacts/staging-initial-hosted/`.

Final results: **82 unit/component/server-handler tests, 49 isolated database tests, four independent PostgreSQL races (one integration test), 39 fixture-backed Chrome scenarios and all 16 real hosted scenarios passed**. TypeScript, ESLint and the production build passed. Supabase's hosted linter reported no errors and two retained warnings about a shadowed/unused loop variable in `save_tutor_slot`. Counts and sanitized migration hashes are recorded in [supabase-staging-verification.json](supabase-staging-verification.json).

Local PGlite replays skip the hosted-only extension installation; local PostgreSQL races use explicit Auth/Storage/Realtime shims. They remain separate from real hosted Auth/PostgREST/Storage/Realtime/function evidence. The first broad fixture run had one loading timeout; its isolated recheck and subsequent full runs passed without raising timeouts. Fresh 375px admin-support and 1440px landing screenshots were inspected as fixture evidence. Hosted screenshots/traces/video remain disabled.

Remaining production prerequisites include actual confirmation/recovery email and approved OAuth, a real hosted frontend origin, all-bucket MIME/size/expiry acceptance, broader hosted concurrency and receiver revocation, scheduled expiry, backup/restore rehearsal, provider abuse/retention controls, physical media/TURN and non-Chrome/accessibility/load review. This staging setup does not authorize production migration or public release.

For the remaining settings, open only the verified staging project:

- **Authentication → URL Configuration:** add the actual approved frontend origin and its `/reset-password` URL when known. Keep the tested local entries while local acceptance is needed.
- **Authentication → Providers → Email / Google:** retain email confirmation and password protections; configure an approved sender/SMTP service for delivery acceptance. Google needs real client ID/secret and the staging Auth callback from the dashboard. No sender, deployed URL or OAuth identity is selected here.
- **Edge Functions → Secrets:** update `APP_PUBLIC_ORIGIN` and exact `APP_ALLOWED_ORIGINS` for that approved frontend. Optional AI also needs `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_API_KEY` and reviewed abuse/spend controls; these never belong in Vite variables.
- **Integrations → Cron:** choose the operator-approved cadence for `SELECT public.expire_old_live_classes();`, then verify recorded executions. No cadence was supplied in source, so no scheduled job was invented during setup.
- **Database backups / restore:** rehearse restoration into another disposable target, including separate Auth/configuration and Storage-byte recovery. Database hashes and a successful migration are not a restore rehearsal.

Primary references: [official CLI installation](https://supabase.com/docs/guides/local-development/cli/getting-started), [CLI configuration and local project identity](https://supabase.com/docs/guides/local-development/cli/config), [migration workflow](https://supabase.com/docs/guides/local-development/database-migrations), [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [global logout semantics](https://supabase.com/docs/guides/auth/signout), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [private-only settings](https://supabase.com/docs/guides/realtime/settings), [server secrets](https://supabase.com/docs/guides/functions/secrets), [static function files](https://supabase.com/changelog/32815-add-static-files-to-edge-functions).
