# Confirmed defect repair log

25 confirmed defect groups repaired in source and covered by local regressions. Evidence can be source inspection, a browser failure, or a PostgreSQL reproduction; these are distinguished by the scenario and references. Hosted acceptance is not claimed. Exact final execution results are in `verification.json` and `TESTING.md`.

Initial raw SQL exploit reproduction is reproducible with `node tests/baseline-security.mjs`; it intentionally replays the historical migrations in a disposable engine, never a configured project. Earlier failing browser artifacts are retained under ignored `artifacts/initial-browser-run`, `artifacts/second-browser-run`, and `artifacts/third-browser-run`.

## SH-001 — Signup / teacher registration

- Severity: **High**.
- Reproduction: Submit teacher signup with email confirmation enabled.
- Expected: Student role and pending teacher request exist without a browser session.
- Actual before repair: Client tried a revoked role INSERT and session-less teacher-request INSERT.
- Root cause: Signup logic lagged behind server-assigned roles.
- Files changed: `src/pages/Auth.tsx; 202610260001 migration`.
- Fix: Store teacher intent in signup metadata; trusted trigger assigns student and records request.
- Regression: database signup test; teacher signup browser test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-002 — AuthContext / role-protected routes

- Severity: **High**.
- Reproduction: Restore an admin session while role lookup is delayed; log out before a lookup finishes.
- Expected: Loading remains until roles resolve; old responses cannot restore privileges.
- Actual before repair: Loading ended before roles arrived; late responses could restore stale role/profile state.
- Root cause: Independent asynchronous session and role updates lacked ordering.
- Files changed: `src/contexts/AuthContext.tsx; AuthContext.test.tsx`.
- Fix: Generation-guarded loading and stale-response rejection; stable role callback.
- Regression: AuthContext unit tests; delayed-role admin browser test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-003 — Teacher dashboard

- Severity: **Medium**.
- Reproduction: Create a new course.
- Expected: Incomplete course starts as a draft.
- Actual before repair: Course was immediately published.
- Root cause: Creation payload explicitly set is_published=true.
- Files changed: `src/pages/Dashboard.tsx`.
- Fix: Default to false; preserve explicit publication control.
- Regression: teacher authoring browser journey.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-004 — Quiz questions / answer-key privacy

- Severity: **Critical**.
- Reproduction: As anon or student, SELECT correct_answer or request all quiz-question columns.
- Expected: Answer keys are readable only by authorized course staff.
- Actual before repair: Published-course answer keys were public.
- Root cause: Broad SELECT grant and published-course SELECT policy.
- Files changed: `202610260001 migration; src/components/QuizManager.tsx`.
- Fix: Revoke table-wide reads; grant safe columns and role-aware questions RPC.
- Regression: database answer-key test; student/teacher quiz browser tests.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-005 — Quiz attempts / score integrity

- Severity: **Critical**.
- Reproduction: Insert an attempt with score=999 and passed=true as student.
- Expected: Only the database computes and records scores.
- Actual before repair: Fabricated passing scores were accepted.
- Root cause: Client-computed grade plus self-owned INSERT policy.
- Files changed: `202610260001 migration; QuizManager.tsx`.
- Fix: Revoke direct writes; validate answer IDs/options and compute grade in submit_quiz.
- Regression: database forged-score and invalid-answer tests; student quiz journey.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-006 — Quiz editor

- Severity: **Medium**.
- Reproduction: Leave option 2 blank, select option 3 as correct, save the question.
- Expected: The compacted options retain the intended correct answer.
- Actual before repair: Correct index referred to the pre-filter array, possibly outside the saved options.
- Root cause: Empty options were removed without remapping the selected index.
- Files changed: `src/components/QuizManager.tsx; quiz constraints`.
- Fix: Require a nonempty correct answer and remap the index after trimming.
- Regression: teacher sparse-option browser regression; SQL question constraint.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-007 — Course progress

- Severity: **High**.
- Reproduction: Deny a completion write; repeat completion and reload.
- Expected: UI reflects confirmed persisted progress only.
- Actual before repair: UI marked lessons complete even when the write failed; implicit upsert conflict could fail.
- Root cause: Unchecked Supabase errors and missing composite conflict target.
- Files changed: `src/pages/CourseDetail.tsx`.
- Fix: Check write/delete errors, disable overlapping saves, use user_id/lesson_id conflict key.
- Regression: progress failure browser test; student reload journey.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-008 — Course bookmarks

- Severity: **Medium**.
- Reproduction: Deny a bookmark INSERT or DELETE.
- Expected: The previous state remains with an actionable error.
- Actual before repair: The bookmark icon toggled and success appeared despite failure.
- Root cause: Mutation error objects were ignored.
- Files changed: `src/components/BookmarkButton.tsx`.
- Fix: Update state only after success; reset on signed-out identity.
- Regression: bookmark denial browser regression.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-009 — Assignment grading / notification

- Severity: **High**.
- Reproduction: Teacher grades an ungraded submission.
- Expected: Persist graded status and one trusted grade notification.
- Actual before repair: UI wrote reviewed while trigger expected graded; client notification path duplicated trust.
- Root cause: Status mismatch across UI/trigger and client-generated notification.
- Files changed: `src/pages/AssignmentDetail.tsx; activity integrity migration`.
- Fix: Use graded consistently; remove direct client grade notification; validate marks.
- Regression: teacher grading browser journey; SQL notification count test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-010 — Assignment submissions

- Severity: **Critical**.
- Reproduction: Student inserts marks/status or updates feedback/grade.
- Expected: Only course owner grades; identity and student content remain stable.
- Actual before repair: Self-owned writes could set grades and status.
- Root cause: RLS checked row ownership but not writable fields.
- Files changed: `submission guard in 202610260001 migration`.
- Fix: Reject student grade changes, teacher content edits, identity swaps and out-of-range marks.
- Regression: database submission grading test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-011 — Submissions/reviews PostgREST relationships

- Severity: **High**.
- Reproduction: Load teacher submissions with profiles or course reviews with author profiles.
- Expected: Named joins resolve to profiles.user_id.
- Actual before repair: Referenced profile foreign keys did not exist in migrations/types.
- Root cause: Queries named absent relationships; admin post query also used an auth FK name.
- Files changed: `Supabase migration/types; AssignmentDetail.tsx; Admin.tsx`.
- Fix: Add profile FKs as NOT VALID for legacy-data review and use the correct post-profile FK.
- Regression: migration replay; TypeScript; teacher grading browser test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-012 — Lesson content authorization

- Severity: **High**.
- Reproduction: Read a published course lesson as an unenrolled account.
- Expected: Only authorized participants or explicit free previews receive private content.
- Actual before repair: Published lessons exposed article/video/file content without enrollment.
- Root cause: SELECT policy treated course publication as content authorization.
- Files changed: `202610260001 migration; CourseDetail.tsx`.
- Fix: Course access predicate, protected lesson reads, refresh after enrollment.
- Regression: database anonymous/unenrolled lesson test; student enrollment journey.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-013 — Enrollment authorization

- Severity: **High**.
- Reproduction: Enroll directly into a draft or priced course; repeat an existing enrollment.
- Expected: Free published enrollment only; duplicates rejected.
- Actual before repair: Self-owned INSERT did not check publication or price.
- Root cause: Row ownership was the sole insert condition.
- Files changed: `catalog and authorization migrations; CourseDetail.tsx`.
- Fix: Require published free course in RLS; present priced enrollment as unavailable.
- Regression: database draft/duplicate/paid tests; paid presentation browser test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-014 — Storage ownership and private files

- Severity: **Critical**.
- Reproduction: As an unrelated account, read a submission object or delete another teacher lesson file.
- Expected: Private content is participant-scoped; deletion is owner-scoped.
- Actual before repair: Submission/lesson/recording buckets were public; lesson deletion allowed every authenticated user.
- Root cause: Public buckets and bucket-only policies.
- Files changed: `202610260002 migration; storage.ts; upload/download/recording components`.
- Fix: Private buckets, scoped paths, signed URLs, owner/participant policies and limits.
- Regression: database private-file/cross-owner tests; signed-link unit tests; teacher PDF browser test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-015 — Course thumbnail storage

- Severity: **High**.
- Reproduction: Replace an existing course thumbnail via upsert; try another owner thumbnail.
- Expected: Owner replacement succeeds; cross-owner writes fail.
- Actual before repair: UPDATE policy was absent; broad INSERT/DELETE allowed unrelated writes.
- Root cause: Storage policy set did not match the upsert workflow.
- Files changed: `202610260002 migration`.
- Fix: Owner-scoped ALL policy for writes while retaining public image reads.
- Regression: database thumbnail owner upsert test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-016 — Teacher student progress

- Severity: **Medium**.
- Reproduction: Teacher queries completed progress in their own course.
- Expected: Teacher sees enrolled student progress and other teachers cannot.
- Actual before repair: Teacher progress tracker received no student progress rows.
- Root cause: Only self-progress SELECT policy existed.
- Files changed: `202610260001 migration`.
- Fix: Add teacher-owned-course SELECT policy.
- Regression: database teacher progress visibility test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-017 — Certificate eligibility

- Severity: **High**.
- Reproduction: Claim a certificate before completing all lessons or without course access.
- Expected: Database checks course access and every lesson.
- Actual before repair: A client could self-issue a certificate for any course.
- Root cause: Certificate INSERT trusted user_id alone.
- Files changed: `202610260001 migration`.
- Fix: Require authorized access, nonempty course and all lesson completion rows.
- Regression: database certificate eligibility test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-018 — Badges and notifications

- Severity: **High**.
- Reproduction: Insert an unearned badge or forge a grade notification for another user.
- Expected: Activity is verified and notifications come from trusted triggers.
- Actual before repair: Any authenticated user could target notifications; badges were self-assigned.
- Root cause: Overbroad INSERT policies.
- Files changed: `activity integrity migration; useBadgeChecker.ts`.
- Fix: Validate badge criteria and revoke browser notification INSERT; remove duplicate notification writes.
- Regression: database notification/badge forgery test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-019 — Live signaling authorization

- Severity: **Critical**.
- Reproduction: Join a known public live topic or send a teacher-ended event with a spoofed identity.
- Expected: Course participants receive private signals; server controls sender and teacher-only events.
- Actual before repair: Public channels and client-provided identities could bypass course UI checks.
- Root cause: Realtime broadcast authorization was absent.
- Files changed: `202610260003 migration; useWebRTCBroadcast.ts`.
- Fix: Private receive-only topic policy and authenticated identity-stamping send RPC.
- Regression: SQL signaling/impersonation test; two-context real local WebRTC test.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-020 — Live lifecycle expiry

- Severity: **Medium**.
- Reproduction: Schedule a future class whose creation time is over a day old; run expiry.
- Expected: Future scheduled sessions remain scheduled.
- Actual before repair: Creation-age rule expired future meetings.
- Root cause: Expiry used created_at rather than scheduled duration.
- Files changed: `202610260001 migration`.
- Fix: Expire relative to scheduled_at plus duration and grace period.
- Regression: database future-session expiry regression.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-021 — Public leaderboard

- Severity: **Medium**.
- Reproduction: Open leaderboard anonymously while students have completed lessons.
- Expected: Show aggregate public rankings without exposing raw progress.
- Actual before repair: Private-table queries failed or returned only the caller records.
- Root cause: Public leaderboard attempted to build rankings from RLS-private tables.
- Files changed: `get_leaderboard RPC; Leaderboard.tsx`.
- Fix: Bounded aggregate RPC with explicit public output.
- Regression: database leaderboard/raw-progress privacy test; public browser routes.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-022 — Course discussions / moderation

- Severity: **High**.
- Reproduction: Reply using another course parent ID; student pins a post in direct SQL.
- Expected: Replies stay in their course; only staff pin.
- Actual before repair: Parent FK did not constrain course; own-post UPDATE could set is_pinned.
- Root cause: Missing cross-row/field integrity checks.
- Files changed: `authorization/activity migrations`.
- Fix: Same-course parent validation and staff pin guard.
- Regression: database cross-course parent and student-pin tests.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-023 — Forms / mobile / keyboard semantics

- Severity: **Medium**.
- Reproduction: Inspect icon actions, form labels, tab bars/dialogs and nested link/buttons.
- Expected: Controls have names; responsive layouts and semantic interactions remain usable.
- Actual before repair: Several inputs/actions lacked names; links wrapped buttons and bookmark buttons; tabs were rigid.
- Root cause: Template markup and fixed-size layout primitives.
- Files changed: `UI tabs/dialogs; course/card/header/forms/community/editor components`.
- Fix: Associated labels, named actions, asChild links, sibling bookmarks, wrapping tabs and bounded dialogs.
- Regression: four-width public and role responsive tests; theme/Bangla/keyboard; semantic authoring/community journeys.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-024 — Assignments/live course-child ownership

- Severity: **High**.
- Reproduction: Move an owned assignment or live class to another teacher course.
- Expected: Course and teacher identities remain consistent.
- Actual before repair: UPDATE checked teacher_id only, permitting mismatched course_id.
- Root cause: Child row ownership did not validate the linked course after updates.
- Files changed: `202610260007 migration`.
- Fix: Validate course/teacher pairing before INSERT/UPDATE.
- Regression: database course-child ownership regression.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## SH-025 — Teacher analytics course filter

- Severity: **Medium**.
- Reproduction: Select course A with submissions/quizzes/progress also present in course B.
- Expected: Headline activity metrics use only selected-course records.
- Actual before repair: Assessment and progress records remained unfiltered.
- Root cause: Indirect assignment/quiz relationships were omitted from filtering.
- Files changed: `teacherActivity.ts; TeacherAnalytics.tsx`.
- Fix: Map assessment ownership and scope all headline activity metrics.
- Regression: teacherActivity.test.ts.
- Verification: local regression results recorded in `verification.json`; SQL tests use PostgreSQL WASM and browser tests use simulated services. Production acceptance remains pending.

## Additional implementation and remaining limits

New tutoring, lesson bookmarks, course information editing, instructor filtering, paid-price presentation and team attribution address missing requirements; they are not counted as defect groups. The optional assistant now authenticates callers and reads context with their JWT rather than a service-role key, but Deno/provider acceptance and application rate limiting remain open.

Other small repairs include My Courses navigation to the existing learning tab and prerequisite completion based on certificate records rather than enrollment. Timed quiz attempts, lesson-specific Q&A quotas/pinning, a course approval queue, full translations/manual accessibility, hosted storage migration, long-media URL renewal, provider acceptance and the Phase 1 dependency advisories were explicit limits; Phase 2 resolves those advisories as documented below. See the audit report and rollout notes.

## Phase 2 — 27 October 2026

The 25 groups above describe Phase 1. Phase 2 preserves those implementations and adds the following reviewed repairs/preparation; it does not count staging infrastructure or documentation as new application defects.

- **Dependency security:** all 14 prior package/meta findings investigated, including the production Zod high finding. Removed unused validation/Drizzle/Typography dependencies and obsolete Drizzle CLI config; updated the affected Router, Vite, Vitest/coverage branches and compatible Tailwind parser resolution. Full and production audits now report zero known findings. Exact versions, applicability, major-update reasons and dated advisory sources: [SECURITY_RESOLUTION.md](SECURITY_RESOLUTION.md), [dependency-audit.json](dependency-audit.json).
- **Hook dependencies:** 12 original warnings resolved through stable fetch callbacks, complete dependencies, direct inexpensive role computation and captured WebRTC peer-map cleanup. This addresses stale closure/ref risks without disabling rules. Nine existing mixed-export Fast Refresh warnings remain intentionally documented; no false claim of zero lint warnings.
- **Unsafe rollout query:** the old `DATABASE_ROLLOUT.md` quiz inventory could evaluate `jsonb_array_length` on a malformed JSON object. It now uses a `CASE` guard, as does `tests/staging-preflight.sql`; an isolated regression verifies malformed legacy JSON is reported without changing data or aborting the inventory.
- **Migration acceptance infrastructure:** six added PostgreSQL regressions cover legacy table adoption/academic-record retention, deferred-constraint validation, transactional duplicate failure, malformed legacy rows, surviving broad Realtime policies and rejection of duplicate replay. [STAGING_MIGRATION_PLAN.md](STAGING_MIGRATION_PLAN.md) reviews every October file. All seven SQL files remain unchanged; no hosted/production migration was run.
- **Real staging infrastructure:** separate opt-in suite with ordinary role JWTs and real-service UI/server readback, no service-key provisioning/auth bypass. Exact host authorization, distinct role accounts, secret-safe credential form input, disabled sensitive browser artifacts, private cleanup manifest and precise ID-scoped cleanup. Progress waits for confirmed completion before reload. Eleven scenarios are blocked/skipped without external staging configuration; no hosted success claimed.
- **Report/demonstration evidence:** found and inspected all 33 PDF pages; replaced prompt-only matrix with exact printed/PDF page references, diagram/schema/stack discrepancies and explicit missing/future capabilities. Verified academic cover attribution and compared current fixture captures with documented UI examples. Original PDF/student IDs are not added to Git. Demo guide and README now explain real vs simulated evidence and current stack.

Actual final checks and remaining external blockers are recorded in [TESTING.md](../TESTING.md), [verification.json](verification.json), and [STAGING_ACCEPTANCE_CHECKLIST.md](STAGING_ACCEPTANCE_CHECKLIST.md). No push, deployment, production mutation, remote account provisioning or provider configuration occurred.

## SH-026 — Student cannot see newly graded marks/feedback

- Severity: **Medium**; confirmed during Phase 2 staging acceptance review.
- Reproduction: Teacher grades a submission (`status='graded'`), then the student reloads their assignment. Teacher sees the result and the student sees the Reviewed badge, but the student's marks/feedback panel is missing.
- Root cause: The student panel still required the legacy `reviewed` status even though the teacher save/SQL notification path now uses `graded`.
- Fix: Accept both `graded` and historical `reviewed` when rendering the student's result; preserve stored data and authorization.
- Files: `src/pages/AssignmentDetail.tsx`, `e2e/journeys.spec.ts`, real staging result selector in `e2e/staging/acceptance.spec.ts`.
- Regression: Extended the existing teacher grading journey with an independent student context, result/feedback after reload, and legacy-status compatibility. This failed before the one-line fix at the missing `Marks: 90/100` assertion. Failure trace/screenshots retained under ignored `artifacts/phase2-grade-before/`.
- Scope: Actual browser regression with intercepted service contracts; the prepared real staging scenario is still blocked. No hosted grade or real academic submission was changed.

## Phase 3 — tutoring, certificates, administration and support

Feature additions are documented in PHASE3_FEATURE_GUIDE.md and are not counted as repairs of the original 26 groups. Confirmed repairs during implementation:

- **SH-027 — Mobile certificate controls:** the course enrolled/progress/certificate row overflowed the 375px viewport by 38px. Reproduction came from the existing responsive browser regression. Wrapping the control row fixes the layout without hiding content or suppressing the width assertion.
- **SH-028 — Bangla PDF runtime and positioning:** the old font adapter first failed with missing regenerator support, then actual Deno failed its disabled prototype mutation. Replaced it with maintained fontkit 2.0.4 and full font embedding, without unsafe flags. Visual review then exposed omitted Indic glyph offsets in pdf-lib drawText; explicit shaped glyph positions now render marks/conjuncts correctly. Node PDF tests and frozen Deno runtime smoke pass; rendered output inspected. No fallback boxes or raster certificate substituted.
- **SH-029 — Certificate deletion/history:** the previous course FK cascaded away certificate identity on course deletion. The new additive migration preserves metadata with SET NULL; public verification reports course removal and downloads/new issuance fail. Isolated SQL regression covers retention and authorization.
- **SH-030 — Tutoring availability and history:** old public availability could advertise a teacher whose role was removed; a global slot query could also omit a participant's booking among unrelated records. Availability now checks the approved teacher role, preserves participant-only cancelled history and loads related slots by exact request IDs. SQL/privacy and independent browser journeys cover the changes.

Other repaired infrastructure findings: old mutation fixtures lacked submission timestamps required by the teacher table; confirmation flows/search/status selectors were updated to the new interface; independent admin contexts prevent login helpers from inheriting protected-route return state. Browser errors were investigated, not suppressed. The four feature implementations add server-enforced double-booking/overlap/elapsed-completion gates, assessment-aware idempotent certificates, role/audit invariants and support privacy/anti-spam rather than retaining insecure convenience writes.

- **SH-031 — Stale public certificate verification:** navigating from a valid token to a malformed token could leave the previous valid result visible. Clear the record at the start of verification; a routed component regression now checks the malformed link shows not-found and removes the old certificate.

- **SH-032 — Mobile admin search usability:** corrected independent-context viewport testing exposed a filter row that squeezed the search field to a few characters at 375px. Stack search/filter/refresh controls below the small-screen breakpoint; the mobile browser journey now asserts a usable search width as well as no page overflow. Screenshots wait for closed dialogs and start at the page top.

## Modernization — React 19 / Vite 8 / Tailwind 4

- **SH-033 — Assistant authentication and independent provider:** the browser sent the project public key as a user bearer token, so the server's `getUser` check rejected signed-in requests. Use the actual session JWT plus public apikey. Replace the proprietary gateway with explicit server-owned provider/model/key configuration, preserving the stream route and RLS context. Handler and component tests cover rejection, input limits, private context and provider errors; browser journeys exercise actual streamed rendering with an intercepted provider contract.
- **SH-034 — Missing/broken course artwork:** absent thumbnails used a generic icon and broken URLs never recovered. Use original local topic SVGs, reserved dimensions and one-way error fallback. Valid uploaded media remains unchanged.
- **SH-035 — Mobile controls and assistant width:** theme/language controls were absent from the mobile menu, and the 380px chat panel could overflow a 375px screen. Add the controls and responsive panel bounds. Tests cover both themes and chat at 375/1440px.
- **SH-036 — React theme compatibility:** the current SSR-oriented theme adapter rendered an inline script that React 19.3 reports as a console error. Replace it with a client external store preserving storage/system/tab behavior. Temporarily disable transitions while applying the palette to prevent mismatched text/background frames. No error filter was added.
- **SH-037 — Toast/chat collision:** Chrome reproduced the enrollment toast covering the assistant's send button; hover kept the notification alive and prevented clicking. Place Sonner notifications at the top center so chat controls remain reachable.
- **SH-038 — Admin debounce migration regression:** moving pagination resets into a timer initially scheduled a redundant reset even when the query was unchanged. A real pagination test failed. Skip the debounce when `search === query`; reset only for an actual changed search. The existing page-2 regression is retained.
- **SH-039 — Quiz controlled value:** Radix reported uncontrolled→controlled on the first selected answer. Supply an empty controlled value until selection; server grading/answer contracts stay unchanged.
- **SH-040 — Tailwind container migration:** the v4 default breakpoint widths initially overrode the former custom container sizing. Preserve the existing 1400px cap explicitly in the custom container utility. Screenshots and responsive routes verify the final behavior.

Intermediate source/config restarts, npm's stale installed-graph resolution conflict, and early test prerequisite/fake-listener mistakes are retained as unsuccessful local attempts, not application passes. Final evidence is in MODERNIZATION_VERIFICATION.md. Existing SQL, hosted RLS acceptance requirements and real user records were not changed.

- **SH-041 — Per-course teacher quiz chart:** the chart's abandoned `courseQuizIds` placeholder was unused and each course bar used all attempts. Aggregate through the existing quiz-to-course map instead. A unit regression isolates 100%/50%/empty courses and excludes unknown quizzes; a visible Chrome regression hovers the two actual bars and checks the corresponding tooltip values.
- **SH-042 — Completion-badge criterion:** the client hardcoded `courses_completed` to zero although the existing SQL guard uses authoritative certificate records. Use the same certificate count and return no awarded badges when the database rejects an insert. Two colocated tests cover eligible completion and rejected awards; no badge-security policy or production record changed.

The final static cleanup also removes unused imports/local bindings and enables TypeScript `noUnusedLocals`; all application source, including retained routes and tests, now passes that guard. Network operations are preserved when unused response bindings are removed.

- **SH-043 — False default concurrency pass:** with no binary opt-in, Node 24's isolated test-process path reported a file-level pass without executing the guarded test. Reproduced against both modes. Add the database suite's existing `--test-isolation=none` setting; the default now reports one explicit skip, and the opt-in still executes four real PostgreSQL races. No assertion or database gate was bypassed.

- **SH-044 — Identity-scoped discovery state:** removing a redundant effect reset left the previous account's home learning cards in component state until a new account's fetch completed. A new component regression was executed and failed before repair. Key discovery content by user ID, and key header search/notification instances by the same identity so pending results cannot populate the next account's UI. The unit now passes; five affected homepage/header/auth Chrome scenarios pass after this final guard. Data/RLS contracts are unchanged.
