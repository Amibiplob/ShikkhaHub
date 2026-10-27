# Codebase cleanup report

27 October 2026, Asia/Dhaka. Compared with `ff94074`; this is implementation work in the existing Vite SPA, with no production data/schema change.

## Removal evidence

Before deletion, static and dynamic imports were resolved from `src/main.tsx`, all source tests and test setup. The unreachable modules were checked against repository-wide references, route composition/lazy imports, scripts, browser tests, server functions and migrations. Remaining references to removed UI files in historical security/audit documents describe the earlier snapshot, not active imports. This is an application repository, not a published component library; unused generated UI examples were not a supported public package API.

The removed `LiveAttendeeCount` used an obsolete public presence channel and was never rendered; active WebRTC viewer counts and private signaling remain in `useWebRTCBroadcast`. `NavLink` was an unused compatibility wrapper. All removed UI primitives and their exclusively used dependencies were unreferenced. The UI `use-toast` file only re-exported the canonical hook, which remains in use. The old `App.css` was the unimported Vite starter layout/logo animation. No routed feature, assessment, migration, security policy, test or academic attribution was deleted.

## Removed files

- `postcss.config.js`
- `public/favicon.ico`
- `public/placeholder.svg`
- `src/App.css`
- `src/components/LiveAttendeeCount.tsx`
- `src/components/NavLink.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/use-toast.ts`
- `src/hooks/use-mobile.tsx`
- `src/integrations/supabase/previewAuthStorage.ts`

## Dependency and integration cleanup

- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-separator`
- `@radix-ui/react-slider`
- `@radix-ui/react-switch`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `cmdk`
- `embla-carousel-react`
- `input-otp`
- `next-themes`
- `react-day-picker`
- `react-hook-form`
- `react-resizable-panels`
- `tailwindcss-animate`
- `vaul`
- `@vitejs/plugin-react-swc`
- `autoprefixer`
- `lovable-tagger`
- `postcss`

Twenty unused runtime libraries were exclusively referenced by dead template components. Additional removals are the build tagger, SWC React plugin (replaced by Vite's Oxc plugin), old animation plugin (replaced by CSS animations), direct PostCSS/autoprefixer (replaced by Tailwind's native Vite integration), and the incompatible SSR theme adapter (replaced by a tested client theme store). Some underlying libraries remain legitimately transitive; direct removal does not imply every transitive occurrence must disappear.

The Supabase client now uses its standard same-origin persisted session storage. The editor-specific broker and all cross-editor token postMessage logic are gone. The Vite plugin registration and development tag instrumentation are gone. HTML no longer points at an editor deployment, generated R2 screenshot or vendor social identity. Local favicon/social metadata replaces them. No canonical domain is invented; an operator must set the approved deployment URL when hosting is authorized.

The assistant remains a feature. Its endpoint and streamed request/response contract remain; server-only `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL` and `AI_API_KEY` replace the proprietary gateway. JWT validation, RLS-scoped context, an origin allowlist, bounded input/context, HTTPS-only configured endpoint, redirect refusal, upstream timeout/cancellation and generic provider errors are now explicit. Frontend requests use the session JWT plus public apikey; unmount aborts the stream. No provider purchase, key migration, gateway call or hosted function deployment took place.

## Maintained architecture and performance

All routed pages remain registered. Home discovery still lives in focused presentation components querying public/user-scoped Supabase data, with `Index` as section composition. Route-level lazy imports now defer course tools, live media, community, assignments and analytics. Student charts load when their tab is opened. PDF/font generation stays server-side. No bundle-warning threshold was raised.

Auth/language context types and values live in focused modules; provider components and consumer hooks have separate refresh boundaries. Unused variant/toast exports were removed instead of disabling the refresh lint rule. URL-derived filters, keyed private state (including home discovery and header search/notifications) and event-driven pagination replace redundant synchronous effect updates. Existing functions, media cleanup and authoring behavior are retained and regression-tested. The linter keeps the current React Hooks recommended rules. Compiler-confirmed unused imports and local bindings were removed using TypeScript's import tooling with behavior-preserving edits, and app `noUnusedLocals` is now enforced. Inspection of an unused analytics placeholder exposed and fixed per-course quiz aggregation; the badge helper now matches the existing SQL completion criterion and does not report rejected awards.

## Intentionally preserved

- All Supabase migration files, generated database types, RLS/constraints/RPCs, Auth/Storage/Realtime contracts and public environment names.
- Historical Drizzle adoption files, audit evidence, security documentation, screenshots and academic attribution.
- Existing route-level features, including experimental recording/badges/assistant and unpaid course pricing. Missing payment/hosted acceptance capabilities are documented, not deleted or simulated as production success.
- Actual environment files and credentials, which were not edited or staged. New `.env.example` text contains only placeholders.
- Existing custom theme tokens, header identity, team names and user-owned uploaded thumbnails/avatar fallback behavior.

## Remaining historical references

A tracked repository-wide case-insensitive search finds vendor references only in README's development-history paragraph and the dated cleanup/dependency inventories (including their machine-readable snapshot). The package locks, runtime source, build configuration, public metadata, examples and active setup instructions contain none. This preserves factual provenance; it does not claim the project never used Lovable. Git history was not rewritten.

Verification results and the browser/backend evidence boundary are in [MODERNIZATION_VERIFICATION.md](MODERNIZATION_VERIFICATION.md). Source and assets were reviewed before selective local commits; no push/deployment/remote database change was authorized or executed.
