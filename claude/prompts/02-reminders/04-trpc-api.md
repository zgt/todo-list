# Reminders - tRPC API

Create tRPC router for reminder CRUD operations with proper validation, authorization, and integration with the notification scheduling service.

## Router Implementation

1. **Create reminder router** - `packages/api/src/router/reminder.ts`:

   All procedures are `protectedProcedure` (require authentication).

   **Query Procedures**:
   - `getByTaskId` - Get all reminders for a task
     - Input: `{ taskId: string }`
     - Validate user owns the task
     - Return reminders with task relation
     - Order by nextScheduledAt ascending
   
   - `getById` - Get single reminder details
     - Input: `{ id: string }`
     - Validate user owns the reminder
     - Return with task relation

   - `getAllActive` - Get all active (enabled) reminders for user
     - No input needed (use ctx.session.user.id)
     - Filter: enabled=true, deletedAt=null
     - Include task relation
     - Order by nextScheduledAt
     - Limit to 100

   **Mutation Procedures**:
   - `create` - Create new reminder
     - Input: `CreateReminderSchema` (from database)
     - Validate user owns the task
     - Insert reminder into database
     - Calculate `nextScheduledAt` based on type
     - **Important**: Return reminder data for client to schedule notification
       (Mobile handles scheduling, server just manages data)
     - Return created reminder with notification trigger data

   - `update` - Update existing reminder
     - Input: `UpdateReminderSchema`
     - Validate user owns the reminder
     - Update database record
     - Recalculate `nextScheduledAt` if time/pattern changed
     - Return updated reminder for rescheduling

   - `delete` - Soft delete reminder
     - Input: `{ id: string }`
     - Validate ownership
     - Set `deletedAt` and `status` to "cancelled"
     - Return `{ success: true, notificationId }` for client to cancel notification

   - `toggle` - Enable/disable reminder
     - Input: `{ id: string, enabled: boolean }`
     - Update `enabled` field
     - Return updated reminder for client to schedule/cancel

   - `snooze` - Snooze a reminder
     - Input: `{ id: string, snoozeMinutes: number }`
     - Calculate `snoozedUntil` = now + snoozeMinutes
     - Increment `snoozeCount`
     - Update `nextScheduledAt`
     - Return updated reminder for rescheduling

   - `markSent` - Mark reminder as sent (called after notification fires)
     - Input: `{ id: string }`
     - Update `status` to "sent"
     - Set `lastSentAt` to now
     - For recurring: calculate and set next `nextScheduledAt`
     - Return updated reminder

   - `rescheduleForTask` - Reschedule all relative reminders when task due date changes
     - Input: `{ taskId: string, newDueDate: Date }`
     - Get all relative reminders for task
     - Recalculate trigger times
     - Update `nextScheduledAt` for all
     - Return array of updated reminders for rescheduling

2. **Register router** - `packages/api/src/root.ts`:
   ```typescript
   import { reminderRouter } from "./router/reminder";
   
   export const appRouter = createTRPCRouter({
     // ... existing routers
     reminder: reminderRouter,
   });
   ```

## Validation & Business Logic

1. **Input validation**:
   - Use `CreateReminderSchema` and `UpdateReminderSchema` from database package
   - Add custom refinements:
     - Absolute reminders: `reminderTime` must be in the future
     - Relative reminders: task must have a due date
     - Recurring reminders: valid recurrence pattern required
     - Snooze minutes: min 5, max 1440 (24 hours)

2. **Authorization checks** (in every procedure):
   ```typescript
   // Check task ownership
   const task = await ctx.db.query.Task.findFirst({
     where: and(
       eq(Task.id, input.taskId),
       eq(Task.userId, ctx.session.user.id)
     )
   });
   if (!task) throw new TRPCError({ code: "NOT_FOUND" });
   
   // Check reminder ownership
   const reminder = await ctx.db.query.TaskReminder.findFirst({
     where: and(
       eq(TaskReminder.id, input.id),
       eq(TaskReminder.userId, ctx.session.user.id)
     )
   });
   if (!reminder) throw new TRPCError({ code: "NOT_FOUND" });
   ```

3. **Calculate nextScheduledAt** - Helper function for different reminder types:
   ```typescript
   function calculateNextScheduledAt(
     reminder: Reminder,
     task?: Task
   ): Date | null {
     switch (reminder.type) {
       case "absolute":
         return reminder.reminderTime;
       
       case "relative":
         if (!task?.dueDate) return null;
         const ms = (reminder.minutesBeforeDue || 0) * 60 * 1000;
         return new Date(task.dueDate.getTime() - ms);
       
       case "recurring":
         return calculateNextRecurrence(
           reminder.recurrencePattern,
           reminder.lastSentAt
         );
       
       default:
         return null;
     }
   }
   ```

4. **Recurring reminder logic**:
   ```typescript
   function calculateNextRecurrence(
     pattern: RecurrencePattern,
     lastSent?: Date
   ): Date {
     const now = lastSent || new Date();
     const next = new Date(now);
     
     switch (pattern) {
       case "daily":
         next.setDate(next.getDate() + 1);
         break;
       case "weekly":
         next.setDate(next.getDate() + 7);
         break;
       case "custom":
         // Use recurrenceInterval from reminder
         break;
     }
     
     return next;
   }
   ```

## Database Operations

1. **Efficient queries** - Use Drizzle ORM best practices:
   - Use `with: { task: true }` to include task relation
   - Use proper indexes (already defined in schema)
   - Limit results to prevent performance issues
   - Use `isNull(deletedAt)` for soft delete filtering

2. **Atomic updates** - For concurrent modification:
   ```typescript
   const [updated] = await ctx.db
     .update(TaskReminder)
     .set({ enabled: input.enabled, updatedAt: new Date() })
     .where(and(
       eq(TaskReminder.id, input.id),
       eq(TaskReminder.userId, ctx.session.user.id)
     ))
     .returning();
   ```

3. **Transaction support** - For `rescheduleForTask`:
   ```typescript
   await ctx.db.transaction(async (tx) => {
     // Update multiple reminders atomically
     for (const reminder of reminders) {
       await tx.update(TaskReminder)
         .set({ nextScheduledAt: newTime })
         .where(eq(TaskReminder.id, reminder.id));
     }
   });
   ```

## Error Handling

1. **Common errors**:
   - `NOT_FOUND` - Task/reminder doesn't exist or user doesn't own it
   - `BAD_REQUEST` - Invalid input (past date, missing due date, etc.)
   - `UNAUTHORIZED` - User not authenticated
   - `CONFLICT` - Attempting invalid state transition

2. **Return types** - All mutations return updated reminder data:
   ```typescript
   return {
     reminder: updatedReminder,
     notificationData: {
       taskId: reminder.taskId,
       triggerTime: nextScheduledAt,
       notificationId: reminder.iosNotificationId || reminder.androidNotificationId
     }
   };
   ```

## Integration Notes

**Mobile app responsibility**:
- Actually scheduling platform notifications (iOS/Android)
- Storing platform-specific notification IDs
- Calling `markSent` after notification fires
- Calling `rescheduleForTask` when task due date changes

**API responsibility**:
- Data persistence and validation
- Authorization
- Business logic (calculating trigger times)
- Providing data for mobile to schedule notifications

## Success Criteria

- ✅ All procedures properly authorized (user ownership check)
- ✅ Input validation using Zod schemas
- ✅ Can create reminders of all three types
- ✅ Can update reminder and get new trigger time
- ✅ Can delete reminder
- ✅ Can toggle enabled/disabled
- ✅ Can snooze reminder
- ✅ Can mark as sent and calculate next occurrence (recurring)
- ✅ Can reschedule all task reminders when due date changes
- ✅ Returns proper error codes
- ✅ No TypeScript errors
- ✅ Router registered in root

Run `pnpm typecheck` to verify compilation.
