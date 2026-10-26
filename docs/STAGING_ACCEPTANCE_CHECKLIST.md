# Staging and academic acceptance

27 October 2026. **No real Supabase staging scenario has passed in this phase.** The separate suite discovers 11 scenarios and skips them without explicit target authorization and external credentials. Skips are blockers, never passes. Local simulated-browser and PostgreSQL WASM evidence is listed in TESTING.md.

## Before enabling real tests

- [ ] Record explicit approval of a disposable, empty staging project and its exact host/reference. Confirm it is separate from production; an environment-variable label alone cannot identify production safely.
- [ ] Complete every preflight, backup/restore and migration step in [STAGING_MIGRATION_PLAN.md](STAGING_MIGRATION_PLAN.md). Record ledger versions, migration hashes, validated constraints and policy review.
- [ ] Create three **dedicated test accounts** through the authorized staging Auth invitation/signup/admin mechanism. Confirm emails through the staging mechanism. Assign teacher/admin roles through trusted server/SQL tooling only; the test runner never grants roles or provisions accounts.
- [ ] Supply the exact approved host, public key and three role credentials externally. Verify the student has neither teacher nor admin and the teacher has no admin role.
- [ ] Allow the runner to create and delete only its UUID-scoped, `staging-acceptance-*` courses, lessons, assessments, bookmarks and test objects. Keep unrelated data out of this project.
- [ ] Configure allowed Auth origins/recovery redirects. Review private-only Realtime settings and all policies before setting `STAGING_REALTIME=enabled`.
- [ ] Restrict artifact access. Real tests disable traces/screenshots/video, but reporter errors or future debugging can still reveal identity information. Never commit reports, credential files, sessions or signed URLs.

## Automated real-service scenarios (all currently blocked)

| Scenario | Prepared proof | Acceptance required |
| --- | --- | --- |
| Student, teacher, admin login/reload/logout | Three independent UI logins, role checks with real SDK/JWT, restored protected view and logout redirect | Run all three; confirm no session leakage across contexts |
| Enrollment and private access | Student cannot read lesson/draft or enroll into draft before joining published free course | HTTP/RLS behavior on hosted migrations |
| Teacher management | Disposable course setup through teacher JWT, UI course edit, independent server readback, scoped cleanup | Full manual create/module/upload/publish/delete walkthrough too |
| Progress | UI complete/reload and direct persisted row check | Hosted write and PostgREST conflict semantics |
| Quiz integrity | Answer-key read and fabricated score rejected; actual UI answer/result compared with stored score | Confirm RPC serialization and role column grants |
| Assignment/grading | UI submission, rejected self-grade, independent teacher grading, student reload | Named PostgREST profile relationship and notifications |
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
- [ ] Re-run full and production dependency audits before acceptance; this phase reports zero known findings. See SECURITY_RESOLUTION.md for all prior findings and scope. Keep test/dev servers on loopback and compile only trusted source.
- [ ] Measure load, concurrent usage, bundle/loading performance and recovery objectives. No availability/scalability/load/compliance certification is claimed.
- [ ] Complete screen-reader, keyboard, contrast, touch, non-Chrome and physical-device review; full dashboard translation remains incomplete.

## Cleanup and academic demonstration

- [ ] Confirm exact-ID course/object cleanup succeeded. Keep the ignored `artifacts/staging/staging-acceptance-*.json` manifest for any failed/partial run. Never clean by broad prefix across unrelated accounts.
- [ ] A trusted staging operator must remove trigger-generated notifications for the **manifest's course/live/assignment links** if needed; ordinary JWTs cannot delete all notifications. Keep dedicated accounts or remove them through approved Auth tooling after reviewing related rows. The runner does not delete identities.
- [ ] Cross-check names/supervisor/title with the report cover. Omit its student IDs from public UI/docs. The original PDF is retained outside the repository.
- [ ] Follow FINAL_YEAR_DEMO_GUIDE.md and identify whether the demonstration uses intercepted service fixtures or the approved live staging project. Never describe fixture persistence as hosted persistence.
- [ ] Explain report inconsistencies: §3.3's resource-oriented ER figure, §3.5's conceptual schema, §3.7's Next.js listing and §5.2's future work. The current source schema and measured tests are the implementation evidence.
- [ ] Leave payments, AI scoring, native apps and automated certification described as future work; standard SQL quiz scoring is implemented. Course approval and promo codes remain absent.
- [ ] Use the selected Phase 1 screenshots only as labeled disposable-fixture examples; compare fresh browser artifacts with the interface before presentation. No real account credentials in slides or recordings.

Public deployment remains blocked until the required hosted/security/operational acceptance above is completed and approved. This phase makes a local commit only.
