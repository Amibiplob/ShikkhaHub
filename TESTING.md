# ShikkhaHub testing

Verification date: **27 October 2026, Asia/Dhaka**. Exact final results are recorded in [`docs/verification.json`](docs/verification.json). The final command transcript is summarized in the audit report; no coverage percentage is claimed.

## Recorded final results

| Check | Result |
| --- | --- |
| `npm run verify` | Passed, exit 0 |
| TypeScript | Application, tooling and browser-test configs passed |
| ESLint | 0 errors, 9 documented Fast Refresh warnings retained; 12 hook warnings fixed |
| Vitest | 35 tests passed in 11 files (includes six staging target safeguards) |
| PostgreSQL WASM integration | 31 tests passed, including six new migration/adoption/recovery regressions |
| Production build | Passed; large-chunk warning retained |
| Headless Chrome | 27 passed, 0 failed/skipped/flaky |
| Real Supabase staging suite | 11 blocked/skipped; no real-service passes |
| Vitest coverage integration | Passed, 35 tests; imported-file report only, no global coverage claim |
| Visible Chrome recheck | Not rerun in Phase 2; Phase 1 had three passes |
| Full dependency audit | Exit 0; zero known findings on final lock |
| Production-only audit | Exit 0; zero known findings on final lock |
| Diff/secret-pattern checks | Passed; actual `.env` unchanged |

Phase 1 screenshot/hot-reload and network-interruption artifacts remain historical evidence. Phase 2 reproduced the student grading-display defect before repairing it; its failing trace/screenshots are retained under ignored `artifacts/phase2-grade-before/`. The extended grading journey now checks student marks/feedback after reload and supports legacy records. Initial restricted-sandbox registry/server attempts failed for environment reasons and were retried with network/loopback permissions. No checks were disabled to hide failures.

## Install and run

Use Node.js 24 and the committed npm lock:

```sh
npm ci
npm run verify
```

`verify` runs app/tooling/browser-test TypeScript, ESLint, Vitest, PostgreSQL WASM integration tests, a production build, then real headless browser tests. It does not run migrations against `.env`, create remote accounts, deploy or push.

```sh
npm run test                 # colocated unit/component tests
npm run test:watch
npm run test:coverage        # optional; not part of the recorded counts
npm run test:db              # isolated migration/RLS/constraint/RPC tests
npm run test:e2e             # real Chrome; starts/waits/stops local Vite itself
npm run test:e2e:headed      # same suite with visible browser (DISPLAY required)
npm run typecheck
npm run lint
npm run build
npm audit                   # dated known-advisory check, currently exits 0
npm audit --omit=dev         # production install classification, currently exits 0
npm run test:e2e:staging     # external approved target only; otherwise 11 blocked/skipped
```

The default browser channel is installed Google Chrome. Phase 2 executed headless Chrome; headed Chrome results belong to Phase 1 only. CI uses downloadable Chromium:

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

Historical migrations replay into an empty disposable database. Six additional migration tests rehearse existing academic records/teacher requests, duplicate-failure atomicity, malformed legacy JSON, deferred validation, unknown broad Realtime policies and duplicate replay. `tests/staging-preflight.sql` is exercised against a legacy fixture; no hosted preflight was run. The migration that only installs `pg_cron`/`pg_net` is explicitly skipped because these hosted extensions are unavailable in WASM. Test schemas provide `auth.uid`, Storage tables and Realtime topic/send shims; service behavior is not silently substituted as hosted proof. Database tests use Node's `--test-isolation=none` to avoid the WASM worker/isolated test-process issue observed with Node 24.

## Browser coverage

The suite uses ephemeral generated passwords and reserved `example.test` accounts supplied entirely by `e2e/fixture.ts`. The administrator is a test fixture identity, never a client-side grant against a backend. The application has no production test-mode auth bypass. Vite receives explicit localhost test settings; all nonlocal HTTP is blocked, and fixture HTTP/WebSocket traffic is intercepted. Every test resets its data. Reloads and independent contexts verify fixture persistence; SQL tests independently verify actual database authorization/persistence.

Covered journeys include:

- Empty/invalid/unregistered login, student/teacher/admin login, session restoration, delayed role loading, expiration with rejected refresh, protected routes, role denial and logout.
- Catalog search/category/instructor filtering, free enrollment, paid presentation/disabled enrollment, Markdown, local lesson media playback, progress and course/lesson bookmarks across reloads, denied writes, quiz participation/results, assignment submission.
- Teacher draft/edit/module/lesson/document/video metadata authoring, sparse quiz options, assignment creation, publication, submission grading with independent student marks/feedback readback for both `graded` and legacy `reviewed`, other-teacher rejection, tutoring availability and approval/rejection.
- Community post/comment/reply persistence; course discussion creation.
- Two-context tutoring and live learning, microphone denial, local peer media/chat/controls/hand raising and session lifecycle.
- Administrator user/course search, teacher-request approval and moderation view.
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

## Real Supabase staging acceptance (prepared, not executed against a backend)

`playwright.staging.config.ts` and `e2e/staging/` are separate from default intercepted tests and from `verify`. No HTTP/WebSocket routes are mocked in this suite. Without opt-in, `npm run test:e2e:staging` starts no application server and reports **11 skipped**. This exit-0 discovery result is not an acceptance pass.

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
| `STAGING_REALTIME` | Optional `enabled` only after hosted private-only settings and complete policy review |
| `E2E_BROWSER_CHANNEL` | Optional `chromium`; defaults to installed `chrome` |

Once those externally managed values are present:

```sh
npm run test:e2e:staging -- --list  # discovers scenarios; does not verify services
npm run test:e2e:staging           # AUTHORIZED DISPOSABLE STAGING ONLY: mutates test data
```

The suite owns a loopback Vite server on **18081**, does not reuse another server, and passes only the selected public backend settings to Vite. It checks distinct account IDs and actual server roles before any writes. Ordinary teacher JWTs create UUID-scoped courses/modules/lessons/quizzes/assignments; the student enrolls, completes a lesson, submits a server-graded quiz and assignment; teacher grades and student reloads; admin UI access/logout and cross-user denials are checked. Storage verifies upload/sign/download, private public-read denial and cross-owner upload denial. Realtime has a separate opt-in and verifies a real private subscription, server-stamped reception and teacher-event spoof rejection.

Traces, screenshots and video are disabled for this suite. Form credentials avoid Playwright fill-argument logging. Keep ignored reports restricted anyway: assertion failures can reveal identity/record metadata. An ignored `artifacts/staging/staging-acceptance-*.json` manifest (created before writes with restricted file permissions) records exact IDs/object path for partial-run recovery. Cleanup deletes only run-owned objects and exact-ID courses; trigger-generated notifications and Auth identities remain operator cleanup. Never delete by a broad prefix across accounts. Reports are `artifacts/staging-results.json`; default fixture reports remain separate.

Currently blocked: all 11 real scenarios because no approved target or external role credentials were supplied. A configured run without Realtime opt-in will still skip its Realtime scenario and cannot be described as complete acceptance. Source/type/safeguard checks and no-credential discovery do not prove selectors or service contracts work against hosted Supabase. Manual second-student/teacher isolation, full Storage bucket/MIME/size/expiry checks, Auth email/OAuth/revocation, tutoring/concurrency, physical media/TURN, screen share and recording remain outside this prepared subset.

## Release acceptance still required

Complete [STAGING_ACCEPTANCE_CHECKLIST.md](docs/STAGING_ACCEPTANCE_CHECKLIST.md) and the migration/backup/restore plan before release review. Re-run dependency audits at acceptance; the dated final snapshot is `docs/dependency-audit.json`, with package applicability/patch rationale and all nine retained lint warnings in [SECURITY_RESOLUTION.md](docs/SECURITY_RESOLUTION.md). No production database, user data, account, provider setting or deployment was touched.
