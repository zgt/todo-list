# Sub-tasks - Mobile UI (Expo/React Native)

Build mobile sub-task interface with collapsible task trees, inline creation, progress indicators, and touch-optimized management.

## Components

1. **Sub-task Section** - `apps/expo/src/components/SubtaskSection.tsx`:

   Section within task detail that shows and manages sub-tasks.

   Props: `{ task: TaskWithSubtasks }`

   ```tsx
   function SubtaskSection({ task }) {
     const [showAll, setShowAll] = useState(false);
     const visibleSubtasks = showAll ? task.subtasks : task.subtasks?.slice(0, 5);

     return (
       <View className="mt-4">
         {/* Header with progress */}
         <View className="flex-row items-center justify-between mb-3">
           <Text className="text-base font-semibold text-primary">
             Sub-tasks
           </Text>
           {task.progress && (
             <Text className="text-sm text-muted">
               {task.progress.completed}/{task.progress.total}
             </Text>
           )}
         </View>

         {/* Progress bar */}
         {task.progress && <ProgressBar progress={task.progress} />}

         {/* Sub-task list */}
         {visibleSubtasks?.map(subtask => (
           <SubtaskRow key={subtask.id} subtask={subtask} depth={1} />
         ))}

         {/* Show more */}
         {task.subtasks?.length > 5 && !showAll && (
           <TouchableOpacity onPress={() => setShowAll(true)}>
             <Text className="text-sm text-primary mt-2">
               Show {task.subtasks.length - 5} more...
             </Text>
           </TouchableOpacity>
         )}

         {/* Add sub-task */}
         <AddSubtaskButton parentId={task.id} depth={task.depth + 1} />
       </View>
     );
   }
   ```

2. **Sub-task Row** - `apps/expo/src/components/SubtaskRow.tsx`:

   Individual sub-task item with checkbox, expandable children, and swipe actions.

   ```tsx
   const SubtaskRow = memo(({ subtask, depth }) => {
     const [expanded, setExpanded] = useState(false);
     const toggleMutation = api.task.update.useMutation();
     const hasChildren = subtask.subtasks?.length > 0;

     return (
       <View style={{ marginLeft: depth * 16 }}>
         <Swipeable
           renderRightActions={() => (
             <View className="flex-row">
               <SwipeAction icon="edit" onPress={() => editSubtask(subtask)} />
               <SwipeAction icon="trash" onPress={() => deleteSubtask(subtask.id)} color="red" />
             </View>
           )}
         >
           <Pressable
             onPress={() => hasChildren && setExpanded(!expanded)}
             className="flex-row items-center py-3 px-2 gap-3"
           >
             {/* Expand chevron (if has children) */}
             {hasChildren ? (
               <Animated.View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
                 <ChevronRightIcon size={16} color="#8FA8A8" />
               </Animated.View>
             ) : (
               <View className="w-4" />
             )}

             {/* Checkbox */}
             <Checkbox
               checked={subtask.completed}
               onCheckedChange={(checked) => {
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                 toggleMutation.mutate({ id: subtask.id, completed: checked });
               }}
             />

             {/* Title */}
             <Text className={cn(
               "flex-1 text-primary",
               subtask.completed && "line-through text-muted"
             )}>
               {subtask.title}
             </Text>

             {/* Child count */}
             {hasChildren && (
               <Text className="text-xs text-muted">
                 {subtask.subtasks.filter(s => s.completed).length}/{subtask.subtasks.length}
               </Text>
             )}
           </Pressable>
         </Swipeable>

         {/* Nested sub-tasks */}
         {expanded && subtask.subtasks?.map(child => (
           <SubtaskRow key={child.id} subtask={child} depth={depth + 1} />
         ))}
       </View>
     );
   });
   ```

3. **Progress Bar** - `apps/expo/src/components/ProgressBar.tsx`:

   Animated progress bar for task completion.

   ```tsx
   function ProgressBar({ progress }: { progress: TaskProgress }) {
     const width = useSharedValue(0);

     useEffect(() => {
       width.value = withTiming(progress.percentage, { duration: 300 });
     }, [progress.percentage]);

     const animatedStyle = useAnimatedStyle(() => ({
       width: `${width.value}%`,
     }));

     return (
       <View className="h-2 bg-surface rounded-full overflow-hidden mb-3">
         <Animated.View
           style={animatedStyle}
           className={cn(
             "h-full rounded-full",
             progress.percentage === 100 ? "bg-green-500" : "bg-primary"
           )}
         />
       </View>
     );
   }
   ```

   Requires `react-native-reanimated` (likely already installed with Expo).

4. **Add Sub-task Button** - `apps/expo/src/components/AddSubtaskButton.tsx`:

   Inline button that expands into a text input.

   ```tsx
   function AddSubtaskButton({ parentId, depth }) {
     const [isAdding, setIsAdding] = useState(false);
     const [title, setTitle] = useState("");
     const createMutation = api.task.createSubtask.useMutation();

     if (depth > 3) return null; // Max depth reached

     if (!isAdding) {
       return (
         <TouchableOpacity
           onPress={() => setIsAdding(true)}
           className="flex-row items-center gap-2 py-3 px-2"
           style={{ marginLeft: depth * 16 }}
         >
           <PlusIcon size={16} color="#8FA8A8" />
           <Text className="text-sm text-muted">Add sub-task</Text>
         </TouchableOpacity>
       );
     }

     return (
       <View className="flex-row items-center gap-2 py-2 px-2" style={{ marginLeft: depth * 16 }}>
         <TextInput
           autoFocus
           value={title}
           onChangeText={setTitle}
           placeholder="Sub-task title..."
           placeholderTextColor="#8FA8A8"
           className="flex-1 text-primary text-sm py-2"
           onSubmitEditing={() => {
             if (title.trim()) {
               createMutation.mutate({ parentTaskId: parentId, title: title.trim() });
               setTitle("");
             }
           }}
           onBlur={() => { if (!title) setIsAdding(false); }}
           returnKeyType="done"
         />
       </View>
     );
   }
   ```

5. **Task Card Enhancement** - Show progress on main task list:

   Update the existing task card in the task list to show:
   - Sub-task count badge
   - Mini progress bar (thin line at bottom of card)
   - Tap to expand inline sub-tasks

   ```tsx
   {task.progress && task.progress.total > 0 && (
     <View className="mt-2">
       <View className="flex-row items-center gap-2">
         <ListTreeIcon size={14} color="#8FA8A8" />
         <Text className="text-xs text-muted">
           {task.progress.completed}/{task.progress.total} complete
         </Text>
       </View>
       <View className="h-1 bg-surface rounded-full overflow-hidden mt-1">
         <View
           className={cn("h-full rounded-full", task.progress.percentage === 100 ? "bg-green-500" : "bg-primary")}
           style={{ width: `${task.progress.percentage}%` }}
         />
       </View>
     </View>
   )}
   ```

6. **Task Detail Screen** - Integration:

   Add SubtaskSection to the task detail screen:
   ```tsx
   <ScrollView className="flex-1 p-4">
     {/* Existing task details */}
     <TaskTitle ... />
     <TaskDescription ... />
     <CategoryPicker ... />
     <PrioritySelector ... />
     <DueDatePicker ... />
     <ReminderManager ... />

     {/* Sub-tasks section */}
     <SubtaskSection task={task} />
   </ScrollView>
   ```

7. **Context Menu / Long Press** - Sub-task operations:

   Long-press on a task shows options:
   - "Add Sub-task"
   - "Convert to Sub-task" (opens parent picker)
   - "Promote to Task" (only on sub-tasks)
   - "Complete All Sub-tasks"

   Use a bottom sheet or ActionSheet:
   ```tsx
   <ActionSheet visible={showActions} onClose={() => setShowActions(false)}>
     <ActionSheetItem
       icon="list-tree"
       label="Add Sub-task"
       onPress={() => { setShowActions(false); setAddingSubtask(true); }}
     />
     {!task.isSubtask && (
       <ActionSheetItem
         icon="arrow-down-to-line"
         label="Convert to Sub-task"
         onPress={() => { setShowActions(false); setShowParentPicker(true); }}
       />
     )}
     {task.isSubtask && (
       <ActionSheetItem
         icon="arrow-up-to-line"
         label="Promote to Task"
         onPress={handlePromote}
       />
     )}
   </ActionSheet>
   ```

## Performance Considerations

- Use `memo()` on SubtaskRow — it renders frequently in lists
- Use `useCallback` for toggle/delete handlers
- Don't deep-render more than 3 levels by default
- Consider virtualizing with FlatList for tasks with many sub-tasks (20+)
- Animated progress bar uses native driver via Reanimated

## Success Criteria

- ✅ Sub-task section displays in task detail
- ✅ Nested indentation renders correctly
- ✅ Can expand/collapse sub-task trees
- ✅ Inline sub-task creation works
- ✅ Checkbox toggle with haptic feedback
- ✅ Swipe to edit/delete sub-tasks
- ✅ Animated progress bar updates smoothly
- ✅ Progress shows on task cards in list
- ✅ Long-press context menu works
- ✅ Can convert task to sub-task
- ✅ Can promote sub-task to task
- ✅ Max depth enforced (no add button at depth 3)
- ✅ Scrolling performance is smooth
- ✅ Works on iOS and Android
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm ios`/`pnpm android` to test.
