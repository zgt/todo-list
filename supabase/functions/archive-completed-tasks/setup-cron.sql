-- Enable the pg_cron extension (if not already enabled)
-- This needs to be run by a superuser/admin in the Supabase dashboard SQL editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the archive-completed-tasks function to run every hour
-- Replace 'YOUR_PROJECT_REF' with your Supabase project ref (from the
-- dashboard URL or Project Settings > General)
-- Replace 'YOUR_SUPABASE_ANON_KEY' with your Supabase anon key (or service
-- role key for better security) from Project Settings > API
SELECT cron.schedule(
  'archive-completed-tasks-hourly',
  '0 * * * *',  -- Every hour at the top of the hour (cron format: minute hour day month weekday)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/archive-completed-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- To check if the cron job is scheduled correctly:
SELECT * FROM cron.job WHERE jobname = 'archive-completed-tasks-hourly';

-- To see recent cron job runs:
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'archive-completed-tasks-hourly')
ORDER BY start_time DESC
LIMIT 10;

-- To unschedule the cron job (if needed):
-- SELECT cron.unschedule('archive-completed-tasks-hourly');
