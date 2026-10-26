# Staging migration plan

Reviewed 27 October 2026. No hosted migration was executed. The seven October files are unchanged from `6ad01db`; this phase adds adoption, failure/recovery and preflight regressions. Local evidence uses real PostgreSQL WASM with Auth/Storage/Realtime schema shims. `pg_cron`/`pg_net`, hosted role ownership, concurrent connections and provider services require Supabase acceptance.

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

Current blockers: no identified/approved staging target or role credentials, no hosted backup/restore rehearsal, unapplied seven migrations, unknown existing data/policies/object paths/provider ownership, unvalidated hosted constraints, real Auth/Storage/Realtime and concurrent-connection acceptance, and no TURN/physical-device proof.
