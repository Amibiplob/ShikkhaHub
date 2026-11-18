-- Reviewed staging operation, deliberately outside automatic migrations.
-- Run inside an explicit transaction after confirming the linked project.
DO $operation$
DECLARE existing cron.job%ROWTYPE;
BEGIN
  IF current_setting('shikkhahub.expiry_approved', true) IS DISTINCT FROM 'pdgrbfisxjkmqrhrgzrs' THEN
    RAISE EXCEPTION 'Explicit staging schedule approval required';
  END IF;
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Expected reviewed postgres job owner'; END IF;
  PERFORM pg_advisory_xact_lock(1866400101);
  IF to_regprocedure('public.expire_old_live_classes()') IS NULL THEN RAISE EXCEPTION 'Expiry function missing'; END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE command ILIKE '%expire_old_live_classes%'
    AND jobname IS DISTINCT FROM 'shikkhahub-expire-live-classes') THEN
    RAISE EXCEPTION 'Another expiry schedule exists; review before changing';
  END IF;
  SELECT * INTO existing FROM cron.job WHERE jobname='shikkhahub-expire-live-classes';
  IF FOUND THEN
    IF existing.schedule <> '*/15 * * * *' OR existing.command <> 'SELECT public.expire_old_live_classes();'
      OR NOT existing.active OR existing.username <> current_user OR existing.database <> current_database() THEN
      RAISE EXCEPTION 'Existing job differs from reviewed schedule; preserve it';
    END IF;
  ELSE
    PERFORM cron.schedule('shikkhahub-expire-live-classes', '*/15 * * * *', 'SELECT public.expire_old_live_classes();');
  END IF;
END $operation$;
