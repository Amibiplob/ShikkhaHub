CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'courses', (SELECT count(*) FROM public.courses WHERE is_published = true),
    'students', (SELECT count(DISTINCT user_id) FROM public.enrollments),
    'live_classes', (SELECT count(*) FROM public.live_classes)
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;