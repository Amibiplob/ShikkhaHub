# Staging and academic acceptance

27 October 2026. **All 16 real hosted scenarios passed** on the explicitly approved disposable ShikkhaHub backend after 43 migrations and three function deployments. See [current setup and evidence](SUPABASE_STAGING_SETUP.md). Realtime public/anonymous/recipient boundaries were additionally probed against the real service. Without explicit external settings the suite still skips; skips are never passes. Local intercepted-browser and PostgreSQL evidence remains separate in TESTING.md.

## Before enabling real tests

- [x] Explicit disposable-project approval and exact authenticated/API/link match recorded. No application tables or Storage objects existed initially; one existing Auth account was preserved.
- [x] Record all 43 ledger versions/hashes, review policies/owners, validate all four deferred constraints and run the read-only postflight. The broader backup/restore rehearsal remains an operational gate below.
- [x] Create three **dedicated test accounts** after explicit approval through Auth Admin, confirmed without sending email. Assign teacher/admin only to those new IDs through trusted SQL; the browser test runner never grants roles or provisions accounts.
- [x] Supply the exact approved host, public key and role credentials through protected local tooling. Real JWT checks verified the student has no staff roles and the teacher has no admin role.
- [x] Allow only UUID-scoped test course/object creation and exact-ID cleanup. Retain isolated test accounts and manifests for intentionally surviving history.
- [x] Configure local Auth/recovery URLs; verify public-channel `PrivateOnly`, anonymous private denial and per-recipient authorization before Realtime opt-in. Hosted origin/email/OAuth acceptance remains below.
- [x] Disable hosted traces/screenshots/video and protect credentials/reports/manifests with restrictive permissions. Never commit them.

## Automated real-service scenarios (documented subset passed)

| Scenario | Prepared proof | Acceptance required |
| --- | --- | --- |
| Student, teacher, admin login/reload/logout | Three independent UI logins, role checks with real SDK/JWT, restored protected view and logout redirect | Run all three; confirm no session leakage across contexts |
| Enrollment and private access | Student cannot read lesson/draft or enroll into draft before joining published free course | HTTP/RLS behavior on hosted migrations |
| Teacher management | Disposable course setup through teacher JWT, UI course edit, independent server readback, scoped cleanup | Full manual create/module/upload/publish/delete walkthrough too |
| Progress | UI complete/reload and direct persisted row check | Hosted write and PostgREST conflict semantics |
| Quiz integrity | Answer-key read and fabricated score rejected; actual UI answer/result compared with stored score | Confirm RPC serialization and role column grants |
| Assignment/grading | UI submission, rejected self-grade, independent teacher grading, private grade-notification CDC and student reload | Broader cross-student/teacher and notification-recovery matrix |
| Cross-user access | Rejected student course mutation; teacher cannot read student's private lesson bookmark | Add second learner/second teacher manual matrix for broader isolation |
| Storage | Real text upload, student signing/download, public read denial, cross-owner upload denial | MIME/size, submission/recording buckets, legacy paths, expiry still manual |
| Realtime (separate opt-in) | Private subscription, actual message reception, stamped teacher identity and student teacher-event denial | Outsider join/direct broadcast rejection, cached receiver revocation, physical devices/TURN still manual |

The suite uses real services without HTTP/WebSocket interception. It does not test email delivery, OAuth, payment, physical media or production performance. Its initial fixture creation uses ordinary teacher JWT/RLS, not service-role authorization. The administrator scenario reads the admin UI and verifies access; it does not change other accounts' roles.

## Manual provider and operational acceptance

- [ ] Confirm new-user email, password reset/recovery, session refresh/expiry, server-side revocation and approved OAuth redirect behavior. Attempt protected routes and direct API access anonymously and with expired/other-role JWTs.
- [ ] Use separate learner B and teacher B to check private lessons, submissions, grades, tutoring requests/links, objects and course mutation isolation. Browser guards alone are insufficient.
- [ ] Review hosted RLS grants/policies using public-key JWT clients; verify teacher approval atomicity and last-admin protection with concurrent connections in the disposable project.
- [ ] Verify malformed/large upload rejection, all private buckets, signed-URL expiry, resource reopening and legacy-object conversion. Long-video automatic URL renewal remains incomplete.
- [ ] Exercise tutoring request → approval/rejection/cancel, duplicate reservation races and private link disclosure with real identities.
- [ ] Test private-only Realtime, forbidden outsider joins, direct client broadcast denial and receiver revocation lifecycle. Current join authorization can remain cached.
- [ ] Run teacher/student live media across physical devices and different networks, with an approved TURN relay. Check denied permissions, reconnect, screen share, recording upload/playback, leave and end.
- [ ] Verify scheduled expiry jobs, backup restoration, error/abuse monitoring and authorized provider quotas. Optional AI requires rate limiting and provider/Deno acceptance before use.
- [ ] Re-run full and production dependency audits before release acceptance. Earlier modernization reports recorded zero known findings; this database setup did not refresh that advisory snapshot. See SECURITY_RESOLUTION.md for historical scope. Keep test/dev servers on loopback and compile only trusted source.
- [ ] Measure load, concurrent usage, bundle/loading performance and recovery objectives. No availability/scalability/load/compliance certification is claimed.
- [ ] Complete screen-reader, keyboard, contrast, touch, non-Chrome and physical-device review; full dashboard translation remains incomplete.

## Cleanup and academic demonstration

- [ ] Confirm exact-ID course/object cleanup succeeded. Keep the ignored `artifacts/staging/staging-acceptance-*.json` manifest for any failed/partial run. Never clean by broad prefix across unrelated accounts.
- [ ] A trusted staging operator must remove trigger-generated notifications for the **manifest's course/live/assignment links** if needed; ordinary JWTs cannot delete all notifications. Keep dedicated accounts or remove them through approved Auth tooling after reviewing related rows. The runner does not delete identities.
- [ ] Cross-check names/supervisor/title with the report cover. Omit its student IDs from public UI/docs. The original PDF is retained outside the repository.
- [ ] Follow FINAL_YEAR_DEMO_GUIDE.md and identify whether the demonstration uses intercepted service fixtures or the approved live staging project. Never describe fixture persistence as hosted persistence.
- [ ] Explain report inconsistencies: §3.3's resource-oriented ER figure, §3.5's conceptual schema, §3.7's Next.js listing and §5.2's future work. The current source schema and measured tests are the implementation evidence.
- [ ] Leave paid entitlements, AI scoring, native apps and accredited certification described as future work. SQL quiz grading, authoritative platform certificates and administrator course approval are implemented; promo codes remain absent.
- [ ] Use the selected Phase 1 screenshots only as labeled disposable-fixture examples; compare fresh browser artifacts with the interface before presentation. No real account credentials in slides or recordings.

Public deployment remains blocked until the required hosted/security/operational acceptance above is completed and approved. This phase makes a local commit only.

## Phase 3 additional gates

The real-service suite contains **16 scenarios**, all passed in the current authorized staging run, including actual PDF/support functions and private Realtime. They still skip without explicit approved settings. The items below describe broader/manual acceptance, not claims established by those 16 scenarios alone.

- [ ] Run Phase 3 preflight, resolve certificate-number collisions and legacy booking overlaps, review legacy snapshots, then apply all five new migrations after the seven existing repairs. Verify revoked direct grants, exact policies/owners and schema cache.
- [ ] Accept teacher review metadata workflow: draft → pending → approved/rejected; title/description/price edits return to draft. Confirm grandfathered publication and the non-versioned lesson-edit boundary.
- [ ] Test tutor search/profile/qualifications, individual/weekly availability, IANA timezone/DST errors, unused-slot edit/removal, parallel slot and cross-participant overlaps, accept/decline/cancel/elapsed teacher completion, private links and preserved history.
- [ ] Check actual automatic certificate issuance after all lessons/quiz passes/assignment grades, retry/concurrent uniqueness, immutable snapshots, missing/removed courses, unvalidated legacy rows, revocation and repeated server PDF downloads. Print and inspect Bangla/English fonts and verify public pages omit recipient details.
- [ ] Configure `APP_ALLOWED_ORIGINS`, `APP_PUBLIC_ORIGIN`, `SUPPORT_CHALLENGE_SECRET`, public Supabase settings and server credentials outside source. Confirm only support intake code reads the service key; platform-injected keys are not per-function isolation. Review `deno.json`/lock and bundled static fonts; exercise the deployed functions and gateway auth on staging.
- [ ] Confirm unauthenticated PDF calls, wrong-owner calls, revoked downloads and forged request metadata fail. `verify_jwt=false` at the gateway does not replace the handlers' explicit user JWT checks.
- [ ] Submit guest and signed-in support, invalidate/tamper/expire proofs, replay nonce/content, hit per-email/global quotas and test invalid JWT behavior. Confirm owner-only tickets/admin-only notes, open → in_progress → resolved/reopen, timestamp/audit changes and no unsupported email claim. Add authorized edge-level abuse monitoring/limits before public exposure.
- [ ] Verify admin server counts/search/filter/pagination, role escalation denial, self/final-admin protection (including concurrent stale snapshots), confirmed moderation/revocation and append-only audit access. Global account suspension is not offered; provider-wide suspension needs a separately reviewed mechanism.
- [ ] Review exact-ID ignored manifests for support/booking/certificate/audit records that intentionally survive course cleanup. Dedicated staging accounts/data must remain isolated; no broad cleanup against production is authorized.
- [ ] Complete screen-reader/touch/non-Chrome QA, high-volume performance/retention review and physical/hosted video acceptance. Basic local Chrome responsiveness is not complete accessibility or production scale proof.

## Modernized build and independent assistant

- Use the Node/npm versions and frozen npm/Deno locks in the dependency report. Re-run actual hosted acceptance after upgrading the Supabase client; fixture and SQL tests do not prove provider serialization/JWT/storage transport.
- Optional `course-assistant` now has explicit per-function import-map/JWT settings. Configure `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_API_KEY` and exact `APP_ALLOWED_ORIGINS` in the approved server secret environment only. Review the selected provider's streaming contract, data handling, spend/quota and per-user rate controls before enabling it. No gateway/provider was configured during modernization.
- Confirm SPA fallback routing and replace local social-image metadata with the actual approved absolute URL/canonical origin before publication. Verify Tailwind 4's browser support floor against the accepted device matrix.
- Test persisted light/dark/system preferences, mobile menu controls, uploaded/broken thumbnails and lazy-route navigation against the deployed build. Local screenshots are fixture evidence.
