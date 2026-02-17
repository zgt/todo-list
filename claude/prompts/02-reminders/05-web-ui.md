# Reminders - Web UI

Build web interface for managing task reminders with type selection, time pickers, reminder list, and integration with task detail views.

## Core Components

1. **Reminder Manager** - `apps/nextjs/src/app/_components/ReminderManager.tsx`:

   Main component for task detail view showing all reminders for a task.
   
   Props: `{ taskId: string, taskDueDate: Date | null }`
   
   Features:
   - Display list of existing reminders
   - "Add Reminder" button opens form
   - Edit/delete actions for each reminder
   - Visual indicator if task has active reminders
   - Empty state: "No reminders set" with quick add button

   Layout:
   ```tsx
   <div className="space-y-4">
     <div className="flex items-center justify-between">
       <h3>Reminders</h3>
       <Button onClick={() => setShowForm(true)}>
         <BellIcon className="mr-2" />
         Add Reminder
       </Button>
     </div>
     
     {reminders.length === 0 ? (
       <EmptyState />
     ) : (
       <ReminderList reminders={reminders} onEdit={...} onDelete={...} />
     )}
     
     <Dialog open={showForm} onOpenChange={setShowForm}>
       <ReminderForm taskId={taskId} taskDueDate={taskDueDate} />
     </Dialog>
   </div>
   ```

2. **Reminder Form** - `apps/nextjs/src/app/_components/ReminderForm.tsx`:

   Form for creating/editing reminders with type-specific fields.
   
   Props: `{ taskId: string, taskDueDate: Date | null, reminder?: Reminder, onSubmit: () => void }`
   
   Fields:
   - Reminder type selector (tabs or radio group): Absolute, Relative, Recurring
   - Type-specific inputs (show/hide based on selected type):
     - **Absolute**: Date + time picker
     - **Relative**: Dropdown (15 min before, 30 min, 1 hour, 1 day, 1 week)
     - **Recurring**: Pattern selector (daily, weekly) + time picker
   - Custom message (optional textarea)
   - Submit button

   Validation:
   - Absolute: Must be future date/time
   - Relative: Task must have due date (show warning if not)
   - Recurring: Valid pattern required

   State management:
   ```typescript
   const [type, setType] = useState<ReminderType>("absolute");
   const [reminderTime, setReminderTime] = useState<Date>();
   const [minutesBefore, setMinutesBefore] = useState(30);
   const [recurrencePattern, setRecurrencePattern] = useState("daily");
   const [message, setMessage] = useState("");
   ```

3. **Reminder List** - `apps/nextjs/src/app/_components/ReminderList.tsx`:

   Display all reminders with actions.
   
   Props: `{ reminders: Reminder[], onEdit: (id) => void, onDelete: (id) => void, onToggle: (id, enabled) => void }`
   
   Each reminder card shows:
   - Type icon (clock, calendar, repeat)
   - Description (e.g., "30 minutes before due date" or "Daily at 9:00 AM")
   - Next scheduled time
   - Enabled toggle switch
   - Edit and delete buttons
   
   Design:
   ```tsx
   <div className="space-y-2">
     {reminders.map(reminder => (
       <div key={reminder.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-default">
         <div className="flex items-center gap-3">
           <ReminderIcon type={reminder.type} />
           <div>
             <p className="text-primary font-medium">
               {formatReminderDescription(reminder)}
             </p>
             <p className="text-sm text-muted">
               Next: {formatNextScheduledTime(reminder)}
             </p>
           </div>
         </div>
         
         <div className="flex items-center gap-2">
           <Switch
             checked={reminder.enabled}
             onCheckedChange={(enabled) => onToggle(reminder.id, enabled)}
           />
           <Button variant="ghost" size="sm" onClick={() => onEdit(reminder.id)}>
             <EditIcon />
           </Button>
           <Button variant="ghost" size="sm" onClick={() => onDelete(reminder.id)}>
             <TrashIcon />
           </Button>
         </div>
       </div>
     ))}
   </div>
   ```

4. **Reminder Type Selector** - `apps/nextjs/src/app/_components/ReminderTypeSelector.tsx`:

   Tabs or segmented control for selecting reminder type.
   
   Options:
   - ⏰ Absolute - "Specific time"
   - ⏱️ Relative - "Before due date"  
   - 🔁 Recurring - "Repeat daily/weekly"
   
   Use shadcn/ui Tabs component:
   ```tsx
   <Tabs value={type} onValueChange={setType}>
     <TabsList>
       <TabsTrigger value="absolute">
         <ClockIcon className="mr-2" />
         Specific Time
       </TabsTrigger>
       <TabsTrigger value="relative">
         <TimerIcon className="mr-2" />
         Before Due Date
       </TabsTrigger>
       <TabsTrigger value="recurring">
         <RepeatIcon className="mr-2" />
         Recurring
       </TabsTrigger>
     </TabsList>
   </Tabs>
   ```

5. **Time Pickers**:

   Use shadcn/ui components or build custom:
   - Date picker: shadcn Popover + Calendar component
   - Time picker: Custom dropdown or input with hour/minute selects
   - Relative time dropdown: Simple Select with preset options
   
   Preset options for relative reminders:
   - 5 minutes before
   - 15 minutes before
   - 30 minutes before
   - 1 hour before
   - 2 hours before
   - 1 day before
   - 1 week before
   - Custom (show number input)

## Integration with Task Views

1. **Task Detail Page** - Update task detail view:
   - Add ReminderManager component
   - Show reminder count badge on task card
   - Include in task edit modal/page

2. **Task Card Enhancement** - Add reminder indicator:
   ```tsx
   {task.reminders?.length > 0 && (
     <Badge variant="secondary">
       <BellIcon className="w-3 h-3 mr-1" />
       {task.reminders.length}
     </Badge>
   )}
   ```

3. **Quick Add Reminder** - Floating action button on task hover:
   - Hover over task card
   - Show quick "Add Reminder" icon button
   - Opens ReminderForm dialog

## Data Fetching & Mutations

1. **tRPC Integration**:
   ```typescript
   // Fetch reminders
   const { data: reminders } = api.reminder.getByTaskId.useQuery({ 
     taskId 
   });
   
   // Create reminder
   const createMutation = api.reminder.create.useMutation({
     onSuccess: () => {
       queryClient.invalidateQueries(api.reminder.getByTaskId.queryKey());
       toast.success("Reminder created");
     }
   });
   
   // Delete reminder
   const deleteMutation = api.reminder.delete.useMutation({
     onSuccess: () => {
       queryClient.invalidateQueries(api.reminder.getByTaskId.queryKey());
       toast.success("Reminder deleted");
     }
   });
   
   // Toggle enabled
   const toggleMutation = api.reminder.toggle.useMutation({
     onSuccess: () => {
       queryClient.invalidateQueries(api.reminder.getByTaskId.queryKey());
     }
   });
   ```

2. **Optimistic Updates** - For better UX on toggle:
   ```typescript
   const toggleMutation = api.reminder.toggle.useMutation({
     onMutate: async ({ id, enabled }) => {
       await queryClient.cancelQueries(api.reminder.getByTaskId.queryKey());
       const previous = queryClient.getQueryData(api.reminder.getByTaskId.queryKey());
       queryClient.setQueryData(api.reminder.getByTaskId.queryKey(), (old) => 
         old?.map(r => r.id === id ? { ...r, enabled } : r)
       );
       return { previous };
     },
     onError: (err, variables, context) => {
       queryClient.setQueryData(api.reminder.getByTaskId.queryKey(), context.previous);
     }
   });
   ```

## Helper Functions

1. **Format reminder description**:
   ```typescript
   function formatReminderDescription(reminder: Reminder): string {
     switch (reminder.type) {
       case "absolute":
         return format(reminder.reminderTime, "MMM d, yyyy 'at' h:mm a");
       case "relative":
         const mins = reminder.minutesBeforeDue;
         if (mins < 60) return `${mins} minutes before due date`;
         if (mins < 1440) return `${mins / 60} hours before due date`;
         return `${mins / 1440} days before due date`;
       case "recurring":
         return `${reminder.recurrencePattern} reminder`;
     }
   }
   ```

2. **Format next scheduled time**:
   ```typescript
   function formatNextScheduledTime(reminder: Reminder): string {
     if (!reminder.nextScheduledAt) return "Not scheduled";
     return formatDistanceToNow(reminder.nextScheduledAt, { addSuffix: true });
   }
   ```

## Design System Adherence

**Colors** (from design system):
- Background: `bg-surface` (#102A2A)
- Border: `border-default` (#164B49)
- Text: `text-primary` (#DCE4E4), `text-muted` (#8FA8A8)
- Accent: Use emerald green (#50C878) for active states

**Components**:
- Use shadcn/ui Button, Dialog, Select, Tabs
- Follow spacing scale: `space-y-4`, `gap-3`
- Border radius: `rounded-lg` (12px)

## Success Criteria

- ✅ Can open ReminderManager from task detail
- ✅ Can create absolute time reminder
- ✅ Can create relative reminder (before due date)
- ✅ Can create recurring daily reminder
- ✅ Can edit existing reminder
- ✅ Can delete reminder
- ✅ Can toggle reminder enabled/disabled
- ✅ Reminders display correctly in list
- ✅ Task cards show reminder count badge
- ✅ Form validation prevents invalid inputs
- ✅ Optimistic updates work smoothly
- ✅ Design matches design system
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm dev` to test.
