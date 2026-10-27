# ShikkhaHub testing

Latest repair verification: **28 October 2026, Asia/Dhaka**; see the repair section below. The **27 October 2026** results in the following historical sections describe their own snapshots. Current modernization results are recorded in [the verification report](docs/MODERNIZATION_VERIFICATION.md) and [`docs/modernization-verification.json`](docs/modernization-verification.json), with historical phases retained in `docs/verification.json`. Coverage percentages describe imported files only.

## Routing, CI, mobile menu and course completion repair

Baseline: clean `df417cb`, Node 24.22.1/npm 11.19.1; 114 Vitest tests passed. Missing Vercel fallback and CI PDF provisioning were confirmed by inspection. The baseline local PDF tool was already installed, so no local ENOENT is claimed. A preliminary browser run was interrupted after four passes because source edits caused Vite reload/parse errors; it is not a completed baseline. The first new browser run reproduced the mobile duplicate-notification-channel crash. The next focused run passed 28/29; its only remaining failure was a new test looking for Bengali text instead of the language button's actual accessible name. The selector was corrected, with the assertion retained. The first new component run passed 7/9; two failures came from an unstable mock translation function retriggering effects; stabilizing the mock gave 9/9 including FAQ. These counts are separate runs, not extra unique scenarios.

`e2e/navigation-repair.spec.ts` covers all four widths (320/375/425/768) for guest/student/teacher/admin: actual theme toggles, open/close, Escape, outside dismissal, focus containment/return, background lock, role links, link navigation, back/forward and session changes. Additional scenarios cover desktop resizing, Bangla labels, public/protected nested refresh, delayed role restoration, unknown routes, zero-row successful progress responses and unauthorized completion. The existing 1440/375 certificate journeys now exercise rapid lesson clicks, saved-progress reload, missing assessments, independent teacher grading, Finish Course, stable certificate identity, completion reload, actual PDF extraction and revocation. Real browser execution uses installed Chrome; HTTP/Auth/Realtime remain isolated fixtures. SQL tests independently enforce real migration/RLS/eligibility behavior in local PGlite.

CI installs Ubuntu `poppler-utils` and runs `command -v pdftotext`/`pdftotext -v` before Playwright. Locally this run uses Poppler 24.02.0. Only the certificate browser spec requires PDF extraction. Build/security helpers use Node/npm. Independent concurrency needs `psql`, `initdb` and `pg_ctl`; the unconfigured command explicitly skips. A new temporary PostgreSQL 18.4 cluster passed all four races after acquiring the pinned binary into `/tmp` and restoring its bundled library symlinks/`LD_LIBRARY_PATH`. The initial installed path had no `initdb`; an initial unhydrated package attempt lacked ICU links. None of these attempts contacted a hosted database or changed project dependencies.

The full command is `npm run verify`; concurrency and `npm audit` run separately because verify does not include them. Keep the Vite/browser run serial and avoid source/docs edits while it runs. Final verification: `npm run verify` ran the unchanged full chain with its configured one browser worker under an isolated local supervisor and exited **0**. No package script or workflow worker setting changed. The first default one-worker run completed **62/62** with no flaky/skipped/global browser errors, then the outer execution returned **143** after the success summary; its signal origin was not proven. A filtered verification-chain/cleanup recheck exited **0**. A temporary two-worker retry hit the existing login journey's unchanged 30-second timeout (18 passed, one failed, two interrupted, 41 not run), so it was stopped (exit 130); its log/trace remain under `parallel-verify.log`/`parallel-browser-results/`. The complete configured one-worker run below then passed. The local supervisor records npm's actual exit separately from the tool-session lifecycle. No assertions, scenarios or production settings were removed to obtain these results.

| Final check | Result |
| --- | --- |
| Git-index secret scan | Passed, including final staged blobs before commits |
| Repository security | **6 passed** |
| Environment/build/routing regressions | **3 passed** |
| TypeScript / ESLint | Passed; zero lint errors/warnings |
| Vitest unit/component/server | **122 passed in 24 files** |
| SQL database/migration tests | **49 passed** in local PGlite with Auth/Storage/Realtime shims |
| Independent PostgreSQL 18.4 races | **4 passed**, reported as one Node integration test |
| Production build | Passed |
| Complete real-Chrome browser suite | **62 passed, 0 failed, 0 skipped, 0 flaky**, with one worker and intercepted backend services |
| npm audit | **0 known vulnerabilities** |
| Git whitespace checks | Passed |

Final logs/status/metadata are `artifacts/bug-repair/verify-final.log`, `verify-final-exit.txt` and `final-results.json`. The earlier complete one-worker results remain in `full-browser-results/` and `full-verify-signal.log`; final browser screenshots/report are copied into `final-browser-results/`. Screenshots at 320/375/425/768px and completed-course screenshots at 375/1440px were opened and inspected; the checked layouts fit their viewports, with bounded internal menu scrolling. This is scoped viewport review, not physical-device or comprehensive accessibility acceptance. Ignored evidence is under `artifacts/bug-repair/`; the focused failure trace and screenshots are preserved under `focused-browser-results/`. Default final screenshots/traces are in `test-results/`.

Local rewrite-pattern tests cover client deep links and reserved API/file/asset paths. They do not execute Vercel's edge router. Actual GitHub Actions, Vercel deep-link/refresh/cache delivery, Auth confirmation/recovery emails and this repair against hosted Supabase require a later authorized hosted run. Previous disposable staging acceptance remains historical and was not repeated here. No push, frontend/backend deployment, hosted migration, account modification or environment-file edit occurs in this repair.

## Explicit environment exposure recheck

The `820a9fa` allowlist was still coupled to provider additions: a synthetic `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG` reproduced the exact build failure (exit 1). The same build now succeeds (exit 0), including an additional unknown provider field; neither marker is present in any `dist/` file. The earlier 16-name fix below is historical and superseded.

`loadEnv` reads prefixed configuration on the server side for validation; Vite's independent automatic exposure uses **`envPrefix: []`**. The validator returns a fresh two-property object, and only its validated URL/canonical public key are passed to `define`. Unknown inputs are never spread into client definitions. The anon-name alias remains supported and both supplied key fields are validated. Credential-name diagnostics remain explicit (including JWT secrets); unknown-name safety is enforced by exclusion. Unused provider/project-ID fields are dropped rather than parsed or trusted. Strict source env types allow only the two application fields and Vite built-ins.

Official [Vite documentation](https://vite.dev/config/shared-options#envprefix) describes prefix-based exposure and explicit `define`; the installed Vite 8.3.5 implementation confirms an empty prefix array selects no environment names. Tests verify this in both dev and build, including whole `import.meta.env` objects and computed reads. [Vercel analytics](https://vercel.com/docs/analytics/package#dynamic-configuration) and [Speed Insights](https://vercel.com/docs/speed-insights/package#dynamic-configuration) document the underlying observability variable as JSON containing client script/intake options. Its reported prefixed form follows Vercel framework conventions. This application installs/imports neither SDK, so it needs no provider payload; actual deployment values were not read or logged.

| Check | Result |
| --- | --- |
| TypeScript / ESLint | Passed; zero lint errors/warnings |
| Full Vitest suite | **114 passed in 23 files** |
| Focused environment policy | **32 passed**: local/public key formats, old Git metadata, observability/additional fields, alias precedence, both key validations, unknown credential names, invalid URL, missing input, type errors, redacted diagnostics and exact output projection |
| Repository security | **6 passed** |
| Vercel build regressions | **2 passed**: actual application build plus production probe build; development transforms; eight credential-name and six invalid/missing/key rejection builds |
| Production builds | Normal build and byte-identical original observability reproduction passed |
| Targeted fixture-backed Chrome | **2 passed**: public routes at 375px and 1440px; both home screenshots opened/inspected, with working navigation/artwork and no visible clipping |
| Exposure proof | All emitted files scanned for five unique non-public markers; zero matches. Executed compiled probe and actual dev transform expose only two application values plus built-ins. Direct/computed/object/spread reads, server-only input, unused alias and provider HTML replacement cannot retrieve excluded values |
| npm audit | Zero known findings |
| Index secret guard / diff check | Passed; all four local environment files unchanged |

The production probe deliberately reads the whole environment and arbitrary properties so dead-code elimination cannot mask a leaked input. The probe code is evaluated in a script VM (with a minimal preload-polyfill DOM capability); the dev probe runs through the real Vite transformer, rebinding only `import.meta.env` for script execution. These are build/transform exposure tests, not browser or hosted-service proof. Probe files live only in a disposable directory; no .env is copied, process settings/cwd are restored, and input diagnostics contain names/reasons only. Normal app sources, frontend behavior and Supabase integrations are preserved. New frontend settings or telemetry SDKs require explicit reviewed exposure and tests; automatic HTML substitution is disabled. Hosting-side script injection and actual deployment behavior are outside this local verification.

Logs, before/after evidence and advisory output are ignored under `artifacts/vercel-env-hardening/`. No live backend, original Lovable-connected project, database, provider setting, deployment credential or local environment file was changed. No push/deployment was performed.

## Earlier Vercel build compatibility recheck (historical)

Against baseline `1616009`, supplying the harmless process-only `VITE_VERCEL_GIT_REPO_ID=123456789` reproduced the exact configuration-loading failure with exit 1. The same `npm run build` now exits 0. The validator allows exactly the 16 [documented public Vercel framework metadata names](https://vercel.com/docs/environment-variables/framework-environment-variables), with no prefix wildcard; OIDC/automation secrets and other unknown `VITE_*` names remain denied. [Vite documents that prefixed settings can reach the browser](https://vite.dev/guide/env-and-mode.html).

`VITE_SUPABASE_ANON_KEY` accepts public publishable/anonymous keys and is normalized at Vite configuration time to the existing key reference used by the SDK, assistant and support HTTP requests. `VITE_SUPABASE_PUBLISHABLE_KEY` retains precedence when both are present; **both** supplied fields are validated. No environment file was rewritten, no live Supabase resource was accessed/changed, and no deployment was attempted.

| Command/check | Result |
| --- | --- |
| `npm run typecheck` / `npm run lint` | Passed; zero lint errors/warnings |
| `npm run test -- --maxWorkers=2` | **110 passed in 23 files** |
| Focused environment regressions | **28 passed**, including each of the 16 documented metadata names, alias resolution/precedence and sensitive-name/key denials |
| `npm run test:security` | **6 passed** |
| `npm run test:build-env` | **1 integration test passed**: builds the actual app in a disposable root with all 16 synthetic metadata variables and only the anon-name public key, checks SDK/assistant/support emitted keys, then rejects six sensitive names and a secret key in seven negative builds |
| `npm run build` | Passed with current local configuration, and again with the original dummy repository ID |
| `npm run check:secrets` / `git diff --check` | Passed; local environment hashes unchanged |

The real-build regression runs in `verify`, and therefore the existing CI workflow. Logs/before-after evidence are ignored under `artifacts/vercel-build-fix/`. Database/browser/provider acceptance was not rerun for this configuration-only change. An initial strict-TypeScript test-fixture indexing error was corrected and the full typecheck/unit suite rerun successfully.

No tracked configuration or project `.npmrc` contained `cache-dir`, and the normal local command emitted no warning. Injecting either `npm_config_cache_dir` or `npm_config_cache-dir` into `npm config get cache` reproduced the exact npm warning, identifying an external npm environment option as a possible source. The actual Vercel injector/settings were not inspected; no unrelated npm configuration was changed.

## Repository cleanup recheck

The subsequent [repository cleanup report](docs/REPOSITORY_CLEANUP_REPORT.md) inventories 65 file moves, three removed unused toast modules, the single removed dependency and environment protection. The default suite remains local/fixture-backed; **hosted staging tests were not rerun** for cleanup.

| Check | Cleanup result |
| --- | --- |
| TypeScript / ESLint | Passed; zero lint errors/warnings |
| Unit/component/server handlers | **91 passed in 23 files**, including nine public-environment boundary tests |
| Repository configuration/secret protection | **6 Node tests passed**, using disposable Git repositories |
| Isolated PostgreSQL WASM | **49 passed**, zero skipped |
| Disposable PostgreSQL 18.4 | **1 test passed**, four independent-connection races, zero skipped |
| Production build | Passed; entry **336.72 kB** (baseline 351.96 kB) |
| Fixture-backed Chrome | **39 passed**, zero failed/skipped in the final frozen full run |
| Full / production npm audit | Both zero findings |
| Clean install / dependency resolution | Isolated `npm ci` and both clean/working `npm ls --all` passed |
| Environment / preserved backend files | All four local environment files and 76 protected migration/function/config/asset/type files match baseline hashes |

`npm run check:secrets` reads the Git index, so stage intended changes before the final check. It rejects force-added private configuration/auth-state/artifact paths and recognized credential formats without printing values; harmless examples/samples and exact negative-test placeholders are allowed. `npm run test:security` proves the guard against disposable repositories without opening any application environment file or contacting Supabase. CI runs the guard before install, and `verify` starts with both checks.

Vite rejects unknown public variable names and privileged/non-anonymous keys before serving/building. Two actual synthetic unsafe builds exited before emission, redacted their values and left `dist/` unchanged. The unit tests also cover public anonymous/publishable keys, loopback-only fixture keys, server-variable separation and unsafe origins. The guard is intentionally targeted; staged review remains required. No secret/history erasure claim is made.

Ignored logs and machine results are in `artifacts/repository-cleanup/{baseline,final}/`; current fixture screenshots are under `test-results/`. Opened and inspected the final 1440px dark home screenshot, 375px light home screenshot, 375px administrator support screenshot and 375px revoked-certificate screenshot. Navigation, artwork, text wrapping, search controls and toast rendering fit the inspected viewports without visible clipping. Automated overflow checks also pass; this is scoped screenshot review, not exhaustive visual/accessibility or physical-device acceptance. The first clean offline install failed with `ENOTCACHED`; a normal pinned clean install then passed in `/tmp`. These runs preserve the working install and actual environment files. The first post-refactor full run had **38 passes and one live-class timeout** after both Vite clients reconnected and the teacher page reloaded. The trace reload timestamp coincided with documentation edits during the run; the installed Tailwind Vite watcher can issue full reloads for scanned-content changes. The unchanged isolated live suite then passed **2/2** without raising timeouts or weakening assertions. The failure trace/screenshots are retained in `artifacts/repository-cleanup/first-final-browser/`. The final full rerun passed **39/39** with repository edits paused (6.7 minutes). A native-loader warning from the new Vite config import was also resolved by specifying its `.ts` extension; typecheck and build were rechecked. Baseline, first post-refactor run, isolated recheck and final full rerun are reported separately.

## Supabase staging setup recheck

27 October 2026: the explicitly approved disposable ShikkhaHub backend has **43 migrations applied** and zero pending. See [the setup report](docs/SUPABASE_STAGING_SETUP.md) and [sanitized evidence](docs/supabase-staging-verification.json). No original Lovable project or production resource was touched.

| Check | Current result |
| --- | --- |
| TypeScript / ESLint / build | Passed; ESLint zero errors/warnings |
| Unit/component/server handlers | **82 passed in 22 files** |
| Isolated PostgreSQL WASM | **49 passed**, including pre-existing Auth adoption, postflight drift and private notification authorization |
| Independent PostgreSQL 18.4 | **1 passed**, covering four independent-connection races |
| Fixture-backed Chrome | **39 passed**, after the notification change |
| Real hosted Chrome / SDK suite | **16 passed, zero skipped/failed**, both function and Realtime opt-ins enabled |
| Read-only public Chrome | Four actual routes rendered, actual API HTTP 200, zero page exceptions/interception |
| Hosted Edge HTTP checks | Ten passed: CORS, unsigned calls, guest challenge and tampered proof |
| Real Realtime probes | Public `PrivateOnly`; anonymous private denial; recipient join / outsider denial; actual private grade-notification CDC and live broadcasts |
| Hosted catalog | 35/35 RLS tables; 46 FKs; four deferred checks validated; 115 public / 15 Storage / 2 Realtime policies |
| Supabase DB linter | No errors; two retained warnings for a shadowed/unused loop variable in `save_tutor_slot` |

The first unit run had one timeout while broad checks competed for resources; the unchanged full suite passed with `--maxWorkers=2`. The first fixture run had 38 passes/one lazy-route loading timeout; the isolated admin recheck, following full run and final full run passed without raising timeouts. The first hosted run had 13 passes, one PDF request failure and two unexecuted scenarios. A real PDF/session diagnostic proved HTTP 200 with an active session, 403 after global logout and 200 after fresh login. The runner now reauthenticates its SDK role after testing the application's global logout. No server session checks were weakened. Private initial hosted evidence remains in `artifacts/staging-initial-hosted/`.

Dedicated test credentials are retained only in ignored `artifacts/staging/staging-accounts.env` (0600), with exact-ID manifests in `artifacts/staging/`. Load them into the runner's process through protected local tooling; the suite deliberately does not infer authorization from app `.env`. Hosted reports disable traces/screenshots/video and were created with restrictive permissions. Do not commit credentials, tokens, raw reports or real signed URLs.

## Recorded modernization results (before staging setup)

| Check | Result |
| --- | --- |
| Reproducible install | Final `npm ci` passed; Node 24.22.1 / npm 11.19.1 |
| TypeScript | Application, tooling, browser-test and all three server adapters pass |
| ESLint | 0 errors, 0 warnings; current React Hooks recommended rules enabled |
| Vitest | 81 tests passed in 21 files |
| PostgreSQL WASM integration | 46 passed; migrations/RLS/RPCs with explicit provider-service shims |
| Production build | Passed; main 351.96 kB, largest deferred chart chunk 380.24 kB; no oversized-chunk warning |
| Headless Chrome | 39 passed, zero failed/skipped/flaky; five affected-route rechecks after the final identity guard |
| Headed Chrome | 38 passed in complete suite plus one separate passing headed chart regression |
| Real Supabase staging suite | 16 deliberately skipped with external opt-in disabled; no hosted passes |
| Independent PostgreSQL | 1 passed; four independent-connection races on disposable PostgreSQL 18.4 |
| Deno compatibility | Actual Deno 2.9.6 frozen checks of all three entry points and PDF/support runtime smoke pass |
| Deno dependency graph | 29 locked version entries; zero known bulk-advisory findings |
| Coverage | 81 tests; imported-file statements 84.99%, branches 76.51%, functions 82.47%, lines 88.34% |
| Full / production dependency audits | Both report zero known findings |
| Dependency tree | `npm ls` passes; only intentional TypeScript 6 / Node 24 type-version exceptions in `npm outdated` |
| Dev / built runtime | CSS HMR without document reload and four built-preview routes pass; backend intercepted |
| Diff / environment preservation | No whitespace errors; actual secrets, migrations and generated database types unchanged |


Phase 1 screenshot/hot-reload and network-interruption artifacts remain historical evidence. Phase 2 reproduced the student grading-display defect before repairing it; its failing trace/screenshots are retained under ignored `artifacts/phase2-grade-before/`. The extended grading journey now checks student marks/feedback after reload and supports legacy records. Initial restricted-sandbox registry/server attempts failed for environment reasons and were retried with network/loopback permissions. No checks were disabled to hide failures.

## Install and run

Use Node.js 24 and the committed npm lock:

```sh
npm ci
npm run verify
```

`verify` runs the Git-index security check and its regressions, app/tooling/browser-test/server-handler TypeScript, ESLint, Vitest, PostgreSQL WASM integration tests, a production build, then real headless browser tests. It does not run migrations against `.env`, create remote accounts, deploy or push.

```sh
npm run test                 # colocated unit/component tests
npm run test:watch
npm run check:secrets        # inspect indexed blobs; never prints configuration values
npm run test:security        # disposable Git-index/ignore/credential regressions
npm run test:coverage        # imported-file coverage; current scope recorded above
npm run test:db              # isolated migration/RLS/constraint/RPC tests
npm run test:e2e             # real Chrome; starts/waits/stops local Vite itself
npm run test:e2e:headed      # same suite with visible browser (DISPLAY required)
npm run typecheck
npm run lint
npm run build
npm audit                   # dated known-advisory check, currently exits 0
npm audit --omit=dev         # production install classification, currently exits 0
npm run test:e2e:staging     # external approved target only; otherwise 16 blocked/skipped
```

The default browser channel is installed Google Chrome 156.0.8078.47. Current modernization headless/headed results are above; earlier phase-specific results remain historical. CI uses downloadable Chromium:

```sh
npx playwright install --with-deps chromium
E2E_BROWSER_CHANNEL=chromium npm run test:e2e
```

`python3 e2e/smoke_e2e.py` is a compatibility wrapper around the maintained TypeScript public-route suite. Python Playwright is no longer required. Port 18080 (or externally selected `E2E_PORT`) must be free: the test configuration refuses to reuse an arbitrary running server.

## Evidence boundaries

| Layer | Actual execution | What it does not prove |
| --- | --- | --- |
| Vitest + Testing Library | Real component rendering, role guards, auth race/failure cleanup, language dictionaries, sorting, signed-link behavior and analytics scoping | Deployed services or browser rendering |
| PostgreSQL WASM / PGlite | Real PostgreSQL SQL engine, ordered migration replay, RLS under anon/authenticated roles, constraints, triggers, grading/RPCs and negative authorization | GoTrue/JWT verification, PostgREST translation, real Storage/Realtime transport, PostgreSQL extensions or multi-connection races |
| Playwright + Chrome | Actual SPA, Supabase SDK, typing/clicks, browser storage/restoration/reload, independent contexts, responsive screens and WebRTC peer media | Authentication/PostgREST/Realtime service contracts are intercepted by deterministic fixtures; no real-provider account or production data verification |
| Live browser test | Real peer connections and decoded media in two contexts with Chrome fake devices, chat/raise-hand/leave/rejoin/end | Hosted signaling, physical microphone/camera, TURN/NAT traversal, multi-network scale, screen share or recording acceptance |
| Optional GitHub Actions | Secret-free workflow definition committed | GitHub execution was not triggered; remote CI is unverified |

Historical migrations replay into an empty disposable database. Seven adoption/recovery tests rehearse existing academic records/teacher requests, duplicate-failure atomicity, malformed legacy JSON, deferred validation, unknown broad Realtime policies and duplicate replay. `tests/staging-preflight.sql` is exercised against a legacy fixture; no hosted preflight was run. The migration that only installs `pg_cron`/`pg_net` is explicitly skipped because these hosted extensions are unavailable in WASM. Test schemas provide `auth.uid`, Storage tables and Realtime topic/send shims; service behavior is not silently substituted as hosted proof. Database tests use Node's `--test-isolation=none` to avoid the WASM worker/isolated test-process issue observed with Node 24.

## Browser coverage

The suite uses ephemeral generated passwords and reserved `example.test` accounts supplied entirely by `e2e/fixture.ts`. The administrator is a test fixture identity, never a client-side grant against a backend. The application has no production test-mode auth bypass. Vite receives explicit localhost test settings; all nonlocal HTTP is blocked, and fixture HTTP/WebSocket traffic is intercepted. Every test resets its data. Reloads and independent contexts verify fixture persistence; SQL tests independently verify actual database authorization/persistence.

Covered journeys include:

- Empty/invalid/unregistered login, student/teacher/admin login, session restoration, delayed role loading, expiration with rejected refresh, protected routes, role denial and logout.
- Catalog search/category/instructor filtering, free enrollment, paid presentation/disabled enrollment, Markdown, local lesson media playback, progress and course/lesson bookmarks across reloads, denied writes, quiz participation/results, assignment submission.
- Teacher draft/edit/module/lesson/document/video metadata authoring, sparse quiz options, assignment creation, publication, submission grading with independent student marks/feedback readback for both `graded` and legacy `reviewed`, other-teacher rejection, tutoring availability and approval/rejection.
- Community post/comment/reply persistence; course discussion creation.
- Two-context tutoring and live learning, microphone denial, local peer media/chat/controls/hand raising and session lifecycle.
- Administrator user/course search, teacher-request approval, course review, confirmed role grants, server pagination and moderation.
- Public screens at **375, 768, 1024 and 1440px**; role screens at **375 and 768px**; English/Bangla team section, themes and basic keyboard focus.

This is scenario coverage, not exhaustive coverage of every permutation, physical device, browser or screen-reader interaction. SQL tests cover additional permission boundaries: fabricated grades, answer leakage, private content, storage ownership, role lockout, badges/notifications, paid/draft enrollment, reservations and authenticated live identities.

## Artifacts and failure handling

- `playwright-report/index.html`: local HTML report.
- `test-results/results.json`: machine-readable execution result.
- `test-results/**/browser-events`: attached console/HTTP/request failures, including expected negative-test responses. Unexpected runtime errors and HTTP failures fail tests.
- Failure PNG and `trace.zip`: retained automatically on failure. `npx playwright show-trace <path>` opens a trace.
- Passing screenshots: home/team across four widths, student assignment, role screens, teacher/student live views.
- `docs/screenshots/`: selected inspected passing examples for reviewers; all data is disposable.
- `artifacts/*browser-run/`: earlier local failure evidence, intentionally ignored by Git.

The HTML report, traces, dependency caches, browser storage and generated artifacts are ignored. The suite owns and shuts down its Vite server and browser contexts. No cleanup command targets real databases or accounts.

## Real Supabase staging acceptance

`playwright.staging.config.ts` and `e2e/staging/` are separate from default intercepted tests and from `verify`. No HTTP/WebSocket routes are mocked. The authorized run on 27 October passed **all 16** against the real disposable backend. Without opt-in, `npm run test:e2e:staging` still starts no application server and reports **16 skipped**; that discovery result is not an acceptance pass.

An authorized operator must approve a disposable project containing only test data, run the [migration plan](docs/STAGING_MIGRATION_PLAN.md), and provision/confirm three dedicated identities through trusted staging Auth/SQL mechanisms. Public signup creates students; grant teacher/admin roles only through trusted server tooling. Tests neither provision accounts nor grant roles. A label or hostname cannot independently prove a project is not production; the operator's target review remains required.

Supply the following **process environment** values via protected local secret tooling or an approved staging CI secret store. Do not copy actual values into `.env.example`, source, shell transcripts or a Git-tracked file. The runner intentionally does not load the app's `.env` as authorization.

| Variable | Required external value |
| --- | --- |
| `STAGING_ACCEPTANCE` | Exact opt-in `disposable-project-approved` |
| `STAGING_SUPABASE_URL` | Approved HTTPS origin only, without path/query/user information |
| `STAGING_ALLOWED_HOST` | Exact separately checked host (including port, if applicable) matching that origin |
| `STAGING_PUBLIC_KEY` | Public `sb_publishable_*` or legacy `anon` JWT; secret/service keys rejected |
| `STAGING_STUDENT_EMAIL`, `STAGING_STUDENT_PASSWORD` | Dedicated confirmed student (no teacher/admin role) |
| `STAGING_TEACHER_EMAIL`, `STAGING_TEACHER_PASSWORD` | Dedicated confirmed teacher (no admin role) |
| `STAGING_ADMIN_EMAIL`, `STAGING_ADMIN_PASSWORD` | Third distinct confirmed administrator |
| `STAGING_FUNCTIONS` | Optional `enabled` only after both new Edge Functions are configured and deployed in the approved disposable target |
| `STAGING_REALTIME` | Optional `enabled` only after hosted private-only settings and complete policy review |
| `E2E_BROWSER_CHANNEL` | Optional `chromium`; defaults to installed `chrome` |

Once those externally managed values are present:

```sh
npm run test:e2e:staging -- --list  # discovers scenarios; does not verify services
npm run test:e2e:staging           # AUTHORIZED DISPOSABLE STAGING ONLY: mutates test data
```

The suite owns a loopback Vite server on **18081**, does not reuse another server, and passes only the selected public backend settings to Vite. It checks distinct account IDs and actual server roles before any writes. Ordinary teacher JWTs create UUID-scoped courses/modules/lessons/quizzes/assignments; the student enrolls, completes a lesson, submits a server-graded quiz and assignment; teacher grades and student reloads; admin UI access/logout and cross-user denials are checked. Storage verifies upload/sign/download, private public-read denial and cross-owner upload denial. Realtime has a separate opt-in and verifies a real private subscription, server-stamped reception and teacher-event spoof rejection.

Traces, screenshots and video are disabled for this suite. Form credentials avoid Playwright fill-argument logging. Keep ignored reports restricted anyway: assertion failures can reveal identity/record metadata. An ignored `artifacts/staging/staging-acceptance-*.json` manifest (created before writes with restricted file permissions) records exact IDs/object path for partial-run recovery. Cleanup deletes only run-owned objects and exact-ID courses; trigger-generated notifications and Auth identities remain operator cleanup. Never delete by a broad prefix across accounts. Reports are `artifacts/staging-results.json`; default fixture reports remain separate.

The approved disposable run passed all 16 with actual role credentials and both optional service gates enabled. A future run without Realtime/function opt-in still skips those scenarios and cannot claim complete subset acceptance. Manual second-student/teacher isolation, all-bucket MIME/size/expiry checks, actual email/OAuth, broader hosted concurrency, physical media/TURN, screen share and recording remain outside this automated subset. The separate PDF diagnostic additionally verified live session revocation at the server handler.

## Release acceptance still required

Complete [STAGING_ACCEPTANCE_CHECKLIST.md](docs/STAGING_ACCEPTANCE_CHECKLIST.md) and the migration/backup/restore plan before release review. Re-run dependency audits at acceptance; the dated final snapshot is `docs/dependency-audit.json`, with package applicability/patch rationale and all nine retained lint warnings in [SECURITY_RESOLUTION.md](docs/SECURITY_RESOLUTION.md). No production database, user data, account, provider setting or deployment was touched.


## Phase 3 feature evidence

The final suite adds desktop **1440px** and mobile **375px** student/teacher tutoring discovery, independent confirmation, conflict denial, private meeting access and cancellation. It completes course lessons/quizzes/graded assignments before obtaining an authoritative certificate, downloads an actual PDF, extracts its content with `pdftotext`, checks repeated issuance, opens public verification and revokes through an independent administrator context. Guest FAQ/form validation and ticket intake are followed by administrator status/internal-note actions and another user's read denial. Admin course review, user pagination and student role-escalation denial are covered. Existing 27 scenarios remain, adapted for mandatory confirmation and course review.

The browser services are still intercepted fixtures. `e2e/phase3-fixture.ts` reuses the **actual shared PDF generator and support HTTP handler/proof logic**, with synthetic authorization/storage adapters. The real database tests separately enforce all eligibility/roles/RLS/state transitions. Neither layer proves hosted PostgREST serialization, actual JWT verification, gateway configuration, static-file deployment or service-key scope.

New colocated unit tests cover timezone conversion including DST gaps/folds, overlap boundaries, accurate searchable FAQ, clearing stale public certificate results, bounded support validation/proof/JWT association/quotas/errors, A4 PDF generation, supported Bangla/English names and download authorization. SQL tests cover all learning prerequisites, trusted automatic/idempotent issuance, revocation/course removal, recurring availability, cross-participant conflicts, elapsed completion, cancellation history, roles/final-admin protection, approval, audited moderation/report totals, private support and reopening. `tests/phase3-preflight.sql` is read-only and is also syntax-executed locally against the pre-Phase-3 schema.

### Independent PostgreSQL connections

```sh
# Optional existing PostgreSQL 18 binaries; never point this at a server or data directory.
LOCAL_POSTGRES_BIN=/path/to/postgresql/bin npm run test:concurrency
```

The test creates, migrates, seeds, stops and removes **its own temporary cluster**, exclusively through a private Unix socket, with no TCP listener. No `.env`/`DATABASE_URL` is read. Four races check same-slot competing confirmations, the same student across overlapping tutors, simultaneous last-admin removal at READ COMMITTED, and a stale REPEATABLE READ role snapshot. All four passed, reported as **one Node integration test**, not four additional unit tests. Supabase Auth/Storage/Realtime remain explicit SQL shims. Without the binary opt-in the test skips, visibly.

This phase used PostgreSQL **18.4**, acquired temporarily through `@embedded-postgres/linux-x64@18.4.0-beta.17`; that package is not a project dependency. It is a local race rehearsal, not hosted database/service acceptance.

### Actual Deno compatibility

With Deno **2.9.6** installed independently:

```sh
deno check --frozen --config supabase/functions/deno.json supabase/functions/certificate-pdf/index.ts supabase/functions/support-contact/index.ts supabase/functions/course-assistant/index.ts
deno run --frozen --config supabase/functions/deno.json --allow-read=supabase/functions/_shared/fonts --allow-write=artifacts/phase3-pdf tests/edge-runtime.mjs
```

The runtime smoke uses synthetic authorization/intake adapters and exercises actual request handling, Web Crypto, proof generation, a Bangla PDF, and outsider download denial. It writes only an ignored local PDF. It does not load environment credentials, contact Supabase, start a public server or deploy anything. Frozen typecheck and runtime execution passed. The 399,735-byte synthetic Bangla sample was rendered with `pdftoppm` and inspected: the maintained font engine plus explicit glyph positioning fixes Indic marks/conjuncts. Fonts are fully embedded because pdf-lib 1.x's subset-stream API differs from modern fontkit; no PDF/font code enters the SPA. English PDF text is extraction-tested; Bangla Unicode extraction order is not guaranteed.

`supabase/functions/deno.lock` records the separate Edge graph. All **31 package-version entries across 29 names** were submitted to npm's bulk-advisory endpoint, grouping duplicate versions per package rather than overwriting them. It returned `{}`. This is a dated known-advisory check, not a guarantee of application security; root `npm audit --omit=dev` alone does not cover the production Edge graph.

### Failures repaired and retained evidence

The initial full Phase 3 browser run reported **26 passed / 8 failed**. Subsequent focused runs reported **4/4**, **2/2** and **0/1** pass/fail while selectors, fixture timestamps and independent-role context setup were repaired. They also exposed a genuine 375px course certificate-control overflow, now fixed. Traces/screenshots are preserved under ignored `artifacts/phase3-initial-browser/`, `phase3-focused-browser/` and `phase3-functions-browser/`. A later full verification run was interrupted with exit 143 after 24 browser passes; no final result was claimed for that partial run, whose log is retained in artifacts/phase3-verification/interrupted-verify.txt. The following immediate full retry passed source/database/build checks but the browser server found the test port still occupied; after it was released, the entire Chrome suite passed separately. Final suite counts above are the final component results, not a sum of all reruns.

The original font adapter first failed the Bangla unit generator with a missing regenerator runtime. Actual Deno then exposed unsafe prototype inheritance despite Node passes. The final implementation replaces that adapter with `fontkit@2.0.4`, avoids the incompatible subset API and preserves shaped glyph offsets. These failures were fixed without enabling unsafe prototype behavior. Public verification navigation now clears an old result before processing another token, covered by a regression test. The standalone Deno script and PostgreSQL race counts are reported separately from Vitest/PGlite/Chrome.

Selected Phase 3 screenshots, using synthetic data, are in `docs/screenshots/phase3-*`. The feature guide documents workflow bounds, unsupported account suspension/payments/email delivery, required Edge configuration and the sixteen blocked hosted scenarios. No production-readiness claim follows from local success.

The 34-scenario full browser run passed. Screenshot inspection then found that independent contexts in the new mobile-labeled flows used the default desktop viewport. All feature contexts now explicitly inherit 375/1440px; a separate seven-scenario recheck verifies the real widths. That review exposed SH-032 (squeezed mobile admin search), repaired with stacked controls and a browser assertion requiring a usable input width. The final seven-scenario run is recorded separately, without counting duplicate scenarios as 41 unique tests.

## Modernization regressions

Five new browser scenarios in `e2e/modernization.spec.ts` load actual local artwork, exercise both themes and mobile controls, and enroll before testing assistant JWT/SSE rendering at 375px/1440px. The extra chart scenario hovers real rendered bars for independent 100%/50% course rates. Completion-badge tests use authoritative certificate counts and reject failed award writes. The server handler tests use only synthetic provider responses and independently verify caller authorization, bounded messages/course context, HTTPS configuration and generic upstream errors. Component tests reject signed-out assistant calls and recover broken course thumbnails. Theme tests cover storage, system changes, cross-tab notifications and the absence of rendered scripts. Existing SQL and browser journeys remain active; the admin pagination test caught and then verified repair of a debounce migration regression.

Failed upgrade attempts and their corrections are documented in the modernization report and retained in ignored local artifacts. Screenshots were opened and inspected; this does not imply hosted service, physical-device or exhaustive visual/accessibility acceptance. The original main bundle warning was resolved through actual route/analytics splitting, without raising its threshold.

Additional strict tooling checks (TypeScript 6 requires `--ignoreConfig` when explicitly passing files):

```sh
npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --types node tailwind.config.ts vitest.config.ts
```

The complete headless run was followed by a final account-identity guard and five affected-route headless rechecks. Its new home-discovery regression was demonstrated failing before repair and passing afterward; all 81 unit tests pass. The complete headed run and later chart recheck are separate evidence. A prior intermittent reload abort, three unchanged passing stability reruns and the later complete pass are retained in the verification report. The no-binary concurrency command now explicitly skips; it no longer reports a misleading test-file pass.
