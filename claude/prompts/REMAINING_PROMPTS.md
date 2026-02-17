# Remaining Prompts to Create

This document outlines the structure for the remaining Claude Code prompts that should be created to complete the feature implementation guide.

## ✅ Completed Prompts

### Priority System (100% Complete)
- ✅ `01-priority-system/01-database-schema.md`
- ✅ `01-priority-system/02-trpc-api.md`
- ✅ `01-priority-system/03-web-ui.md`
- ✅ `01-priority-system/04-mobile-ui.md`

### Reminders (100% Complete)
- ✅ `02-reminders/01-research-and-schema.md`
- ✅ `02-reminders/02-expo-setup.md`
- ✅ `02-reminders/03-notification-service.md`
- ✅ `02-reminders/04-trpc-api.md`
- ✅ `02-reminders/05-web-ui.md`
- ✅ `02-reminders/06-mobile-ui.md`

---

## 📝 Prompts Still Needed

### 2. Reminders (5 more prompts needed)

#### `02-reminders/02-expo-setup.md`
**Objective**: Configure Expo notifications package, permissions, and app.json settings

**Key Sections**:
- Install `expo-notifications` package
- Configure `app.json` for iOS and Android
- Set up notification channels (Android)
- Configure notification categories and actions
- Request permissions flow
- Background notification setup
- Test basic notification functionality

#### `02-reminders/03-notification-service.md`
**Objective**: Build notification scheduling service layer

**Key Sections**:
- Create `NotificationScheduler` service class
- Implement notification scheduling logic
- Handle platform-specific notification IDs
- Build notification cancellation logic
- Implement notification rescheduling when tasks change
- Create notification action handlers (complete, snooze)
- Handle badge count management
- Error handling and retry logic

#### `02-reminders/04-trpc-api.md`
**Objective**: Create tRPC API for reminder CRUD and notification triggering

**Key Sections**:
- `reminder.getByTaskId` - Get all reminders for a task
- `reminder.create` - Create new reminder with notification scheduling
- `reminder.update` - Update reminder and reschedule notification
- `reminder.delete` - Delete reminder and cancel notification
- `reminder.snooze` - Snooze a reminder for X minutes
- `reminder.rescheduleForTask` - Reschedule all task reminders when due date changes
- Integration with NotificationScheduler service
- Error handling and validation

#### `02-reminders/05-web-ui.md`
**Objective**: Build web UI for managing reminders

**Key Sections**:
- `ReminderManager` component for task detail view
- `ReminderForm` for adding new reminders
- `ReminderList` displaying all reminders for a task
- `ReminderTypeSelector` (absolute, relative, recurring)
- `ReminderTimePicker` component
- Visual indicators for active reminders
- Delete and edit reminder flows
- Integration with task forms

#### `02-reminders/06-mobile-ui.md`
**Objective**: Build mobile UI with native notification support

**Key Sections**:
- Permission request UI flow
- `ReminderList` with native list performance
- `AddReminderSheet` bottom sheet
- `ReminderTypePicker` mobile selector
- `TimePicker` native time/date picker integration
- Notification action handlers (complete task from notification)
- Snooze flow from notification
- Settings screen for notification preferences
- Badge count display and management

---

### 3. Collaborative Lists (100% Complete)
- ✅ `03-collaborative-lists/01-database-schema.md`
- ✅ `03-collaborative-lists/02-permissions-logic.md`
- ✅ `03-collaborative-lists/03-trpc-api.md`
- ✅ `03-collaborative-lists/04-realtime-sync.md`
- ✅ `03-collaborative-lists/05-web-ui.md`
- ✅ `03-collaborative-lists/06-mobile-ui.md`

### 4. Sub-tasks (100% Complete)
- ✅ `04-sub-tasks/01-database-schema.md`
- ✅ `04-sub-tasks/02-trpc-api.md`
- ✅ `04-sub-tasks/03-progress-tracking.md`
- ✅ `04-sub-tasks/04-web-ui.md`
- ✅ `04-sub-tasks/05-mobile-ui.md`
- ✅ `04-sub-tasks/06-drag-drop.md`

---

## Prompt Creation Checklist

When creating each prompt, include:
- [ ] Clear objective statement
- [ ] Technical context (stack, files, patterns)
- [ ] Current state analysis
- [ ] Implementation requirements
- [ ] Step-by-step implementation guide
- [ ] Code quality standards
- [ ] Expected deliverables
- [ ] Success criteria checklist
- [ ] Testing checklist
- [ ] Next steps / integration notes

---

## Priority Order for Creation

### High Priority (Immediate Value)
1. Complete Reminders prompts (2-6) - users want notifications
2. Complete Sub-tasks prompts (1-6) - frequently requested
3. Complete Collaborative Lists prompts (1-6) - team feature

### Template Approach
Each prompt should follow the same structure as:
- `01-priority-system/01-database-schema.md` (for database prompts)
- `01-priority-system/03-web-ui.md` (for UI prompts)
- `02-reminders/01-research-and-schema.md` (for research prompts)

---

## Next Steps

1. **Create remaining reminders prompts** using similar structure
2. **Create collaborative lists prompts** with focus on security/permissions
3. **Create sub-tasks prompts** with focus on recursive queries
4. **Test each prompt** by running through Claude Code
5. **Refine based on results** and add any missing details
6. **Document edge cases** discovered during implementation

---

**Note**: The Priority System prompts are production-ready and can be used immediately as templates for creating the remaining prompts.
