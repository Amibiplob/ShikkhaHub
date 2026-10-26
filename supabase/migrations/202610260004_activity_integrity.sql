-- Notifications are emitted by trusted triggers, never arbitrary browser inserts.
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM authenticated;

CREATE FUNCTION public.guard_badge_award() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE badge public.badges; actual integer;
BEGIN
 SELECT * INTO badge FROM public.badges WHERE id=NEW.badge_id;
 CASE badge.criteria_type
 WHEN 'lessons_completed' THEN SELECT count(*) INTO actual FROM public.lesson_progress WHERE user_id=NEW.user_id AND completed;
 WHEN 'certificates_earned' THEN SELECT count(*) INTO actual FROM public.certificates WHERE user_id=NEW.user_id;
 WHEN 'courses_completed' THEN SELECT count(*) INTO actual FROM public.certificates WHERE user_id=NEW.user_id;
 WHEN 'enrollments' THEN SELECT count(*) INTO actual FROM public.enrollments WHERE user_id=NEW.user_id;
 WHEN 'posts_created' THEN SELECT count(*) INTO actual FROM public.community_posts WHERE user_id=NEW.user_id;
 WHEN 'comments_created' THEN SELECT count(*) INTO actual FROM public.community_comments WHERE user_id=NEW.user_id;
 WHEN 'reviews_written' THEN SELECT count(*) INTO actual FROM public.course_reviews WHERE user_id=NEW.user_id;
 ELSE RAISE EXCEPTION 'Unknown badge criterion'; END CASE;
 IF actual<badge.criteria_value THEN RAISE EXCEPTION 'Badge criteria not met'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_badge_award BEFORE INSERT ON public.user_badges FOR EACH ROW EXECUTE FUNCTION public.guard_badge_award();
REVOKE ALL ON FUNCTION public.guard_badge_award() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.guard_post_moderation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF (TG_OP='INSERT' AND coalesce(NEW.is_pinned,false)) OR (TG_OP='UPDATE' AND NEW.is_pinned IS DISTINCT FROM OLD.is_pinned) THEN
   IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')) THEN RAISE EXCEPTION 'Staff access required to pin posts'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_post_moderation BEFORE INSERT OR UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.guard_post_moderation();
REVOKE ALL ON FUNCTION public.guard_post_moderation() FROM PUBLIC,anon,authenticated;
