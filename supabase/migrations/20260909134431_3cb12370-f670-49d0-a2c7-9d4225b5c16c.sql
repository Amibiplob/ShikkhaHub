ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.community_comments
  ADD CONSTRAINT community_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;