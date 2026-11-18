# Device staging preparation and origin verification — 17 November 2026

This work preserves the completed 16/16 hosted suite, 10/10 focused follow-up, container/font evidence and all existing uncommitted changes. Preparation was read-only. The user subsequently approved exactly three origin changes on Supabase **`pdgrbfisxjkmqrhrgzrs`**; they are now applied and verified below. The additional isolated PDF-verification fixture was cleaned by exact ID. No frontend deployment, production resource, purchase, push or commit is changed. Deployed source revision, TURN acceptance and physical-device tests remain **unverified**.

## 18 November candidate update

Follow [RELEASE_PREPARATION.md](RELEASE_PREPARATION.md) for the new local Google/PKCE callback, recovery compatibility, disabled-provider/AI behavior, exact Google Cloud setup, deployment review and guarded expiry schedule. The prior approved origins and device sequence below remain preserved. Fresh public assets still lack the local auth callback and `live-ice` integration; provider commit provenance is unavailable. To test **these new changes** on HTTPS, review/approve the candidate deployment and four callback allowlist additions first. No frontend deployment, callback setting, provider credential, expiry job or physical check is performed by this preparation. The current read-only expiry impact inventory is zero rows, not permission to activate a future global job. Full local results are recorded in the reliability review.

## Approved application results

- Exact staging identity/link rechecked healthy; current values matched preparation and rollback digests before writing.
- Auth Site URL now `https://shikkhahub.vercel.app`; all **eight redirects** and other previewed fields unchanged. Sparse final diff has **zero pending declared changes**.
- `APP_PUBLIC_ORIGIN` now uses that HTTPS origin. CORS adds it while preserving all **three** previous origins; every unrelated secret name/digest is unchanged. Protected rollback files remain available, unused.
- **20/20 preflight checks pass**: all four functions allow HTTPS and each of the three local origins; all reject the unapproved probe origin.
- **4/4 actual HTTPS browser checks pass**: teacher login/reload/logout, student login/reload/logout, recovery-route/missing-token guard, and exact staging backend/no runtime errors. The browser is a secure context with the capture API available; no microphone/camera capture is tested. No recovery email was sent and no password was changed.
- **5/5 focused PDF checks pass**: new authenticated **399,749-byte PDF** contains the HTTPS verification link and no localhost link; wrong-owner denial; actual browser-enforced cross-origin PDF fetch; public HTTPS verification page; exact-ID fixture cleanup. Final read-only inventory shows zero remaining fixture course/module/lesson/enrollment/progress/certificate/notification rows. Two new append-only audit entries remain.
- Pre-existing academic and Storage fingerprints, actual environment/config/link files and existing staging-harness/postflight changes are preserved. No full suite, migration, function deployment or completed write was repeated.

Evidence is in ignored `artifacts/device-stage/origin-application/`: preflight, protected before/after configs and secret metadata, apply receipts/statuses, `auth-preservation.json`, `secret-preservation.json`, `cors-after.json`, `https-login-results.json`, `https-pdf-results.json`, private fixture manifest/PDF, `fixture-after.json` and `final-verification.json`. Credential values are not printed.

## Existing HTTPS frontend

**Use the existing `https://shikkhahub.vercel.app` for the next supervised device checks.** Its approved origin configuration is now verified. It returns HTTP 200; clean Chrome contexts and shipped client inspection confirm backend `https://pdgrbfisxjkmqrhrgzrs.supabase.co`. The initial preparation only observed public reads; the later checks above additionally verified real teacher/student login and an isolated PDF fixture.

The inspected entry is `/assets/index-2cRSVn_5.js` (423,363 bytes); the client chunk is `/assets/client-D8IBpOPz.js` (255,809 bytes). Hashes are retained in ignored evidence. These asset names differ from current local `dist/`; this does **not** prove the entire hosted revision equals the locally verified source. Public inspection establishes backend targeting, not Vercel account ownership, environment classification, deployment provenance or full hosted feature acceptance. There is no local `.vercel` link, Vercel CLI or available Vercel login/token in the checked locations/process. No provider inventory or deployment was attempted.

Because a usable HTTPS frontend already exists, no new preview deployment is required for ordinary two-device checks and no deployment authorization is requested now. If a new build is later needed, first identify the authenticated Vercel owner/team, exact separate preview project and preview environment; review the complete artifact/configuration before asking for that deployment. Never infer that this public alias is disposable hosting or redeploy it under the backend authorization.

The publicly shipped `LiveClass-BFfojVBY.js` contains an unconditional `iceServers` return using two Google STUN endpoints and no `live-ice` invocation. **The inspected frontend is STUN-only.** Backend relay credentials alone will not enable TURN in that build. An application TURN trial requires a separately authorized frontend build with `VITE_LIVE_TURN_ENABLED=true`, followed by verification of its actual network behavior; a separate forced-relay diagnostic can test the provider first.

## Minimal approved origin changes — applied

| Setting on the authorized Supabase project | Before | Verified current state |
| --- | --- | --- |
| Auth Site URL | `http://localhost:8080` | `https://shikkhahub.vercel.app`. |
| Auth additional redirects | Exact HTTPS root and `/reset-password` already present, along with six local-development/recovery entries | **No change.** Preserve all eight entries; add no wildcard. |
| `APP_PUBLIC_ORIGIN` | Localhost:8080, verified by old PDF and digest | `https://shikkhahub.vercel.app`, verified by new PDF and digest. |
| `APP_ALLOWED_ORIGINS` | All four functions rejected HTTPS preflight with **403** | HTTPS added; all three existing local members retained; **20/20** allow/deny checks pass. |
| Frontend Supabase URL/public key | Shipped client and real browser requests target the authorized staging backend | No change for ordinary device testing. No server credentials belong in the browser. |

Fresh `config pull --dry-run --output-format json` reports `wrote=false`. The CLI preview requires `--output-format`; the earlier rejected `--output` flag performed no operation. A sparse local Auth patch was prepared under ignored `artifacts/device-stage/auth-origin-change/supabase/config.toml`. `config diff` confirms **exactly one declared change**, `auth.site_url`; undeclared redirects, email/MFA/provider settings and other resources are preserved. Do not push the full config-pull/default configuration as a shortcut.

The secret-management listing exposes names and SHA-256 digests, not recoverable secret values. The documented, non-secret local-origin list was independently matched against the pre-change allowlist digest. Mode-0600 ignored `artifacts/device-stage/origin-change.env` contains **only** `APP_ALLOWED_ORIGINS` and `APP_PUBLIC_ORIGIN`, with HTTPS added and all old members retained. The support signing secret, platform keys, providers and unrelated settings are excluded. Protected `origin-rollback.env` and sparse `auth-origin-rollback/supabase/config.toml` preserve the previous three values. Both approved patches were applied once; rollback files remain unused.

The following operations completed under the user's explicit three-setting approval, after current-value and preservation checks. These are a record, not instructions to repeat completed writes:

```sh
# Completed approved operations; do not repeat to start a device test.
SUPABASE_TELEMETRY_DISABLED=1 npx supabase config push \
  --workdir artifacts/device-stage/auth-origin-change \
  --project-ref pdgrbfisxjkmqrhrgzrs
SUPABASE_TELEMETRY_DISABLED=1 npx supabase secrets set \
  --project-ref pdgrbfisxjkmqrhrgzrs \
  --env-file artifacts/device-stage/origin-change.env
```

For any future change, stop on an unexpected diff or changed precondition rather than replacing another operator's settings. The protected rollback covers only the three touched values. Existing functions picked up the updates without deployment: actual allow/deny preflights, retained loopback behavior, HTTPS login/recovery routing and a fresh HTTPS-linking PDF passed. Newly created verification fixture IDs were cleaned. Actual recovery email remains a separate gate.

Reference: [Supabase exact Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls) and [protected function secrets and update behavior](https://supabase.com/docs/guides/functions/secrets).

## TURN setup through protected tooling

Fresh authenticated secret-name inventory confirms **`TURN_URLS` and `TURN_SHARED_SECRET` absent**. Neither is in the current process or checked actual local function/app environment files. No provider credential was displayed, guessed, purchased, created or rotated; no relay connectivity is established.

1. Use an **existing** compatible coturn REST shared-secret service/relay. Supply its comma-separated UDP/TCP/TLS URLs as server-only `TURN_URLS`, and its matching random shared secret (at least 32 characters) as server-only `TURN_SHARED_SECRET`. This implementation uses timestamped HMAC-SHA1 credentials; arbitrary provider API keys or static username/password credentials require a reviewed adapter.
2. Retrieve values from the operator's password manager/provider console directly into a protected local file outside source, with mode 0600, or the staging project's protected Edge Function secret editor. Do not paste them into chat, command arguments, logs or a `VITE_*` variable. The protected file should contain only those two settings; preserve origin/support/platform settings.
3. After separate approval of the concrete provider/configuration, apply only to `pdgrbfisxjkmqrhrgzrs` with `supabase secrets set --project-ref pdgrbfisxjkmqrhrgzrs --env-file /secure/path/staging-turn.env`. No paid service provisioning is included. Verify relay authentication mode/realm, TLS certificate/public address, listeners, relay-port firewall rules, allocation/bandwidth limits, monitoring and peer restrictions. Never print the shared secret.
4. Confirm the actual authenticated `live-ice` response for an authorized live room and denials for outsiders/completed rooms. Keep response credentials/SDP/IPs out of shared evidence. A configured endpoint is not relay proof.
5. First use a separate two-peer diagnostic with `iceTransportPolicy: 'relay'`, then the separately authorized TURN-enabled frontend. Require a selected successful relay candidate pair and increasing sent/received bytes in `getStats()` while transferring data/media. Test UDP and TCP/TLS paths independently. Ordinary cross-network STUN success and gathering a relay candidate do **not** prove selected relay use.

The current implementation issues credentials for at most one hour and renews them on rejoin. Automatic long-session credential rotation/ICE restart is not implemented. Preserve this limitation in the results. [coturn authentication reference](https://github.com/coturn/coturn/blob/master/README.turnserver).

## Short two-device checklist — all physical checks NOT RUN

Use the existing protected disposable teacher/student identities through secure local tooling. Teacher: desktop/laptop on Wi-Fi; enrolled student: another device on **mobile data or separate Wi-Fi**. Both use the same approved HTTPS origin and a new isolated staging class. Record device/browser versions, network types, time, result and redacted diagnostics. Obtain participant recording consent. This is the minimum two-person check; three/seven-person and extended browser/device coverage remain separate.

To begin from the cleaned staging state:

1. Retrieve the existing teacher/student credentials privately from mode-0600 ignored `artifacts/staging-readiness/private/staging-accounts-current.env` (`STAGING_TEACHER_*` / `STAGING_STUDENT_*`). Do not paste them into chat or a report. Keep teacher/student in separate browser profiles/devices; use the same protected administrator fixture only for the course approval below.
2. On the teacher's computer, open `https://shikkhahub.vercel.app/auth`, sign in as teacher and use **New Course → Create Course**. Use a unique disposable title such as `Device test 2026-11-17 01` and a free course. Open its page, copy the exact course URL for cleanup, then choose **Submit for review**.
3. In a separate desktop browser profile, sign in as the existing staging administrator. Open `/admin?tab=courses`, find that exact title, select **Approve course**, enter a staging-test reason and **Confirm action**. Leave existing courses/accounts unchanged. Return to the teacher profile and reload the course page.
4. On the student's second device/network, sign in as student, open that same course URL and choose **Enroll Now**. On the teacher's course page choose **Schedule Live Class**, set a unique title, local date/time shortly ahead and a 30-minute duration, then **Schedule Class**. Preserve the resulting exact class/room URL as part of the fixture record.
5. Teacher opens that class card → **Open classroom**. Share its `/live/<room>` URL with the student. Both review the lobby; student reads/checks media-recording consent before sharing devices, each deliberately enables microphone/camera, then selects **Join Class**. Allow browser permissions as prompted. Continue with the six checks below.

Button names describe the inspected implementation, not proof of the entire deployed source revision. If the hosted labels/workflow differ or permissions fail, record the actual message and stop that check; do not mark it passed or reuse production accounts. No automatic test course/class is left behind by the origin verification.

- [ ] **Join:** teacher creates/starts the test class; enrolled student joins on the second network. Confirm preview, roster, remote speech/video and late leave/rejoin. An unrelated account must not enter.
- [ ] **Microphone/camera:** allow and deny permissions, retry, mute/unmute, camera off/on and switch available devices. Confirm replacement tracks reach the other participant; indicators clear after leaving.
- [ ] **Screen share:** teacher shares a tab/window, optionally with supported tab audio, cancels/restarts and stops from browser controls. Student verifies the intended content/audio and restored camera. Record unsupported mobile features honestly.
- [ ] **Reconnect:** briefly disconnect the student, restore connectivity, then switch network if available. Check clear recovery/rejoin behavior, roster, tracks and chat without duplicates. Record manual rejoin separately from automatic recovery.
- [ ] **Recording:** with participant consent, teacher chooses **Start recording → I consent — start recording**; confirm the visible notice on both devices. Record both speakers and a short presentation, then **Stop recording**. Open **Recordings on this device / Recordings**, review the local draft and choose **Save privately** once. On upload failure retain the local draft/download. Teacher chooses **End**, and student cannot re-enter.
- [ ] **Playback:** reload and play the private recording as the authorized student on the second device; listen for both voices, check duration/seek/sync and URL renewal. Verify an unrelated/signed-out context cannot access it. Retain only fixture IDs, then clean the newly created data.

For each result, label **ordinary connectivity** or **verified relay transport**. The latter additionally requires the forced-relay/selected-pair byte evidence above. No microphone, camera, screen sharing, reconnect, recording or physical playback check is marked passed by this preparation. Use the [extended checklist](STAGING_RELIABILITY_RUNBOOK.md#physical-device-and-different-network-checklist) for later coverage.

## Separate feature/release gates

The immediate scope inferred from this request is supervised teacher/student live testing alongside the implemented course, assessment, certificate and support features. This is not a decision to release AI or Google sign-in. Keep the following gates independent:

| Gate | Actual state/evidence | Required when |
| --- | --- | --- |
| Scheduled live-class expiry | Function/extensions exist; latest read-only inventory confirms no scheduled job. Reviewed fifteen-minute proposal remains unapplied. | Required before promising automatic expiry or unattended live-session lifecycle. Supervised short device tests can end classes explicitly. Install one reviewed job, observe an execution and verify only intended expired fixtures change before acceptance. |
| Email/password signup and recovery | Email enabled, auto-confirm enabled; actual confirmation/recovery inbox delivery unverified. HTTPS origin patch does not prove delivery. | Public self-service account creation/recovery needs the intended verification policy, provider/rate settings and actual inbox/redirect/reset tests. Existing controlled test accounts do not require new email delivery for this device trial. Ticket storage/support intake itself makes no email-delivery promise. |
| Google OAuth | Disabled; current Auth UI still offers Google. | Required if Google sign-in is offered. Configure/test the real provider and exact `https://pdgrbfisxjkmqrhrgzrs.supabase.co/auth/v1/callback`, or gate/remove the visible option in a separately reviewed frontend change before public release. Do not claim a Google flow passed. |
| Backup restoration | No observed restore rehearsal; no second disposable restore target authorized. | Operational gate before relying on real users' academic/private data for a public release. Restore into a separately confirmed disposable target and verify database plus Storage recovery; never restore over this existing project. This does not block short disposable-fixture device testing. |
| AI-provider acceptance | No `AI_API_KEY`, `AI_MODEL` or `AI_CHAT_COMPLETIONS_URL`; intentional authenticated 503 already established. | Required only if releasing the assistant as working AI. Configure an approved provider securely and verify real authorized streaming/denials/quotas/cost controls. Otherwise describe it as unavailable and gate its entry point; do not conflate platform quiz scoring/certificates with AI. |
| TURN and physical media | Existing shipped frontend is STUN-only; no provider settings or physical pass. | Required for a claim of reliable relay-backed cross-network live classes. First complete ordinary two-device evidence; then provider/forced-relay and application TURN-enabled acceptance under separate frontend authorization. |

No feature-specific acceptance implies production readiness. Broader private-media size/expiry/UI permutations, long recordings, long-session credentials, native/browser support, accessibility, abuse controls and sustained load retain the earlier runbook's separate status.

Preparation evidence remains in ignored `artifacts/device-stage/`: public HTML/module hashes, browser backend targeting, pre-change Auth/CORS, protected digest checks and prepared origin/rollback files. Approved application evidence is in its `origin-application/` directory, as detailed above. Reports never print credential values. Full suites were not repeated; the one new PDF fixture was cleaned, with append-only audits retained. Actual environment/config/link file hashes remain preserved.

**Next action:** begin the two-device setup above using the protected staging identities. Origin changes are complete; no further origin approval or frontend deployment is needed for an ordinary STUN connectivity test. Physical results, deployed source revision and TURN acceptance remain unverified until their separate evidence exists.
