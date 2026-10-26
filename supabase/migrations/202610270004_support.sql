CREATE TABLE public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 120), email text NOT NULL CHECK(length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 category text NOT NULL CHECK(category IN ('account','courses','tutoring','certificates','technical','other')),
 subject text NOT NULL CHECK(length(trim(subject)) BETWEEN 3 AND 160), message text NOT NULL CHECK(length(trim(message)) BETWEEN 10 AND 5000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
 intake_nonce uuid NOT NULL UNIQUE, payload_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_status_created ON public.support_tickets(status,created_at DESC,id);
CREATE INDEX support_owner_created ON public.support_tickets(user_id,created_at DESC);
CREATE TABLE public.support_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id), body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_notes_ticket ON public.support_notes(ticket_id,created_at);
CREATE TABLE public.support_intake_limits (bucket text NOT NULL, window_start timestamptz NOT NULL, attempts integer NOT NULL, PRIMARY KEY(bucket,window_start));
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_intake_limits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.support_tickets,public.support_notes TO authenticated;
CREATE POLICY "Support owner or admin reads tickets" ON public.support_tickets FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Only admins read internal support notes" ON public.support_notes FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
GRANT ALL ON public.support_tickets,public.support_notes,public.support_intake_limits TO service_role;
REVOKE ALL ON public.support_intake_limits FROM anon,authenticated;

-- Only the server function calls this after validating a signed, expiring,
-- email-bound proof-of-work challenge and (if present) the real user JWT.
CREATE FUNCTION public.support_intake(nonce uuid, owner_id uuid, sender_name text, sender_email text, ticket_category text, ticket_subject text, ticket_message text, email_bucket text, content_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.support_tickets; result uuid; current_window timestamptz=date_trunc('hour',now()); current_bucket text; current_attempts integer;
BEGIN
 UPDATE public.application_locks SET version=version+1 WHERE key='support';
 SELECT * INTO existing FROM public.support_tickets WHERE intake_nonce=nonce;
 IF FOUND THEN
  IF existing.payload_hash<>content_hash OR existing.user_id IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'This request identifier has already been used'; END IF;
  RETURN existing.id;
 END IF;
 IF coalesce(length(email_bucket),0)<>64 OR coalesce(length(content_hash),0)<>64 THEN RAISE EXCEPTION 'Invalid server intake metadata'; END IF;
 DELETE FROM public.support_intake_limits WHERE window_start<now()-interval '2 hours';
 FOREACH current_bucket IN ARRAY ARRAY['global',email_bucket] LOOP
  INSERT INTO public.support_intake_limits(bucket,window_start,attempts) VALUES(current_bucket,current_window,1)
  ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=support_intake_limits.attempts+1 RETURNING support_intake_limits.attempts INTO current_attempts;
  IF current_attempts>(CASE WHEN current_bucket='global' THEN 100 ELSE 3 END) THEN RAISE EXCEPTION 'Support submission limit reached; please try again later'; END IF;
 END LOOP;
 INSERT INTO public.support_tickets(user_id,name,email,category,subject,message,intake_nonce,payload_hash)
 VALUES(owner_id,trim(sender_name),lower(trim(sender_email)),ticket_category,trim(ticket_subject),trim(ticket_message),nonce,content_hash) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.support_intake(uuid,uuid,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_intake(uuid,uuid,text,text,text,text,text,text,text) TO service_role;
CREATE FUNCTION public.admin_support_action(ticket_id uuid, next_status text, internal_note text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF next_status IS NULL OR next_status NOT IN ('open','in_progress','resolved') THEN RAISE EXCEPTION 'Invalid ticket status'; END IF;
 IF internal_note IS NOT NULL AND length(trim(internal_note))>2000 THEN RAISE EXCEPTION 'Internal note is too long'; END IF;
 SELECT status INTO previous FROM public.support_tickets WHERE id=ticket_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
 UPDATE public.support_tickets SET status=next_status,updated_at=now() WHERE id=ticket_id;
 IF coalesce(length(trim(internal_note)),0)>0 THEN INSERT INTO public.support_notes(ticket_id,author_id,body) VALUES(ticket_id,auth.uid(),trim(internal_note)); END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'support.status',ticket_id::text,jsonb_build_object('from',previous,'to',next_status));
END $$;
REVOKE ALL ON FUNCTION public.admin_support_action(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_support_action(uuid,text,text) TO authenticated;
