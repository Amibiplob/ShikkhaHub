# Phase 2 dependency and lint resolution

27 October 2026 (Asia/Dhaka). The baseline is the lockfile at `41ab799` and its committed advisory report. Counts are npm package/meta findings, not 14 independent exploit demonstrations. Both `npm audit --json` and `npm audit --omit=dev --json` now exit 0 with **zero known findings**. This is a dated registry result, not a guarantee of application or provider security. Raw final reports and every baseline advisory are preserved in `dependency-audit.json`.

## Every prior finding

| Prior package / installed version | Direct/transitive and applicability | Resolution / compatible patch |
| --- | --- | --- |
| `zod` 3.25.76 — high, production | Direct; unused in `src/`, tests and application configuration. Oversized collection validation can consume memory where reachable. No active Zod validation path was found; do not dismiss it merely because this SPA is client-side. | Removed unused Zod and unused `@hookform/resolvers` import-free dependency. Upstream identifies 4.6.6 as patched; removal avoids an unnecessary validation API migration. React Hook Form and UI form helpers retained. |
| `react-router` 6.30.6 — moderate, production | Transitive via direct `react-router-dom`; open redirect with backslashes applies to navigation. SSR error hydration constructor advisory has no current SPA SSR path. | Both router packages 7.18.2, above advisory fix boundary 7.18.0. Latest published 6.x was 6.30.6 and remained in the affected range, so staying on v6 did not resolve it. Existing declarative BrowserRouter/routes retained; login/redirects, role guards, missing routes, filters and all browser journeys passed. |
| `react-router-dom` 6.30.6 — moderate, production | Direct meta finding from router. | Same coordinated 7.18.2 update; no framework rewrite. |
| `postcss-selector-parser` 6.0.10 (Typography subtree), 6.1.2 (Tailwind) — moderate; previously production classification as well | Transitive. CSS selector parsing occurs at build time in this project; no user CSS compilation endpoint. Pathological selectors can exhaust CPU; AST recursion advisory also affected 6.1.2. | Tailwind 3.4.17 resolves parser **6.1.5** within its existing compatible range. Unused Typography and its pinned 6.0.10 subtree removed. Current registry marks flat-selector advisory `<6.1.5`; older committed audit listed a broader range. Both current audits are retained without ignoring advisories. |
| `@tailwindcss/typography` 0.5.16 — moderate | Direct dev dependency, meta finding from pinned parser. Not imported/registered in `tailwind.config.ts`, PostCSS or source. Existing `prose` class strings do not register a Tailwind plugin. | Removed unused package; production CSS is byte-identical before/after removal (see verification). No override or downgrade to npm's suggested 0.5.4. |
| `vite` 5.4.21 — high, dev | Direct development/build server; path/file disclosure, custom middleware cross-origin script and editor/Windows command/path advisories require relevant dev-server/editor conditions. Static `dist/` does not run Vite. | 6.4.5, on the nearest major branch with applicable fixes; latest 5.x 5.4.21 remained affected and used vulnerable esbuild. Existing SWC/tagger peers accept Vite 6. Build/loopback browser server pass; do not expose dev/preview servers publicly. |
| `esbuild` 0.21.5 and 0.18.20 — moderate, dev | Transitive via Vite and legacy Drizzle/esbuild-kit. Development-server cross-origin reads; no application esbuild server. | Vite's esbuild 0.25.12 (advisory patched after 0.24.2); legacy loader subtree removed with unused Drizzle tooling. |
| `drizzle-kit` 0.31.11 — moderate | Direct dev meta finding from old loader/esbuild chain. No runtime imports or npm scripts use it; source of truth is Supabase SQL migrations, not the empty Drizzle schema. | Removed unused CLI plus `drizzle-orm`, `postgres`, obsolete `drizzle.config.ts`. Historical `drizzle/` SQL/metadata retained for provenance and adoption tests. Do not run Drizzle against the canonical schema. |
| `@esbuild-kit/esm-loader` 2.6.5 — moderate | Transitive, Drizzle loader meta finding. | Removed with unused Drizzle CLI; no replacement runtime path needed. |
| `@esbuild-kit/core-utils` 3.3.2 — moderate | Transitive, Drizzle loader meta finding via esbuild. | Removed with unused Drizzle CLI. |
| `tinypool` 1.1.1 — critical | Transitive via Vitest 3. Prototype-polluted worker/run options can lead to code execution in a test process; no production worker path. Trusted tests reduce exposure but do not patch the dependency. | Removed by Vitest 4.1.12's worker implementation. No global transitive override imposed. |
| `vitest` 3.2.7 — critical (meta/own advisories) | Direct dev runner, affected mocker/server and worker dependency paths. No public test server intended. | 4.1.12, the patched branch compatible with Node 24 and Vite 6. Latest 3.x was 3.2.7 and still affected. Existing mocks/component tests pass. |
| `@vitest/mocker` 3.2.7 — moderate | Transitive through runner/coverage; unauthenticated mock registration and path traversal apply when vulnerable test-server APIs are exposed. | 4.1.12, fixing path traversal (<4.1.11) and code injection (<4.1.12). |
| `@vitest/coverage-v8` 3.2.7 — moderate | Direct dev meta finding via mocker/test infrastructure. | 4.1.12, aligned with runner; coverage command executed to verify integration. No coverage threshold/percentage claim added. |

Three scoped major branch updates (Router 6→7, Vite 5→6, Vitest/coverage 3→4) were necessary to exit the reported vulnerable ranges without unsupported forced transitive combinations. npm's automatic suggestions to jump to Vite 8/Vitest 5 were not used. Registry metadata, installed peer ranges, typecheck, unit/coverage, build and full Chrome scenarios support compatibility. Other direct framework/UI packages were kept at their existing versions. Lockfile churn includes removed toolchains and platform-specific esbuild packages. No audit ignore, override or forced audit fix remains.

## Primary sources checked

- [Zod collection exhaustion and patched version](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- [Router navigation redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) and [SSR hydration advisory](https://github.com/advisories/GHSA-337j-9hxr-rhxg).
- [Parser AST recursion](https://github.com/advisories/GHSA-w9m9-85wc-3x92) and [flat-selector CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
- [esbuild cross-origin dev-server reads](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
- [Vitest 4.1.12 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12) and [Vite 6.4.5 release](https://github.com/vitejs/vite/releases/tag/v6.4.5). Individual Vite/mocker/tinypool advisory URLs and affected ranges are retained in `dependency-audit.json`.

## All 21 original lint warnings assessed

Twelve hook-dependency warnings were repaired. Fetch callbacks in CourseContentEditor, CourseDiscussions, CoursePrerequisites, CourseReviews, QuizManager, NotificationBell, Community and CommunityPost now use explicit stable dependencies; effects subscribe to those callbacks. CoursePrerequisites includes teacher mode as a data dependency; Community computes the inexpensive role flag directly rather than using an incomplete memo. The WebRTC teacher callback depends on stopBroadcast, and unmount cleanup captures the peer map used by that effect. No ESLint rule was disabled or downgraded.

Nine `react-refresh/only-export-components` warnings remain intentionally. These concern development hot-reload boundaries, not hook dependencies or runtime authorization. Changing each module API would add broad mechanical edits without changing staging behavior; Vite may fall back to a full refresh. The exact files/exports are:

| File | Mixed export / reason retained |
| --- | --- |
| `src/components/ui/badge.tsx` | `Badge` and `badgeVariants`: existing shadcn style API |
| `src/components/ui/button.tsx` | `Button` and `buttonVariants`: shared link/button styles |
| `src/components/ui/form.tsx` | Form components and `useFormField`: existing form API |
| `src/components/ui/navigation-menu.tsx` | Navigation components and `navigationMenuTriggerStyle` |
| `src/components/ui/sidebar.tsx` | Sidebar components and `useSidebar` |
| `src/components/ui/sonner.tsx` | `Toaster` and re-exported `toast` API |
| `src/components/ui/toggle.tsx` | `Toggle` and `toggleVariants`, shared toggle group styles |
| `src/contexts/AuthContext.tsx` | Auth provider and `useAuth`, existing consumer API |
| `src/contexts/LanguageContext.tsx` | Language provider and `useLanguage`, existing consumer API |

ESLint's actual final result is **0 errors, 9 warnings**. An optional future module split can improve hot reload; those warnings are not silently suppressed or presented as resolved.
