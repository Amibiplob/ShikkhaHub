DO $$
DECLARE t text;
  public_read text[] := ARRAY['courses','profiles','modules','lessons','community_posts','community_comments','community_upvotes','course_reviews','course_prerequisites','badges','user_badges','live_classes','quizzes','quiz_questions','class_recordings','course_discussions'];
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF t = ANY(public_read) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;