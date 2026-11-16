# UX and recording review — 29 October 2026

## Pre-change inventory

Reviewed the clean `3e7cc78` checkout: AGENTS, README/TESTING, existing architecture/cleanup/classroom evidence, route definitions, feature/query and component inventory, role resolution, course/assessment/certificate journeys, recording lifecycle, migration/policy dependencies, browser fixtures, CI and Vercel. The university report cover and introduction identify the existing team, supervisor, university and learning/tutoring objectives; proposed commercial capabilities in that report are not delivered-payment claims.

| Area | Existing behavior and concrete findings | Priority |
| --- | --- | --- |
| Recording | Canvas + Web Audio + MediaRecorder + IndexedDB, private notice RPC, private upload. Startup awaits notice/storage/audio without deadlines; UI reports recording before the encoder start event. Finalization saves `complete=true` before validating the blob. Upload accepts any metadata 23505 as success and may delete the only local copy without verifying the saved row. | First |
| Backend | 44 canonical migrations. `202610280001` adds meeting/media events and path guard; prior 43-migration backend rejects recording notice. Hosted state is not inferred from fixtures or old reports. | First |
| Background | Retained preliminary artifacts show ~9s packet gap and another 3.661s gap. In the latter, recorder AudioContext #3 advances ~10.17s over ~13.91s wall time while still reported running. This supports audio-clock starvation, not a proven OS/browser root cause or an auth teardown. | First |
| Roles | Auth navigates before roles resolve; admin defaults to dashboard; teacher Analytics renders student analytics; header duplicates learning/teaching menus and links desktop Certificates to Achievements. | High |
| Learning | Course refresh selects lesson one, no previous/next or current-lesson URL, owner sees Enroll, completed certificate retains Finish action; authoritative completion already enforced by RPC. | High |
| Live journey | Modal offers three identical camera/screen/audio paths and can end meeting outside active recorder cleanup; course entry buried below lessons, scheduled and ended labels confusing. Device-free prejoin already works. | High |
| Public and supporting routes | Existing discovery, tutoring, community, FAQ/contact, profile, notifications, certificates and support remain. Home has many repeated sections and academic information lacks mission/story context. Catalog has no visible sort/reset. Recordings are mouse-only cards; profile cramped at 320px. | Medium |
| Architecture | Feature-based architecture and one browser Supabase client already present. Upload business logic mixed into RecordingPanel; giant CourseDetail duplicates live scheduling. Avoid wholesale folder churn. | Medium |
| Cleanup | Historical SQL, security checks, recovery, fonts/licenses, CI and test wrappers have references and must stay. Four custom CSS utilities appear unused; dependency removal requires import/runtime evidence. | Low |
| CI | 15-minute job timeout is below the previous measured ~20-minute single-worker browser suite, before other verify stages. FFmpeg media checks need explicit CI prerequisites. | High |

Routes before changes: `/`, `/auth`, `/reset-password`, `/faq`, `/contact`, `/certificates`, `/certificates/verify/:token`, `/tutors`, `/courses`, `/courses/:id`, `/dashboard`, `/community`, `/community/:id`, `/live/:roomName`, `/recordings/:classId`, `/assignments/:assignmentId`, `/analytics`, `/achievements`, `/leaderboard`, `/profile`, `/admin`, fallback 404. Settings are profile/theme/language controls, not a separate settings route. Teacher course management lives on course detail; grading on assignment detail. No invented routes or unsupported reports are needed.

Internal file/route inventory and raw verification evidence: ignored `artifacts/ux-recording/`. Security boundary: PostgreSQL role checks/RLS, private buckets and identity-stamped RPC remain authoritative. No hosted writes, remote migrations, push or deployment authorized.
