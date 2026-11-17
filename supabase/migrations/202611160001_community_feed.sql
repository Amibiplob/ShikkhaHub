-- Bounded, RLS-preserving public feed. Search is a literal substring, never SQL
-- or PostgREST filter syntax. Counts/ranking are computed before pagination.
CREATE INDEX IF NOT EXISTS community_upvotes_post_idx ON public.community_upvotes(post_id);
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON public.community_comments(post_id);
CREATE OR REPLACE FUNCTION public.community_feed(
  search_text text DEFAULT '', topic text DEFAULT 'all', ordering text DEFAULT 'newest',
  page_number integer DEFAULT 0, page_size integer DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF ordering IS NULL OR ordering NOT IN ('newest','oldest','popular')
    OR topic IS NULL OR topic NOT IN ('all','programming','career','hardware','ai','general')
    OR page_number IS NULL OR page_number < 0 OR page_number > 100000
    OR page_size IS NULL OR page_size < 1 OR page_size > 50
    OR length(coalesce(search_text,'')) > 200 THEN
    RAISE EXCEPTION 'Invalid community filters' USING ERRCODE = '22023';
  END IF;
  WITH matching AS MATERIALIZED (
    SELECT p.id, p.user_id, p.title, left(p.content,300) AS content, p.category,
      p.is_pinned, p.created_at, p.updated_at, p.is_reported,
      (SELECT count(*) FROM public.community_upvotes u WHERE u.post_id=p.id) AS upvote_count
    FROM public.community_posts p
    WHERE (topic='all' OR p.category=topic)
      AND (coalesce(btrim(search_text),'')='' OR
        strpos(lower(p.title),lower(btrim(search_text)))>0 OR
        strpos(lower(p.content),lower(btrim(search_text)))>0)
  ), selected AS (
    SELECT m.* FROM matching m
    ORDER BY m.is_pinned DESC NULLS LAST,
      CASE WHEN ordering='popular' THEN m.upvote_count END DESC,
      CASE WHEN ordering='oldest' THEN m.created_at END ASC,
      CASE WHEN ordering<>'oldest' THEN m.created_at END DESC, m.id
    LIMIT page_size OFFSET page_number::bigint*page_size
  )
  SELECT jsonb_build_object('total',(SELECT count(*) FROM matching), 'rows',coalesce((
    SELECT jsonb_agg(to_jsonb(s) || jsonb_build_object(
      'profiles',(SELECT jsonb_build_object('full_name',p.full_name,'avatar_url',p.avatar_url)
        FROM public.profiles p WHERE p.user_id=s.user_id),
      'comment_count',(SELECT count(*) FROM public.community_comments c WHERE c.post_id=s.id),
      'viewer_upvoted',EXISTS(SELECT 1 FROM public.community_upvotes u WHERE u.post_id=s.id AND u.user_id=auth.uid())
    )) FROM selected s
  ),'[]'::jsonb)) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.community_feed(text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_feed(text,text,text,integer,integer) TO anon, authenticated;
