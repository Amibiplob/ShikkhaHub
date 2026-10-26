# Final-year demonstration guide

## Project overview

**ShikkhaHub — An Online Based Educational Platform** is a final-year CSE project by Md Biplob Hossain, Leon Khan, Al Amin, and Asif Khan at City University, Bangladesh. Supervisor: Ahsan Habib, Lecturer and Coordinator, Department of CSE.

Demonstrate a course authoring → student learning → assessment → tutoring → moderation sequence. Do not imply university endorsement, accredited certification, live payments, or hosted acceptance from simulated service fixtures.

## Architecture explanation

The frontend is a React/TypeScript SPA built by Vite. React Router selects screens; shadcn/ui and Tailwind provide presentation. Supabase supplies Auth, PostgreSQL/PostgREST, Storage, and Realtime. RLS protects rows even when a caller bypasses the UI. Quiz scoring and live event identity are handled in database RPCs. WebRTC transports a teacher's media to students; private Realtime carries authorized signaling and chat.

Main database groups:

- Identity: `profiles`, `user_roles`, `teacher_requests`.
- Learning: `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress`, course/lesson bookmarks.
- Assessments: `quizzes`, `quiz_questions`, `quiz_attempts`, `assignments`, `submissions`.
- Interaction: community posts/comments/votes, `course_discussions`, notifications.
- Live/tutoring: `live_classes`, `class_recordings`, `tutor_slots`, `tutoring_requests`.
- Existing achievements: badges, user badges, certificates.

## Safe preparation

Use a disposable Supabase project with reviewed migrations and explicitly provisioned student/teacher/admin accounts. Seed one published free course, a teacher-owned draft, a lesson, quiz, assignment, and future tutoring slot. Never display real emails, passwords, student IDs, submissions or provider secrets during the demo.

Alternatively run `npm run test:e2e:headed`. The suite generates ephemeral passwords and simulated accounts, intercepts HTTP/WebSocket requests, and uses real Chrome. Its local test data is neither production seed content nor real provider account provisioning. SQL integration tests run against disposable PostgreSQL WASM with Auth/Storage/Realtime shims. Explain these boundaries to examiners.

## Student sequence

1. Open the landing page; explain discovery, live learning, community, and team attribution. Change theme/language.
2. Open Courses. Search and filter category, difficulty and instructor. Open a free course.
3. Sign in through the form. Enroll and show the dashboard. Open the course.
4. Read a Markdown lesson, bookmark the lesson/course, mark completion and reload to demonstrate persistence. Completion is user-reported progress.
5. Attempt the quiz and show server-returned score and history. Explain that answer keys are withheld from students and submitted scores are rejected.
6. Submit an HTTPS repository/website link, or an allowed small document in the staging Storage environment. Reload and show pending status.
7. Post a course discussion and reply. Open community posts/comments/votes.
8. Request a tutor's future slot. After teacher approval, reload and show the private meeting link.
9. Open the scheduled/live class. In the local automated demonstration, fake devices provide media; do not claim this proves real camera/network service.
10. Sign out; revisit a protected route and show the sign-in redirect.

## Teacher sequence

1. Sign in as an approved teacher and open My Courses.
2. Create a course. It starts as a draft. Edit its title/description/category and, optionally, BDT presentation price. Keep the demo course free.
3. Add a module and documentation lesson. Edit the lesson. Add a document or video metadata using safe test content.
4. Create a quiz with two or more options and a valid correct answer. Create an assignment.
5. Publish; verify the catalog from the student's independent context.
6. Review a student's submission, set bounded marks and feedback, then show the student's persisted result. The database creates the notification.
7. View enrolled progress and analytics; explain that the teacher sees only owned-course activity.
8. Offer a future tutoring slot; approve/reject a request and provide an HTTPS meeting link.
9. Schedule a class. Start camera/audio, join from an independent student browser, exchange chat, raise a hand, leave/rejoin and end. The automated local test exercises real peer media with simulated signaling; hosted Realtime/TURN must be demonstrated separately.

## Administrator sequence

1. Sign in with an explicitly provisioned test administrator. Ordinary signup cannot grant admin.
2. Search the user table and inspect roles.
3. Approve a teacher request; explain atomic status/role updates.
4. Inspect courses, enrollments, platform counts and reported community posts. Use only disposable records for mutations.
5. Demonstrate student rejection from `/admin` and direct SQL/RPC authorization tests.
6. Explain the last-admin invariant. Do not attempt to demote a real administrator during the demonstration.

## Testing evidence

Use `npm run verify` and the recorded counts in `TESTING.md` / `docs/verification.json`. Open the Playwright HTML report with `npx playwright show-report`. Failures retain screenshots and traces; useful passing screenshots are stored in test output and selected examples in `docs/screenshots/`.

Mention what each layer proves: components and race guards (Vitest), SQL policies/constraints/RPCs (PostgreSQL WASM), and actual rendered navigation/typing/persistence/media across browser contexts (Chrome with simulated service contracts). No fabricated coverage percentages or production acceptance claims.

## Known limitations and likely examiner questions

- **Why Vite rather than Next.js?** Source inspection established the working SPA architecture. No framework migration was needed to implement these workflows.
- **Can changing a role in devtools grant admin?** UI state can be altered, but SQL RLS/RPC authorization uses authenticated identity and server-side role records.
- **Who computes quiz scores?** PostgreSQL; the client submits answers only. Timed attempts and proctoring are future work.
- **Can a student grade themselves or read another submission?** Submission triggers and RLS reject those operations; isolated SQL regressions cover them.
- **Are paid purchases supported?** Prices can be displayed, but no real gateway or paid entitlements exist. Direct paid self-enrollment is blocked.
- **Is live video production-ready?** Local peer transport has automated evidence. Hosted Realtime, TURN/NAT, physical-device, recording and scale acceptance remain open.
- **Do tutoring links enforce provider admission?** The application restricts disclosure; an external meeting provider controls admission once a link is shared.
- **Are certificates official?** They are existing platform-generated completion images, not accredited or university-issued awards.
- **Was the university PDF checked?** Phase 2 inspected all 33 pages of the original report found in Downloads; the matrix cites printed pages and physical PDF pages. Its conceptual schema and resource-oriented ER figure differ from the implemented schema.
- **Can it be publicly deployed now?** A build is available, but hosted/security/operational acceptance remains blocked. Dated dependency audits currently report zero known findings. No deployment or push was performed.

Phase 2 real-service tests and provisioning prerequisites are described in [STAGING_ACCEPTANCE_CHECKLIST.md](STAGING_ACCEPTANCE_CHECKLIST.md). The 11 prepared real-service scenarios are blocked until external staging authorization and credentials are supplied. Report screenshots in §4.2 are historical: the current interface has renamed branding, safer controls and expanded sections. Use newly generated local fixture screenshots as labeled examples, never as real-account evidence.
