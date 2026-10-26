# ShikkhaHub testing

Verification date: **26 October 2026, Asia/Dhaka**. Exact final results are recorded in [`docs/verification.json`](docs/verification.json). The final command transcript is summarized in the audit report; no coverage percentage is claimed.

## Recorded final results

| Check | Result |
| --- | --- |
| `npm run verify` | Passed, exit 0 |
| TypeScript | Application, tooling and browser-test configs passed |
| ESLint | 0 errors, 21 warnings retained |
| Vitest | 29 tests passed in 10 files |
| PostgreSQL WASM integration | 25 tests passed |
| Production build | Passed; large-chunk warning retained |
| Headless Chrome | 27 passed, 0 failed/skipped/flaky |
| Visible Chrome recheck | 3 passed |
| Full dependency audit | 14 findings: 2 critical, 2 high, 10 moderate |
| Production-only audit | 4 findings: 1 high, 3 moderate, 0 critical |
| Diff/secret-pattern checks | Passed; actual `.env` unchanged |

An earlier screenshot was detached during a development hot reload, and another run captured a host `ERR_NETWORK_CHANGED` event. Both traces were preserved; the final stable run passed without suppressing those failure checks.

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
npm audit                   # advisory findings remain; intentionally nonzero
```

The default browser channel is installed Google Chrome. This audit executed both headed and headless Chrome. CI uses downloadable Chromium:

```sh
npx playwright install --with-deps chromium
E2E_BROWSER_CHANNEL=chromium npm run test:e2e
```

`python3 e2e/smoke_e2e.py` is a compatibility wrapper around the maintained TypeScript public-route suite. Python Playwright is no longer required. Port 8080 must be free: the test configuration refuses to reuse an arbitrary running server.

## Evidence boundaries

| Layer | Actual execution | What it does not prove |
| --- | --- | --- |
| Vitest + Testing Library | Real component rendering, role guards, auth race/failure cleanup, language dictionaries, sorting, signed-link behavior and analytics scoping | Deployed services or browser rendering |
| PostgreSQL WASM / PGlite | Real PostgreSQL SQL engine, ordered migration replay, RLS under anon/authenticated roles, constraints, triggers, grading/RPCs and negative authorization | GoTrue/JWT verification, PostgREST translation, real Storage/Realtime transport, PostgreSQL extensions or multi-connection races |
| Playwright + Chrome | Actual SPA, Supabase SDK, typing/clicks, browser storage/restoration/reload, independent contexts, responsive screens and WebRTC peer media | Authentication/PostgREST/Realtime service contracts are intercepted by deterministic fixtures; no real-provider account or production data verification |
| Live browser test | Real peer connections and decoded media in two contexts with Chrome fake devices, chat/raise-hand/leave/rejoin/end | Hosted signaling, physical microphone/camera, TURN/NAT traversal, multi-network scale, screen share or recording acceptance |
| Optional GitHub Actions | Secret-free workflow definition committed | GitHub execution was not triggered; remote CI is unverified |

Historical migrations replay into an empty disposable database. The migration that only installs `pg_cron`/`pg_net` is explicitly skipped because these hosted extensions are unavailable in WASM. Test schemas provide `auth.uid`, Storage tables and Realtime topic/send shims; service behavior is not silently substituted as hosted proof. Database tests use Node's `--test-isolation=none` to avoid the WASM worker/isolated test-process issue observed with Node 24.

## Browser coverage

The suite uses ephemeral generated passwords and reserved `example.test` accounts supplied entirely by `e2e/fixture.ts`. The administrator is a test fixture identity, never a client-side grant against a backend. The application has no production test-mode auth bypass. Vite receives explicit localhost test settings; all nonlocal HTTP is blocked, and fixture HTTP/WebSocket traffic is intercepted. Every test resets its data. Reloads and independent contexts verify fixture persistence; SQL tests independently verify actual database authorization/persistence.

Covered journeys include:

- Empty/invalid/unregistered login, student/teacher/admin login, session restoration, delayed role loading, expiration with rejected refresh, protected routes, role denial and logout.
- Catalog search/category/instructor filtering, free enrollment, paid presentation/disabled enrollment, Markdown, local lesson media playback, progress and course/lesson bookmarks across reloads, denied writes, quiz participation/results, assignment submission.
- Teacher draft/edit/module/lesson/document/video metadata authoring, sparse quiz options, assignment creation, publication, submission grading, other-teacher rejection, tutoring availability and approval/rejection.
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

## Release acceptance still required

Use an authorized staging project and credentials supplied through local environment/secret tooling for real provider tests. Do not point mutation tests at production. Complete the [database rollout](docs/DATABASE_ROLLOUT.md), real email/recovery/OAuth, Storage and signed-URL lifetime tests, hosted Realtime policies/private-only settings, physical-device/TURN and screen-sharing/recording tests, and remaining dependency/security review. Current runtime/dev advisory details are in `docs/dependency-audit.json`.
