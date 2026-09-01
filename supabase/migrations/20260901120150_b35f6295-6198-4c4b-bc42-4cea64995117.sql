-- 1. Remove self-service role insert (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- 2. Auto-assign default 'student' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3. Backfill: every existing user without a role becomes a student
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Prevent admin lockout: block removing the last admin or self-demotion
CREATE OR REPLACE FUNCTION public.prevent_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.role = 'admin' THEN
    IF OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot remove your own admin role';
    END IF;
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'At least one admin must remain';
    END IF;
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_admin_lockout_trigger ON public.user_roles;
CREATE TRIGGER prevent_admin_lockout_trigger
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_lockout();