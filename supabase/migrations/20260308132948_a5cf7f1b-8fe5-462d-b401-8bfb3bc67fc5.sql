
-- Badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'award',
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User badges (earned)
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges viewable by everyone
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);

-- Admins can manage badges
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Users can view own earned badges
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

-- Anyone can view all earned badges (for leaderboard)
CREATE POLICY "Anyone can view earned badges" ON public.user_badges FOR SELECT USING (true);

-- System can insert badges for users
CREATE POLICY "Authenticated can earn badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow lesson_progress deletion for uncompleting lessons
CREATE POLICY "Users can delete own progress" ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id);

-- Seed default badges
INSERT INTO public.badges (name, description, icon, criteria_type, criteria_value) VALUES
  ('First Steps', 'Complete your first lesson', 'footprints', 'lessons_completed', 1),
  ('Quick Learner', 'Complete 10 lessons', 'zap', 'lessons_completed', 10),
  ('Knowledge Seeker', 'Complete 50 lessons', 'brain', 'lessons_completed', 50),
  ('Course Graduate', 'Complete your first course', 'graduation-cap', 'courses_completed', 1),
  ('Scholar', 'Complete 5 courses', 'scroll', 'courses_completed', 5),
  ('Certified Pro', 'Earn your first certificate', 'award', 'certificates_earned', 1),
  ('Community Voice', 'Create your first community post', 'message-circle', 'posts_created', 1),
  ('Helpful Hand', 'Leave 5 comments', 'heart-handshake', 'comments_created', 5),
  ('Reviewer', 'Write your first course review', 'star', 'reviews_written', 1),
  ('Dedicated', 'Enroll in 3 courses', 'target', 'enrollments', 3);
