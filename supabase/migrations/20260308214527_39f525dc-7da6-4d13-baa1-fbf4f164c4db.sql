
-- Function to auto-expire live classes older than 1 day
CREATE OR REPLACE FUNCTION public.expire_old_live_classes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.live_classes
  SET status = 'expired', updated_at = now()
  WHERE status IN ('scheduled', 'live')
    AND created_at < now() - interval '1 day';
END;
$$;
