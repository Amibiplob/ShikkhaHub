-- Teacher access requests: users check "I want to be a teacher" at signup,
-- admins approve (grants the teacher role) or dismiss the request.
CREATE TABLE public.teacher_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_requests_status_check CHECK (status IN ('pending', 'approved', 'dismissed'))
);

-- A user may only have one pending request at a time.
CREATE UNIQUE INDEX teacher_requests_one_pending
  ON public.teacher_requests (user_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.teacher_requests TO authenticated;
GRANT ALL ON public.teacher_requests TO service_role;

ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit their own teacher request"
ON public.teacher_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own request; admins can view all"
ON public.teacher_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can review teacher requests"
ON public.teacher_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.teacher_requests IS 'Signup teacher-access requests reviewed by admins (status: pending/approved/dismissed)';