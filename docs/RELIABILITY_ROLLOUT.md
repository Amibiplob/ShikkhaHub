# Reliability rollout — 16–17 November 2026

This is a local implementation and verification pass. No hosted migration, function deployment, push, production data change, relay provisioning or actual environment-file change is authorized or performed by this work. Older reports describe their own historical snapshots.

## Current local readiness and verification

The completed cleanup is preserved from baseline `96c199f`; this continuation remains uncommitted. Browser verification now serves an isolated production bundle under `artifacts/e2e-app`, with zero retries and the existing assertions/deadlines. A new regression reproduces document-refresh state loss against the old development server and passes against preview. The teacher-authoring case also raced its asynchronous save: it now waits for successful dialog closure before asserting the unchanged persisted payloads, with deterministic 250 ms mutation latency retained. The three previously intermittent scenarios and the new isolation regression pass **4/4**, with no retries or deadline changes. The preliminary continuation run was stopped at that confirmed race (exit 130; 25 passes, 1 failure, 1 interrupted, 121 not run), then fixed; it is not counted as a complete run. The final complete `npm run verify` now finishes with **exit 0 in 877.58 seconds**: **148/148 browser cases**, **183 unit tests**, **56 SQL tests**, **6 security tests**, **3 environment tests**, strict TypeScript, lint and build all pass, with **zero browser retries/skips/flaky results**. All 378 pre-run candidate hashes matched after completion. Only final result records are edited afterward. See [the review](RELIABILITY_REVIEW.md) for logs, failed-before evidence and exact boundaries. Local verification is complete; hosted-release acceptance remains gated below.

Local prerequisites that were previously unavailable have been satisfied without installing services or changing actual environment files:

- PostgreSQL **16.15** binaries extracted under `/tmp`: the native independent-connection test passes **1/1 with 0 skips**, covering four booking/participant/last-admin races. It creates and destroys its own temporary Unix-socket cluster; no TCP listener or provider connection is used.
- Deno **2.9.6** under `/tmp`: all four frozen-lock entry checks and Deno-platform bundles pass. A local smoke probe registers each packaged handler with synthetic settings, checks preflight responses and reads the two copied font assets, without network/environment/write permission. The standalone bundler is experimental and reports an upstream fontkit duplicate-key warning. This is not Supabase ESZIP/container packaging or hosted invocation; Docker/Edge Runtime is absent.
- Compatible **typescript-eslint 8.73.0** resolves the seven moderate development lint/parser findings using patched minimatch **11.0.9**. Full and production audits both report **zero findings**. No forced upgrade, dependency override or production package upgrade was used. The previous issue concerned resource exhaustion from pathological tooling glob patterns; it was not in the browser runtime graph.

Reproduce optional checks with the real tool paths, without reading `.env`:

```sh
LOCAL_POSTGRES_BIN=/path/to/extracted/postgresql/16/bin npm run test:concurrency
deno check --frozen --config supabase/functions/deno.json supabase/functions/{certificate-pdf,course-assistant,support-contact,live-ice}/index.ts
deno bundle --frozen-lockfile --config supabase/functions/deno.json --platform deno --output /tmp/live-ice.js supabase/functions/live-ice/index.ts
```

For a standalone packaged certificate entry, preserve its function-directory layout and include `../_shared/fonts/` plus `OFL.txt`; a flat JavaScript file alone is not the complete certificate package. Supabase's existing `static_files` declaration includes those assets, but actual provider packaging/deployment must still be accepted separately. Current local logs are under ignored `artifacts/reliability/`; these artifacts and temporary tools are not release uploads.

## Database and matching application

Two additive migrations follow the existing 44 files:

1. `202611160001_community_feed.sql` adds the `community_feed` RPC and post-ID count indexes. Its bounded pages return excerpt/profile data, aggregate votes/comments and the caller's vote. Pinned posts precede popularity/newness; ties use timestamps and IDs. Literal substring search accepts punctuation without constructing SQL or PostgREST filters. `SECURITY INVOKER`, underlying table grants and RLS control every read. Only anon/authenticated receive execution; no new table-read privileges are granted.
2. `202611160002_endpoint_quotas.sql` adds a private RLS-enabled quota table and an atomic `consume_endpoint_quota` RPC. Callers may consume only their own fixed one-minute quotas: 6 AI requests, 10 certificate PDFs or 12 ICE credential requests. Clients cannot read, edit, reset or choose limits/identities. Rows are bounded to three per account and cascade with account deletion. Quotas are shared across Edge instances; provider/gateway/global abuse and cost controls remain operational requirements.

Rehearse all pending migrations on an explicitly approved disposable Supabase target, in timestamp order, using its migration ledger. Do not infer the target or authorization from `.env` or older staging reports. Stop on an error and inspect the failed transaction; preserve old migration history and user records. Check actual execution privileges, trusted function ownership, RLS, PostgREST schema refresh, literal search, pagination, quotas, certificate downloads and AI responses with distinct real JWTs before releasing the matching frontend/functions.

Deploy the updated `course-assistant` and `certificate-pdf` adapters only after the quota RPC is available. Their request methods, JWT/ownership checks, body bounds, origin checks, provider credentials and certificate integrity remain enforced. A missing quota RPC fails closed. Support contact retains its existing proof/replay/quota controls. No paid entitlement or new payment behavior is introduced.

## Optional authenticated TURN

Default ICE remains the existing two STUN servers. Enable TURN only after the following separately authorized setup:

- Provision an authenticated coturn-compatible relay with `use-auth-secret`, a strong random `static-auth-secret`, realm, TLS certificate, public/external IP, UDP/TCP/TLS listeners and relay-port firewall rules appropriate to the deployment. Configure per-user/global allocation quotas, bandwidth limits, monitoring and private-address/peer restrictions according to the network. Never expose the shared secret to a browser.
- Set server-only `TURN_URLS` to a comma-separated list such as `turn:relay.example.test:3478?transport=udp,turns:relay.example.test:5349?transport=tcp`. Set `TURN_SHARED_SECRET` through the provider's protected secret tooling (at least 32 characters), matching the relay. Keep `APP_ALLOWED_ORIGINS` exact.
- Deploy the new `live-ice` Edge Function. It explicitly validates the JWT using Auth and reads the scheduled/live room using the caller's RLS context, consumes the caller's ICE quota, and returns `no-store` HMAC credentials valid for at most one hour. The client obtains them through the authenticated Supabase function client with an eight-second request deadline. Enabled-mode errors prevent admission with a recoverable message; they do not silently fall back to STUN.
- Set the public non-secret flag `VITE_LIVE_TURN_ENABLED=true` in the approved frontend build configuration. Only this validated optional flag is added to the existing explicit Vite allowlist. Invalid values fail the build. `VITE_TURN_SHARED_SECRET` and other credential names remain rejected. The disabled flag preserves existing classroom behavior and does not require the new endpoint.

Credential construction follows the [coturn REST authentication documentation](https://github.com/coturn/coturn/blob/master/README.turnserver): timestamp-prefixed username and base64 HMAC-SHA1 password. The credential is intentionally visible to its authorized browser; the relay shared secret is server-only. Credentials are not instantly revocable after class completion or signout. Rejoin obtains fresh credentials; automatic credential rotation/ICE restart for hour-long sessions is not implemented.

Required real-network acceptance: independent devices/networks, restrictive NAT, forced relay transport with a confirmed selected relay candidate via `getStats`, UDP and TCP/TLS fallback, outsider/expired/completed-room denial, quota exhaustion, secret rotation, credential expiry, reconnect after network loss and late join. Verify resource cleanup, microphone/camera replacement, consent, presentation audio and recording recovery across supported browsers. Local peer/media tests and handler/HMAC tests do not prove relay operation, native capture sources or hosted Realtime delivery.

## Media and account behavior

Private lesson and recording video shares one player. URLs renew before their five-minute signing lifetime; playback position and play intent are restored after source replacement. Playback errors trigger at most two automatic recoveries per mounted resource, then an explicit retry. Access/signing failures remain visible. Signing requests and renewal timers are cancelled/ignored on resource replacement or unmount. Legacy public/signed/authenticated storage paths are re-signed; explicit external resources remain external. Storage authorization still decides access. A previously downloaded or buffered file cannot be recalled.

Account identity changes remount descendant application state, clearing searches, drafts, route-local data and subscriptions. Same-user token/session revalidation keeps the existing descendant tree, preserving live media. Server roles/RLS remain authoritative. No application TanStack Query consumers existed, so its unused provider and two dependency packages were removed rather than adding a second state system.

## Limits and release gates

- Community-feed and quota migrations and updated/new Edge Functions have local test evidence only in this pass. Hosted Auth/PostgREST/Storage/Realtime and Supabase ESZIP/container packaging/configuration require separate authorized acceptance. Native Deno checks/bundles/local startup are already verified, as scoped above.
- Physical devices, native screen/system-audio capture, Safari/Firefox/iOS, seven-party sustained load, long recordings, OS/browser termination and continuous background recording are not established by Chrome fixtures.
- Dashboard, student/teacher analytics, achievements, completion guidance and student-progress summary reads page by exact authorized totals with deterministic ID ordering. Smaller provider caps do not truncate summaries. Missing/changing totals, stalled pages, more than 50,000 rows, 200 pages or 30 seconds produce a recoverable error. Very large nested relations and IN-filter request lengths still require hosted scale acceptance; dedicated database aggregates should precede high-volume operation.
- Accessibility evidence covers existing keyboard, focus and viewport regressions plus reviewed screenshots. It is not a complete assistive-technology or contrast certification. Existing English/Bangla content and terminology are retained; full translation of every older English-only screen is outside the verified result.
- Remaining route/feature files are deliberately retained. The extraction separates recording lifecycle, recordings pagination, chat transcript, course creation and admin reads; it does not replace established feature behavior with a new architecture.
