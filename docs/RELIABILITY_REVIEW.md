# ShikkhaHub reliability review — 16–17 November 2026

Starting revision: `edcaad2`; the working tree was clean. This report covers implemented local changes. The final verification record below distinguishes complete runs from retained intermediate attempts. No push, commit, deployment, hosted migration or production mutation is part of this work.

## Current local verification continuation

Baseline for this continuation: clean `96c199f` (the completed cleanup was already committed before this request). Preserve that implementation; leave this continuation uncommitted. No hosted operation or actual environment-file change is performed.

- [x] Investigate the three intermittent failures. Two traces show document reloads while review Markdown was being saved; the other shows cold Vite module requests near ten seconds during navigation. The new isolation regression **fails against the old development-server setup** with a destroyed execution context, then passes against the release bundle. The first continuation full run also exposed an immediate fixture-row assertion racing the asynchronous lesson save; this is independently reproduced with 250 ms request latency.
- [x] Serve a dedicated production build from `artifacts/e2e-app` through Vite preview for browser tests. This removes development HMR and per-request source transforms from these journeys. Keep all original assertions/deadlines and explicitly set **zero retries**. Production `dist/` remains a separate build artifact.
- [x] Add a browser regression that preserves the login draft and document identity across a Markdown timestamp change, restoring the original timestamps afterward. This changes no document content. Fix the authoring scenario to wait for each successful dialog closure before asserting the persisted article/PDF/video payloads. Retain all original persistence assertions, add those UI-success assertions and keep deterministic 250 ms mutation latency. The three affected cases plus the isolation regression pass **4/4**, without retries, in 25.8 seconds.
- [x] Resolve all seven inherited moderate development audit findings with a normal **typescript-eslint 8.72.1 → 8.73.0** minor update and lockfile refresh. It officially requires minimatch `^11.0.1`; the resolved graph uses **11.0.9**. No overrides, forced upgrades or production dependency changes. Full and production audits both report **0 findings**; lint passes.
- [x] Acquire disposable PostgreSQL **16.15** server binaries under `/tmp` without installing a service. Run the existing independent-connection test: **1/1 passes, 0 skips**, covering four booking/participant/administrator races on a private Unix socket with no TCP listener. The temporary cluster is stopped and deleted by the test.
- [x] Acquire Deno **2.9.6** under `/tmp`. Frozen-lock native checks pass for all four Edge Function entries. Deno-platform bundles pass **4/4**; a permission-restricted smoke probe loads each bundle, captures handler registration, checks fixture preflight responses and reads both packaged font assets. The probe grants no network, environment or write permission and uses synthetic settings. It does not exercise hosted Auth/RPC/provider behavior.
- [x] Complete the final sequential `npm run verify` after all implementation and documentation edits: **exit 0**, **877.58 seconds**, with all **148 browser cases passing** and zero retries/skips/flaky results. All **378 candidate file hashes** match the pre-run snapshot; only this result record is updated afterward.

| Current check | Observed result |
| --- | --- |
| Focused browser isolation / formerly intermittent cases | **4/4 pass**, zero retries, including deterministic 250 ms lesson-save latency |
| Old-development-server isolation regression | **Fails as expected**; preserved under `artifacts/reliability/isolation-before*` |
| Dependency audit (all / production) | **0 / 0 findings** |
| PostgreSQL native concurrency | **1/1 pass, 0 skipped**; four independent-connection races |
| Deno frozen checks / bundles / local packaged startup and fonts | **4 / 4 / 4 pass**, plus two font assets |
| Final complete `npm run verify` | **Exit 0**, **877.58 seconds** |
| Final security / build-environment tests | **6/6 / 3/3 pass** |
| Final strict app/node/browser/functions TypeScript, lint, production build | Pass |
| Final unit/component/shared-handler tests | **183/183 pass in 37 files** |
| Final PGlite SQL/migration/security tests | **56/56 pass** |
| Final complete Chrome suite | **148/148 pass**, **0 failures / 0 skips / 0 flaky / 0 retries** |
| Frozen candidate source/content check | **378 files unchanged during verification** |
| Final working-tree candidate secret scan / whitespace | Pass; **378 files** scanned using a disposable index; actual index untouched |

A preliminary continuation `verify` attempt was intentionally stopped after exposing the authoring race: **exit 130**, 261.32 seconds, **25 browser passes / 1 failure / 1 interrupted / 121 not run**. It is not a complete run or a pass. Its static stages passed. Evidence: `verify-before-async-fix.log`, `verify-before-async-fix-status.json`, and `before-async-fix-browser/`. A separate old-assertion run with controlled latency also failed before the synchronization fix (`authoring-latency-before.log` and its browser evidence). The final complete run below follows both test-isolation fixes and all documentation edits.

The previous seven findings were one minimatch advisory propagated through the development lint/parser graph, not seven independent application bugs. Before the update, attacker-controlled pathological glob patterns could exhaust CPU/memory in development or CI tooling; the browser/production dependency audit was already clean. The compatible upstream fix now removes that known chain. See [the advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249). An audit is a known-advisory snapshot, not a guarantee against all defects.

Deno's standalone bundler is experimental and emits an existing **fontkit 2.0.4 duplicate `axisIndex` key warning** (both declarations use the same `uint16` value). Checks, bundles and local startup succeed; the dependency was not patched or force-upgraded. Supabase's own ESZIP/container packaging, deployment and hosted function invocation remain unverified: Docker/Edge Runtime tooling is not present. Native Deno success is not provider acceptance.

Current acceptance evidence: `artifacts/reliability/verify-acceptance.log`, `verify-acceptance-status.json`, `acceptance-source-sha256.json`, `acceptance-source-check.json`, `candidate-secret-scan-acceptance.log`, `acceptance-browser/` and the default browser reports. Supporting evidence: `artifacts/reliability/preview-isolation-final-focused.log`, `isolation-before.log`, `audit-continuation-before.json`, `audit-continuation-after.json`, `audit-continuation-production.json`, `concurrency-native.log`, `deno-check.log`, `deno-bundle-status.json`, `deno-bundle.log` and `deno-packaging-smoke.log`. Downloaded tools and local probe artifacts are not tracked or deployed.

**Readiness:** local verification is complete and passing, suitable for review and a local commit. This is not hosted-release clearance: pending hosted migrations/functions, Supabase container packaging, TURN relay operation and physical-device acceptance remain unverified. No code, configuration, package or test changes follow the passing run; only the final result fields in the two review documents are updated afterward. All continuation changes remain uncommitted.

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

## Previous verification attempt (development server)

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

The previous development-server whole-suite invocation remains a recorded failure. The new release-bundle run and its actual status are recorded in the current continuation section; passing focused runs do not replace that required full result.

See [rollout instructions and acceptance boundaries](RELIABILITY_ROLLOUT.md). The two new migrations and updated/new Edge adapters require separate authorized hosted rollout. TURN needs relay provisioning, protected server configuration and real multi-network/device tests. One-hour credentials require rejoin for renewal; existing buffered/downloaded media and already-issued relay credentials are not instantly revocable.

The earlier audit went from nine to seven moderate development findings after the ESLint patch. This continuation resolves the remaining seven through the compatible typescript-eslint minor release; current full and production audits are clean. Historical audit files retain their dated counts, while `audit-continuation-after.json` and `audit-continuation-production.json` are current.

The earlier native PostgreSQL skip is resolved locally as described above; PGlite SQL and native multi-connection evidence remain separate. Deno checks, bundles and permission-restricted local startup are verified; Supabase packaging/deployment and hosted provider quotas/service delivery are not. Sustained nested-relation scale, native/physical media, cross-browser/accessibility, long recordings and production operations remain unverified. This is no zero-bug or exhaustive behavior claim.
