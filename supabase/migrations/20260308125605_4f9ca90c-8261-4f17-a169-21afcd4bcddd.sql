
-- Create course_reviews table
CREATE TABLE public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.course_reviews FOR SELECT
USING (true);

-- Enrolled students can create reviews
CREATE POLICY "Enrolled students can create reviews"
ON public.course_reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid() AND e.course_id = course_reviews.course_id
  )
);

-- Users can update own reviews
CREATE POLICY "Users can update own reviews"
ON public.course_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews"
ON public.course_reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Admins can delete any review
CREATE POLICY "Admins can delete any review"
ON public.course_reviews FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));
