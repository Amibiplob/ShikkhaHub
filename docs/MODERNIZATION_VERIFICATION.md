# Modernization verification

27 October 2026, Asia/Dhaka. Baseline commit: `ff94074`, clean `main` worktree, four existing local commits ahead of the last recorded remote branch. Node 24.22.1 / npm 11.19.1. No remote Git operation, deployment, provider configuration, real-account provisioning or production database mutation was performed.

## Executed checks

| Check | Baseline | Final |
| --- | --- | --- |
| TypeScript | Passed, app/tooling/E2E/server configs | Passed; assistant adapter now included in strict server checking |
| ESLint | 0 errors, 9 Fast Refresh warnings | 0 errors, 0 warnings; current Hooks recommended rules enabled |
| Unit/component/server tests | 53 / 16 files | 81 / 21 files |
| Coverage command | Passed; imported-file report | Passed; imported-file report, not whole-app coverage |
| PostgreSQL / PGlite | 46 passed | 46 passed on PGlite 0.5.12; all 41 migration files preserved |
| Independent PostgreSQL | Default command did not execute races without binaries | One actual PostgreSQL 18.4 integration test passed, containing four independent-connection races |
| Production build | Passed with 1.57 MB chunk warning | Passed, no oversized-chunk warning; threshold unchanged |
| Headless Chrome | 34 passed in unchanged temporary checkout | 39 passed, 0 failed/skipped/flaky; five affected-route rechecks passed after the final identity guard |
| Headed Chrome | Not a new baseline claim | 38 passed in complete headed suite; one additional headed analytics scenario passed after its fix |
| npm ci | Existing installed baseline + independent clean baseline install | Passed from final lock, 469 packages installed |
| Full / production npm audits | Zero known findings after registry access was available | Zero known findings in both audits |
| npm ls | Passed | Passed, no invalid peers |
| npm outdated | Inventory queried for all 77 direct packages | Only supported TypeScript 6 and Node 24 types remain behind latest |
| Deno frozen checks | Prior Phase 3 evidence is historical | All three actual Deno 2.9.6 entry-point checks pass |
| Deno runtime smoke | Prior Phase 3 evidence is historical | PDF/Bangla/support/auth denial smoke passes with synthetic adapters |
| Deno locked graph audit | Prior graph: 31 version entries | 29 entries, zero known npm bulk-advisory findings |
| Real Supabase staging | Not authorized/configured | 16 deliberately skipped with opt-in disabled; zero hosted passes |
| Dev HMR / built preview | Vite baseline build/dev served | CSS HMR passed without document reload; production preview /, /courses, /faq, /contact passed; 1400px cap, light/mobile layout and zero console/page errors verified with intercepted backend responses |

Final coverage over imported files: statements **84.99% (725/853)**, branches **76.51% (430/562)**, functions **82.47% (160/194)**, lines **88.34% (644/729)**. The baseline imported-file set differs; these figures are not a comparable application-wide coverage improvement claim.

## Browser coverage and artifacts

The maintained 34 scenarios cover login/signup/expiry/restoration/role denial, public navigation/search, free enrollment/progress/bookmarks, Markdown/media, quizzes/assignments/teacher grading readback, course/module/lesson/quiz authoring and publication review, administrator search/roles/pagination, tutoring availability/booking/conflicts/cancellation, certificates/PDF download/text/verification/revocation, FAQ/support/privacy/internal notes and local two-peer live media/chat/lifecycle. Five added scenarios check the per-course quiz chart, artwork loading, both themes, mobile controls, assistant JWT/streaming and chat viewport bounds at 375px and 1440px. Existing responsive checks also cover 768px and 1024px where applicable.

Actual Chrome executes the SPA and Supabase SDK. Its HTTP/Auth/Realtime/provider responses are intercepted with reserved test identities, random disposable passwords and synthetic data. Actual SQL, shared PDF/support/assistant handlers and Deno have separate engine/runtime tests. None of these replaces hosted Auth/PostgREST/Storage/Realtime/Edge/JWT/gateway acceptance. Expected denial responses are recorded separately; unexpected console/runtime/network errors fail browser tests. No console rule or HTTP assertion was relaxed during modernization. Tests do not load production accounts.

Selected final screenshots: [home-dark-desktop](screenshots/modernization-home-dark-desktop.png) · [home-light-desktop](screenshots/modernization-home-light-desktop.png) · [home-light-mobile](screenshots/modernization-home-light-mobile.png) · [assistant-mobile](screenshots/modernization-assistant-mobile.png)

The original 1440px homepage screenshot and final desktop/mobile captures were opened and compared. This was a visual review of intentionally changed artwork/layout and key workflows, not automated pixel equivalence or a claim of exhaustive visual/accessibility/device certification. The final light/dark views, assistant controls and preserved academic team content were inspected. The complete 39-scenario headless run precedes only the final account-identity guard; that guard then passed its deliberately reproduced unit regression and five affected homepage/header/auth browser rechecks. The complete headed 38-scenario run precedes final static/metric cleanup; a separate headed chart-hover regression verifies the new metric. These are scoped passing runs, not an invented single combined command. The SVG artwork/social PNG were also rendered and opened independently.

Ignored local browser reports/traces/events live under `test-results/`, `playwright-report/` and `artifacts/modernization-*`. The machine-readable result is [modernization-verification.json](modernization-verification.json). Earlier failed attempts remain local evidence, not extra passing scenarios. A browser baseline wrapper received a termination status after its completed report; the unchanged checkout's JSON records 34 expected, zero unexpected/skipped/flaky and no report errors.

## Bundle measurements

Decimal kB as reported by Vite, production minified output:

| Output | Before | After |
| --- | --- | --- |
| Main entry JavaScript | 1,570.42 kB / 436.40 kB gzip | 351.96 kB / 106.31 kB gzip |
| Largest JavaScript chunk | 1,570.42 kB | 380.24 kB (deferred charts) |
| CSS | 79.18 kB / 13.89 kB gzip | 71.78 kB / 12.73 kB gzip |

Main entry reduction is about **77.6%**; this describes one entry file, not total initial transferred bytes. Shared chunks still load when imported. The chart, course Markdown/authoring, live media, administration and other routes are deferred through actual lazy imports. The build warning threshold remains 500 kB. No manual chunk threshold increase hides the original warning. PDF/font generation remains server-only.

## Findings and failed attempts

[BUG_FIX_LOG.md](BUG_FIX_LOG.md), SH-033–SH-044, records the assistant bearer-token defect, missing/broken thumbnails, mobile controls/chat width, React inline-script compatibility, theme transition flash, toast/chat collision, an admin debounce regression, controlled quiz warning and Tailwind container behavior. Existing scenarios were kept and failures repaired before final commits.

Initial restricted network/browser attempts failed for sandbox reasons. npm initially resolved against the old ESLint graph and failed; an empty tree installed compatible peers without force/legacy-peer-deps. A baseline browser run was interrupted by a config edit; the untouched checkout was then reinstalled and completed all 34 scenarios separately. Early focused tests omitted enrollment or modeled only one of multiple system-theme listeners; those test defects were corrected. The first downloaded PostgreSQL launch lacked its bundled library links; actual races passed after setting those up. Temporary-copy HMR attempts hit missing referenced configs and cold optimizer errors; only the final successful runtime result is claimed. One later complete browser attempt had 38 passes and a single `ERR_ABORTED` during a quiz-result page reload; its failure trace is retained. Three unchanged isolated stability runs then passed, followed by a complete 39-scenario pass. No navigation assertion was removed or retried automatically. The optional concurrency command also had a reproduced false default file pass; the isolation setting now makes missing binary support an explicit skip. Intermediate browser failures were preserved, not reported as passes.

## Remaining acceptance and production readiness

**Not cleared for production.** The local modernization is verified; external acceptance remains open:

- Approve a disposable Supabase target, migration/backup/restore plan, dedicated student/teacher/admin identities and real Auth email/recovery/OAuth/session-expiry checks. No existing `.env` value constitutes target authorization.
- Execute hosted RLS/RPC/serialization/Storage/Realtime and concurrency acceptance, including private channels, permissive-policy review, JWT revocation, object expiry/MIME/size and real uploaded-media transport.
- Configure/package/deploy Edge Functions only through a separately authorized rollout; verify PDF fonts, CORS/origins and injected key scope. Support intake is not email delivery.
- Configure the optional independent assistant endpoint/model/key, streaming contract, data handling, provider spend/rate limits and per-user abuse controls before enabling it. Local synthetic handler tests do not prove a live model response.
- Complete physical-device/multi-network WebRTC/TURN, screen-share/recording, cross-browser/accessibility, load/monitoring and operational restoration acceptance. Chrome fixture media is not physical hardware or NAT traversal.
- Supply an approved hosting domain, SPA fallback and absolute canonical/social URLs. Paid entitlement/payment gateways, accredited certificates, native apps and complete translation remain outside implemented acceptance claims.

All 41 Supabase migrations, generated database types, historical Drizzle adoption files, academic names, actual credentials and existing public data contracts are preserved. The only remaining vendor strings are intentional development-history/dependency-inventory references. See the upgrade, cleanup and asset reports for the full inventory.

Implementation commit: `bfe833bd2aa8d176ce030d69253b0a5fb281bcc8`. Documentation commit and final clean working-tree status are reported in the completion response; no push/deployment follows these local commits.
