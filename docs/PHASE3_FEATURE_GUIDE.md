# Tutoring, certificates, administration and support

27 October 2026 (Asia/Dhaka). These are functioning local implementations with SQL, server-handler and browser tests. Hosted Supabase, Edge Function deployment and real-account acceptance remain unverified. No push/deployment/provider mutation was performed.

## Routes and use

| Route | Purpose |
| --- | --- |
| `/tutors` | Public discovery by teacher/subject and expertise; profile, self-reported qualifications, published courses, duration and future availability |
| `/dashboard?tab=tutoring` | My Tutoring Sessions; teachers additionally get Tutoring Management, editable profile and individual/weekly availability |
| `/certificates` | Authenticated My Certificates, eligibility retry, repeated PDF download and verification links |
| `/certificates/verify/:token` | Public current status, course and issue date; no recipient name/email/account ID |
| `/admin` | Accurate counters, seven-day activity, bounded server search/filter/pagination, confirmed role/content actions, course reviews, tutoring oversight, certificate revocation, private support and audit trail |
| `/faq` | Searchable accessible FAQ describing implemented capabilities |
| `/contact` | Private guest/authenticated support intake and signed-in own-ticket status history |

Header/footer/dashboard links connect these workflows. Achievements keeps badges and learning progress and links to the authoritative certificate center. Large new routes/workspaces are lazy loaded. PDF/font libraries and font files remain server/test assets, outside the SPA bundle.

## Tutoring rules

The existing `tutor_slots` and `tutoring_requests` tables are extended, not replaced. Stored `approved` means **confirmed** in the UI; existing records retain their meaning. States are `pending → approved → completed`, plus `rejected`/`cancelled`. No fee, payment transaction or invented rating/qualification is supplied. Teacher approval is a platform role decision, not academic credential verification.

Teachers choose an IANA timezone, local start, 15–180 minute duration and 1–8 weekly occurrences. PostgreSQL preserves weekly local time across timezone-offset changes. Nonexistent or ambiguous DST times are rejected, with the whole RPC rolled back. Browser conversion independently rejects ambiguous initial dates. Users view actual timestamps in their browser timezone. Future unused slots can be edited; slots with request history must be cancelled/recreated, preserving booking history. Removing a slot declines pending requests; cancel confirmed bookings first.

Ordinary clients cannot directly mutate slots/requests. `save_tutor_slot`, `cancel_tutor_slot`, `request_tutoring` and `decide_tutoring` authorize every action. Confirmation serializes on a private database guard row, locks booking/slot records, rejects overlapping confirmed sessions for either participant (including teacher/student role swaps), and reserves one slot. The partial approved-slot index remains a second uniqueness defense. Other pending requests for the slot are declined. Cancellation is permitted to either participant/admin before the start and removes the meeting link. Only the teacher can record completion after the end; this is an authorized statement, not automated attendance proof. Resolved requests cannot be rewritten/reconfirmed; request another slot instead.

Participants/admins can read their scoped booking history; public discovery does not advertise cancelled slots or nonteacher availability. Booking links are only in participant rows, removed on cancellation/completion; admin report rows intentionally omit them. External meeting providers control admission after a link is shared. This phase does not add a second video backend or claim hosted private video connectivity.

Discovery is bounded to 200 future slots. The workspace reads the user's requests/teacher-owned slots and fetches exact related slot IDs, avoiding an unrelated global-slot limit hiding booking history. Latest 200 requests per participant side and up to 500 owned slots are shown; broader archival reporting/pagination is future work. Users can refresh decisions; no polling/realtime guarantee is implied for tutoring UI updates.

## Authoritative completion certificates

Existing certificates gain immutable issuance snapshots, a full UUID verification token, validation/revocation timestamps and reason. Existing short certificate numbers are retained and checked for duplicates before a unique index; new numbers use a full UUID. An existing certificate is revalidated against the new requirements before downloading. Legacy snapshots are populated from current profiles/courses during rollout; they are not claimed to reconstruct historical names.

Eligibility is computed only in PostgreSQL: published existing course, enrollment, nonempty valid display name, at least one lesson, every lesson marked complete, every course quiz with a passed server-scored attempt, and every assignment with a bounded nonnull teacher grade (`graded` or legacy `reviewed`). All current course quizzes/assignments are required because the existing schema has no optional-assessment flag or assignment pass threshold. No invented minimum assignment percentage is imposed. Existing quiz passing rules apply; question versioning/proctoring and watch-time verification remain out of scope.

Trusted triggers retry issuance after progress, quiz attempt or assignment grade writes. A narrow own-user retry RPC handles preexisting completions or parallel final activities whose snapshots did not yet see each other. A unique `(user_id,course_id)` constraint makes repeated/concurrent issuance idempotent. Clients cannot INSERT/UPDATE/DELETE certificate metadata, choose another recipient, override names/dates/numbers, or clear revocation. Revocation is administrator-only, requires a reason and is audited. Deleting a course retains metadata with a null course reference; verification shows `course_removed` and new issuance/PDF downloads are denied. Revoked/removed copies already downloaded cannot be recalled; verification remains the authority.

`certificate-pdf` authenticates with real Supabase `getUser`, reads only `certificate_download_record` using the caller JWT, and generates the PDF on the server. It uses no service role and does not accept client names, titles or percentages. PDF output is A4 landscape, print-friendly, with ShikkhaHub branding, recipient/course snapshots, UTC issue date, certificate number and verification URL. No seal, signature, supervisor approval or accreditation is fabricated. Repeated downloads regenerate from durable metadata; no public PDF bucket is created. Public verification requires the unguessable UUID token and withholds recipient data.

Noto Sans and Noto Sans Bengali are bundled under their OFL license (`supabase/functions/_shared/fonts/OFL.txt`), with fontkit shaping and full font embedding. Their source URLs and hashes are below. English PDF text is extraction-tested; Bangla shaping was rendered and visually inspected. PDF text extraction may reorder Bangla combining glyphs; no Unicode extraction roundtrip guarantee is claimed. Unsupported scripts/control characters or overlong layout text fail rather than silently replace a name. The old font adapter failed Node/Deno compatibility checks and was replaced by fontkit 2.0.4. Explicit glyph advances/offsets preserve Indic marks/conjuncts that pdf-lib's normal drawText omits. Full embedding avoids the legacy subset-stream API mismatch; the synthetic Bangla PDF is about 400 kB.

## Administration and review

`admin_overview` and whitelisted `admin_records` independently authorize admins. Counts come from all matching database records, not the browser's ten-row page. Search is bounded/parameterized, pagination is 1–50 rows (UI ten), and stable ordering includes the record ID. Role counts can overlap; registered profiles are not active-login telemetry. Completion counters measure validated certificate records; revocation and active certificate counts are separate. The seven-day chart counts recorded audit events, not revenue or fabricated engagement.

Direct browser role writes are revoked. `admin_set_role` takes an existing account, role, grant/revoke decision and reason, checks admin authority under the shared role guard, and records the review. Self-admin removal and removal of the final administrator are blocked. A private guard row serializes operations and causes stale REPEATABLE READ snapshots to fail rather than write-skew the invariant. Teacher-request approval/dismissal is confirmed, atomic and audited. The trail is append-only to clients; system signup role events may have a null actor.

Existing published courses are grandfathered as approved. New courses start as drafts; teachers submit through `request_course_review`; admins approve/reject/unpublish with reasons. Direct publication/status tampering is rejected. Editing course title/description/price through the browser returns it to draft and unpublishes it. This is publication/metadata review, not immutable versioned approval of every subsequent lesson edit. Content deletion/pinning and certificate revocation require confirmation and backend authorization, and retain reasons in audit records. No insecure administrator bootstrap route is added.

Account status shows registered profile state. Global Auth suspension/reactivation is deliberately not implemented: disabling only UI roles would leave existing user-owned RLS paths/JWTs active. Provider-level suspension/revocation needs a separately reviewed Auth administration mechanism. No private Auth data or service key is exposed in the admin SPA.

## Support privacy, validation and anti-spam

The public form validates name, email, category, subject and 10–5,000 character message, with accessible field errors/loading/confirmation. It saves a ticket; it does not send email. Signed-in users are linked only after server JWT verification. Client-submitted owner IDs are ignored. Users read only their own tickets; guests receive a reference but cannot list/read ticket messages through public APIs. Only admins can read internal notes or change ticket states (`open`, `in_progress`, `resolved`, including reopening).

`support-contact` accepts bounded JSON, rejects a honeypot, issues an HMAC-signed random challenge bound to normalized email with a ten-minute lifetime, and checks a 12-bit browser proof of work. The HMAC secret is server-only. `support_intake` is executable only by the service role, has single-use nonce/content binding for idempotent retries, and serializes quotas: three accepted submissions per email per fixed database hour and 100 global per hour. Rate-limit keys use keyed hashes, not public raw emails. These are basic bounded anti-spam controls, not abuse-proof identity verification; challenge generation itself is stateless and public. No claim of trusted client IP throttling is made, avoiding spoofable forwarding headers. Internet-scale abuse monitoring/edge limits remain an operations acceptance item.

Origin checks use an explicit server allowlist; CORS is supplemental, not authorization. Invalid JWTs fail instead of silently becoming guests. Only the support function uses the service key, strictly for intake after validation. PDF generation never uses it. Neither function logs credentials, bodies, signed links or ticket contents. The browser has no privileged key.

## External configuration and staging

Five new additive migrations follow all seven October 26 migrations. Use the migration plan/preflight; do not edit applied SQL or run any production migration. New functions and the new frontend must be rolled out together after schema-cache refresh. A frontend against the old schema will correctly report unavailable operations rather than manufacture records.

Before an authorized hosted acceptance run, configure through protected secret tooling:

- `SUPABASE_URL` and server public key `SUPABASE_ANON_KEY`; Supabase usually supplies these in Edge Functions.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-side and is read only by the support intake code. Supabase injects default keys into the function environment; this is a code-use boundary, not a claim of per-function secret isolation. Do not attempt to create a custom `SUPABASE_*` secret; verify the platform-provided legacy keys exist for this pinned adapter.
- `SUPPORT_CHALLENGE_SECRET`: independent random material of at least 32 characters, never a Vite value.
- `APP_ALLOWED_ORIGINS`: comma-separated exact permitted browser origins, including an explicitly approved staging/local acceptance origin.
- `APP_PUBLIC_ORIGIN`: exact HTTPS application origin for certificate verification (HTTP permitted only for loopback local tests).
- Package the two Edge Functions with their `deno.json` import map and configured static font files. `verify_jwt=false` allows modern public keys and guest intake; PDF and signed-in support still perform explicit server-side `getUser` checks. Verify gateway settings, font bundling, CORS and key scope on staging before release.
- For real tests, existing external role/target settings plus `STAGING_FUNCTIONS=enabled` only after both functions are configured/deployed by an authorized operator. `STAGING_REALTIME` remains a separate gate.

No function was deployed here. Sixteen real staging scenarios are prepared but blocked without an approved target/credentials; optional PDF/support and Realtime scenarios have additional configuration gates. The suite creates only test-owned records, but certificate/booking/audit/support history now intentionally survives some course deletion. Review exact-ID ignored manifests and perform privileged cleanup only inside disposable staging. No broad production cleanup is authorized.

## Local evidence and reproduction

- `npm run verify`: types (including server handlers), lint, unit/component/server, PGlite SQL, build and default Chrome workflows.
- `npm run test:concurrency`: optional independent-connection PostgreSQL race test. Without `LOCAL_POSTGRES_BIN` it explicitly skips; it never reads `.env` or `DATABASE_URL`. With disposable binaries it creates its own private Unix-socket cluster, no TCP listener, replays SQL with Auth/Storage/Realtime shims, runs four races, and stops/removes the cluster. This phase executed it with temporary PostgreSQL 18.4 binaries from `@embedded-postgres/linux-x64@18.4.0-beta.17` (package wrapper version); no runtime dependency was added. Provider extensions remain untested.
- Browser fixtures simulate service contracts; the actual PDF generator and support challenge/handler logic are reused in those intercepted routes. SQL authorization has separate actual-engine evidence. Provider HTTP serialization/JWT/Storage transport is not silently substituted.
- Actual Deno 2.9.6 frozen-lock typecheck and `tests/edge-runtime.mjs` smoke passed with synthetic adapters, without unsafe prototype flags. Reproduction commands and the separately audited 31-version Deno graph are in TESTING.md. This does not prove the hosted Edge runtime or deployment.
- Unit PDF sample: ignored `artifacts/phase3-pdf/bangla-certificate.pdf`; browser PDF downloads have header/page/content checks. Failure traces/screenshots are retained. See TESTING and verification.json for exact final counts and intermediate failures.

Primary references: [Supabase injected environment variables](https://supabase.com/docs/guides/functions/secrets#default-secrets), [Supabase static function files](https://supabase.com/docs/guides/local-development/cli/config#functionsfunction_namestatic_files), [pdf-lib custom fonts](https://pdf-lib.js.org/docs/api/classes/pdfdocument#embedfont), [fontkit layout/glyph API](https://github.com/foliojs/fontkit#fontlayoutstring-features--script--language--direction), [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Font sources: [Noto Sans](https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf), [Noto Sans Bengali](https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf), [OFL](https://github.com/notofonts/noto-fonts/blob/main/LICENSE). SHA-256: Noto Sans `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`; Bengali `6300c5370cd688b0641343de4c786de6d412bb6c578d129dae75e93a0322dcab`.

## Inspected examples (synthetic local data)

[Tutoring mobile](screenshots/phase3-tutoring-mobile.png) · [Admin support mobile](screenshots/phase3-admin-support-mobile.png) · [Course review](screenshots/phase3-admin-courses.png) · [Public verification mobile](screenshots/phase3-certificate-verification-mobile.png) · [Rendered Bangla PDF](screenshots/phase3-bangla-certificate.png). These are disposable fixture/runtime examples, not hosted accounts, platform business statistics or university-issued awards. The PDF preview uses the synthetic Deno snapshot; the browser examples use intercepted service contracts.
