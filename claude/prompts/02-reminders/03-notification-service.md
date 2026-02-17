# Reminders - Notification Scheduling Service

Build the core notification scheduling service that handles scheduling, canceling, and rescheduling notifications with platform-specific logic.

## Core Service Implementation

1. **Create service class** - `apps/expo/src/services/NotificationScheduler.ts`:

   Main methods:
   - `scheduleReminder(reminder: ReminderData)` - Schedule a notification based on reminder configuration
   - `cancelReminder(notificationId: string)` - Cancel a scheduled notification
   - `rescheduleReminder(reminder: ReminderData)` - Update an existing notification schedule
   - `cancelAllForTask(taskId: string)` - Cancel all reminders for a task
   - `getScheduledNotifications()` - Get all currently scheduled notifications

2. **Implement scheduling logic** - Handle different reminder types:

   **Absolute reminders** (specific date/time):
   ```typescript
   async scheduleReminder(reminder: AbsoluteReminder) {
     const trigger = new Date(reminder.reminderTime);
     const notificationId = await Notifications.scheduleNotificationAsync({
       content: {
         title: reminder.title || "Task Reminder",
         body: reminder.message || reminder.task.title,
         sound: reminder.sound || "default",
         badge: 1,
         categoryIdentifier: "task-reminder",
         data: {
           taskId: reminder.taskId,
           reminderId: reminder.id,
           type: "reminder"
         }
       },
       trigger: { date: trigger }
     });
     return notificationId;
   }
   ```

   **Relative reminders** (X minutes before due date):
   - Calculate actual trigger time from task due date
   - Handle case where task has no due date (skip scheduling)
   - Update when task due date changes

   **Recurring reminders** (daily, weekly, custom):
   - Use repeating trigger: `{ repeats: true, ...triggerConfig }`
   - Daily: `{ hour: X, minute: Y, repeats: true }`
   - Weekly: `{ weekday: N, hour: X, minute: Y, repeats: true }`
   - Custom interval: `{ seconds: intervalSeconds, repeats: true }`

3. **Platform-specific handling**:

   **iOS**:
   - Check 64-notification limit before scheduling
   - Clear oldest notifications if limit reached
   - Store notification IDs in AsyncStorage or database
   - Handle timezone correctly with Date objects

   **Android**:
   - Create notification channel if not exists
   - Request exact alarm permission on Android 12+
   - Handle battery optimization warnings

4. **Notification ID management** - Track notification IDs for cancellation:
   - Store platform-specific ID in database when scheduled
   - Use unique identifiers: `${taskId}-${reminderId}`
   - Return notification ID to caller for storage

5. **Error handling**:
   - Permission denied → Return error, don't throw
   - Scheduling failed → Log error, update reminder status
   - Invalid trigger time (past date) → Skip scheduling, mark as failed
   - Network errors → Retry logic with exponential backoff

## Helper Functions

1. **Create utilities** - `apps/expo/src/services/NotificationScheduler/utils.ts`:

   Functions:
   - `calculateRelativeTrigger(dueDate: Date, minutesBefore: number)` - Calculate absolute time
   - `calculateNextRecurrence(pattern: RecurrencePattern, lastRun?: Date)` - Next occurrence
   - `isValidTriggerTime(date: Date)` - Check if time is in future
   - `formatNotificationBody(task: Task, reminder: Reminder)` - Generate notification text
   - `getPlatformNotificationId()` - Generate unique ID per platform

2. **Badge count manager** - `apps/expo/src/services/NotificationScheduler/badge.ts`:
   - `incrementBadge()` - Increment app badge count
   - `decrementBadge()` - Decrement badge count (when task completed)
   - `setBadgeCount(count: number)` - Set absolute badge count
   - `clearBadge()` - Set badge to 0
   - Store count in AsyncStorage for persistence

## Integration Hooks

1. **Create React hooks** - `apps/expo/src/hooks/useNotificationScheduler.ts`:
   - `useNotificationScheduler()` - Access scheduler instance
   - `useScheduleReminder()` - Hook for scheduling with loading state
   - `useCancelReminder()` - Hook for canceling with loading state
   - `useScheduledCount()` - Get count of scheduled notifications

2. **Task sync hook** - Update notifications when task changes:
   - Listen for task updates (due date, completion, deletion)
   - Auto-reschedule all relative reminders when due date changes
   - Cancel all reminders when task is completed or deleted
   - Re-enable reminders if task is uncompleted

## Storage Layer

1. **AsyncStorage for metadata** - Store notification scheduling metadata:
   - Key: `notifications:${taskId}:${reminderId}`
   - Value: `{ notificationId, scheduledAt, triggerTime, status }`
   - Used for tracking and debugging

2. **Sync with database** - After scheduling, update database:
   - Store `iosNotificationId` or `androidNotificationId` in TaskReminder table
   - Update `nextScheduledAt` timestamp
   - Update `status` to "scheduled"
   - Handle failures: Update `failureReason` and `status` to "failed"

## Testing Utilities

1. **Debug helpers** - `apps/expo/src/services/NotificationScheduler/debug.ts`:
   - `getAllScheduled()` - List all scheduled notifications
   - `clearAllScheduled()` - Cancel all notifications (for testing)
   - `testNotificationIn(seconds: number)` - Schedule test notification
   - `logSchedulingInfo()` - Print debug information

2. **Test scenarios**:
   - Schedule 10 different reminders
   - Cancel specific reminder
   - Reschedule when task due date changes
   - Handle recurring daily reminder
   - Test notification limit (iOS)
   - Test exact alarm permission (Android)

## Success Criteria

- ✅ Can schedule absolute time reminders
- ✅ Can schedule relative (before due date) reminders
- ✅ Can schedule recurring reminders
- ✅ Notification IDs stored correctly per platform
- ✅ Can cancel individual reminders
- ✅ Can cancel all reminders for a task
- ✅ Handles iOS 64-notification limit
- ✅ Badge count updates correctly
- ✅ Error handling returns graceful errors
- ✅ Reschedules when task due date changes
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify compilation.
