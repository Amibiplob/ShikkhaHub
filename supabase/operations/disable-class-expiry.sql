-- Roll back only the exact reviewed job. Does not reverse expired class rows.
DO $operation$
DECLARE existing cron.job%ROWTYPE;
BEGIN
  IF current_setting('shikkhahub.expiry_approved', true) IS DISTINCT FROM 'pdgrbfisxjkmqrhrgzrs' THEN
    RAISE EXCEPTION 'Explicit staging schedule approval required';
  END IF;
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Expected reviewed postgres job owner'; END IF;
  PERFORM pg_advisory_xact_lock(1866400101);
  SELECT * INTO existing FROM cron.job WHERE jobname='shikkhahub-expire-live-classes';
  IF FOUND THEN
    IF existing.schedule <> '*/15 * * * *' OR existing.command <> 'SELECT public.expire_old_live_classes();'
      OR existing.username <> current_user OR existing.database <> current_database() THEN
      RAISE EXCEPTION 'Existing job differs; review rollback manually';
    END IF;
    PERFORM cron.unschedule(existing.jobid);
  END IF;
END $operation$;
