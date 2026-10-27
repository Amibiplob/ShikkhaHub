# ShikkhaHub - An Online Based Educational Platform

ShikkhaHub is a final-year CSE project at City University, Bangladesh. Students discover courses, learn through structured lessons, complete assessments, discuss course material, and request private tutoring. Teachers manage courses, assessments, tutoring availability, and live broadcasts. Administrators manage roles and moderate the platform.

ShikkhaHub is independently maintained. It uses **React 19.3, TypeScript 6, Vite 8 with Rolldown/Oxc, React Router 7, Tailwind CSS 4, Radix UI, TanStack Query, and Supabase**. The browser SPA keeps authentication, authorization and data storage in Supabase.

**Staging update, 27 October 2026:** the explicitly approved disposable backend has all **43 migrations applied**, three deployed Edge Functions and **16/16 real hosted acceptance scenarios passed**. See [staging setup and verification](docs/SUPABASE_STAGING_SETUP.md) for identity checks, configuration, corrections and remaining manual gates. Earlier modernization/Phase 3 no-hosted-access statements describe those earlier runs.

See [repository cleanup](docs/REPOSITORY_CLEANUP_REPORT.md) for the current structure, environment protection and regression results. [Dependency upgrades](docs/DEPENDENCY_UPGRADE_REPORT.md), [earlier cleanup](docs/CODEBASE_CLEANUP_REPORT.md), [visual assets](docs/VISUAL_ASSET_AUDIT.md), and [modernization verification](docs/MODERNIZATION_VERIFICATION.md) retain the earlier evidence and remaining acceptance requirements.

## Features and roles

- **Public:** course search, category/difficulty/instructor filters, course descriptions, community, aggregate leaderboard, tutor profiles/availability, English/Bangla landing page, themes, academic attribution.
- **Student:** email/password accounts, profile editing, recovery screen, free enrollment, Markdown/video/document lessons, progress, course and lesson bookmarks, server-graded quizzes, assignment submissions, discussions, tutoring requests, confirmed/cancelled session history and private meeting access.
- **Teacher:** admin-approved access, draft course creation/editing/submission for admin-reviewed publication, modules and lessons, uploads, quizzes, grading, student progress, live scheduling and broadcasts, timezone-aware individual/weekly tutoring availability, approval/decline/cancellation and elapsed session completion.
- **Administrator:** audited role grants/removal, teacher/course approval, paginated search/filtering, accurate platform counts, tutoring/support oversight, certificate revocation, course deletion and community moderation.
- **Certificates:** authoritative automatic eligibility, durable metadata, downloadable A4 PDFs with embedded English/Bangla fonts, private-recipient public verification and administrator revocation. PDF delivery requires the configured server function.
- **Support:** searchable FAQ, private guest/signed-in tickets, anti-spam checks and administrator notes/status workflow. Server intake requires external function configuration.
- **Existing experimental features:** badges, recording, and a provider-dependent AI assistant. These are not claims of accredited certification or verified live-provider acceptance.
- **Payments:** BDT prices can be presented; self-enrollment is restricted to free courses. No payment gateway, simulated purchase, or paid entitlement service is supplied.

## Architecture

`src/App.tsx` composes the error boundary, providers and router. Route screens stay in `src/pages/`; route definitions and lazy imports are in `src/app/router/AppRoutes.tsx`. Feature-owned components, hooks, services and their tests live together in `src/features/`. Home discovery queries stay in presentation components, keeping `Index.tsx` a readable section composition.

```text
config/                 Vite public-environment validation and regressions
scripts/                Git-index secret/configuration check
src/
  app/providers/        application providers and theme adapter
  app/router/           discoverable route definitions
  pages/                routed screens
  features/             auth, courses, home, learning, assessments, tutoring,
                        certificates, administration, support, community,
                        live-classes and notifications
  components/ui/        reusable UI primitives and the single Sonner toaster
  components/layout/    Header, Footer and PageShell
  components/shared/    cross-feature presentation helpers
  contexts/             shared language state
  hooks/                shared theme/language and achievement helpers
  integrations/supabase/ central browser client and generated database types
  lib/                  shared storage, translations and class utilities
  types/                small shared database-query view models
  test/                 shared source-test setup and fakes
public/                 local artwork and public metadata
supabase/functions/     server adapters, shared handlers, fonts and Deno lock
supabase/migrations/    canonical, immutable database history
e2e/                    isolated Chrome journeys; separate hosted opt-in suite
tests/                  SQL, concurrency, server-runtime and repository checks
docs/                   setup, security, verification and historical evidence
```

`AuthContext` waits for account roles before granting protected-route access. Browser requests use the public Supabase key and user JWT. PostgreSQL RLS, constraints, triggers and narrow RPCs enforce ownership, assessment integrity and private content access. Storage uses private buckets and short-lived signed URLs. WebRTC carries live media; Supabase private Realtime topics receive signals sent through an authenticated RPC.

`supabase/migrations/` is the canonical database history. `drizzle/` retains the historical teacher-request migration and empty generated schema as reference only. Supabase migrations adopt that table. The unused Drizzle CLI/config and database client dependencies have been removed; use the canonical Supabase migration history.

## Local setup

Use **Node.js 24.22.1 or newer within Node 24**, and **npm 11.19.1 or newer within npm 11**. `package-lock.json` is authoritative; stale Bun locks were removed.

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
| `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` | Public anon/publishable key; RLS remains mandatory. The publishable-name setting takes precedence if both are supplied; both are validated. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server-side Supabase configuration for the Edge Functions |
| `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_API_KEY` | Optional server-only HTTPS SSE chat-completions provider; see `supabase/functions/.env.example` |
| `APP_ALLOWED_ORIGINS`, `APP_PUBLIC_ORIGIN` | Exact server browser origins / certificate verification origin; see Phase 3 guide |
| `SUPPORT_CHALLENGE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` | Server-only support signing/intake; never expose to Vite |
| `E2E_BROWSER_CHANNEL` | Test browser channel, defaults to `chrome` |

The SPA requires the URL and one of the two public-key settings above. The `ANON_KEY` name may contain a modern publishable key; the publishable-name input retains precedence when both are supplied, and **both** supplied fields are checked. The validator checks string types, required values, an HTTPS origin (HTTP only on loopback), and public publishable/anonymous key formats. Service-role/secret keys and authenticated user JWTs in either key field are rejected. Recognizable browser credential names (including service-role, secret/API/access keys, passwords, tokens, JWT secrets and database URLs) still fail with names-only diagnostics. Supabase public keys depend on RLS; see [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

**Exposure is explicit:** `vite.config.ts` uses `envPrefix: []` to disable automatic environment-prefix exposure, including whole `import.meta.env` objects and HTML interpolation. The empty array means no prefixes; an empty string would be unsafe. The validator returns a fresh object containing only `VITE_SUPABASE_URL` and the normalized `VITE_SUPABASE_PUBLISHABLE_KEY`; only these two validated application values are supplied through `define`, alongside Vite's standard built-ins. `VITE_SUPABASE_ANON_KEY` is an input alias, not an extra exposed value. The SDK, assistant and support requests continue using the canonical public-key reference. Source types declare only the approved application fields. See [Vite's exposure/define options](https://vite.dev/config/shared-options#envprefix).

Unused settings-including Git metadata, the legacy project identifier, unknown provider fields and `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`-are not parsed, trusted or forwarded to the browser. There is no Vercel name/prefix allowlist to maintain. A provider adding an unrelated field no longer breaks the build; even a private marker under an unrecognized harmless-looking name is excluded. Recognizable credential names still fail as misconfiguration diagnostics, but unknown-name safety comes from non-exposure rather than naming rules.

Vercel documents the [underlying observability configuration](https://vercel.com/docs/analytics/package#dynamic-configuration) as JSON client options such as analytics script and collection URLs; [Speed Insights](https://vercel.com/docs/speed-insights/package#dynamic-configuration) uses the same configuration variable. The reported `VITE_` form follows framework-prefix conventions. This app installs/uses neither SDK and needs none of that payload. The actual deployment payload was not accessed. `npm run test:build-env` now verifies the actual app build, direct/computed/whole-object/spread reads, development transforms, HTML placeholders and absence of synthetic secret markers in all emitted assets. New application configuration or optional telemetry integrations require explicit validation/exposure/types and corresponding tests; never restore automatic broad prefixes.

Local `.env` and dedicated test-account files remain intact and ignored; `.env` is no longer tracked. `.env.local` takes precedence over `.env`. Keep staging and production configuration in separate protected stores, or ignored mode-specific files such as `.env.staging.local` and `.env.production.local`; select the intended mode explicitly when building. Runtime Edge Function secrets belong in Supabase's server environment, with names/placeholders in `supabase/functions/.env.example`, never in `VITE_*`. A configured URL does not authorize hosted mutations.

Run `npm run check:secrets` before committing. It inspects Git's index, including force-added ignored files, and fails on private environment/authentication paths or recognized credential formats without displaying values. It also runs first in CI and `verify`. Harmless `.env.example` and `.env.sample` files are allowed. This is a targeted guard, not a guarantee against every possible secret format; review staged changes. The historical `.env` retains an old public anonymous key and project configuration: ignoring/untracking does not erase history. The [repository cleanup report](docs/REPOSITORY_CLEANUP_REPORT.md) records the scan scope and findings. Do not rewrite history automatically; rotate any genuinely private credential if a later review identifies exposure.

The browser suite overrides the backend URL and key with an isolated localhost endpoint and intercepts its HTTP/WebSocket traffic; it does not create real accounts or contact the configured project.

## Supabase setup

Use [SUPABASE_STAGING_SETUP.md](docs/SUPABASE_STAGING_SETUP.md) for the current procedure. The API URL, authenticated project reference and CLI link must match before every hosted operation. `config.toml`'s `project_id` is a local namespace, not authority to target a remote project. Never reuse the original Lovable-connected backend.

1. Create an explicitly disposable project or local Supabase stack. Apply `supabase/migrations/` in timestamp order using the Supabase CLI. Do not apply `drizzle/migrations/` a second time on a new project.
2. Inspect [migration rollout notes](docs/DATABASE_ROLLOUT.md) before applying the October repairs to existing data. Duplicate submissions and historical storage paths need human review. Local WASM tests do not verify hosted Storage, Auth, extensions or Realtime services.
3. Configure Auth email confirmation/recovery redirects for your exact local/hosted origin and `/reset-password`. Google OAuth requires a separately approved test provider setup.
4. Provision the first administrator through trusted server/SQL tooling in the disposable project. Public signup always creates a student. A teacher checkbox records a request; an administrator approves it through an atomic RPC.
5. Enforce private-only channels in Supabase Realtime settings. Review other existing Realtime policies; permissive policies combine with OR. New application live topics only receive messages; `send_live_signal` authorizes and stamps outgoing identities.
6. Existing private files need canonical course/class paths. Do not reopen buckets to recover access. For optional AI, deploy the repaired user-JWT-scoped function only after provider quota/rate-limit and live acceptance review.

## Commands

```sh
npm run dev                  # development server
npm run typecheck            # app + tooling + browser + server-handler TypeScript
npm run check:secrets        # inspect tracked/indexed configuration without values
npm run test:security        # disposable Git-index/ignore/credential regressions
npm run test:build-env       # actual builds/dev exposure probes, provider isolation and secret denials
npm run lint                 # ESLint; zero errors/warnings in the modernization run
npm run test                 # colocated Vitest unit/component tests
npm run test:db              # disposable PostgreSQL WASM migration/RLS integration tests
npm run test:e2e             # starts/stops Vite and executes real Chrome headlessly
npm run test:e2e:headed      # visible Chrome; requires a display
npm run test:e2e:staging     # real Supabase; explicit external opt-in, otherwise skips
npm run test:coverage        # local Vitest coverage, no claimed percentage
npm run test:concurrency     # disposable independent PostgreSQL races; see TESTING
npm run build               # production assets in dist/
npm run preview             # inspect built assets
npm run verify              # repository security checks, typecheck, lint, unit, DB, build, browser
npm audit                   # full dependency advisory report; dated results in docs/
```

See [TESTING.md](TESTING.md) for exact evidence, artifacts, scope and reproduction commands. Browser tests live in `e2e/`; source tests live next to components, with shared fakes in `src/test/`. SQL integration tests and their Auth/Storage/Realtime shims live in `tests/`.

## Deployment

Deploy `dist/` to a static host with SPA history fallback to `index.html`. Set the public Vite variables **before building**. Apply reviewed migrations separately to the authorized backend, configure Auth redirects and private-only Realtime, then perform hosted role/storage/media acceptance. This staging setup deployed backend functions only; no frontend deployment, push or production migration was performed.

**Not production-cleared.** The hosted staging subset passes, but real email/OAuth, broader Storage/Realtime acceptance, backup restoration, scheduled expiry and TURN/NAT testing remain open. WebRTC currently has STUN servers and no configured TURN relay. Recordings use browser MediaRecorder; multi-device/screen-sharing and long recording tests remain manual.

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

[Phase 3 feature guide](docs/PHASE3_FEATURE_GUIDE.md) documents tutoring, server-generated certificates, admin review/roles and support, including all routes, business rules, server secrets, font licenses and evidence boundaries. New public pages: `/faq`, `/contact`, `/tutors`, `/certificates/verify/:token`; account pages: `/dashboard?tab=tutoring`, `/certificates`, `/admin`. Five original Phase 3 migrations and two staging corrections follow the seven Phase 1 repairs. Backend functions are deployed only to the approved disposable staging target; the frontend remains undeployed.

Verification (27 October 2026): see [TESTING.md](TESTING.md) for current local/hosted results, [security resolution](docs/SECURITY_RESOLUTION.md) for historical findings, [migration plan](docs/STAGING_MIGRATION_PLAN.md) for review/preflight/recovery, and [staging acceptance](docs/STAGING_ACCEPTANCE_CHECKLIST.md) for remaining gates. Staging setup changed only the approved disposable backend; the original project and production remain untouched.

- [Requirements matrix](docs/REPORT_REQUIREMENTS_MATRIX.md): evidence and limitations per major requirement. Phase 2 inspected the original 33-page PDF; printed/PDF page references and discrepancies are recorded.
- [Audit report](docs/SHIKKHAHUB_AUDIT_REPORT.md): architecture, verification boundaries, security and remaining risks.
- [Bug repair log](docs/BUG_FIX_LOG.md): reproducible defects, repairs and regression references.
- [Final-year demo guide](docs/FINAL_YEAR_DEMO_GUIDE.md): safe student, teacher and administrator demonstration.

Future work includes gateway-backed paid entitlements, production AI controls, accredited certification, native mobile apps, TURN and scalable live delivery, fuller translation and accessibility review, lesson-specific Q&A limits/pinning, and hosted acceptance.

## Independent maintenance and visuals

The project originally used Lovable. This history is retained as attribution; its build tagger, editor session broker, gateway dependency and visible branding have been removed. Supabase Auth, RLS, Storage, Realtime, migration history and public environment names remain in use.

Original local SVG artwork is in `public/artwork/`; the favicon and social preview are also local. Uploaded course thumbnails remain teacher-owned data and fall back to topic artwork when missing or broken. Team names and the existing header identity are preserved. Theme controls work in desktop and mobile menus, retain the existing `theme` storage key and support the stored `system` setting.

The optional assistant now uses the signed-in user JWT and server-configured provider. Set `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_API_KEY` and `APP_ALLOWED_ORIGINS` only in an approved server environment. No provider endpoint or model is selected automatically; absent configuration returns 503. It retains the `course-assistant` route and streamed chat contract. Provider billing, rate limits and hosted acceptance require operator configuration; no service has been purchased or configured here.

Tailwind 4 and Vite 8 target modern browsers (Chrome 111+, Firefox 128+, Safari 16.4+ for Tailwind). Older browsers need a separately reviewed support decision. For hosting, supply an SPA fallback to `index.html`, an actual approved public origin/canonical URL and absolute social-image URL; no deployment domain is invented in source. Nothing in the local verification authorizes a release or production database changes.
