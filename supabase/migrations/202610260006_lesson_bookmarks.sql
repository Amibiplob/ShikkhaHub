CREATE TABLE public.lesson_bookmarks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,lesson_id)
);
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,DELETE ON public.lesson_bookmarks TO authenticated;
GRANT ALL ON public.lesson_bookmarks TO service_role;
CREATE POLICY "Users read own lesson bookmarks" ON public.lesson_bookmarks FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Participants bookmark lessons" ON public.lesson_bookmarks FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(
 SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE l.id=lesson_id AND public.can_access_course(m.course_id)));
CREATE POLICY "Users remove own lesson bookmarks" ON public.lesson_bookmarks FOR DELETE TO authenticated USING(user_id=auth.uid());
