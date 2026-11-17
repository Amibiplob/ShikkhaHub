# Reliability rollout — 16–17 November 2026

This is a local implementation and verification pass. No hosted migration, function deployment, push, production data change, relay provisioning or actual environment-file change is authorized or performed by this work. Older reports describe their own historical snapshots.

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

- Community-feed and quota migrations and updated/new Edge Functions have local test evidence only in this pass. Hosted Auth/PostgREST/Storage/Realtime and provider packaging/configuration require separate authorized acceptance.
- Physical devices, native screen/system-audio capture, Safari/Firefox/iOS, seven-party sustained load, long recordings, OS/browser termination and continuous background recording are not established by Chrome fixtures.
- Dashboard, student/teacher analytics, achievements, completion guidance and student-progress summary reads page by exact authorized totals with deterministic ID ordering. Smaller provider caps do not truncate summaries. Missing/changing totals, stalled pages, more than 50,000 rows, 200 pages or 30 seconds produce a recoverable error. Very large nested relations and IN-filter request lengths still require hosted scale acceptance; dedicated database aggregates should precede high-volume operation.
- Accessibility evidence covers existing keyboard, focus and viewport regressions plus reviewed screenshots. It is not a complete assistive-technology or contrast certification. Existing English/Bangla content and terminology are retained; full translation of every older English-only screen is outside the verified result.
- Remaining route/feature files are deliberately retained. The extraction separates recording lifecycle, recordings pagination, chat transcript, course creation and admin reads; it does not replace established feature behavior with a new architecture.
