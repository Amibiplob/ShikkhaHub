-- Read only, before applying 20261027 migrations to APPROVED STAGING after 20261026.
BEGIN READ ONLY;
SELECT 'duplicate certificate numbers' AS check_name,count(*) AS blockers FROM
 (SELECT 1 FROM public.certificates GROUP BY certificate_number HAVING count(*)>1) d
UNION ALL SELECT 'certificate profile orphans',count(*) FROM public.certificates c LEFT JOIN public.profiles p ON p.user_id=c.user_id WHERE p.user_id IS NULL
UNION ALL SELECT 'invalid tutoring windows',count(*) FROM public.tutor_slots WHERE ends_at<=starts_at
UNION ALL SELECT 'confirmed session overlap pairs',count(*) FROM public.tutoring_requests a
 JOIN public.tutor_slots x ON x.id=a.slot_id JOIN public.tutoring_requests b ON a.id<b.id AND b.status='approved'
 JOIN public.tutor_slots y ON y.id=b.slot_id
 WHERE a.status='approved' AND (x.teacher_id=y.teacher_id OR a.student_id=b.student_id OR x.teacher_id=b.student_id OR y.teacher_id=a.student_id)
 AND tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(y.starts_at,y.ends_at,'[)');
SELECT c.id,c.is_published,c.teacher_id FROM public.courses c WHERE c.is_published AND NOT public.has_role(c.teacher_id,'teacher');
SELECT id,user_id,course_id,certificate_number,issued_at FROM public.certificates ORDER BY issued_at;
SELECT schemaname,tablename,policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('courses','user_roles','certificates','tutor_slots','tutoring_requests') ORDER BY tablename,policyname;
ROLLBACK;
