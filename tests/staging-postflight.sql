-- Read-only catalog checks AFTER the complete canonical migration chain.
-- Use a trusted migration-owner connection to VERIFIED DISPOSABLE STAGING.
-- A single JSON report also preserves every result through the CLI Management API.
-- Zero blockers is catalog evidence, not hosted JWT/service acceptance.
-- Review full policy/index definitions and function owners, not names/counts alone.
-- The four NOT VALID legacy constraints require separate reviewed validation.
-- Cron schedules and private-only Realtime settings require provider checks.
BEGIN READ ONLY;
WITH sections AS (
SELECT 'identity' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT current_database() AS database_name, current_user AS database_role, version()
) item
UNION ALL
SELECT 'checks' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
WITH expected(name) AS (VALUES
 ('profiles'),('user_roles'),('courses'),('modules'),('lessons'),('enrollments'),
 ('community_posts'),('community_comments'),('community_upvotes'),('live_classes'),
 ('assignments'),('submissions'),('course_reviews'),('certificates'),('course_discussions'),
 ('notifications'),('badges'),('user_badges'),('quizzes'),('quiz_questions'),('quiz_attempts'),
 ('course_bookmarks'),('course_prerequisites'),('class_recordings'),('teacher_requests'),
 ('tutor_slots'),('tutoring_requests'),('lesson_bookmarks'),('application_locks'),
 ('admin_audit_log'),('tutor_profiles'),('support_tickets'),('support_notes'),('support_intake_limits')),
checks AS (
 SELECT 'missing application tables' AS check_name,count(*) AS blockers FROM expected e
 WHERE to_regclass('public.'||e.name) IS NULL
 UNION ALL SELECT 'application tables without RLS',count(*) FROM expected e
 JOIN pg_class c ON c.oid=to_regclass('public.'||e.name) WHERE NOT c.relrowsecurity
 UNION ALL SELECT 'missing required unique indexes',count(*) FROM (VALUES
 ('submissions_one_per_student'),('teacher_requests_one_pending'),('tutor_slot_one_approved'),('certificates_number_unique')) e(name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indexrelid=to_regclass('public.'||e.name) AND i.indisunique AND i.indisvalid)
 UNION ALL SELECT 'missing lifecycle RPCs',count(*) FROM (VALUES
 ('submit_quiz(uuid,jsonb)'),('read_quiz_questions(uuid)'),('review_teacher_request(uuid,boolean)'),
 ('save_tutor_slot(uuid,text,timestamptz,integer,text,integer)'),('request_tutoring(uuid,text)'),
 ('decide_tutoring(uuid,text,text,text)'),('issue_course_certificate(uuid)'),
 ('certificate_download_record(uuid)'),('verify_certificate(uuid)'),
 ('admin_set_role(uuid,app_role,boolean,text)'),('admin_course_action(uuid,text,text)'),
 ('admin_support_action(uuid,text,text)'),('admin_records(text,text,text,integer,integer)'),
 ('send_live_signal(text,text,jsonb)'),('support_intake(uuid,uuid,text,text,text,text,text,text,text)')) e(signature)
 WHERE to_regprocedure('public.'||e.signature) IS NULL
 UNION ALL SELECT 'security definers without fixed search path',count(*) FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace AND p.prosecdef AND NOT EXISTS(
 SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) setting WHERE setting LIKE 'search_path=%')
 UNION ALL SELECT 'missing Storage buckets',count(*) FROM (VALUES
 ('avatars'),('course-thumbnails'),('lesson-files'),('submissions'),('class-recordings')) e(id)
 WHERE NOT EXISTS(SELECT 1 FROM storage.buckets b WHERE b.id=e.id)
 UNION ALL SELECT 'incorrect Storage visibility',count(*) FROM storage.buckets
 WHERE (id IN ('lesson-files','submissions','class-recordings') AND public IS DISTINCT FROM false)
 OR (id IN ('avatars','course-thumbnails') AND public IS DISTINCT FROM true)
 UNION ALL SELECT 'missing notification publication',CASE WHEN EXISTS(
 SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN 0 ELSE 1 END
)
SELECT * FROM checks ORDER BY check_name
) item
UNION ALL
SELECT 'privileges' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT has_table_privilege('authenticated','public.certificates','INSERT') AS certificate_insert_must_be_false,
 has_table_privilege('authenticated','public.user_roles','DELETE') AS role_delete_must_be_false,
 has_table_privilege('authenticated','public.tutoring_requests','UPDATE') AS booking_update_must_be_false,
 has_table_privilege('authenticated','public.quiz_attempts','INSERT') AS attempt_insert_must_be_false,
 has_table_privilege('authenticated','public.notifications','INSERT') AS notification_insert_must_be_false,
 has_column_privilege('authenticated','public.quiz_questions','correct_answer','SELECT') AS answer_read_must_be_false,
 has_function_privilege('authenticated','public.support_intake(uuid,uuid,text,text,text,text,text,text,text)','EXECUTE') AS client_intake_must_be_false,
 has_function_privilege('anon','public.support_intake(uuid,uuid,text,text,text,text,text,text,text)','EXECUTE') AS anonymous_intake_must_be_false
) item
UNION ALL
SELECT 'constraints' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT conrelid::regclass AS relation,conname,convalidated,pg_get_constraintdef(oid) AS definition
 FROM pg_constraint WHERE connamespace='public'::regnamespace AND (contype='f' OR NOT convalidated)
 ORDER BY conrelid::regclass::text,conname
) item
UNION ALL
SELECT 'indexes' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname
) item
UNION ALL
SELECT 'tables' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT n.nspname,c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname
) item
UNION ALL
SELECT 'functions' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT n.nspname,p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname
) item
UNION ALL
SELECT 'schema_permissions' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT role,has_schema_privilege(role,'public','CREATE') AS untrusted_create_must_be_false
 FROM (VALUES ('anon'),('authenticated')) r(role)
) item
UNION ALL
SELECT 'policies' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
 WHERE schemaname IN ('public','storage','realtime') ORDER BY schemaname,tablename,policyname
) item
UNION ALL
SELECT 'triggers' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT event_object_table,trigger_name,action_timing,event_manipulation FROM information_schema.triggers
 WHERE trigger_schema='public' ORDER BY event_object_table,trigger_name
) item
UNION ALL
SELECT 'buckets' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id
) item
UNION ALL
SELECT 'extensions' AS section, coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb) AS rows
FROM (
SELECT extname,extversion FROM pg_extension WHERE extname IN ('pg_cron','pg_net')
) item
)
SELECT jsonb_object_agg(section,rows) AS report FROM sections;
ROLLBACK;
