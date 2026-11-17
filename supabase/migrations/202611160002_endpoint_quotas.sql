-- Atomic per-account quotas shared by all Edge instances. One row per endpoint
-- and account; no unbounded request journal or caller-supplied identity/limit.
CREATE TABLE public.endpoint_quotas (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL CHECK (endpoint IN ('assistant','certificate','ice')),
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits BETWEEN 1 AND 12),
  PRIMARY KEY(user_id,endpoint)
);
ALTER TABLE public.endpoint_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.endpoint_quotas FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.consume_endpoint_quota(endpoint_name text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE maximum integer; caller uuid := auth.uid(); consumed integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  maximum := CASE endpoint_name WHEN 'assistant' THEN 6 WHEN 'certificate' THEN 10 WHEN 'ice' THEN 12 ELSE NULL END;
  IF maximum IS NULL THEN RAISE EXCEPTION 'Invalid endpoint' USING ERRCODE='22023'; END IF;
  INSERT INTO public.endpoint_quotas AS q(user_id,endpoint,window_start,hits)
    VALUES(caller,endpoint_name,date_trunc('minute',clock_timestamp()),1)
  ON CONFLICT(user_id,endpoint) DO UPDATE SET
    window_start=excluded.window_start,
    hits=CASE WHEN q.window_start=excluded.window_start THEN q.hits+1 ELSE 1 END
  WHERE q.window_start<>excluded.window_start OR q.hits<maximum
  RETURNING hits INTO consumed;
  RETURN consumed IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_endpoint_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_endpoint_quota(text) TO authenticated;
