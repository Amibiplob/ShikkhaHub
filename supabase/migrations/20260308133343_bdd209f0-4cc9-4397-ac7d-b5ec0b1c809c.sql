
-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  pass_percentage INTEGER NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course bookmarks
CREATE TABLE public.course_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Course prerequisites
CREATE TABLE public.course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id)
);

-- RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Quizzes: viewable with course
CREATE POLICY "Quizzes viewable with course" ON public.quizzes FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND (c.is_published = true OR c.teacher_id = auth.uid())));
CREATE POLICY "Teachers can manage quizzes" ON public.quizzes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Teachers can update quizzes" ON public.quizzes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Teachers can delete quizzes" ON public.quizzes FOR DELETE
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()));

-- Quiz questions
CREATE POLICY "Questions viewable with quiz" ON public.quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND (c.is_published = true OR c.teacher_id = auth.uid())));
CREATE POLICY "Teachers can manage questions" ON public.quiz_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid()));

-- Quiz attempts
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view course attempts" ON public.quiz_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Users can submit attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.course_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark" ON public.course_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmarks" ON public.course_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Prerequisites: viewable by everyone
CREATE POLICY "Anyone can view prerequisites" ON public.course_prerequisites FOR SELECT USING (true);
CREATE POLICY "Teachers can manage prerequisites" ON public.course_prerequisites FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_prerequisites.course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Teachers can delete prerequisites" ON public.course_prerequisites FOR DELETE
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_prerequisites.course_id AND c.teacher_id = auth.uid()));
