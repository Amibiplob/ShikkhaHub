# ShikkhaHub — An Online Based Educational Platform

ShikkhaHub is a final-year CSE project at City University, Bangladesh. Students discover courses, learn through structured lessons, complete assessments, discuss course material, and request private tutoring. Teachers manage courses, assessments, tutoring availability, and live broadcasts. Administrators manage roles and moderate the platform.

This repository originated in Lovable and is maintained locally. It uses **React 18, TypeScript, Vite 6, React Router 7, Tailwind CSS, shadcn/ui, TanStack Query, and Supabase**. It is a browser SPA, not a Next.js or Express application.

## Features and roles

- **Public:** course search, category/difficulty/instructor filters, course descriptions, community, aggregate leaderboard, tutor profiles/availability, English/Bangla landing page, themes, academic attribution.
- **Student:** email/password accounts, profile editing, recovery screen, free enrollment, Markdown/video/document lessons, progress, course and lesson bookmarks, server-graded quizzes, assignment submissions, discussions, tutoring requests and approved meeting access.
- **Teacher:** admin-approved access, draft course creation/editing/publication, modules and lessons, uploads, quizzes, grading, student progress, live scheduling and broadcasts, tutoring approval/rejection.
- **Administrator:** role grants/removal, teacher-request review, user/course search, platform counts, course deletion and community moderation.
- **Existing experimental features:** browser-generated certificates/badges, recording, and a provider-dependent AI assistant. These are not claims of accredited certification or verified live-provider acceptance.
- **Payments:** BDT prices can be presented; self-enrollment is restricted to free courses. No payment gateway, simulated purchase, or paid entitlement service is supplied.

## Architecture

`src/pages/` composes routed screens; `src/components/` contains presentation and workflow components. `AuthContext` waits for account roles before granting protected-route access. Browser requests use the public Supabase key and user JWT. PostgreSQL RLS, constraints, triggers and narrow RPCs enforce ownership, assessment integrity and private content access. Storage uses private buckets and short-lived signed URLs. WebRTC carries live media; Supabase private Realtime topics receive signals sent through an authenticated RPC.

`supabase/migrations/` is the canonical database history. `drizzle/` retains the historical teacher-request migration and empty generated schema as reference only. Supabase migrations adopt that table. The unused Drizzle CLI/config and database client dependencies have been removed; use the canonical Supabase migration history.

## Local setup

Use Node.js 24 and npm. `package-lock.json` is authoritative; stale Bun locks were removed.

```sh
npm ci
cp .env.example .env.local
# Fill .env.local with a disposable Supabase project's public configuration.
npm run dev
```

Vite serves on port 8080. A graphical desktop and installed Google Chrome are used by the default browser tests. To use downloaded Chromium instead:

```sh
npx playwright install chromium
E2E_BROWSER_CHANNEL=chromium npm run test:e2e
```

Environment variable names:

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon/publishable key; RLS remains mandatory |
| `VITE_SUPABASE_PROJECT_ID` | Legacy project identifier, if required by local tooling |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY` | Server-side Edge Function configuration for the optional assistant |
| `E2E_BROWSER_CHANNEL` | Test browser channel, defaults to `chrome` |

Never put a service-role key in the frontend. Existing `.env` contents were preserved; `.env.local` takes precedence. The browser suite overrides the backend URL and key with an isolated localhost endpoint and intercepts its HTTP/WebSocket traffic; it does not create real accounts or contact the configured project.

## Supabase setup

1. Create an explicitly disposable project or local Supabase stack. Apply `supabase/migrations/` in timestamp order using the Supabase CLI. Do not apply `drizzle/migrations/` a second time on a new project.
2. Inspect [migration rollout notes](docs/DATABASE_ROLLOUT.md) before applying the October repairs to existing data. Duplicate submissions and historical storage paths need human review. Local WASM tests do not verify hosted Storage, Auth, extensions or Realtime services.
3. Configure Auth email confirmation/recovery redirects for your exact local/hosted origin and `/reset-password`. Google OAuth requires a separately approved test provider setup.
4. Provision the first administrator through trusted server/SQL tooling in the disposable project. Public signup always creates a student. A teacher checkbox records a request; an administrator approves it through an atomic RPC.
5. Enforce private-only channels in Supabase Realtime settings. Review other existing Realtime policies; permissive policies combine with OR. New application live topics only receive messages; `send_live_signal` authorizes and stamps outgoing identities.
6. Existing private files need canonical course/class paths. Do not reopen buckets to recover access. For optional AI, deploy the repaired user-JWT-scoped function only after provider quota/rate-limit and live acceptance review.

## Commands

```sh
npm run dev                  # development server
npm run typecheck            # app + tooling + browser-test TypeScript
npm run lint                 # ESLint; nine Fast Refresh warnings documented
npm run test                 # colocated Vitest unit/component tests
npm run test:db              # disposable PostgreSQL WASM migration/RLS integration tests
npm run test:e2e             # starts/stops Vite and executes real Chrome headlessly
npm run test:e2e:headed      # visible Chrome; requires a display
npm run test:e2e:staging     # real Supabase; explicit external opt-in, otherwise skips
npm run test:coverage        # local Vitest coverage, no claimed percentage
npm run build               # production assets in dist/
npm run preview             # inspect built assets
npm run verify              # typecheck, lint, unit, database, build, browser
npm audit                   # full dependency advisory report; dated results in docs/
```

See [TESTING.md](TESTING.md) for exact evidence, artifacts, scope and reproduction commands. Browser tests live in `e2e/`; source tests live next to components, with shared fakes in `src/test/`. SQL integration tests and their Auth/Storage/Realtime shims live in `tests/`.

## Deployment

Deploy `dist/` to a static host with SPA history fallback to `index.html`. Set the public Vite variables **before building**. Apply reviewed migrations separately to the authorized backend, configure Auth redirects and private-only Realtime, then perform hosted role/storage/media acceptance. No deployment, push, production migration or provider configuration was performed by this audit.

**Not production-cleared.** Phase 2 audits report zero known dependency findings, but external configuration, hosted migration acceptance, real email/OAuth, Storage, Realtime and TURN/NAT testing remain open. WebRTC currently has STUN servers and no configured TURN relay. Recordings use browser MediaRecorder; multi-device/screen-sharing and long recording tests remain manual.

## Verified screenshots

All examples use disposable browser-fixture data, not production users or platform metrics.

[Desktop landing page](docs/screenshots/home-desktop.png) · [Mobile academic team](docs/screenshots/team-mobile.png) · [Bangla/light theme](docs/screenshots/team-bangla-light.png) · [Student assignment](docs/screenshots/student-assignment.png) · [Teacher live view](docs/screenshots/teacher-live.png) · [Student live view](docs/screenshots/student-live.png)

## Academic team

- Md Biplob Hossain
- Leon Khan
- Al Amin
- Asif Khan

Supervisor: **Ahsan Habib**, Lecturer and Coordinator, Department of CSE, City University.

The compact landing-page team section supports both themes and English/Bangla descriptions. Names and supervisor match the report cover; no biographies, portraits, student IDs, or endorsement claims are added.

## Review and demonstration

Phase 2 verification (27 October 2026): see [TESTING.md](TESTING.md) for actual results, [security resolution](docs/SECURITY_RESOLUTION.md) for all 14 prior findings and nine retained lint warnings, [migration plan](docs/STAGING_MIGRATION_PLAN.md) for per-file review/preflight/recovery, and [staging acceptance](docs/STAGING_ACCEPTANCE_CHECKLIST.md) for external blockers. No hosted account, migration, deployment or provider configuration was changed.

- [Requirements matrix](docs/REPORT_REQUIREMENTS_MATRIX.md): evidence and limitations per major requirement. Phase 2 inspected the original 33-page PDF; printed/PDF page references and discrepancies are recorded.
- [Audit report](docs/SHIKKHAHUB_AUDIT_REPORT.md): architecture, verification boundaries, security and remaining risks.
- [Bug repair log](docs/BUG_FIX_LOG.md): reproducible defects, repairs and regression references.
- [Final-year demo guide](docs/FINAL_YEAR_DEMO_GUIDE.md): safe student, teacher and administrator demonstration.

Future work includes gateway-backed paid entitlements, production AI controls, accredited/automated certification, native mobile apps, TURN and scalable live delivery, fuller translation and accessibility review, lesson-specific Q&A limits/pinning, and hosted acceptance.
