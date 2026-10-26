ALTER TABLE public.courses ADD COLUMN price_bdt integer NOT NULL DEFAULT 0 CHECK(price_bdt>=0);
-- Until a real gateway and entitlement service exist, paid courses cannot be
-- self-enrolled through a REST request, regardless of hidden/disabled buttons.
DROP POLICY "Users can enroll" ON public.enrollments;
CREATE POLICY "Users can enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (
 user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.is_published AND c.price_bdt=0));

CREATE FUNCTION public.get_leaderboard() RETURNS TABLE(user_id uuid,full_name text,"completedCourses" bigint,certificates bigint,"lessonsCompleted" bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,coalesce(p.full_name,'Anonymous'),
 (SELECT count(*) FROM public.certificates c WHERE c.user_id=p.user_id),
 (SELECT count(*) FROM public.certificates c WHERE c.user_id=p.user_id),
 (SELECT count(*) FROM public.lesson_progress lp WHERE lp.user_id=p.user_id AND lp.completed)
 FROM public.profiles p
 WHERE EXISTS(SELECT 1 FROM public.lesson_progress lp WHERE lp.user_id=p.user_id AND lp.completed)
 OR EXISTS(SELECT 1 FROM public.certificates c WHERE c.user_id=p.user_id)
 ORDER BY 4 DESC,5 DESC,p.user_id LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon,authenticated;
