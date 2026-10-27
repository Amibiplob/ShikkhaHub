# Repository cleanup report

27 October 2026, Asia/Dhaka. Baseline: `5467b7fb56e591863f59cb2467568f3984d876de` on `main`, one commit ahead of `origin/main`, with a pre-existing modified tracked `.env`. This cleanup changes the local repository only; it performs no hosted-project Supabase request, account operation, database migration, setting change, deployment, push or history rewrite.

## Before and after

Before: `src/App.tsx` contained the complete provider/router tree; feature components shared the flat `src/components/` directory, feature hooks lived in `src/hooks/`, and feature services/types shared `src/lib/`. There were 48 direct component/test files and 131 TypeScript source/declaration/test files under `src/`. `.env` was tracked despite ignore rules. Two notification presentation systems were mounted although every producer used Sonner.

After: the small `src/App.tsx` composes `src/app/providers/AppProviders.tsx` and `src/app/router/AppRoutes.tsx`. All **22 route declarations**, including guard props and lazy loading, match the baseline. Feature-specific components/hooks/services and their tests are together in `src/features/`; UI, layout and shared presentation have separate directories. Route screens remain discoverable in `src/pages/`. There are 130 TypeScript files under `src/`; no empty imitation folders, compatibility barrels or extra framework were introduced. The `@/` alias still targets `src/`. The source graph has no unresolved imports or dependency cycles. An AST review of 127 existing source/test modules, resolving relocated imports and omitting type declarations, found no runtime changes outside the explicitly extracted App composition. README contains the full directory map.

The final source layout is `app/{providers,router}`, `components/{ui,layout,shared}`, `features/{auth,courses,home,learning,assessments,tutoring,certificates,administration,support,community,live-classes,notifications}`, `pages`, `contexts`, `hooks`, `integrations/supabase`, `lib`, `types` and `test`. Root `config/` holds Vite environment validation; `scripts/` holds the Git-index check.

## Removed files, dependency and duplication

Only these three implementation files were deleted:

- `src/components/ui/toast.tsx`: unused Radix toast primitives.
- `src/components/ui/toaster.tsx`: mounted presenter with no producer calls.
- `src/hooks/use-toast.ts`: unused independent notification store and API.

Before deletion, repository-wide searches covered static/dynamic imports, route/lazy definitions, source/browser/database tests, package scripts, CI, configuration, Edge Functions, migrations and documentation, including hidden tracked files. Every notification producer imports `sonner`; only the removed presenter imported the old hook, and only those removed files imported the old primitives. The old presenter's App mount was removed; the existing themed Sonner presenter remains in the same provider order.

Removed direct dependency: **`@radix-ui/react-toast@1.3.1`**. npm removed exactly that lockfile package, with no added packages, other package changes or version upgrades. Dependencies without JavaScript imports were individually retained where CSS fonts/animations, automatic type resolution, Vite/Tailwind tooling, test environments/coverage, CLI scripts or the separate Edge/PDF graph require them. A clean isolated `npm ci` and `npm ls --all` pass. The first offline attempt lacked cached tarballs (`ENOTCACHED`); the successful normal install fetched the pinned packages in a disposable `/tmp` directory. The working installation was not replaced.

Two repeated handwritten `AppRole` unions now use the existing generated-database-derived auth type; the shared test fake aliases it as well. Removed two unused, stale handwritten `TutorSlot`/`TutoringRequest` view models; active tutoring code already uses generated `Tables<>` types. Other small query view models moved to `src/types/models.ts`. No runtime authorization behavior changed.

## Environment protection and historical exposure

- `git rm --cached -- .env` removed only the index entry. The local `.env`, both existing `.env.example` files and ignored `artifacts/staging/staging-accounts.env` were hashed before changes and remain **byte-for-byte intact**. Dedicated account credentials retain mode 0600. Example files remain harmless and unchanged; required browser names and server-only names/separation are documented in README and `supabase/functions/.env.example`.
- `git ls-files -- .env` returns no path. `git check-ignore -v --no-index .env` confirms it is ignored. Private `.env.*`, named staging credentials/secrets, key files, browser auth state and test artifacts are ignored; `.env.example` and `.env.sample` remain trackable, including nested examples.
- `npm run check:secrets` inspects indexed blobs, including force-added ignored files. It rejects private configuration/authentication/artifact paths, recognizable Supabase privileged/session keys, private keys, GitHub/AWS tokens and database credential URLs. Diagnostics contain paths/reasons only. Six disposable Git regression tests prove ignore exceptions, force-add denial, index-only environment removal, staged-versus-working-copy inspection, credential detection and value redaction. Exact synthetic negative-test placeholders remain allowed. This targeted check is not an exhaustive secret detector or a replacement for review; it does not scan ignored private files or rewrite history.
- CI runs the index guard before installation; `npm run verify` starts with the guard and repository-security tests. Vite validates loaded public environment values before serving or emitting assets. Only the two required browser variables and the historical optional public project identifier are accepted. Public-key input must be publishable/anonymous, with two exact test-only keys permitted solely on loopback. Additional `VITE_*` variables and privileged/user JWTs are rejected. Two actual negative Vite builds confirmed rejection before emission, redacted errors and unchanged existing `dist/` output.
- Browser requests retain the centralized Supabase client, public key and user JWT. Server-only service-role/AI/support secrets remain read through `Deno.env` inside Edge adapters. Auth/RLS/admin enforcement and all SQL remain unchanged. No bypass/debug endpoint was added. Existing error-boundary/media error logging was reviewed and retained as operational error reporting, not credential/body logging.

Historical inspection at the baseline commit: `.env` was present in **one history-touching commit / one distinct committed version** across reachable refs. It contained a public project identifier, public Supabase URL and legacy JWT with role `anon`; it did **not** contain a service-role/secret key. An additional **859 reachable historical blobs** were inspected for recognizable privileged/session JWTs, Supabase secret keys, private keys, GitHub/AWS tokens and database credential URLs. The sole match was the explicit synthetic `sb_secret_external-placeholder` negative fixture in `e2e/staging/settings.test.ts`. No real private credential was identified by these checks. This is a bounded pattern review, not proof that arbitrary secrets never existed in any remote/unreachable history. No values are reproduced here.

The old public configuration **remains in Git history**. Ignore rules and index removal do not erase earlier commits. No key rotation or history rewrite was performed. If a later review finds a genuinely private credential, revoke/rotate it at the provider, inspect its use and separately plan any coordinated history remediation. Supabase public keys are intended for client use and depend on RLS ([Supabase API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys)); `VITE_*` values are browser-visible ([Vite guidance](https://vite.dev/guide/env-and-mode.html)).

## Verification

The first post-refactor full run had **38 passes and one live-class timeout** after both Vite clients reconnected and the teacher page reloaded. The trace reload timestamp coincided with documentation edits during the run; the installed Tailwind Vite watcher can issue full reloads for scanned-content changes. The unchanged isolated live suite then passed **2/2** without raising timeouts or weakening assertions. The failure trace/screenshots are retained in `artifacts/repository-cleanup/first-final-browser/`. The final full rerun passed **39/39** with repository edits paused (6.7 minutes). A native-loader warning from the new Vite config import was also resolved by specifying its `.ts` extension; typecheck and build were rechecked.

| Check | Baseline | Final |
| --- | --- | --- |
| TypeScript (app/tooling/browser/Edge handlers) | Pass | Pass |
| ESLint | 0 errors/warnings | 0 errors/warnings |
| Vitest | 82 in 22 files | **91 in 23 files**, including nine public-environment regressions |
| Repository security (Node) | Not yet implemented | **6 passed**, zero skipped |
| PostgreSQL WASM migration/RLS/RPC integration | 49 passed | **49 passed**, zero skipped |
| Disposable PostgreSQL 18.4 | 1 test / four races passed | **1 test / four races passed**, zero skipped; private Unix socket/no TCP |
| Production build | Pass; entry 351.96 kB | Pass; entry **336.72 kB**, largest deferred chart 380.24 kB; no large-chunk warning |
| Fixture-backed real Chrome | 39 passed | **39 passed**, zero failed/skipped in the frozen full rerun; earlier 38/1 run and 2/2 recheck retained |
| Full and production npm audits | Both zero findings | Both zero findings |
| Clean install / dependency resolution | Existing tree valid | Isolated clean `npm ci`, clean and working `npm ls --all` pass |
| Diff / route and import review | Recorded | No whitespace errors; 22 routes unchanged, zero unresolved source imports/cycles |
| Protected files | Snapshotted | All 76 migration/function/config/asset/generated-type files unchanged |

Both browser runs use the existing full suite: independent student/teacher/admin login/logout/restoration and access denials; learning/enrollment/lessons/progress/quizzes/assignments/bookmarks; tutoring availability/booking/decisions/conflicts; certificate eligibility, actual synthetic PDF generation/extraction, public verification/revocation; administration/course roles/review/support/audit flows; public FAQ/contact/team/themes/artwork; local WebRTC media and simulated signaling. Viewports include **375, 768, 1024 and 1440 px**, with width/overflow assertions. Opened and inspected the final 1440px dark home screenshot, 375px light home screenshot, 375px administrator support screenshot and 375px revoked-certificate screenshot. Navigation, artwork, text wrapping, search controls and toast rendering fit the inspected viewports without visible clipping. Automated overflow checks also pass; this is scoped screenshot review, not exhaustive visual/accessibility or physical-device acceptance.

Fixture interception, PGlite's explicit Auth/Storage/Realtime shims and a disposable local PostgreSQL cluster prove local behavior only. **The 16 hosted staging scenarios were not rerun in this task.** Earlier hosted acceptance remains dated evidence in `SUPABASE_STAGING_SETUP.md`; no new live-service claim follows from these checks. No hosted migrations/settings/accounts were accessed or changed.

Ignored evidence: `artifacts/repository-cleanup/baseline/` and `artifacts/repository-cleanup/final/` contain command logs, browser JSON, advisory/install/import/negative-build results. Existing `test-results/` contains current fixture screenshots/traces; credentials and hosted reports remain in their existing ignored locations. Environment snapshots store hashes/path metadata only, never values. These artifacts are deliberately excluded from commits.

## Preserved files and remaining work

All **43 canonical Supabase migrations**, historical Drizzle migration/adoption/schema references, generated Supabase types, three server functions/shared PDF/support/assistant handlers, fonts/licenses, public art/social assets, useful audit reports/screenshots, academic names/supervisor and regression tests are preserved. The former `.lovable/plan/` QA plan moved to `docs/archive/` with its original text plus a dated archival note. Earlier reports retain snapshot paths/counts and are not rewritten as current results.

`ThumbnailUpload.tsx` is unreachable from current routes/tests but remains under courses: it is a dormant authoring capability, not a confirmed duplicate. Removing it would discard incomplete functionality; wiring it into an authoring flow requires its own behavior/authorization review. Existing missing features (paid entitlements, optional AI provider configuration, TURN/physical-device coverage, actual email/OAuth, backup restoration, scheduled expiry and broader hosted service acceptance) remain documented future/operations work. This cleanup does not implement or certify them. Further splitting large route screens should follow concrete feature work, not cosmetic wrappers.

README documents the actual structure, installation, required public/server configuration, development/build/test commands, Supabase/Edge deployment prerequisites, security and limits. TESTING records the cleanup rerun separately from previous hosted verification. This report inventories changes and preservation decisions.

## Moved files

**65 existing files moved**, including 10 colocated regression test files (where present) and the archived QA plan; no test was removed. The two new app composition files are extractions from the existing App, not compatibility re-exports.

| Previous path | Current path |
| --- | --- |
| `src/components/Header.tsx` | `src/components/layout/Header.tsx` |
| `src/components/Footer.tsx` | `src/components/layout/Footer.tsx` |
| `src/components/PageShell.tsx` | `src/components/layout/PageShell.tsx` |
| `src/components/ErrorBoundary.tsx` | `src/components/shared/ErrorBoundary.tsx` |
| `src/components/ScrollToHash.tsx` | `src/components/shared/ScrollToHash.tsx` |
| `src/components/ThemeProvider.tsx` | `src/app/providers/ThemeProvider.tsx` |
| `src/components/CategoriesSection.tsx` | `src/features/home/components/CategoriesSection.tsx` |
| `src/components/FaqSection.tsx` | `src/features/home/components/FaqSection.tsx` |
| `src/components/FeaturedCoursesSection.tsx` | `src/features/home/components/FeaturedCoursesSection.tsx` |
| `src/components/FeaturesSection.tsx` | `src/features/home/components/FeaturesSection.tsx` |
| `src/components/HeroSection.tsx` | `src/features/home/components/HeroSection.tsx` |
| `src/components/HomeDiscoverySections.tsx` | `src/features/home/components/HomeDiscoverySections.tsx` |
| `src/components/HomeDiscoverySections.test.tsx` | `src/features/home/components/HomeDiscoverySections.test.tsx` |
| `src/components/HowItWorksSection.tsx` | `src/features/home/components/HowItWorksSection.tsx` |
| `src/components/LearningPathsSection.tsx` | `src/features/home/components/LearningPathsSection.tsx` |
| `src/components/ProjectTeamSection.tsx` | `src/features/home/components/ProjectTeamSection.tsx` |
| `src/components/TeachSection.tsx` | `src/features/home/components/TeachSection.tsx` |
| `src/contexts/AuthContext.tsx` | `src/features/auth/AuthContext.tsx` |
| `src/contexts/AuthContext.test.tsx` | `src/features/auth/AuthContext.test.tsx` |
| `src/contexts/auth-context.ts` | `src/features/auth/auth-context.ts` |
| `src/hooks/useAuth.ts` | `src/features/auth/useAuth.ts` |
| `src/hooks/usePermissions.ts` | `src/features/auth/usePermissions.ts` |
| `src/hooks/usePermissions.test.ts` | `src/features/auth/usePermissions.test.ts` |
| `src/components/ProtectedRoute.tsx` | `src/features/auth/ProtectedRoute.tsx` |
| `src/components/ProtectedRoute.test.tsx` | `src/features/auth/ProtectedRoute.test.tsx` |
| `src/components/CertificateCard.tsx` | `src/features/certificates/CertificateCard.tsx` |
| `src/lib/certificates.ts` | `src/features/certificates/certificates.ts` |
| `src/components/TutoringWorkspace.tsx` | `src/features/tutoring/TutoringWorkspace.tsx` |
| `src/lib/tutoring.ts` | `src/features/tutoring/tutoring.ts` |
| `src/lib/tutoring.test.ts` | `src/features/tutoring/tutoring.test.ts` |
| `src/lib/faqs.ts` | `src/features/support/faqs.ts` |
| `src/lib/communitySort.ts` | `src/features/community/communitySort.ts` |
| `src/lib/communitySort.test.ts` | `src/features/community/communitySort.test.ts` |
| `src/components/BookmarkButton.tsx` | `src/features/courses/components/BookmarkButton.tsx` |
| `src/components/CourseAssistant.tsx` | `src/features/courses/components/CourseAssistant.tsx` |
| `src/components/CourseAssistant.test.tsx` | `src/features/courses/components/CourseAssistant.test.tsx` |
| `src/components/CourseCard.tsx` | `src/features/courses/components/CourseCard.tsx` |
| `src/components/CourseCard.test.tsx` | `src/features/courses/components/CourseCard.test.tsx` |
| `src/components/CourseContentEditor.tsx` | `src/features/courses/components/CourseContentEditor.tsx` |
| `src/components/CourseDiscussions.tsx` | `src/features/courses/components/CourseDiscussions.tsx` |
| `src/components/CoursePrerequisites.tsx` | `src/features/courses/components/CoursePrerequisites.tsx` |
| `src/components/CourseReviews.tsx` | `src/features/courses/components/CourseReviews.tsx` |
| `src/components/CourseSettings.tsx` | `src/features/courses/components/CourseSettings.tsx` |
| `src/components/LessonBookmark.tsx` | `src/features/courses/components/LessonBookmark.tsx` |
| `src/components/LessonFileUpload.tsx` | `src/features/courses/components/LessonFileUpload.tsx` |
| `src/components/ThumbnailUpload.tsx` | `src/features/courses/components/ThumbnailUpload.tsx` |
| `src/components/QuizManager.tsx` | `src/features/assessments/QuizManager.tsx` |
| `src/components/LiveClassModal.tsx` | `src/features/live-classes/LiveClassModal.tsx` |
| `src/components/LiveClassScheduler.tsx` | `src/features/live-classes/LiveClassScheduler.tsx` |
| `src/hooks/useWebRTCBroadcast.ts` | `src/features/live-classes/useWebRTCBroadcast.ts` |
| `src/components/TeacherRequests.tsx` | `src/features/administration/TeacherRequests.tsx` |
| `src/components/StudentAnalytics.tsx` | `src/features/learning/StudentAnalytics.tsx` |
| `src/components/StudentProgressTracker.tsx` | `src/features/learning/StudentProgressTracker.tsx` |
| `src/lib/teacherActivity.ts` | `src/features/learning/teacherActivity.ts` |
| `src/lib/teacherActivity.test.ts` | `src/features/learning/teacherActivity.test.ts` |
| `src/lib/models.ts` | `src/types/models.ts` |
| `src/components/GlobalSearch.tsx` | `src/components/shared/GlobalSearch.tsx` |
| `src/components/ThemeToggle.tsx` | `src/components/shared/ThemeToggle.tsx` |
| `src/components/LanguageToggle.tsx` | `src/components/shared/LanguageToggle.tsx` |
| `src/components/NotificationBell.tsx` | `src/features/notifications/NotificationBell.tsx` |
| `src/components/NotificationBell.test.tsx` | `src/features/notifications/NotificationBell.test.tsx` |
| `src/components/ProfileEditor.tsx` | `src/features/auth/ProfileEditor.tsx` |
| `.lovable/plan/sqa-test-suite-for-shikkhahub-2026-10-06.md` | `docs/archive/SQA_PLAN_2026-10-06.md` |
| `src/components/PrivateFileLink.tsx` | `src/components/shared/PrivateFileLink.tsx` |
| `src/components/PrivateVideo.tsx` | `src/components/shared/PrivateVideo.tsx` |

## Git handoff

Local commit message: **`Clean ShikkhaHub repository and secure environment configuration`**. This report belongs to that commit; resolve its exact ID with `git log -1 --format="%h %s" -- docs/REPOSITORY_CLEANUP_REPORT.md`. The final handoff records the resulting hash and working-tree status.

All task paths, including the `.env` index deletion, were selectively staged. The staged diff (with environment contents withheld), indexed blob guard, protected-file hashes and whitespace checks were reviewed before commit. No unrelated work is included.

The `.env` change in the commit is its deletion from tracking only; its local file still exists. The commit does not contain actual environment/test credentials, generated build output or private artifacts. No push, deployment, hosted mutation or history rewrite is part of this handoff.
