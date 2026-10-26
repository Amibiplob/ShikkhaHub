-- Read-only. Run with psql -X -v ON_ERROR_STOP=1 against APPROVED STAGING only.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS database_role, version();
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron','pg_net');
SELECT 'duplicate submission groups' AS check_name, count(*) AS blockers FROM
 (SELECT 1 FROM public.submissions GROUP BY assignment_id,student_id HAVING count(*)>1) s
UNION ALL SELECT 'submission profile orphans', count(*) FROM public.submissions s
 LEFT JOIN public.profiles p ON p.user_id=s.student_id WHERE p.user_id IS NULL
UNION ALL SELECT 'review profile orphans', count(*) FROM public.course_reviews r
 LEFT JOIN public.profiles p ON p.user_id=r.user_id WHERE p.user_id IS NULL
UNION ALL SELECT 'invalid quiz questions', count(*) FROM public.quiz_questions
 WHERE CASE WHEN jsonb_typeof(options)='array' THEN
 jsonb_array_length(options)<2 OR correct_answer<0 OR correct_answer>=jsonb_array_length(options) OR points<=0
 ELSE true END
UNION ALL SELECT 'invalid quiz pass thresholds', count(*) FROM public.quizzes WHERE pass_percentage NOT BETWEEN 0 AND 100
UNION ALL SELECT 'invalid assignment mark ranges', count(*) FROM public.assignments WHERE max_marks IS NULL OR max_marks<=0
UNION ALL SELECT 'assignment owner mismatch', count(*) FROM public.assignments a
 JOIN public.courses c ON c.id=a.course_id WHERE a.teacher_id<>c.teacher_id
UNION ALL SELECT 'live owner mismatch', count(*) FROM public.live_classes l
 JOIN public.courses c ON c.id=l.course_id WHERE l.teacher_id<>c.teacher_id
UNION ALL SELECT 'cross-course discussion parents', count(*) FROM public.course_discussions d
 JOIN public.course_discussions p ON p.id=d.parent_id WHERE p.course_id<>d.course_id;

-- Optional old Drizzle table; no table or data is created by this check.
DO $$ DECLARE duplicates bigint; BEGIN
 IF to_regclass('public.teacher_requests') IS NOT NULL THEN
  EXECUTE 'SELECT count(*) FROM (SELECT 1 FROM public.teacher_requests WHERE status=''pending'' GROUP BY user_id HAVING count(*)>1) s' INTO duplicates;
  RAISE NOTICE 'Duplicate pending teacher-request groups: %', duplicates;
 END IF;
END $$;

-- Compare complete definitions with reviewed migrations; names alone are insufficient.
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
 WHERE schemaname IN ('public','storage','realtime') ORDER BY schemaname,tablename,policyname;
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
 WHERE schemaname='public' ORDER BY tablename,indexname;
SELECT n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS type
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname='teacher_requests' AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum;
SELECT event_object_table,trigger_name,action_timing,event_manipulation FROM information_schema.triggers
 WHERE trigger_schema='public' ORDER BY event_object_table,trigger_name;
SELECT bucket_id,count(*) AS objects,
 count(*) FILTER (WHERE position('/' IN name)=0) AS root_objects FROM storage.objects
 WHERE bucket_id IN ('lesson-files','submissions','class-recordings','course-thumbnails') GROUP BY bucket_id;
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets
 WHERE id IN ('lesson-files','submissions','class-recordings','course-thumbnails','avatars');
SELECT conrelid::regclass AS relation,conname,convalidated,pg_get_constraintdef(oid) AS definition
 FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text,conname;
ROLLBACK;
