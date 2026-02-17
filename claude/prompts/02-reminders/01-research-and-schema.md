# Task Reminders - Research & Database Schema

## Objective
Research React Native/Expo notification systems for iOS and Android, then design and implement the database schema for a flexible task reminder system that supports multiple reminders per task with various notification types.

## Phase 1: Research & Technical Analysis

### Research Scope

**iOS Notifications (React Native/Expo)**:
1. **Local Notifications vs Push Notifications**
   - Research `expo-notifications` package capabilities
   - Understand iOS notification permissions and requirements
   - Document iOS notification categories and actions
   - Review iOS background notification limitations

2. **Permission Requirements**:
   - iOS notification permissions flow
   - Required `app.json`/`app.config.js` configuration
   - Notification categories for actions (complete, snooze, etc.)
   - Background modes and capabilities

3. **Notification Scheduling**:
   - Local notification scheduling API
   - Repeating notifications for recurring reminders
   - Notification triggers (time-based, location-based)
   - Maximum scheduled notifications limit

4. **Platform-Specific Considerations**:
   - iOS vs Android notification differences
   - Badge count management
   - Sound and vibration patterns
   - Critical alerts (iOS 12+)

### Required Documentation

Create research document covering:
- `expo-notifications` API overview
- Permission request workflow
- Notification scheduling patterns
- Best practices for reliability
- Known limitations and workarounds
- Code examples for key operations

### Key Questions to Answer

1. **Permissions**: How to request and check notification permissions?
2. **Scheduling**: How to schedule notifications for specific dates/times?
3. **Recurring**: How to handle recurring daily/weekly reminders?
4. **Cancellation**: How to cancel scheduled notifications?
5. **Update**: How to reschedule when task due date changes?
6. **Background**: Do notifications work when app is closed?
7. **Limits**: Are there limits on scheduled notifications?

### Research Resources

- Expo Notifications Documentation: https://docs.expo.dev/versions/latest/sdk/notifications/
- React Native Notifications Guide
- iOS Notification Best Practices
- Stack Overflow common issues

## Phase 2: Database Schema Design

### Schema Requirements

**Core Features**:
- Multiple reminders per task
- Different reminder types (before due date, specific time, recurring)
- Notification status tracking (scheduled, sent, failed)
- Platform-specific notification IDs
- Snooze functionality
- Custom reminder messages

**Reminder Types**:
1. **Absolute**: Specific date/time (e.g., "Jan 15 at 9:00 AM")
2. **Relative**: X minutes/hours/days before due date
3. **Recurring**: Daily, weekly, custom intervals
4. **Location-based**: Trigger when near a location (future enhancement)

### Table Design

**New Table**: `task_reminder`

```typescript
export const TaskReminder = pgTable(
  "task_reminder",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    
    // Foreign keys
    taskId: t.uuid("task_id")
      .notNull()
      .references(() => Task.id, { onDelete: "cascade" }),
    userId: t.text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Reminder configuration
    type: t.varchar({ length: 20 }).notNull(), // "absolute" | "relative" | "recurring"
    
    // Absolute reminder fields
    reminderTime: t.timestamp("reminder_time", { 
      withTimezone: true, 
      mode: "date" 
    }),
    
    // Relative reminder fields  
    minutesBeforeDue: t.integer("minutes_before_due"),
    
    // Recurring reminder fields
    recurrencePattern: t.varchar("recurrence_pattern", { length: 50 }), // "daily", "weekly", "custom"
    recurrenceInterval: t.integer("recurrence_interval"), // for custom intervals
    
    // Notification details
    title: t.varchar({ length: 200 }),
    message: t.text(),
    sound: t.varchar({ length: 50 }).default("default"),
    
    // Platform notification IDs (for cancellation)
    iosNotificationId: t.varchar("ios_notification_id", { length: 100 }),
    androidNotificationId: t.varchar("android_notification_id", { length: 100 }),
    
    // Status tracking
    status: t.varchar({ length: 20 }).notNull().default("scheduled"), // "scheduled" | "sent" | "failed" | "cancelled"
    lastSentAt: t.timestamp("last_sent_at", { 
      withTimezone: true, 
      mode: "date" 
    }),
    nextScheduledAt: t.timestamp("next_scheduled_at", { 
      withTimezone: true, 
      mode: "date" 
    }),
    failureReason: t.text("failure_reason"),
    
    // Snooze functionality
    snoozedUntil: t.timestamp("snoozed_until", { 
      withTimezone: true, 
      mode: "date" 
    }),
    snoozeCount: t.integer("snooze_count").default(0),
    
    // Metadata
    enabled: t.boolean().notNull().default(true),
    createdAt: t.timestamp("created_at", { 
      withTimezone: true, 
      mode: "date" 
    }).$defaultFn(() => new Date()).notNull(),
    updatedAt: t.timestamp("updated_at", { 
      withTimezone: true, 
      mode: "date" 
    }).$defaultFn(() => new Date()).$onUpdate(() => new Date()),
    deletedAt: t.timestamp("deleted_at", { 
      withTimezone: true, 
      mode: "date" 
    }),
  }),
  (table) => [
    index("task_reminder_task_id_idx").on(table.taskId),
    index("task_reminder_user_id_idx").on(table.userId),
    index("task_reminder_next_scheduled_idx").on(table.nextScheduledAt),
    index("task_reminder_status_idx").on(table.status),
    check(
      "task_reminder_type_valid",
      sql`${table.type} IN ('absolute', 'relative', 'recurring')`
    ),
    check(
      "task_reminder_status_valid",
      sql`${table.status} IN ('scheduled', 'sent', 'failed', 'cancelled')`
    ),
  ]
);
```

### Type Definitions

**Reminder Type Enum**:
```typescript
export const ReminderType = z.enum(["absolute", "relative", "recurring"]);
export type ReminderType = z.infer<typeof ReminderType>;

export const ReminderStatus = z.enum(["scheduled", "sent", "failed", "cancelled"]);
export type ReminderStatus = z.infer<typeof ReminderStatus>;

export const RecurrencePattern = z.enum(["daily", "weekly", "custom"]);
export type RecurrencePattern = z.infer<typeof RecurrencePattern>;
```

### Validation Schemas

**Create Reminder Schema**:
```typescript
export const CreateReminderSchema = createInsertSchema(TaskReminder, {
  type: ReminderType,
  reminderTime: z.date().optional(),
  minutesBeforeDue: z.number().int().min(0).max(43200).optional(), // Max 30 days
  recurrencePattern: RecurrencePattern.optional(),
  recurrenceInterval: z.number().int().min(1).optional(),
  title: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  sound: z.string().max(50).optional(),
}).omit({
  id: true,
  userId: true,
  iosNotificationId: true,
  androidNotificationId: true,
  status: true,
  lastSentAt: true,
  nextScheduledAt: true,
  failureReason: true,
  snoozedUntil: true,
  snoozeCount: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).refine(
  (data) => {
    if (data.type === "absolute") return !!data.reminderTime;
    if (data.type === "relative") return !!data.minutesBeforeDue;
    if (data.type === "recurring") return !!data.recurrencePattern;
    return false;
  },
  {
    message: "Invalid reminder configuration for type",
  }
);
```

**Update Reminder Schema**:
```typescript
export const UpdateReminderSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean().optional(),
  reminderTime: z.date().optional(),
  minutesBeforeDue: z.number().int().min(0).max(43200).optional(),
  recurrencePattern: RecurrencePattern.optional(),
  recurrenceInterval: z.number().int().min(1).optional(),
  title: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  sound: z.string().max(50).optional(),
  snoozedUntil: z.date().nullable().optional(),
});
```

### Relations

**Task to Reminders Relation**:
```typescript
export const taskReminderRelations = relations(TaskReminder, ({ one }) => ({
  task: one(Task, {
    fields: [TaskReminder.taskId],
    references: [Task.id],
  }),
}));

export const taskRelations = relations(Task, ({ one, many }) => ({
  category: one(Category, {
    fields: [Task.categoryId],
    references: [Category.id],
  }),
  reminders: many(TaskReminder), // Add this
}));
```

## Implementation Steps

### Step 1: Research Phase
1. Review Expo notifications documentation
2. Test notification permissions in sample Expo app
3. Test notification scheduling and cancellation
4. Document platform differences (iOS vs Android)
5. Identify limitations and best practices
6. Create research summary document

### Step 2: Schema Implementation
1. Create `TaskReminder` table in `packages/db/src/schema.ts`
2. Add type enums (`ReminderType`, `ReminderStatus`, etc.)
3. Create validation schemas
4. Add relations to `Task` table
5. Add proper indexes
6. Add check constraints

### Step 3: Migration
1. Run `pnpm db:push` to apply schema
2. Verify in Drizzle Studio
3. Test with sample data
4. Ensure foreign key cascades work

## Code Quality Standards

**Database Design**:
- Follow snake_case naming (auto-converted by Drizzle)
- Add indexes for all foreign keys
- Include soft delete support (deletedAt)
- Use check constraints for enums
- Timestamp fields with timezone

**TypeScript**:
- Export all enums and types
- Use Zod for all validation
- Strict mode compliance
- Descriptive type names

**Validation**:
- Custom refinements for complex rules
- Clear error messages
- Handle null vs undefined correctly
- Validate type-specific required fields

## Expected Deliverables

1. **Research Document**: iOS/Android notification capabilities and setup
2. **Schema File**: Updated `schema.ts` with `TaskReminder` table
3. **Type Definitions**: Reminder enums and types
4. **Validation Schemas**: Create and update schemas
5. **Relations**: Task-to-reminders relationship
6. **Migration Success**: Schema pushed to database

## Success Criteria

- ✅ Research document covers all notification requirements
- ✅ `TaskReminder` table created with all fields
- ✅ Indexes added for performance
- ✅ Check constraints enforce valid values
- ✅ Type enums exported and usable
- ✅ Validation schemas work correctly
- ✅ Relations defined between Task and TaskReminder
- ✅ Schema push completes without errors
- ✅ Can query reminders via Drizzle Studio
- ✅ Cascade deletes work (deleting task deletes reminders)

## Testing Checklist

After implementation:
- [ ] Research document is complete
- [ ] Schema push succeeds
- [ ] Can create reminder with type="absolute"
- [ ] Can create reminder with type="relative"
- [ ] Can create reminder with type="recurring"
- [ ] Invalid reminder type is rejected
- [ ] Invalid status is rejected
- [ ] Indexes exist in database
- [ ] Foreign keys cascade on task delete
- [ ] Relations work in queries
- [ ] TypeScript types are correct

## Platform Research Checklist

iOS Notification Research:
- [ ] How to request permissions
- [ ] How to schedule local notifications
- [ ] How to cancel notifications by ID
- [ ] Maximum scheduled notification limit
- [ ] Background notification behavior
- [ ] Notification actions (complete, snooze)
- [ ] Badge count management
- [ ] Critical alerts capability

Android Notification Research:
- [ ] Permission requirements
- [ ] Notification channels
- [ ] Scheduling differences vs iOS
- [ ] Background behavior
- [ ] Notification actions
- [ ] Sound and vibration

## Implementation Notes

**Next Steps**:
After schema completion, subsequent prompts will cover:
1. Expo notifications setup and configuration
2. tRPC API for reminder management
3. Notification scheduling service
4. Web UI for reminder management
5. Mobile UI for reminder management

**Reminder Calculation Logic**:
Will be implemented in API layer:
- Relative reminders: Calculate actual time from task due date
- Recurring reminders: Calculate next occurrence
- Handle timezone differences
- Update when task due date changes
