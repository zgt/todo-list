# Reminders - Mobile UI (Expo/React Native)

Build mobile reminder management UI with native notifications, bottom sheets, permission handling, and notification action responses.

## Core Components

1. **Reminder Manager** - `apps/expo/src/components/ReminderManager.tsx`:

   Main component for managing task reminders in mobile app.
   
   Props: `{ taskId: string, task: Task }`
   
   Features:
   - Display list of reminders
   - Floating action button (FAB) to add new reminder
   - Swipe actions on reminder items (edit, delete)
   - Permission request flow
   - Integration with NotificationScheduler service
   
   Layout:
   ```tsx
   <View className="flex-1 p-4">
     <Text className="text-lg font-semibold text-primary mb-4">
       Reminders
     </Text>
     
     {!hasPermission && <PermissionPrompt onRequest={requestPermissions} />}
     
     <FlatList
       data={reminders}
       renderItem={({ item }) => <ReminderCard reminder={item} />}
       ListEmptyComponent={<EmptyState />}
     />
     
     <FAB
       icon="bell-plus"
       onPress={() => setShowAddSheet(true)}
       disabled={!hasPermission}
     />
     
     <BottomSheet visible={showAddSheet}>
       <ReminderForm taskId={taskId} task={task} />
     </BottomSheet>
   </View>
   ```

2. **Reminder Form (Bottom Sheet)** - `apps/expo/src/components/ReminderFormSheet.tsx`:

   Bottom sheet for creating/editing reminders.
   
   Type-specific inputs using native components:
   - **Absolute**: Date + time picker (native DateTimePicker)
   - **Relative**: Picker with preset options
   - **Recurring**: Pattern selector + time picker
   - Custom message input (optional)
   
   Implementation:
   ```tsx
   <BottomSheet visible={visible} onClose={onClose}>
     <View className="p-4">
       <Text className="text-xl font-bold text-primary mb-4">
         {reminder ? "Edit Reminder" : "Add Reminder"}
       </Text>
       
       {/* Type Selector */}
       <SegmentedControl
         values={["Specific Time", "Before Due", "Recurring"]}
         selectedIndex={typeIndex}
         onChange={handleTypeChange}
       />
       
       {/* Type-specific inputs */}
       {type === "absolute" && (
         <DateTimePicker
           value={reminderTime}
           mode="datetime"
           minimumDate={new Date()}
           onChange={setReminderTime}
         />
       )}
       
       {type === "relative" && (
         <Picker selectedValue={minutesBefore} onValueChange={setMinutesBefore}>
           <Picker.Item label="5 minutes before" value={5} />
           <Picker.Item label="15 minutes before" value={15} />
           <Picker.Item label="30 minutes before" value={30} />
           <Picker.Item label="1 hour before" value={60} />
           <Picker.Item label="1 day before" value={1440} />
           <Picker.Item label="1 week before" value={10080} />
         </Picker>
       )}
       
       {type === "recurring" && (
         <>
           <RecurrencePatternPicker
             value={recurrencePattern}
             onChange={setRecurrencePattern}
           />
           <TimePicker value={timeOfDay} onChange={setTimeOfDay} />
         </>
       )}
       
       {/* Optional message */}
       <TextInput
         placeholder="Custom message (optional)"
         value={message}
         onChangeText={setMessage}
         className="mt-4"
       />
       
       {/* Actions */}
       <View className="flex-row gap-2 mt-6">
         <Button variant="outline" onPress={onClose} className="flex-1">
           Cancel
         </Button>
         <Button onPress={handleSubmit} className="flex-1">
           {reminder ? "Update" : "Create"}
         </Button>
       </View>
     </View>
   </BottomSheet>
   ```

3. **Reminder Card** - `apps/expo/src/components/ReminderCard.tsx`:

   Individual reminder display with swipe actions.
   
   Props: `{ reminder: Reminder, onEdit: () => void, onDelete: () => void, onToggle: (enabled) => void }`
   
   Features:
   - Type icon and description
   - Next scheduled time
   - Enabled/disabled switch
   - Swipe left to reveal actions (edit, delete)
   
   Implementation:
   ```tsx
   <Swipeable
     renderRightActions={() => (
       <View className="flex-row">
         <TouchableOpacity 
           onPress={onEdit}
           className="bg-blue-600 justify-center px-6"
         >
           <EditIcon color="white" />
         </TouchableOpacity>
         <TouchableOpacity 
           onPress={onDelete}
           className="bg-red-600 justify-center px-6"
         >
           <TrashIcon color="white" />
         </TouchableOpacity>
       </View>
     )}
   >
     <View className="flex-row items-center justify-between p-4 bg-surface">
       <View className="flex-row items-center gap-3 flex-1">
         <ReminderTypeIcon type={reminder.type} />
         <View className="flex-1">
           <Text className="text-primary font-medium">
             {formatReminderDescription(reminder)}
           </Text>
           <Text className="text-sm text-muted">
             Next: {formatNextScheduledTime(reminder)}
           </Text>
         </View>
       </View>
       
       <Switch
         value={reminder.enabled}
         onValueChange={onToggle}
         trackColor={{ false: "#8FA8A8", true: "#50C878" }}
       />
     </View>
   </Swipeable>
   ```

4. **Permission Handler** - `apps/expo/src/components/PermissionPrompt.tsx`:

   Permission request UI and handling.
   
   Features:
   - Explain why notifications are needed
   - Request button
   - Handle denied state (link to settings)
   - Check permission on mount
   
   States:
   - Not determined → Show request button
   - Denied → Show "Enable in Settings" button
   - Granted → Hide component
   
   ```tsx
   const PermissionPrompt = ({ onRequest }: Props) => {
     const [status, setStatus] = useState<PermissionStatus>("undetermined");
     
     if (status === "granted") return null;
     
     return (
       <View className="p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
         <Text className="text-yellow-300 font-medium mb-2">
           {status === "denied" 
             ? "Notifications Disabled" 
             : "Enable Notifications"}
         </Text>
         <Text className="text-yellow-200 text-sm mb-3">
           {status === "denied"
             ? "Please enable notifications in Settings to receive reminders."
             : "Get notified about your tasks so you never miss a deadline."}
         </Text>
         
         <Button
           onPress={status === "denied" ? openSettings : onRequest}
           variant="outline"
         >
           {status === "denied" ? "Open Settings" : "Enable Notifications"}
         </Button>
       </View>
     );
   };
   ```

## Notification Scheduling Integration

1. **Schedule on create** - When reminder is created via API:
   ```typescript
   const createMutation = api.reminder.create.useMutation({
     onSuccess: async (reminder) => {
       // Schedule the notification
       const notificationId = await NotificationScheduler.scheduleReminder({
         ...reminder,
         task: task // Include task data
       });
       
       // Update database with notification ID
       await updateNotificationId.mutateAsync({
         id: reminder.id,
         notificationId,
         platform: Platform.OS
       });
       
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
       toast.success("Reminder created");
     }
   });
   ```

2. **Cancel on delete** - When reminder is deleted:
   ```typescript
   const deleteMutation = api.reminder.delete.useMutation({
     onSuccess: async (data) => {
       // Cancel the notification
       if (data.notificationId) {
         await Notifications.cancelScheduledNotificationAsync(data.notificationId);
       }
       
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
       toast.success("Reminder deleted");
     }
   });
   ```

3. **Reschedule on update** - When reminder is updated:
   ```typescript
   const updateMutation = api.reminder.update.useMutation({
     onSuccess: async (reminder) => {
       // Cancel old notification
       if (reminder.iosNotificationId || reminder.androidNotificationId) {
         const oldId = Platform.OS === "ios" 
           ? reminder.iosNotificationId 
           : reminder.androidNotificationId;
         if (oldId) {
           await Notifications.cancelScheduledNotificationAsync(oldId);
         }
       }
       
       // Schedule new notification
       const notificationId = await NotificationScheduler.scheduleReminder({
         ...reminder,
         task
       });
       
       // Update database
       await updateNotificationId.mutateAsync({
         id: reminder.id,
         notificationId,
         platform: Platform.OS
       });
     }
   });
   ```

## Notification Action Handlers

1. **Handle notification tap** - Navigate to task when notification is tapped:
   ```typescript
   useEffect(() => {
     const subscription = Notifications.addNotificationResponseReceivedListener(
       async (response) => {
         const { taskId, reminderId, type } = response.notification.request.content.data;
         
         if (type === "reminder") {
           // Mark reminder as sent
           await markSentMutation.mutateAsync({ id: reminderId });
           
           // Navigate to task detail
           router.push(`/tasks/${taskId}`);
         }
       }
     );
     
     return () => subscription.remove();
   }, []);
   ```

2. **Handle notification actions** - Complete task or snooze from notification:
   ```typescript
   const subscription = Notifications.addNotificationResponseReceivedListener(
     async (response) => {
       const { actionIdentifier } = response;
       const { taskId, reminderId } = response.notification.request.content.data;
       
       switch (actionIdentifier) {
         case "complete":
           await completeTaskMutation.mutateAsync({ id: taskId });
           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
           break;
           
         case "snooze-15":
           await snoozeMutation.mutateAsync({ id: reminderId, snoozeMinutes: 15 });
           break;
           
         case "snooze-1h":
           await snoozeMutation.mutateAsync({ id: reminderId, snoozeMinutes: 60 });
           break;
           
         case "view":
           router.push(`/tasks/${taskId}`);
           break;
       }
     }
   );
   ```

3. **Background notification handling** - When app is closed:
   - Notification fires from OS
   - User taps or uses action
   - App opens and handles response
   - Update badge count

## Badge Count Management

1. **Update badge on task changes**:
   ```typescript
   useEffect(() => {
     const updateBadge = async () => {
       const count = await getIncompleteTaskCount();
       await Notifications.setBadgeCountAsync(count);
     };
     
     updateBadge();
   }, [tasks]);
   ```

2. **Clear badge when app opens**:
   ```typescript
   useFocusEffect(
     useCallback(() => {
       Notifications.setBadgeCountAsync(0);
     }, [])
   );
   ```

## Integration with Task Screens

1. **Task Detail Screen** - Add reminder section:
   ```tsx
   <ScrollView>
     {/* ... existing task details ... */}
     
     <View className="mt-6">
       <ReminderManager taskId={task.id} task={task} />
     </View>
   </ScrollView>
   ```

2. **Task Card Enhancement** - Show reminder indicator:
   ```tsx
   {task.reminders && task.reminders.length > 0 && (
     <View className="flex-row items-center gap-1">
       <BellIcon size={16} color="#50C878" />
       <Text className="text-xs text-primary-bright">
         {task.reminders.length}
       </Text>
     </View>
   )}
   ```

## Testing Features

1. **Test notification screen** - For development:
   - Button to schedule test notification in 5 seconds
   - Button to test notification actions
   - Display permission status
   - List all scheduled notifications
   - Button to clear all notifications

2. **Debug tools**:
   - Log all notification scheduling
   - Display notification IDs
   - Show badge count
   - Test notification sounds

## Success Criteria

- ✅ Can request notification permissions
- ✅ Can create reminders of all types
- ✅ Notifications schedule successfully
- ✅ Can edit reminder and notification reschedules
- ✅ Can delete reminder and notification cancels
- ✅ Can toggle enabled/disabled
- ✅ Notification appears when scheduled
- ✅ Tapping notification opens task
- ✅ Complete action works from notification
- ✅ Snooze actions work from notification
- ✅ Badge count updates correctly
- ✅ Works when app is closed/backgrounded
- ✅ Swipe actions work smoothly
- ✅ Haptic feedback triggers
- ✅ No TypeScript errors
- ✅ Works on both iOS and Android

Run `pnpm typecheck` and `pnpm ios`/`pnpm android` to test on device.
