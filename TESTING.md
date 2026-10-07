# ShikkhaHub QA / Testing

## Automated
- `bun run test` — unit + component tests (Vitest)
  - `src/lib/translations.test.ts` — every English text has a Bangla version
  - `src/contexts/LanguageContext.test.tsx` — language toggle, saving, fallback
  - `src/hooks/usePermissions.test.ts` — student / teacher / admin permissions
  - `src/components/ProtectedRoute.test.tsx` — sign-in redirect, access denied
  - `src/lib/communitySort.test.ts` — Popular order (pinned, votes, newest) holds across pages
  - `src/components/CourseCard.test.tsx` — course data, link, missing-thumbnail fallback
  - `src/pages/Auth.test.tsx` — sign-in default, `?tab=signup&role=teacher`, form rules
- `bun run test:coverage` — same tests plus a coverage report
- `bun run test:e2e` — browser smoke test (`e2e/smoke_e2e.py`, needs the app running on :8080):
  public pages load with no JS errors, no sideways scroll on desktop and mobile, protected pages redirect to sign-in.

## Manual checklist (each release)
- [ ] Sign up as student and as teacher (`/auth?tab=signup&role=teacher`); password reset email arrives
- [ ] Teacher creates a course, module, lesson, attachment, and quiz
- [ ] Student enrolls, completes a lesson, takes the quiz, and sees progress
- [ ] Assignment submit (GitHub/URL/file) → teacher grades → student gets a notification
- [ ] Live class: start, join from a second browser, video/audio, chat, raise hand, viewer count
- [ ] AI course assistant answers
- [ ] Community: post, comment, reply, vote, delete, Popular/Newest across pages
- [ ] Certificate download, badges, leaderboard
- [ ] Bangla/English toggle and dark/light mode on every page
- [ ] Admin: change roles; the last admin can't be removed
