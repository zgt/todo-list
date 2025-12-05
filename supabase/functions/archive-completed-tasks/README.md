# Archive Completed Tasks - Supabase Edge Function

This Edge Function automatically archives tasks that have been completed for more than 24 hours by setting their `deleted_at` timestamp (soft delete).

## How It Works

The function:
1. Calculates a cutoff time (24 hours ago from current time)
2. Finds all tasks that are:
   - Marked as `completed = true`
   - Have `completed_at` older than 24 hours
   - Not already archived (`deleted_at` is null)
3. Sets `deleted_at` to the current timestamp for those tasks
4. Returns the count of archived tasks

## Deployment

### 1. Deploy the Edge Function

Install the Supabase CLI if you haven't already:
```bash
npm install -g supabase
```

Login to Supabase:
```bash
supabase login
```

Link your project (run from repository root):
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy the function:
```bash
supabase functions deploy archive-completed-tasks
```

### 2. Set Up the Cron Job

The function needs to run automatically every hour. You have two options:

#### Option A: pg_cron (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open `setup-cron.sql` from this directory
4. Replace placeholders:
   - `YOUR_SUPABASE_PROJECT_URL` with your project URL (e.g., `https://abcdefgh.supabase.co`)
   - `YOUR_ANON_KEY` with your Supabase anon key (found in Settings → API)
5. Run the SQL script

#### Option B: Supabase Database Webhooks

1. Go to Database → Webhooks in your Supabase dashboard
2. Create a new webhook:
   - **Name**: Archive Completed Tasks
   - **Table**: task
   - **Events**: UPDATE
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/archive-completed-tasks`
   - **Headers**:
     ```
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
     ```
   - **Conditions**: Add a filter for `completed = true`

However, note that webhooks trigger on events, not on a schedule. For scheduled execution, use pg_cron.

### 3. Test the Function

You can manually trigger the function to test it:

```bash
# Using curl
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/archive-completed-tasks' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Expected response:
```json
{
  "success": true,
  "archivedCount": 5,
  "cutoffTime": "2025-12-03T12:00:00.000Z",
  "archivedTaskIds": ["uuid1", "uuid2", ...]
}
```

## Monitoring

### Check Cron Job Status

Run this query in the Supabase SQL Editor:

```sql
-- See scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'archive-completed-tasks-hourly';

-- See recent runs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'archive-completed-tasks-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

### View Function Logs

1. Go to Edge Functions → archive-completed-tasks in Supabase dashboard
2. Click on "Logs" tab
3. Monitor execution logs and errors

## Troubleshooting

### Function not archiving tasks

1. Check that tasks have `completed = true` and `completed_at` is set
2. Verify that `completed_at` is more than 24 hours old
3. Check function logs for errors
4. Manually test the function using curl

### Cron job not running

1. Verify pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
2. Check if the job is scheduled:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'archive-completed-tasks-hourly';
   ```
3. Review recent job runs for errors:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

### Permission errors

Ensure the service role key is used in the cron job setup, not the anon key. The service role key bypasses Row Level Security (RLS) policies.

## Alternative: PostgreSQL Trigger

Instead of a scheduled function, you could use a PostgreSQL trigger that sets a future `deleted_at` timestamp when a task is completed:

```sql
-- Create a trigger function
CREATE OR REPLACE FUNCTION schedule_task_archive()
RETURNS TRIGGER AS $$
BEGIN
  -- When a task is marked as completed, schedule it for archiving in 24 hours
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_schedule_archive
  BEFORE UPDATE ON task
  FOR EACH ROW
  WHEN (NEW.completed = true AND OLD.completed = false)
  EXECUTE FUNCTION schedule_task_archive();
```

However, this approach still requires a scheduled job to actually perform the archiving. The Edge Function + cron approach is more flexible and maintainable.

## Configuration

You can modify the archive delay by changing the cutoff calculation in `index.ts`:

```typescript
// Change from 24 hours to 48 hours
const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);

// Change from 24 hours to 7 days
const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
```

After making changes, redeploy:
```bash
supabase functions deploy archive-completed-tasks
```
