# Database rollout and external acceptance

No hosted database, storage object, account, payment setting, or Realtime configuration was changed during this work.

## Canonical migration path

Apply `supabase/migrations/` in timestamp order to a disposable Supabase project. The historical `drizzle/migrations/0000_create_teacher_requests.sql` introduced only teacher requests; the October migration adopts this table with `IF NOT EXISTS` and replaces its policies. Do not run the empty Drizzle schema as a replacement for Supabase migrations.

The seven October migrations repair assessment/role authorization, private storage, tutoring, authenticated private signaling, activity integrity, catalog/leaderboard access, lesson bookmarks, and course-child ownership. These are additive source changes awaiting hosted acceptance.

## Existing-data preflight

Run read-only checks in the authorized staging environment before applying changes:

```sql
-- One submission per assignment/student is now enforced. Preserve academic work:
-- manually reconcile duplicate histories before creating the unique index.
SELECT assignment_id, student_id, count(*)
FROM public.submissions GROUP BY assignment_id, student_id HAVING count(*) > 1;

-- New profile relationships are NOT VALID for historical rows; identify orphans.
SELECT s.id FROM public.submissions s LEFT JOIN public.profiles p ON p.user_id=s.student_id WHERE p.user_id IS NULL;
SELECT r.id FROM public.course_reviews r LEFT JOIN public.profiles p ON p.user_id=r.user_id WHERE p.user_id IS NULL;

-- Review malformed legacy questions before validating the new constraints.
SELECT id FROM public.quiz_questions WHERE jsonb_typeof(options)<>'array'
 OR jsonb_array_length(options)<2 OR correct_answer<0
 OR correct_answer>=jsonb_array_length(options) OR points<=0;
```

The unique submission index intentionally fails on duplicates; the migration does not delete or pick a winning submission. New question/pass-percentage and foreign-key checks use `NOT VALID` where specified, so new writes are checked while historical rows need separate validation. Older `reviewed` submission statuses remain readable in the UI; new grades use `graded`. Editing malformed historical rows may need an explicit data repair.

## Storage changes

`submissions`, `lesson-files`, and `class-recordings` become private. Bucket size/MIME limits are configured for Supabase Storage to enforce; the WASM table shim does not emulate the Storage service's validation. Avatars and course thumbnails remain public raster images.

New paths:

- Lesson: `<course-id>/<random-id>.<extension>`.
- Submission: `<student-id>/<assignment-id>/<timestamp>.<extension>`.
- Recording: `<live-class-id>/<random-id>.webm`.
- Thumbnail: existing `<course-id>/thumbnail.<extension>`.

Legacy public URLs are converted into object paths before signing. Root-level lesson uploads and teacher-prefixed recordings from older versions do not match the new authorization paths. Inventory and copy/move those objects, then update referencing rows through an explicitly authorized storage migration. Expired signed URLs require reopening a resource. Very long videos can require signed-URL refresh; automatic playback renewal is not implemented.

Review older generic notification inserts: the client no longer writes notifications; trusted triggers emit them. New badge inserts check actual activity. The current client does not compute the completed-course badge count automatically; achievement automation remains partial.

## Auth, roles and Realtime

The signup trigger always assigns `student`, regardless of metadata. `wants_teacher` creates a pending request only. Approving the request and granting the teacher role occur in one locked RPC transaction. Existing direct role grants remain administrator-only. Last-admin protections include DELETE and future UPDATE paths; concurrent multi-connection behavior still needs hosted verification.

Enable private-only Realtime in the dashboard and inspect existing `realtime.messages` policies. Permissive policies combine with OR; unrelated broad INSERT/SELECT policies must not bypass the intended live-topic policy. The application subscribes with `private: true` and sends through `send_live_signal`, which stamps identity and rejects teacher-only events from students. This follows [Supabase's Realtime authorization model](https://supabase.com/docs/guides/realtime/authorization); RLS join authorization is cached, so revocation of an already connected participant is not immediate. The RPC checks access on every send, but existing subscriptions require hosted lifecycle/revocation review.

Deploy the optional assistant with caller-JWT authorization and RLS context reads. It no longer uses a service-role key to read course material. Provider quota, application rate limiting, abuse controls, and Deno/provider integration remain unverified; leave it out of the exam demonstration until those checks are complete.

## Required hosted acceptance

- Replay all migrations on staging, validate existing data, inspect generated PostgREST relationships and schema cache.
- Test real confirmation/recovery email and an approved Google OAuth configuration.
- Test distinct student/teacher/admin JWTs directly against REST, RPC, signed files, and private Realtime.
- Verify Storage MIME/size enforcement, legacy object access, recording upload/metadata rollback, and long-video expiry.
- Test WebRTC across physical devices and different networks; configure an authorized TURN relay before promising broad connectivity.
- Review remaining dependency advisories before public deployment.
