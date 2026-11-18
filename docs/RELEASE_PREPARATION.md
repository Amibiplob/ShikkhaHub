# ShikkhaHub release preparation — 18 November 2026

This packet covers the local candidate and the already authorized disposable backend **pdgrbfisxjkmqrhrgzrs**. Existing work and academic data are preserved. No frontend publication, push, commit, provider purchase, scheduled-job activation or production change is authorized/performed here. Local/browser contract tests do not establish Google, inbox delivery, relay transport or physical-device acceptance. Results are recorded in the current reliability review.

## Google setup checklist

Use [Supabase's current Google guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [Google's web OAuth instructions](https://developers.google.com/identity/protocols/oauth2/web-server). The app uses Supabase OAuth redirects and PKCE. It requests sign-in/profile access only; it does not request Google API offline access.

1. In **Google Cloud → Google Auth Platform**, select your intended project. Under **Branding**, enter ShikkhaHub, your real support/developer contact and the app home `https://shikkhahub.vercel.app`; supply your actual published privacy/terms URLs if required. Use only domains you control or are authorized to use. Complete Google's applicable verification requirements; do not claim domain ownership of Supabase/Vercel parent domains. Under **Audience**, choose External for personal Google accounts, keep the app in Testing for staging, and add the exact consenting tester Google addresses. Workspace Internal works only for eligible organization accounts. Do not publish the consent screen merely to start testing.
2. Under **Data Access**, use only `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile`. Under **Clients → Create client → Web application**, add the exact origins below. No path/trailing slash belongs in an origin. Local origins are for this staging/development client only.
3. Add **one Google authorized redirect URI**: `https://pdgrbfisxjkmqrhrgzrs.supabase.co/auth/v1/callback`. This is Google's return to Supabase. The frontend `/auth/callback` is a separate Supabase redirect, not Google's redirect URI.
4. In [this staging project's Auth provider settings](https://supabase.com/dashboard/project/pdgrbfisxjkmqrhrgzrs/auth/providers), enable **Google**, paste the Web client ID and secret directly from the console into protected provider fields, then save. Keep normal email verification/security checks enabled. The **client secret belongs only in Supabase's Google provider settings**; no VITE variable, Edge secret, source file, shell argument, log or chat is needed. Do not enable manual identity linking as a workaround.
5. In **Auth → URL Configuration**, retain Site URL `https://shikkhahub.vercel.app` and all eight existing redirects. Add the four callback URLs below. A sparse local patch and rollback are prepared in ignored `artifacts/release-prep/auth-callback-{change,rollback}/supabase/config.toml`. The fresh non-writing diff has exactly **one update**, `auth.additional_redirect_urls`; all other fields are undeclared/preserved. It is **not applied**. Recheck the live allowlist immediately before application and preserve any newer operator additions. Callback allowlist expansion is a new setting change beyond the prior three-origin approval; review/approve it before applying.
6. Review and authorize the frontend candidate below. After it is deployed, reload `/auth`: Google stays disabled unless the actual public Supabase settings endpoint reports `external.google === true`. A settings error/timeout also disables it. Provider enabled does not prove valid credentials. Complete the real-provider manual tests before claiming Google login works.

| Google authorized JavaScript origins | Supabase additional redirect URLs to add |
| --- | --- |
| `https://shikkhahub.vercel.app` | `https://shikkhahub.vercel.app/auth/callback` |
| `http://localhost:8080` | `http://localhost:8080/auth/callback` |
| `http://127.0.0.1:8080` | `http://127.0.0.1:8080/auth/callback` |
| `http://127.0.0.1:18081` | `http://127.0.0.1:18081/auth/callback` |

Port 8080 is the configured Vite development origin; 18081 is the controlled staging browser origin. An additional preview domain must be identified and authorized separately, then added exactly to Supabase redirects/Google origins and function CORS. No wildcard is proposed.

First-time identities use the **existing database trigger**: create a profile and grant only `student`. Client/OAuth `role`, `roles`, or teacher/admin claims cannot grant staff access. An email signup's teacher checkbox creates an approval request only; staff access remains an administrator operation. The app reads roles from `user_roles`, never OAuth metadata.

[Supabase automatic identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) handles eligible identities with the same verified email. The app does not merge users, transfer academic data, link different-email accounts, or call `linkIdentity`. Test an existing verified email/password user and confirm the same user ID and data; if Supabase declines the identity, use the existing sign-in method and resolve through support. Never delete/recreate a real account to fix linking. PKCE callbacks must return to the browser that started the flow; missing verifier, denied/cancelled consent and invalid codes show a retry route. Safe local return paths survive the redirect for ten minutes. Callback codes/provider errors are removed from browser history.

## Email/password recovery

The current staging project has email enabled and **auto-confirm enabled**; this was observed, not changed. Before public signup, choose and review the intended email-confirmation policy, custom SMTP/sender domain, deliverability and rate limits in Supabase Auth. Do not disable confirmation as a Google workaround. Configure an existing mail service without buying a new service automatically.

Preserve these existing exact redirects (no change required for recovery):

- `https://shikkhahub.vercel.app/reset-password`
- `http://localhost:8080/reset-password`
- `http://127.0.0.1:8080/reset-password`
- `http://127.0.0.1:18081/reset-password`

The UI calls `resetPasswordForEmail` with its current origin plus `/reset-password`. Keep the Supabase recovery template's normal confirmation link; custom templates must preserve the configured redirect/PKCE flow. The SDK exchanges the code once; the form waits for a validated recovery session, including an event received before the lazy page mounted. A fragment containing only `type=recovery` grants no form access. Already-issued implicit recovery links are still validated by the SDK on the reset route; a fragment flag alone never enables the form. Entering sign-in from that legacy recovery document reloads once so subsequent Google/email flows use PKCE. New PKCE emails should open in the same browser/profile that requested them; opening elsewhere should fail safely and offer a new request. Reloading after consuming a recovery link requires requesting a fresh link. Real inbox delivery, expired/reused links and login with the new password remain manual tests. No email was sent and no hosted password changed by these local tests.

## Frontend deployment for review

Read-only public inspection on 18 November returns the same entry `/assets/index-2cRSVn_5.js` (SHA-256 `fc3c0ac1e1910497c8aff3511b47dcbf2c8c94b0c2295fc7d026fac09c55e9b9`). Its downloaded `Auth-MN_PE0KK.js` has no callback-route implementation, and `LiveClass-BFfojVBY.js` has the unconditional STUN configuration and no `live-ice` invocation. This establishes the served behavior independently of appearance: the new callback route is absent and that classroom build is STUN-only. A TURN-disabled optimized build can remove the `live-ice` call even from current source, so that string's absence **cannot identify a source revision**. Whole-deployment source equivalence and the exact deployed commit remain unverified. No local Vercel project link, CLI/login or token is available, so provider revision/owner/team metadata could not be read. The Vercel response ID is not a commit SHA.

The candidate is the reviewed working tree at the recorded HEAD plus uncommitted changes. `artifacts/release-prep/candidate-source.json` inventories source hashes; `candidate-dist.json` inventories the final build. Neither contains actual environment files or credentials. `dist/` is a local build, not an upload. Recheck candidate hashes before publishing. Do not deploy under disposable-backend authorization alone.

After the user approves the intended Vercel project/team/target and the exact candidate:

1. In that **existing** Vercel project's deployment settings, verify its configured repository, selected source revision and environment. Preserve unrelated hosting settings. If using Git integration, any commit/push requires separate explicit authorization. Do not select an unreviewed branch head.
2. Use Vite preset, repository root, Node **24.x** satisfying `>=24.22.1 <25`, npm **11.19.1**, install `npm ci`, build `npm run build`, output **dist**. Preserve the existing `vercel.json` SPA fallback. Review `/auth/callback`, `/reset-password`, nested course/recording routes and missing assets after deployment.
3. Required public build variables: `VITE_SUPABASE_URL=https://pdgrbfisxjkmqrhrgzrs.supabase.co`; the same project's **public publishable/anon key** through the hosting editor; `VITE_LIVE_TURN_ENABLED=false`; `VITE_AI_ASSISTANT_ENABLED=false`. There is no Google client secret or Google flag in frontend settings. The validated public environment guard rejects credential-like VITE names. Enable TURN/AI flags only after their protected backend setup and acceptance below.
4. For a CLI upload workflow, review `dist/` and the existing Vercel project mapping first; an operator with hosting access can use that project's documented Vite deployment workflow. Do not run `vercel --prod`, create another project, push or change the alias without approval. Record provider deployment ID, commit/source fingerprint and actual effective URL. Keep the prior deployment ID for rollback through Vercel's existing-deployment promotion flow; no DNS/provider resource recreation is required.
5. Run the manual checklist on the actual deployed candidate. Retain deployment metadata and served-asset hashes; screenshots alone do not establish revision equivalence. Roll back to the recorded previous deployment if acceptance fails, after checking compatibility with the unchanged backend.

## TURN and optional AI

The local TURN path already calls authenticated `live-ice` before admission. That deployed handler checks Auth, room access and quota, then issues coturn REST HMAC credentials for at most one hour with no-store responses. The client now also rejects malformed, expired, almost-expired or overlong credential leases. Enabled-mode failures stop admission with a recoverable error; no silent STUN fallback. Normal peer configuration is retained. TURN has no provider secrets on staging and no relay success has been observed.

Follow [the protected TURN setup](DEVICE_STAGING_PREPARATION.md#turn-setup-through-protected-tooling): use an existing coturn REST-compatible relay; put only `TURN_URLS` and matching `TURN_SHARED_SECRET` into protected server settings on this exact staging project, preserving origin/support settings. Never use static browser credentials or put the relay secret in VITE. Review TLS/public address/firewalls, allocation/bandwidth limits and peer restrictions against [coturn's configuration](https://github.com/coturn/coturn/blob/master/README.turnserver). No purchase is authorized. First verify two-peer forced-relay data/media transfer with a selected relay candidate pair and increasing bytes over each UDP/TCP/TLS path; then authorize a frontend build with `VITE_LIVE_TURN_ENABLED=true`. Rejoining obtains new credentials; **automatic renewal/ICE restart after an hour is not implemented**, so long sessions remain a separate release limitation.

AI is optional and **disabled by default**, with an explicit unavailable notice and no prompt submission. An approved existing provider needs server-only `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_API_KEY`, followed by actual streaming/quota/privacy/cost checks. Only then set `VITE_AI_ASSISTANT_ENABLED=true` in an approved build. No provider key goes to the browser. Courses, quizzes and certificates remain available without AI.

## Class expiry schedule and rollback

The existing expiry function already uses **scheduled time + duration (60-minute fallback) + one day**. Local tests now exercise old scheduled/live, within-grace, future and completed rooms, client execution denial and repeat execution. There is no change to academic expiry policy. Current hosted inventory has the function and zero cron jobs.

The reviewed operation is [enable-class-expiry.sql](../supabase/operations/enable-class-expiry.sql), outside automatic migrations so it cannot silently activate with a schema push. It proposes one **postgres-owned** job named `shikkhahub-expire-live-classes`, every fifteen minutes (`*/15 * * * *`, pg_cron UTC). It refuses other expiry jobs or mismatched name/command/owner/database/schedule, and leaves an identical job unchanged. Additional lag after expiry threshold is up to one interval plus execution delay.

**Approval required before activation.** This job runs the global existing expiry function and can expire any eligible pre-existing staging class. Before asking for activation, inventory exact impacted class IDs/titles/scheduled times and review them; do not call it fixture-only. Do not activate if any existing academic state change is outside the approved scope. Preserve the before-snapshot and decide with the owner whether those eligible rows should expire. A restore of old statuses is not an automatic rollback.

After approval, fresh identity/preflight/job-owner inspection and the affected-row review, create a protected SQL wrapper containing the exact operation body:

```sql
BEGIN;
SET LOCAL shikkhahub.expiry_approved = 'pdgrbfisxjkmqrhrgzrs';
-- Paste the reviewed contents of supabase/operations/enable-class-expiry.sql here.
COMMIT;
```

Execute that wrapper only against the independently confirmed staging link (`npx supabase db query --linked --file /secure/path/approved-expiry.sql`). The approval marker is an operator guard, not proof of database identity. Never enable a new schedule merely by setting it. Inspect `cron.job` and `cron.job_run_details`; observe a successful scheduled run with exact disposable old/active/completed fixture IDs and verify other rows against the before-snapshot. Clean only those fixture IDs. [Supabase cron reference](https://supabase.com/docs/guides/cron/quickstart).

To stop future runs after approval, use the same transaction/approval marker with [disable-class-expiry.sql](../supabase/operations/disable-class-expiry.sql). It removes only the exact matching job and preserves other jobs/run history. It tolerates an already absent job. It **does not revert expired rows**; review any exact-ID status repair separately, with concurrency/current-state checks. Local schedule tests use a pg_cron SQL-interface shim; actual hosted scheduling/execution remains unverified and unenabled.

## Final automated validation

`npm run verify` completes with **exit 0 in 1,154.31 seconds**: **155 browser / 199 unit / 60 SQL / 6 security / 3 build-environment tests**, strict TypeScript, lint and build. Browser retries/skips/flaky/unexpected counts are all zero. All 326 frozen non-document candidate hashes match after the run. Authentication/browser media are exercised in Chrome with intercepted services and synthetic inputs; the real Google provider, inbox delivery, hosted relay and physical devices remain unverified. The prior fixture failures, port refusal and superseded incomplete run remain separately recorded in [the reliability review](RELIABILITY_REVIEW.md).

## Manual test checklist

Use existing protected staging role fixtures and new exact-ID disposable data; do not use production users. See [device preparation](DEVICE_STAGING_PREPARATION.md#short-two-device-checklist--all-physical-checks-not-run) for the detailed course approval, enrollment and scheduling sequence.

- [ ] **Google:** first-time test user → profile/student only; reload/logout/relogin; existing verified email/password → same user ID and preserved data; cancel consent; invalid/missing-verifier callback; safe protected return link. Confirm no teacher/admin grant from Google metadata. Mark real Google successful only after observing the complete provider round trip.
- [ ] **Recovery:** receive the actual inbox link; same-browser redirect; mismatched passwords; save; sign out; old password fails/new password works. Reused/expired links and another browser fail safely. Confirm normal email/password login and the chosen confirmation policy.
- [ ] **Teacher/student classes:** new teacher course → admin approves → student enrolls → teacher schedules → both join from separate devices/networks; verify permissions, speech/video, mute, screen sharing, late join/reconnect/chat, outsider denial and teacher-end delivery. Record ordinary STUN versus verified relay separately.
- [ ] **Recording:** informed consent, visible notice on both devices, record both speakers/presentation, switch tabs, stop; local preview/download; save privately; retain draft on failed upload. Hardware indicators clear on leave/end.
- [ ] **Playback:** authorized student after reload/on another device; duration, seek, both voices and sync; expired URL renewal; outsider/signed-out denial; actual Safari/iOS codec support if targeted. Test long recordings/sessions separately.

## Release gates

Required for the requested Google-enabled manual trial: provider/consent test-user setup, exact callback allowlist, and an approved deployment of this candidate; then observe actual Google and mail flows. Required before a public release relying on academic/private data: [backup/restore rehearsal](BACKUP_RESTORE.md), reviewed signup/mail policy, physical capture/playback and cross-network/relay evidence, remaining Storage/abuse/monitoring/browser/long-session gates in the staging runbook. Automatic expiry may be claimed only after approval and an observed scheduled run. The prepared global expiry job must not change pre-existing academic records without a separately reviewed decision.

Optional: AI provider/generation, Google if explicitly removed from release scope, and TURN only for a narrowly described supervised STUN-only trial. These are not accepted by disabled controls or local mocks. Hour-long TURN renewal remains unsupported. No production acceptance is claimed.
