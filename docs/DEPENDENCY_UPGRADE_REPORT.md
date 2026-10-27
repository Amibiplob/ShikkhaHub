# Dependency modernization

27 October 2026, Asia/Dhaka. Baseline: `ff94074`. Registry metadata and official migration guides were checked before selecting stable releases; no prerelease application dependency, forced audit fix, peer-dependency bypass or blanket override was used.

## Inventory and compatibility

**77 original direct packages inspected (51 production, 26 development); 41 installed versions upgraded; 26 direct packages removed; three replacement tools added; 54 direct packages remain.** Forty-three retained manifest targets changed; two already resolved to their current release in the old lock. Counts compare installed versions, not cosmetic removal of caret ranges. Exact data is in [modernization-dependencies.json](modernization-dependencies.json).

Major upgrades include React/DOM 18→19, Vite 6→8, Tailwind 3→4, ESLint 9→10, Vitest/coverage 4→5, TypeScript 5→6, Recharts 2→3, date-fns 3→4, Lucide 0→1, Sonner 1→2, tailwind-merge 2→3, jsdom 20→30 and React types 18→19. PGlite moved from 0.3 to 0.5; Playwright and all used Radix primitives are current stable. Supabase's browser lock already resolved 2.118.0; its declared target and the separately frozen Deno SDK are now aligned at 2.118.0.

- Vite 8 uses Rolldown with `@vitejs/plugin-react@6.1.2` and its Oxc transform. The SWC plugin was replaced following Vite's own diagnostic. Alias paths now use `import.meta.dirname`; HMR error overlays are enabled again.
- Tailwind 4.3.3 uses `@tailwindcss/vite`, `@import`, an explicit class-based dark variant, a container utility and the existing TypeScript theme tokens through supported `@config`. Documented shadow/radius/outline/gradient utility renames preserve the v3 scale. `tw-animate-css@1.4.0` replaces the animation plugin. PostCSS/autoprefixer configuration and direct dependencies are unnecessary with this pipeline.
- React forwardRef components remain compatible. Lucide's removed GitHub icon export was replaced with a repository-branch icon. Recharts' actual analytics routes pass type/build checks and browser workflows.
- `next-themes@0.4.6` was tried and replaced after real Chrome detected React 19.3's error for its rendered inline script. A browser-only external-store hook/provider preserves the `theme` key, default dark mode, system changes and cross-tab updates; four tests cover this behavior. No console diagnostic was suppressed.
- Vitest 5 changed matcher generics. `src/test/setup.ts` registers the actual jest-dom matchers and extends the documented `Matchers<R,T>` type; no `any` cast or skipped test masks the incompatibility. DOM isolation remains per file. The optional Node concurrency command uses `--test-isolation=none`, matching the existing SQL suite, so its no-binary case reports a real skip rather than a misleading file pass.
- All current React Hooks recommended rules remain enabled. Redundant effect state was replaced with derived values, event-driven changes or keyed private state; asynchronous service effect bodies are explicit. Recording refs are declared before their cleanup effect, and tutoring time-dependent actions refresh from a timer. Fast Refresh hooks/context values now live outside provider components; unused mixed exports were removed. Lint has zero errors/warnings. A final compiler-driven import/local cleanup enables `noUnusedLocals` for the app; strict standalone checks also cover the Tailwind and Vitest configuration files.

## Deliberately retained versions

| Package | Selected | npm latest | Reason |
| --- | --- | --- | --- |
| TypeScript | 6.0.3 | 7.0.2 | typescript-eslint 8.72.1 explicitly requires TypeScript >=4.8.4 and <6.1.0. Version 7 is outside the supported parser/toolchain contract. |
| @types/node | 24.19.2 | 26.6.5 | Types match the supported Node 24 runtime; Node 26 APIs must not typecheck against a Node 24 deployment. |

All other retained direct packages and the three additions match the queried stable release. Fonts, CVA, clsx, React Markdown, Testing Library React, pdf-lib, fontkit and its types were already current in the baseline lock. Removed unused calendar/resizing/form/drawer/carousel libraries were inspected rather than needlessly migrated.

Use Node **>=24.22.1 <25** and npm **>=11.19.1 <12**; `packageManager` records npm 11.19.1. The lockfile is reproducible with `npm ci`. Initial installation against the old installed ESLint graph failed resolution; an empty dependency tree resolved normally, without force/legacy-peer-deps. Original files were backed up in /tmp during migration.

## Deno and security

All three Edge Functions pass actual Deno 2.9.6 frozen checks. The real PDF/support Deno smoke passes with synthetic authorization adapters. The frozen Deno graph contains 29 package-version entries, with zero known findings from npm's bulk advisory service. No server dependency or PDF/font bundle enters the SPA.

Full and production-only npm audits report **zero known findings** on the final lock. `npm ls` passes without invalid peers. `npm outdated` reports only the two intentional exceptions above (its nonzero exit is normal when these entries exist). Dated advisory results do not establish hosted configuration or application security acceptance.

## Bundle comparison

Baseline production entry: **1,570.42 kB / 436.40 kB gzip**; CSS **79.18 kB / 13.89 kB gzip**. The final build measurements and test counts are recorded in [MODERNIZATION_VERIFICATION.md](MODERNIZATION_VERIFICATION.md). Routes, course Markdown/authoring/live media and analytics are lazy loaded. The largest final chunk is below the original 500 kB warning threshold; the threshold was not raised. Entry-file reduction is not a claim about total initial network bytes or total application download size.

## Complete original-package inventory

| Package | Before installed | After | Queried stable | Outcome |
| --- | --- | --- | --- | --- |
| `@fontsource-variable/dm-sans` | 5.3.0 | 5.3.0 | 5.3.0 | already current |
| `@fontsource-variable/space-grotesk` | 5.3.0 | 5.3.0 | 5.3.0 | already current |
| `@radix-ui/react-accordion` | 1.2.11 | 1.3.1 | 1.3.1 | upgraded |
| `@radix-ui/react-alert-dialog` | 1.1.14 | removed | 1.2.1 | removed |
| `@radix-ui/react-aspect-ratio` | 1.1.7 | removed | 1.2.0 | removed |
| `@radix-ui/react-avatar` | 1.1.10 | 1.3.1 | 1.3.1 | upgraded |
| `@radix-ui/react-checkbox` | 1.3.2 | 1.4.1 | 1.4.1 | upgraded |
| `@radix-ui/react-collapsible` | 1.1.11 | removed | 1.2.1 | removed |
| `@radix-ui/react-context-menu` | 2.2.15 | removed | 2.4.1 | removed |
| `@radix-ui/react-dialog` | 1.1.14 | 1.3.1 | 1.3.1 | upgraded |
| `@radix-ui/react-dropdown-menu` | 2.1.15 | 2.2.1 | 2.2.1 | upgraded |
| `@radix-ui/react-hover-card` | 1.1.14 | removed | 1.2.1 | removed |
| `@radix-ui/react-label` | 2.1.7 | 2.1.17 | 2.1.17 | upgraded |
| `@radix-ui/react-menubar` | 1.1.15 | removed | 1.2.1 | removed |
| `@radix-ui/react-navigation-menu` | 1.2.13 | removed | 1.4.1 | removed |
| `@radix-ui/react-popover` | 1.1.14 | removed | 1.3.1 | removed |
| `@radix-ui/react-progress` | 1.1.7 | 1.2.1 | 1.2.1 | upgraded |
| `@radix-ui/react-radio-group` | 1.3.7 | 1.5.1 | 1.5.1 | upgraded |
| `@radix-ui/react-scroll-area` | 1.2.9 | 1.4.0 | 1.4.0 | upgraded |
| `@radix-ui/react-select` | 2.2.5 | 2.4.1 | 2.4.1 | upgraded |
| `@radix-ui/react-separator` | 1.1.7 | removed | 1.2.0 | removed |
| `@radix-ui/react-slider` | 1.3.5 | removed | 1.6.1 | removed |
| `@radix-ui/react-slot` | 1.2.3 | 1.5.0 | 1.5.0 | upgraded |
| `@radix-ui/react-switch` | 1.2.5 | removed | 1.4.1 | removed |
| `@radix-ui/react-tabs` | 1.1.12 | 1.2.1 | 1.2.1 | upgraded |
| `@radix-ui/react-toast` | 1.2.14 | 1.3.1 | 1.3.1 | upgraded |
| `@radix-ui/react-toggle` | 1.1.9 | removed | 1.2.1 | removed |
| `@radix-ui/react-toggle-group` | 1.1.10 | removed | 1.2.1 | removed |
| `@radix-ui/react-tooltip` | 1.2.7 | 1.4.1 | 1.4.1 | upgraded |
| `@supabase/supabase-js` | 2.118.0 | 2.118.0 | 2.118.0 | already current |
| `@tanstack/react-query` | 5.83.0 | 5.105.0 | 5.105.0 | upgraded |
| `class-variance-authority` | 0.7.1 | 0.7.1 | 0.7.1 | already current |
| `clsx` | 2.1.1 | 2.1.1 | 2.1.1 | already current |
| `cmdk` | 1.1.1 | removed | 1.1.1 | removed |
| `date-fns` | 3.6.0 | 4.4.0 | 4.4.0 | upgraded |
| `embla-carousel-react` | 8.6.0 | removed | 8.6.0 | removed |
| `input-otp` | 1.4.2 | removed | 1.5.0 | removed |
| `lucide-react` | 0.462.0 | 1.61.0 | 1.61.0 | upgraded |
| `next-themes` | 0.3.0 | removed | 0.4.6 | removed |
| `react` | 18.3.1 | 19.3.1 | 19.3.1 | upgraded |
| `react-day-picker` | 8.10.1 | removed | 10.0.2 | removed |
| `react-dom` | 18.3.1 | 19.3.1 | 19.3.1 | upgraded |
| `react-hook-form` | 7.61.1 | removed | 7.91.0 | removed |
| `react-markdown` | 10.1.0 | 10.1.0 | 10.1.0 | already current |
| `react-resizable-panels` | 2.1.9 | removed | 4.15.0 | removed |
| `react-router-dom` | 7.18.2 | 7.18.4 | 7.18.4 | upgraded |
| `recharts` | 2.15.4 | 3.10.1 | 3.10.1 | upgraded |
| `sonner` | 1.7.4 | 2.0.8 | 2.0.8 | upgraded |
| `tailwind-merge` | 2.6.0 | 3.7.0 | 3.7.0 | upgraded |
| `tailwindcss-animate` | 1.0.7 | removed | 1.0.7 | removed |
| `vaul` | 0.9.9 | removed | 1.1.2 | removed |
| `@electric-sql/pglite` | 0.3.14 | 0.5.12 | 0.5.12 | upgraded |
| `@eslint/js` | 9.32.0 | 10.0.1 | 10.0.1 | upgraded |
| `@playwright/test` | 1.58.2 | 1.64.1 | 1.64.1 | upgraded |
| `@testing-library/jest-dom` | 6.9.1 | 7.0.1 | 7.0.1 | upgraded |
| `@testing-library/react` | 16.3.3 | 16.3.3 | 16.3.3 | already current |
| `@types/fontkit` | 2.0.9 | 2.0.9 | 2.0.9 | already current |
| `@types/node` | 22.16.5 | 24.19.2 | 26.6.5 | upgraded |
| `@types/react` | 18.3.23 | 19.3.0 | 19.3.0 | upgraded |
| `@types/react-dom` | 18.3.7 | 19.3.0 | 19.3.0 | upgraded |
| `@vitejs/plugin-react-swc` | 3.11.0 | removed | 4.3.3 | removed |
| `@vitest/coverage-v8` | 4.1.12 | 5.0.5 | 5.0.5 | upgraded |
| `autoprefixer` | 10.4.21 | removed | 10.6.2 | removed |
| `eslint` | 9.32.0 | 10.13.0 | 10.13.0 | upgraded |
| `eslint-plugin-react-hooks` | 5.2.0 | 7.1.1 | 7.1.1 | upgraded |
| `eslint-plugin-react-refresh` | 0.4.20 | 0.5.7 | 0.5.7 | upgraded |
| `fontkit` | 2.0.4 | 2.0.4 | 2.0.4 | already current |
| `globals` | 15.15.0 | 17.13.0 | 17.13.0 | upgraded |
| `jsdom` | 20.0.3 | 30.1.3 | 30.1.3 | upgraded |
| `lovable-tagger` | 1.1.13 | removed | 1.3.5 | removed |
| `pdf-lib` | 1.17.1 | 1.17.1 | 1.17.1 | already current |
| `postcss` | 8.5.31 | removed | 8.5.32 | removed |
| `tailwindcss` | 3.4.17 | 4.3.3 | 4.3.3 | upgraded |
| `typescript` | 5.8.3 | 6.0.3 | 7.0.2 | upgraded |
| `typescript-eslint` | 8.38.0 | 8.72.1 | 8.72.1 | upgraded |
| `vite` | 6.4.5 | 8.3.5 | 8.3.5 | upgraded |
| `vitest` | 4.1.12 | 5.0.5 | 5.0.5 | upgraded |

## Primary migration references

- [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Vite 8 migration](https://vite.dev/guide/migration) and [Oxc/Rolldown React tooling](https://vite.dev/rolldown)
- [Tailwind 4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) and [browser compatibility](https://tailwindcss.com/docs/compatibility)
- [ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
- [Vitest 5 migration, including matcher types](https://vitest.dev/guide/migration/)
- [Recharts 3 migration](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
- Stable versions, engines and peers: official npm registry metadata queried for every original direct package and each replacement tool on the verification date.
