# Staging migration plan

**Executed 27 October 2026:** all **43** canonical migrations are recorded on the explicitly approved disposable ShikkhaHub staging project (`pdg…zrs`); final dry run has no pending migrations. The authenticated project, API URL and CLI link matched before writes. Hosted catalog verification, all four deferred constraint validations and 16 real acceptance scenarios passed. See [the setup report](SUPABASE_STAGING_SETUP.md) and [sanitized evidence](supabase-staging-verification.json). The original Lovable-connected project was untouched.

The per-phase review below retains the historical rollout/adoption requirements. The original seven October 26 files and original five Phase 3 files remain unchanged. Local PostgreSQL WASM and independent-connection shims remain separate evidence from hosted services. Existing-data and production rollouts still require their own backup/restore and operational approval.

## Target and recovery prerequisites

Use an explicitly approved, disposable Supabase staging project with no production users or objects. Record its project reference, database name and approved host outside Git. Do not infer staging authorization from the existing app `.env`. Preserve a restricted database backup, object inventory/copy and Auth/role configuration export; rehearse restoration into a second disposable target. Database dumps do not contain Storage object bytes or all provider settings.

Use a trusted migration owner able to manage public schema policies/functions and the required Storage/Realtime policies. Never use the browser public key for migrations. Recheck `git status`, the exact migration hashes, remote migration ledger and current schema before execution. Pause application writes and cron expiry during the change window. Set bounded lock/statement timeouts appropriate to the staging dataset. Ordinary unique-index creation and foreign-key changes can block writes; schedule accordingly.

## Exact read-only preflight

Configure a local libpq service named `shikkhahub_staging` through protected secret tooling. Verify its host/project reference against the approved target before connecting. The following commands are an operator recipe, not commands run during this audit:

```sh
psql 'service=shikkhahub_staging' -X -v ON_ERROR_STOP=1 -f tests/staging-preflight.sql
psql 'service=shikkhahub_staging' -X -v ON_ERROR_STOP=1 -c \
  'SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version;'
sha256sum supabase/migrations/20261026*.sql
```

The preflight script runs in a read-only transaction and rolls back. It inventories complete policies/indexes/triggers/constraints, teacher-request column types, extensions, bucket metadata and object counts. Every data-blocker count must be zero or have a reviewed data repair before proceeding. Its JSON check uses `CASE` so malformed objects do not cause `jsonb_array_length` to abort the inventory.

Review these additional adoption conditions:

- The complete historical Supabase chain through September must already match source. Fresh projects need the historical chain first, including the hosted extension migration. Do not run the old Drizzle migration again on a fresh project.
- An existing `teacher_requests` table must have the reviewed columns, status constraint and **correct definition** of `teacher_requests_one_pending`. `IF NOT EXISTS` checks names, not shape; stop on incompatible types or a same-named index with a different predicate. Preserve pending/approved/dismissed history and remove no records automatically.
- Reconcile duplicate assignment/student submissions with the academic owner, preserving work/history. A unique index deliberately fails if duplicates remain. No “keep latest” deletion is supplied.
- Repair profile orphans before validation. The two new profile FKs are `NOT VALID`, allowing existing rows to remain while checking new writes. They default to `NO ACTION`, so profile deletion can be blocked by assessment/review history; do not cascade away academic work as a quick fix.
- Repair malformed quiz options, answer indexes, nonpositive points and pass thresholds. New checks are `NOT VALID`; editing an invalid legacy row can fail until repaired. Historical `reviewed` submissions remain readable; new grading writes use `graded`.
- Reconcile assignment/live owner mismatches, cross-course discussion parents, and invalid/null assignment maximum marks. New triggers check future edits and do not rewrite historical rows. Maximum-mark data must be valid for meaningful bounded grading.
- Compare **all** affected public, Storage and Realtime policy definitions. Permissive policies combine with OR. Broad policies with other names are not removed by these migrations. An isolated regression demonstrates the Realtime bypass when such a policy exists. Stop until an authorized owner reviews/removes the conflicting policies.
- Verify all five expected buckets exist. Inventory actual keys and referencing lesson/submission/recording rows. Root-level lesson keys and teacher-prefixed recordings require approved copies/moves and reference updates. Bucket metadata updates do not create missing buckets or move objects. Keep public copies closed after conversion; never restore public access as recovery.
- Inspect existing function/trigger/constraint/table names for collisions, function ownership and schema privileges. New functions/triggers/tables are intentionally one-time DDL. Do not treat rerunning a recorded migration as an idempotent operation.
- Confirm publication membership, private-only Realtime settings, cron scheduling and extension availability on the hosted stack. The files create an expiry function; that does not prove the cron job is configured/running.

## Order and per-file review

| Order / exact filename | Dependencies and behavior | Adoption / operational risk |
| --- | --- | --- |
| `202610260001_authorization_and_assessments.sql` | Historical roles, profiles, courses, modules, lessons, assessments, certificates and live classes. Adopts teacher requests; defines access/review/grading RPCs; narrows grants; adds integrity triggers, unique submission index and four deferred validation constraints. | Known historical policy/trigger names must exist. Duplicate submissions block the index. Existing malformed rows remain pending validation. Admin mutations use an advisory transaction lock; multi-connection lockout testing remains external. |
| `202610260002_storage_and_tutoring.sql` | Requires `can_access_course` from 001, historical buckets/Storage policies and recording metadata. Privatizes three buckets, scopes paths, adds tutoring tables/policies and row locking plus partial unique accepted reservation index. | Objects are not moved. Public thumbnail SELECT coexists intentionally with owner write policies. Hosted MIME/size enforcement and concurrent approvals require acceptance. Slot/profile FKs can block deleting referenced teacher profiles. |
| `202610260003_private_live_signaling.sql` | Requires 001 and Supabase-owned `realtime.messages`, `realtime.topic`, `realtime.send`. Adds receive-only live-topic policy and authenticated, identity-stamping RPC. | No ownership-altering `ALTER TABLE realtime.messages`. Other broad policies/private-only settings can defeat isolation. Join authorization is cached; removal of an already connected receiver is not immediate. |
| `202610260004_activity_integrity.sql` | Requires historical notifications/badges/community triggers and tables. Revokes browser notification insertion; validates badge counts and staff pin changes. | Review remaining grants/policies and trusted trigger ownership. Historical unearned badges are not removed. Client completed-course badge automation remains partial. |
| `202610260005_catalog_and_leaderboard.sql` | Requires 001 enrollment policy; adds nonnegative integer `price_bdt`, free-only enrollment and bounded public aggregate leaderboard RPC. | Existing courses receive price zero; obtain owner review before treating previously paid content as free. Backfill intended prices in the approved maintenance window **before** exposing the updated frontend. No gateway or entitlement migration is supplied. |
| `202610260006_lesson_bookmarks.sql` | Requires Auth/users, lessons and 001 access function. User/lesson unique index, own SELECT/DELETE and participant INSERT. | Reject existing conflicting table names. Course/lesson deletion cascades bookmarks intentionally. |
| `202610260007_course_child_ownership.sql` | Requires historical assignments/live courses. Validates teacher/course pairing on future INSERT/UPDATE. | Historical mismatches are not auto-repaired. Reassignment of course owners can require a coordinated child-row update plan. |

Existing unique indexes cover enrollment `(user_id,course_id)`, progress `(user_id,lesson_id)`, pending teacher requests, submissions `(assignment_id,student_id)`, tutor times `(teacher_id,starts_at)`, requests `(slot_id,student_id)`, approved-slot partial uniqueness, and lesson bookmarks `(user_id,lesson_id)`. No duplicate index is added by the legacy teacher-request adoption when the existing definition matches. Production query plans, FK-side indexing needs and load/lock duration remain unmeasured; acceptance must include representative staging data.

Use the existing migration runner, explicitly linked to approved staging, to apply only the seven pending files in order, one transaction per file, stopping on the first error. Review its dry-run output and ledger before execution. For an **unlinked disposable rehearsal only**, the exact SQL replay is:

```sh
set -e
for migration in supabase/migrations/20261026*.sql; do
  PGOPTIONS='-c lock_timeout=5s -c statement_timeout=120s' \
    psql 'service=shikkhahub_staging' -X -v ON_ERROR_STOP=1 --single-transaction -f "$migration"
done
```

Manual `psql` replay does **not** update Supabase's migration ledger. Do not follow it with a blind `db push`. Keep manual rehearsals disposable; use the approved migration runner for an acceptance target and verify the recorded versions afterward. No production commands are authorized by this plan.

## Verification and explicit constraint validation

After resolving existing data, validate each pending constraint on staging:

```sql
ALTER TABLE public.quiz_questions VALIDATE CONSTRAINT quiz_question_valid;
ALTER TABLE public.quizzes VALIDATE CONSTRAINT quiz_pass_valid;
ALTER TABLE public.submissions VALIDATE CONSTRAINT submissions_student_id_fkey;
ALTER TABLE public.course_reviews VALIDATE CONSTRAINT course_reviews_user_id_fkey;

SELECT conname,convalidated FROM pg_constraint WHERE conname IN
 ('quiz_question_valid','quiz_pass_valid','submissions_student_id_fkey','course_reviews_user_id_fkey');
SELECT has_table_privilege('authenticated','public.quiz_attempts','INSERT') AS must_be_false,
 has_table_privilege('authenticated','public.notifications','INSERT') AS must_be_false,
 has_column_privilege('authenticated','public.quiz_questions','correct_answer','SELECT') AS must_be_false;
SELECT id,public FROM storage.buckets WHERE id IN ('lesson-files','submissions','class-recordings');
SELECT policyname,cmd,qual,with_check FROM pg_policies
 WHERE schemaname='realtime' AND tablename='messages';
SELECT proname,prosecdef,proconfig,proacl FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('can_access_course','read_quiz_questions','submit_quiz','review_teacher_request','send_live_signal');
NOTIFY pgrst, 'reload schema';
```

All four constraints must report `true`; grants must report `false`; three buckets must be present and private. Review function owners/search paths/EXECUTE grants and confirm no client role can create objects in trusted schemas. After schema refresh, use real JWTs to check hidden quiz keys, RPC composite result serialization, named profile joins, student self-grade denial, free/draft/paid enrollment and cross-owner access. A successful SQL replay does not establish any of these HTTP/provider contracts.

Run `npm run test:e2e:staging` with the external configuration in TESTING.md. Record its real results separately from the default intercepted-browser suite. Complete the [acceptance checklist](STAGING_ACCEPTANCE_CHECKLIST.md), including Storage limits, Realtime conflict/private-only checks, session revocation and physical-device media.

## Recovery

On SQL error, stop immediately. A transactional file rolls back atomically; prior successful files remain applied. Confirm ledger and actual schema, preserve error evidence privately, repair the reviewed cause and retry only that pending file. The local duplicate-submission regression verifies no partial column/function change or academic-record deletion remains after a failed 001 transaction.

There are no destructive down scripts. Dropping guards, restoring public buckets/answer grants or re-enabling arbitrary notification writes would restore known vulnerabilities. Prefer a reviewed forward repair. If the disposable target is inconsistent or prior manual DDL escaped transactions, restore its backup into a new disposable project and replay there; separately restore private object bytes and settings. Restore testing, object-reference checks and migration ledger reconciliation must pass before resuming writes. Never “repair” the migration ledger to conceal schema drift.

Earlier Phase 2 blockers included missing target/credentials and unapplied migrations. The current staging run resolves identity, migrations, constraints and the documented real-service subset. Full backup restoration, broader hosted concurrency, email/OAuth, all-bucket acceptance and TURN/physical-device proof remain open.

## Phase 3 extension - five pending additive files

The seven October 26 files above remain unchanged. Apply the following **after** that chain, one transaction per file, to authorized disposable staging only. No hosted migration was executed in Phase 3. Do not deploy the new frontend before its RPCs/functions are accepted.

| Order | File | Review / adoption concerns |
| --- | --- | --- |
| 8 | `202610270001_administration.sql` | Private serialization guard and append-only client audit trail, role mutation RPC, stronger last-admin trigger, publication review column/guard/RPCs. Existing published courses become approved; drafts remain drafts. Direct browser role writes and direct publication stop working intentionally; deploy matching UI. Review trusted function owner and public-schema CREATE grants. |
| 9 | `202610270002_tutoring_lifecycle.sql` | Extends existing slots/requests, `approved` retained as confirmed, completion/history/timezone/reservation metadata, tutor profiles and lifecycle RPCs. Backfills reservation flags for legacy approved bookings. Reconcile existing approved overlaps first; no history is deleted. Review visibility policies for active teachers and private participant history. Weekly schedules preserve timezone wall time and reject DST ambiguity/gaps atomically. |
| 10 | `202610270003_authoritative_certificates.sql` | Adds unique certificate numbers, snapshots, validation/revocation, UUID verification, automatic issuance/RPCs. **Duplicate old numbers intentionally abort** rather than discard certificates. Course FK changes to SET NULL to retain history; removed-course verification/download behavior changes. Legacy rows need eligibility revalidation; snapshots reflect current profile/course data at migration, not reconstructed historical facts. New eligibility includes every quiz/assignment. |
| 11 | `202610270004_support.sql` | Private tickets, admin-only internal notes, service-only intake and bounded quotas. No anonymous table reads or client writes. Confirm service role exists; leave its key only in the support server function. HTTP/HMAC validation is a separate required server deployment, not supplied by a SQL grant. |
| 12 | `202610270005_admin_reporting.sql` | Independently authorized statistics, whitelisted parameterized bounded pages, content moderation and audit triggers. Requires all preceding new tables/columns. Client audit writes remain revoked. Review duplicate generic/action audit entries as intentional event/reason records, not duplicate business mutations. |

Read-only preflight after the October 26 chain:

```sh
psql 'service=shikkhahub_staging' -X -v ON_ERROR_STOP=1 -f tests/staging-preflight.sql
psql 'service=shikkhahub_staging' -X -v ON_ERROR_STOP=1 -f tests/phase3-preflight.sql
sha256sum supabase/migrations/20261027*.sql
```

The new preflight inventories duplicate certificate numbers, orphan certificate recipients, invalid tutoring ranges and confirmed overlapping participant pairs. Every blocker requires reviewed remediation; do not bulk-delete grades/certificates/bookings. Published courses whose owner lacks a teacher role need an explicit administrator decision. Inventory legacy certificate snapshots and confirm consent/privacy for newly public token verification (which withholds recipient name/email). Review colliding table/function/constraint/index/policy names and the complete existing migration ledger. Retain a database/object/Auth/settings backup and rehearse restoration before rollout.

After ordered transactional application and schema-cache refresh, verify:

```sql
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.certificates'::regclass;
SELECT has_table_privilege('authenticated','public.certificates','INSERT') AS must_be_false,
 has_table_privilege('authenticated','public.user_roles','DELETE') AS must_be_false,
 has_table_privilege('authenticated','public.tutoring_requests','UPDATE') AS must_be_false,
 has_table_privilege('anon','public.support_tickets','SELECT') AS must_be_false,
 has_function_privilege('authenticated','public.support_intake(uuid,uuid,text,text,text,text,text,text,text)','EXECUTE') AS must_be_false;
SELECT c.id FROM public.certificates c WHERE c.validated_at IS NULL; -- explicit legacy acceptance list
SELECT s.id,s.is_reserved FROM public.tutor_slots s
 WHERE s.is_reserved IS DISTINCT FROM EXISTS(SELECT 1 FROM public.tutoring_requests r WHERE r.slot_id=s.id AND r.status IN ('approved','completed'));
SELECT schemaname,tablename,policyname,cmd,qual,with_check FROM pg_policies
 WHERE tablename IN ('application_locks','admin_audit_log','tutor_slots','tutoring_requests','tutor_profiles','support_tickets','support_notes','support_intake_limits');
NOTIFY pgrst, 'reload schema';
```

Then run distinct real JWTs through every new RPC and private table. Verify invalid state transitions/direct writes, cross-owner reads, concurrent confirmations, last-admin READ COMMITTED/REPEATABLE READ behavior, certificate auto-issuance/idempotency/revocation/removal, accurate paginated totals and guest/authenticated support privacy. Deploy functions only within the authorized staging setup using PHASE3_FEATURE_GUIDE.md; this run explicitly authorized and deployed all three adapters. Acceptance must confirm exact origin checks, modern public-key/JWT behavior, service-key scope, font static-file packaging and returned PDF bytes.

The local independent-connection rehearsal used temporary PostgreSQL 18.4 with private Unix sockets and explicit Auth/Storage/Realtime shims; it does not establish hosted extension ownership or Supabase services. PGlite also tests atomic recovery from duplicate old certificate numbers, preserving both legacy rows and the old FK after a failed file 10 transaction.

Recovery: stop on the first error, inspect the ledger/schema, preserve evidence, resolve the reviewed cause and retry only the pending transaction. Previous successful files remain applied. Prefer forward repairs or restoring a disposable backup into a new target. Do not restore direct client role/certificate writes, public ticket access or the former broad tutoring mutations as a rollback shortcut. Roll back the matching frontend if RPCs are unavailable. Existing downloaded PDFs cannot be recalled; retain verification/revocation metadata. Completed/cancelled bookings, certificates, tickets, notes and audit history need explicit retention/cleanup decisions, not automatic deletion.

## Additional staging corrections and execution

| Source position | Additive file | Evidence and behavior |
| --- | --- | --- |
| 42 | `202610270006_existing_auth_profiles.sql` | Hosted preflight found one Auth account predating the application tables. A regression first proved the old chain leaves its profile missing. Insert only missing profiles using signup metadata, preserve existing profiles and default student role behavior, and never infer staff roles from metadata. |
| 43 | `202610270007_private_notification_channels.sql` | Private-only Realtime rejects the UI's old public notification channel. Use a private per-user topic and an authenticated SELECT policy matching both the recipient and joined topic; no browser broadcast-write policy is added. SQL/component regressions and actual recipient/outsider subscriptions verify the repair. |

The initial dry run included all 41 original files with no seeds/role files. The profile repair was locally validated and included in the first 42-file hosted push; the notification correction was separately dry-run/applied as the only pending file. Final ledger comparison includes all 43 versions, including historical empty files, with zero pending changes. No historical file was renamed or rewritten and no ledger repair/reset was used.

Use `npx supabase@2.122.0 db query --linked --file tests/staging-postflight.sql` after independently checking the link. The script runs in a read-only transaction and returns one JSON report covering expected tables/RLS, RPCs, unique indexes, grants, complete policies, owners/search paths, FKs, buckets, publication and extensions. Review zero blocker counts, false forbidden privileges and zero unvalidated constraints after the separate validation procedure; counts alone are insufficient.

The initial staging database had no application tables, policies, buckets or objects, but one Auth account. Protected configuration/catalog snapshots were retained; a full backup/restore rehearsal was not performed. This disposable setup does not satisfy production recovery acceptance. See [SUPABASE_STAGING_SETUP.md](SUPABASE_STAGING_SETUP.md) for executed service checks, function deployment, dedicated test identities and remaining operational requirements.
