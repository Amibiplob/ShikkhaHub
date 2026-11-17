# ShikkhaHub reliability review — 16–17 November 2026

Starting revision: `edcaad2`; the working tree was clean. This report covers implemented local changes. The final verification record below distinguishes complete runs from retained intermediate attempts. No push, commit, deployment, hosted migration or production mutation is part of this work.

## Checklist and implementation

- [x] Read AGENTS, current routes/features/hooks/server adapters/migrations and earlier project guidance; preserve the React/Vite/Supabase architecture, branding, bilingual content, responsive UI and authorization boundaries.
- [x] Reproduce current baseline: normal type checking/lint/build, 156 unit tests and 53 local SQL tests pass. The strict app compiler reports **49 diagnostics** (the earlier 47 count is stale).
- [x] Enable strict checking and correct nullable state/relationships, optional route values, assignment limits and typed callbacks. No blanket `any`, disabled strict flags, ignored diagnostics or weakened assertions were added.
- [x] Fix global-search races, clearing, failure/retry, wildcard escaping and accessible naming/Escape behavior. Abort obsolete requests and ignore late responses.
- [x] Replace client-side community popularity/count scans with a bounded, invoker-authorized database feed. Keep literal search, stable pagination, vote serialization, mutation refresh, load-error retry and last-page correction. Remove an initial debounce timer that could reset a newly selected page.
- [x] Move course recording reads/presentation into a feature component and shared paged hook. Use an inner course join/filter on the server, stable order and ten-item pages. Class recording history shares pagination and error/retry states.
- [x] Share renewable private-video playback across lesson/recording screens. Preserve playback position/play intent; cap automatic error recovery at two attempts, then expose retry. Keep storage private and re-sign legacy object links.
- [x] Remount descendant state on identity changes while preserving same-user auth revalidation/media. Cancel stale summary reads. Preserve database authorization, assessments, certificate verification and private storage.
- [x] Guard duplicate course/enrollment/assignment/submission/grading/admin/vote actions; reset busy state after transport failures. Ignore stale administrator support-note reads. Failed prerequisite deletion retains its row; revoked/unvalidated certificates no longer satisfy prerequisite guidance.
- [x] Add paged, stale-response-safe discussion reads with explicit retry and serialized comment/reply/vote actions; handle prerequisite fetch and mutation failures.
- [x] Correct analytics course identity matching and distinguish failed reads from empty/zero results across analytics, achievements, profile, assignments, student progress and leaderboard.
- [x] Page summary reads by exact totals, including smaller provider caps; enforce cancellation, stable ID ordering, deadlines and explicit dataset bounds instead of silent truncation. Add a 501-row browser regression.
- [x] Measure and repair informational/destructive token contrast while preserving hues; keep existing keyboard, focus and viewport coverage. Reproduce the teacher quiz-card overflow at 320 px (34 px), then wrap its title/action groups without hiding content.
- [x] Extract course creation, administration reads, chat transcript, media error text and recording lifecycle by responsibility. Keep home discovery in its existing presentation components. Remove the unused TanStack Query provider and dependency graph; retain one established server-state approach.
- [x] Add optional server-issued authenticated TURN credentials and durable per-account endpoint quotas. Disabled TURN preserves the existing STUN behavior. Preserve JWT/room/RLS/CORS/body-size boundaries and server-only secrets.
- [x] Isolate unit configuration from local dotenv/backend credentials and separate pure media error text from the integration-heavy media hook. Add meaningful source-adjacent, SQL and browser regressions.
- [x] Complete final verification and screenshot review; record the failed whole-suite batch and unchanged successful repetitions separately.

## Review scope

Inspected public discovery/catalog/community, auth/account routing and isolation, student learning/progress/assessments/completion, teacher authoring/grading/analytics/live classes, administration/reporting/notes, tutoring, certificates, notifications, private media, recording persistence/upload, server handlers and additive database/security tests. Existing role/owner/RLS, authoritative quiz scoring, certificate issuance/revocation, private signaling and support-intake protections remain intact. No new payment capability or hosted-service claim is introduced.

The changes retain readable route composition and existing feature boundaries. Large files remain where further splitting would merely move presentation without clarifying ownership. Dormant authoring capabilities and historical applied migrations are preserved.

## Verification

Final application/test-source hashes match `artifacts/reliability/tested-source-sha256-final.json`; **no application, test, migration or configuration source changed during the final full run or affected-case repetitions**. Documentation edits during that full run did cause development-server refreshes, as diagnosed below. No live backend credentials are used by unit/browser fixtures.

| Check | Observed result |
| --- | --- |
| Indexed secret check; security regression tests | Pass; **6/6 security tests** |
| Build/environment exposure tests | **3/3 pass** |
| Strict TypeScript, app/node/browser/functions; ESLint | Pass |
| Unit/component/shared-handler tests | **183/183 pass in 37 files** |
| Local PGlite SQL/migration/security tests | **56/56 pass** |
| Production build | Pass; main entry **423.36 kB** before gzip |
| Complete `npm run verify` | **Exit 1**, 1702.99 seconds; all preceding stages passed; Chrome **144 passed / 3 failed / 0 skipped** |
| Each of the three affected browser cases, twice unchanged | **6/6 pass**, exit 0, 65.31 seconds; no concurrent project edits |
| Original 503 failure/recovery cases | **2/2 pass** focused; both also pass in the full run |
| Isolated development-refresh diagnostic | **1/1 pass**; a Markdown timestamp-only change reloads the document in 1123 ms |
| Native PostgreSQL independent-connection test | **0 pass / 1 configured skip**; server binaries unavailable |
| Final working-tree candidate secret scan and whitespace | Pass; **377 candidate files** scanned in a temporary Git index, actual index untouched; `git diff --check` passes |

Chrome uses real media/encoding/playback and decoding checks with intercepted backend services and synthetic inputs. PGlite runs the actual migration history with existing Auth/Storage/Realtime shims. These results do not establish hosted service delivery or physical-device acceptance.

The full batch's three failures were teacher article/PDF/video authoring (30-second navigation deadline; trace includes local Vite module requests near ten seconds), student main routes at 768 px (login reset during an unexpected page reload), and classroom controls/recording at 1440 px (meeting reset during a page reload). The classroom document reload occurred **157 ms after a review-document save**. The installed Tailwind Vite plugin sends a full reload on source invalidation; a controlled timestamp-only Markdown change reproduced a document reload without changing content. The temporary diagnostic restored the document timestamps and was removed after evidence capture. Documentation must remain frozen during these development-server journeys. Both reload-affected cases, and the authoring case, passed twice with no concurrent edits; original assertions and deadlines remain.

Every collected browser scenario has passing evidence on the final application source across the full run and unchanged repetitions. **A clean single whole-suite invocation is not claimed:** the complete command exited 1, and its original failures/traces remain saved. The diagnostic and repeated executions are additional evidence, not additional unique product scenarios.

Evidence under ignored `artifacts/reliability/`: `verify-final.log`, `verify-status.json`, `full-browser-final/`, `affected-repeat-final.log`, `affected-repeat-status.json`, `affected-repeat-final-browser/`, `503-focused.log`, and `markdown-refresh-diagnostic-browser/`. The default `test-results/` and `playwright-report/` retain the full 147-case batch; focused reports are preserved separately.

Retained attempts under ignored `artifacts/reliability/`: initial restricted-sandbox Git-child/web-server startup failures; an intentional HTTP 503 fixture mismatch (the regression now uses deliberate authorization denial); the reproduced initial debounce pagination failure and trace; and a deliberately interrupted intermediate verification run (**7 browser passes, 1 interrupted, 134 not run**, exit 130) before closing the summary row-limit issue. A later intermediate run retained **75 passes, 3 stale-assertion failures, 1 interrupted and 64 not run**, exit 130. Starting-source inspection confirmed the old lesson-completion wording and desktop-only record selectors predated this work. The tests now assert exact lesson-only completion plus its accessible progress value, uniquely target the desktop record cell and use the actual mobile definition role. All workflow/persistence/privacy assertions remain. A focused run passed 7/8, with the long student case exhausting its unchanged 30-second budget while unit/compiler workers overlapped; its trace showed submission was reached near the deadline. Two unchanged serial repetitions then passed in 13.9/14.1 seconds. Final verification runs all stages sequentially. A mistaken anchored test filter that collected no cases is also retained and is not a pass. No timeout was extended, scenario skipped, assertion weakened or failure hidden.


## Continuation and failure diagnosis

The session-ended full attempt reached browser case 101 with **96 passes and 5 failures**, followed by **43 uncompleted scenarios**; it produced no final exit/status and is not a completed verification run. Its static stages passed. Evidence is retained in `artifacts/reliability/verify-session-ended.log` and `continued-incomplete-browser/`.

The actual 320 px product defect was the teacher quiz card combining Edit Questions and Start Quiz on one row. DOM measurements identified the controls extending to 353.59 px. Wrapping the card and action groups, with a shrinkable title, removes the overflow. An additional diagnostic reproduced the failure before the fix and returned no overflowing elements afterward; its temporary test was removed, while the existing 320 px regression remains.

In the session-ended attempt, two route tests exhausted the shared 30-second test budget. The student/teacher/admin mobile-and-tablet loops now run as six independent viewport cases, preserving all routes, assertions and the original deadline. Those six cases and the unchanged public nested-navigation case passed serially. The 503 dashboard test also inspected error state before the SDK completed its three automatic read retries. It now checks loading, waits for the fourth failed response, then retains all error/retry/empty-state assertions. The browser harness accepts only a declared HTTP console failure with the exact endpoint and status; all page/runtime and unexpected network errors remain failures. Both original **503** scenarios pass (dashboard and notification failure/recovery), in a separate 2/2 run. No assertion or timeout was relaxed; unexpected browser errors still fail. An earlier focused intermediate pass used 403 fixtures; it is retained separately and does not substitute for the final 503 evidence. A continuation verification attempt exited 1 after 71.3 seconds when the build correctly rejected an undeclared synthetic key; its security/type/lint/unit/SQL stages passed but build/browser did not. The final run used the validator's existing approved loopback fixture key. The allowlist was not changed.

## Visual and contrast scope

The checked foreground/background, muted/card, primary, info and destructive token pairs include their relevant 10% card tints. After the small lightness/foreground adjustments, all **14 scoped pairs** exceed 4.5:1 (minimum **4.615:1**); artifacts retain before/after sRGB luminance calculations. The threshold follows [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This calculation is not a whole-page, hover-state or assistive-technology certification. [The repaired 320 px teacher quiz controls](screenshots/reliability-teacher-quiz-320-dark.png) were opened and reviewed in Chrome's dark theme: both actions, prerequisite selector and content-editor controls fit without clipping. Also opened the full-run 320 px light teacher course, 768 px light administrator workspace, 1440 px light teacher course, and 320 px dark Bangla About page. The quiz actions wrap at 320 px and stay inline at desktop width; the administrator record/actions and Bangla text fit. Selected evidence: [administrator at 768 px](screenshots/reliability-admin-768-light.png), [Bangla at 320 px](screenshots/reliability-about-bn-320-dark.png). The full automated workspace matrix checks student/teacher/admin widths at 320, 375, 768, 1024 and 1440 px. These are browser viewports, not physical-device acceptance.

## Known issues and external requirements

The whole-suite invocation remains a recorded failure, despite all affected cases passing twice afterward. Keep project files frozen during browser verification. No new uninterrupted full-suite pass is claimed.

See [rollout instructions and acceptance boundaries](RELIABILITY_ROLLOUT.md). The two new migrations and updated/new Edge adapters require separate authorized hosted rollout. TURN needs relay provisioning, protected server configuration and real multi-network/device tests. One-hour credentials require rejoin for renewal; existing buffered/downloaded media and already-issued relay credentials are not instantly revocable.

A current audit initially reported **9 moderate development findings**, all from one minimatch advisory chain; production dependencies had **0 findings**. ESLint was updated from 10.13.0 to the compatible 10.15.0 release, removing its affected branches. The remaining typescript-eslint 8.72.1 graph requires minimatch 10.x (its latest 8.72.2 metadata still does); [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) is patched in minimatch 11.0.1+. No forced downgrade or incompatible override was applied. Final audit: **7 moderate development findings**, **0 production findings**, no high/critical findings. Reports: `artifacts/reliability/audit-all-final.json` and `audit-production-final.json`.

Independent native PostgreSQL concurrency has **0 passes / 1 configured skip**: this environment has `psql` but no `initdb`, `pg_ctl` or server binary. PGlite SQL/migration tests are separate evidence. Deno packaging/deployment, actual provider quotas/service delivery, sustained nested-relation scale, native/physical media, cross-browser/accessibility, long recordings and production operations remain unverified. This is no zero-bug or exhaustive behavior claim.
