# ShikkhaHub stabilization and staging audit

**Phase 2: 27 October 2026 (Asia/Dhaka). Local preparation complete; real Supabase acceptance remains blocked.** Both npm audits report zero known findings. Twelve hook warnings were fixed; nine documented Fast Refresh warnings remain. The original 33-page university report was located and inspected. No push, deployment, production migration, real account provisioning or provider configuration occurred.

## Basis and scope

Verified local history: `6ad01db` (implementation) and `41ab799` (documentation/evidence). The initial working tree already contained Phase 2 dependency, hook, migration-test and staging-test work. These task-related changes were reviewed, preserved and verified; the existing application architecture and original `.env` were preserved. No unrelated files or secret-bearing browser artifacts are included in the local commit.

Phase 1's evidence is retained as historical data in `verification.json` and `dependency-audit.json`: 29 unit/component + 25 PostgreSQL + 27 fixture-browser scenarios, 21 lint warnings, 14 full dependency package findings and four production package findings. Its three headed rechecks are historical, not Phase 2 execution.

The app remains a React 18/TypeScript/Vite SPA with React Router, Tailwind/shadcn, Query and Supabase. The Phase 2 security updates move to Vite 6, Router 7 and Vitest/coverage 4 without changing framework architecture. Focused discovery sections keep `Index.tsx` as composition. Canonical migrations remain `supabase/migrations/`; historical Drizzle SQL stays as reference/adoption evidence, while the unused CLI/config/dependencies were removed.

## University report and demonstration

`/home/biplob/Downloads/ShikkhaHub_Report.pdf` contains 33 pages, SHA-256 `3e357ac98f4425ca86a53cc31326d6190017a91dee02bce152e307810c406477`. Extracted text and rendered pages were inspected, including all diagrams/screenshots. The matrix now cites exact sections, printed pages and physical PDF pages for roles, authentication, courses, enrollment/progress, assessments, tutoring, live classes, community, administration, schema, attribution and every nonfunctional requirement. The original PDF/student IDs remain outside Git.

Material discrepancies: §3.3's resource-oriented ER figure does not depict this LMS; §3.5's conceptual schema differs from the actual Auth/roles/modules/JSON-assessment model; §3.7 lists Next.js but the source is a Vite SPA. The abstract's Zod integration and deployed-provider claims are not current source/live evidence. Report screenshots use earlier CodeCampus branding and historical content. Current home, mobile team and assignment captures were compared with the existing labeled fixture examples and agree with the current interface; no screenshot is presented as real-provider acceptance.

The public team names/title/supervisor agree with the cover; no student IDs are exposed in the team UI. Payments appear in requirements and in §5.2 future work: the matrix records the missing gateway, paid entitlements, discounts and payment admin without adding simulated purchases. Admin course approval is missing; tutoring is a slot/request/private-link MVP. AI scoring, mobile apps and automated certification remain future work. Existing deterministic SQL grading, partial Bangla/English UI and platform-generated completion images do not establish those future capabilities.

## Application repairs and lint

The 25 Phase 1 defect groups remain in `BUG_FIX_LOG.md`. Phase 2 identified **SH-026**: teacher grading writes `graded`, while the student marks/feedback panel only accepted legacy `reviewed`. An independent student readback regression failed before repair. The one-line render condition now supports both statuses, preserving historical rows and SQL authorization.

Twelve hook-dependency warnings were resolved using stable callbacks/complete dependencies, direct role computation and captured peer cleanup. Nine Fast Refresh mixed-export warnings remain intentionally: seven existing shadcn UI modules and the Auth/Language provider-hook modules. They affect development refresh boundaries; no hook warning, runtime error or lint rule was suppressed. Exact files/reasons appear in `SECURITY_RESOLUTION.md`.

## Dependency security

All 14 prior package/meta findings were investigated by installed version, dependency path, applicability and patch/removal option. The production high finding was unused Zod; it and unused resolvers were removed. Router 7.18.2 addresses the remaining navigation/SSR advisory range; Vite 6.4.5 and Vitest/coverage 4.1.12 address affected dev/mock/worker dependencies. Unused Drizzle loader tooling and unregistered Typography were removed, and Tailwind's existing range now resolves parser 6.1.5. Production CSS hash stayed `index-CJDFYpOZ.css` across removal, confirming the plugin was not active.

Full and production-only `npm audit` both exit 0 with zero known findings on the final lock. Latest old-major branches were still affected, so the three scoped branch upgrades were necessary; npm's larger Vite 8/Vitest 5 jumps were avoided. No ignore, blanket override or forced audit fix was used. Compatibility evidence includes types, build, unit/coverage and complete Chrome workflows. Dated registry results do not establish the absence of undisclosed vulnerabilities, application authorization flaws or provider misconfiguration.

## Seven-migration review

All seven October SQL files were reviewed and left unchanged from `6ad01db`. `STAGING_MIGRATION_PLAN.md` covers dependencies/order, existing data, grants/RLS and OR-policy conflicts, ownership, constraints, object/index collisions, locks, object paths, safe application and recovery. `tests/staging-preflight.sql` inventories blockers in a read-only transaction. The old documentation JSON-array check was corrected to handle malformed legacy objects safely.

Six added PostgreSQL regressions cover preflight safety, legacy teacher-request adoption/academic record preservation, four deferred-constraint validations, atomic duplicate-submission failure, malformed legacy quiz repair, surviving broad Realtime policies and duplicate-replay rejection (some scenarios combine related checks). The local tests demonstrate that unknown permissive policies survive and can defeat restrictive ones: hosted policy review is a required gate. Unique-index creation intentionally rejects duplicate submissions rather than deleting academic work.

All **31 PostgreSQL WASM tests pass**. Auth identity/roles, Storage tables and Realtime topic/send functions are explicit shims. Historical `pg_cron`/`pg_net` installation is skipped because extensions are unavailable in WASM. This does not verify hosted migration roles/extensions, real JWTs/PostgREST, object bytes, Realtime authorization caching or multi-connection races. No hosted migration ran and the remote migration ledger was not queried.

## Real Supabase tests and verification boundaries

The separate opt-in suite prepares 11 scenarios: three role login/reload/logout journeys, private/draft denial, teacher course edit, enrollment/progress, quiz integrity, submission/grading/student readback, cross-user access, real Storage and separately enabled private Realtime. It uses ordinary authenticated JWTs, no service-role provisioning or client role grant. Credentials/approved exact host are external; account creation and staff roles require trusted staging mechanisms. Browser traces/video/screenshots are disabled, credential entry avoids fill-call credential logging, and a private ignored manifest records exact cleanup IDs before writes. Cleanup targets only this run's objects/courses; trigger notifications and identities require a staging operator.

No approved target or role credentials were supplied: **11 skipped/blocked, zero real-service passes**. The default browser suite never reads those credentials and intercepts backend HTTP/WebSockets at a localhost endpoint. It executes the actual SPA/SDK, navigation, form operations, reloads and browser persistence across contexts. Live tests use actual local peer connections/fake media but simulated signaling. SQL tests independently execute policies/constraints/RPCs. Neither layer substitutes for real Auth, Storage, PostgREST, Realtime or physical-device acceptance.

Current executed results and artifacts are in [TESTING.md](../TESTING.md) and [verification.json](verification.json). Required checks cover TypeScript, ESLint, unit/component, PostgreSQL, production build, local Chrome, dependency audits and Git diff/secret-pattern review. Coverage integration was also executed to validate the upgraded coverage package; its imported-file report is not an application-wide coverage claim. A new grading-display failure was deliberately reproduced and retained before repair. Initial sandbox-only registry/server failures were retried with the required network/loopback permissions; they are environment failures, not successful checks. Remote CI and headed Chrome were not rerun in Phase 2.

## Release blockers and handoff

**Not production-cleared.** External work remains:

1. Identify/approve disposable Supabase staging, trusted migration credentials, three isolated test identities and Auth origins/redirects. Never infer staging authority from the existing `.env`.
2. Complete read-only preflight, backup/restore rehearsal, migration ledger/schema/policy review and seven-file staging rollout. Resolve duplicate/orphan/malformed rows, intended price backfill, deferred constraints, missing buckets and legacy object paths.
3. Run the real suite and manual second-student/second-teacher matrix. Verify real email/recovery/OAuth, JWT expiry/revocation, named profile joins/RPC serialization, all private Storage buckets/MIME/size/expiry and tutoring/role concurrency.
4. Enforce private-only Realtime and review all permissive policies/publications. Validate outsider/direct-send rejection and cached receiver revocation. Test physical-device/multi-network WebRTC, TURN, screen share and recording. No TURN relay is configured.
5. Complete provider/operational monitoring, cron expiry, abuse/rate controls, optional AI Deno/provider/cost acceptance, hosted backup restoration, load/performance and accessibility/device/browser review. The production build retains its large-chunk warning.
6. Keep missing/future/report discrepancies explicit: paid entitlements, course approval, advanced Q&A, assessment timing/versioning, full translation, certificate accreditation and native apps are not completed acceptance claims.

Updated README, TESTING, audit report, requirements matrix, bug log, rollout notes and demo guide; added security resolution, staging migration plan, acceptance checklist and supporting tests. This handoff authorizes no deployment, push, production connection or remote data mutation. The completion response reports the reviewed local commit and final working-tree status.
