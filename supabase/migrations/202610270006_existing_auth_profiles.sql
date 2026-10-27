-- Auth accounts can predate installation of the application signup trigger.
-- Preserve existing profiles and import only the same metadata used by signup.
-- Historical role backfill remains authoritative; metadata never grants roles.
INSERT INTO public.profiles (user_id, full_name, avatar_url)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
