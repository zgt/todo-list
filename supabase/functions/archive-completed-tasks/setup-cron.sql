-- Enable the pg_cron extension (if not already enabled)
-- This needs to be run by a superuser/admin in the Supabase dashboard SQL editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the archive-completed-tasks function to run every hour
-- Replace 'YOUR_SUPABASE_PROJECT_URL' with your actual Supabase project URL
-- Replace 'YOUR_ANON_KEY' with your Supabase anon key (or service role key for better security)
SELECT cron.schedule(
  'archive-completed-tasks-hourly',
  '0 * * * *',  -- Every hour at the top of the hour (cron format: minute hour day month weekday)
  $$
  SELECT
    net.http_post(
      url := 'https://lpwebtedgfzpaxtuyhss.supabase.co/functions/v1/archive-completed-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwd2VidGVkZ2Z6cGF4dHV5aHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTc3MDEsImV4cCI6MjA4MDI5MzcwMX0.hHCM507jJaldWEYWPBggHniP6TINvsrOcf49g2kN0WI'
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
