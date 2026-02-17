# Sub-tasks - Drag & Drop Reordering

Implement drag-and-drop reordering for sub-tasks on both web and mobile, including within-parent reordering and drag-to-reparent.

## Web Implementation

1. **Install drag-and-drop library**:

   Use `@dnd-kit` (modern, accessible, performant):
   ```bash
   cd apps/nextjs
   pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Create sortable sub-task list** - Update `SubtaskList.tsx`:

   Wrap sub-tasks in DnD context:
   ```tsx
   import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
   import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
   import { CSS } from "@dnd-kit/utilities";

   function SortableSubtaskList({ subtasks, parentId, onReorder }) {
     const ids = subtasks.map(s => s.id);

     const handleDragEnd = (event: DragEndEvent) => {
       const { active, over } = event;
       if (!over || active.id === over.id) return;

       const oldIndex = ids.indexOf(active.id as string);
       const newIndex = ids.indexOf(over.id as string);
       const newOrder = arrayMove(ids, oldIndex, newIndex);

       onReorder({ parentId, orderedIds: newOrder });
     };

     return (
       <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <SortableContext items={ids} strategy={verticalListSortingStrategy}>
           {subtasks.map(subtask => (
             <SortableSubtaskItem key={subtask.id} subtask={subtask} />
           ))}
         </SortableContext>
       </DndContext>
     );
   }
   ```

3. **Create sortable sub-task item** - Make each item draggable:

   ```tsx
   function SortableSubtaskItem({ subtask }) {
     const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
       id: subtask.id,
     });

     const style = {
       transform: CSS.Transform.toString(transform),
       transition,
       opacity: isDragging ? 0.5 : 1,
       zIndex: isDragging ? 10 : undefined,
     };

     return (
       <div ref={setNodeRef} style={style} className="group">
         <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surface/50">
           {/* Drag handle */}
           <button
             {...attributes}
             {...listeners}
             className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 p-1"
           >
             <GripVerticalIcon className="w-3 h-3 text-muted" />
           </button>

           {/* Rest of sub-task item */}
           <Checkbox checked={subtask.completed} ... />
           <span>{subtask.title}</span>
         </div>
       </div>
     );
   }
   ```

4. **Drag overlay** - Visual feedback while dragging:

   ```tsx
   <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
     <SortableContext items={ids}>
       {/* ... items ... */}
     </SortableContext>

     <DragOverlay>
       {activeId && (
         <div className="bg-surface border border-primary/30 rounded-md shadow-lg p-2 opacity-90">
           <span className="text-sm text-primary">
             {subtasks.find(s => s.id === activeId)?.title}
           </span>
         </div>
       )}
     </DragOverlay>
   </DndContext>
   ```

5. **tRPC integration** - Persist reorder:

   ```typescript
   const reorderMutation = api.task.reorderSubtasks.useMutation({
     onMutate: async ({ parentId, orderedIds }) => {
       // Optimistic reorder
       await utils.task.all.cancel();
       const previous = utils.task.all.getData();

       utils.task.all.setData(undefined, (old) => {
         // Reorder subtasks in local data
         return reorderSubtasksInTree(old, parentId, orderedIds);
       });

       return { previous };
     },
     onError: (err, vars, context) => {
       utils.task.all.setData(undefined, context?.previous);
       toast.error("Failed to reorder");
     },
     onSettled: () => {
       utils.task.all.invalidate();
     },
   });
   ```

## Mobile Implementation

1. **Install drag library**:

   ```bash
   cd apps/expo
   npx expo install react-native-draggable-flatlist react-native-gesture-handler react-native-reanimated
   ```

   `react-native-gesture-handler` and `react-native-reanimated` are likely already installed.

2. **Create draggable sub-task list** - `apps/expo/src/components/DraggableSubtaskList.tsx`:

   ```tsx
   import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";

   function DraggableSubtaskList({ subtasks, parentId, onReorder }) {
     const renderItem = ({ item, drag, isActive }: RenderItemParams<Task>) => (
       <ScaleDecorator>
         <Pressable
           onLongPress={drag}
           disabled={isActive}
           className={cn(
             "flex-row items-center py-3 px-4 gap-3",
             isActive && "bg-primary/10 rounded-lg shadow-lg"
           )}
         >
           {/* Drag handle (visible always on mobile) */}
           <View className="py-2">
             <GripVerticalIcon size={16} color="#8FA8A8" />
           </View>

           <Checkbox
             checked={item.completed}
             onCheckedChange={(checked) => toggleTask(item.id, checked)}
           />

           <Text className={cn(
             "flex-1 text-primary",
             item.completed && "line-through text-muted"
           )}>
             {item.title}
           </Text>
         </Pressable>
       </ScaleDecorator>
     );

     const handleDragEnd = ({ data }: { data: Task[] }) => {
       const orderedIds = data.map(t => t.id);
       onReorder({ parentId, orderedIds });
       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
     };

     return (
       <DraggableFlatList
         data={subtasks}
         renderItem={renderItem}
         keyExtractor={(item) => item.id}
         onDragEnd={handleDragEnd}
         onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
       />
     );
   }
   ```

3. **Enable reordering mode**:

   Add an "Edit" / "Reorder" toggle button:
   ```tsx
   <View className="flex-row items-center justify-between mb-2">
     <Text className="text-base font-semibold text-primary">Sub-tasks</Text>
     <TouchableOpacity onPress={() => setReorderMode(!reorderMode)}>
       <Text className="text-sm text-primary">
         {reorderMode ? "Done" : "Reorder"}
       </Text>
     </TouchableOpacity>
   </View>

   {reorderMode ? (
     <DraggableSubtaskList
       subtasks={task.subtasks}
       parentId={task.id}
       onReorder={handleReorder}
     />
   ) : (
     <SubtaskList subtasks={task.subtasks} ... />
   )}
   ```

4. **Haptic feedback during drag**:

   ```typescript
   onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
   onDragEnd={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
   ```

## Keyboard Shortcuts (Web)

Add keyboard shortcuts for power users:

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Tab" && focusedSubtask) {
      e.preventDefault();
      if (e.shiftKey) {
        // Outdent: Promote sub-task one level
        promoteTask(focusedSubtask.id);
      } else {
        // Indent: Make sub-task of previous sibling
        convertToSubtask(focusedSubtask.id, previousSiblingId);
      }
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [focusedSubtask]);
```

## Success Criteria

- ✅ Web: Can drag to reorder sub-tasks
- ✅ Web: Drag handle appears on hover
- ✅ Web: Visual overlay during drag
- ✅ Web: Optimistic reorder (instant UI update)
- ✅ Web: Tab/Shift+Tab to indent/outdent
- ✅ Mobile: Long-press to start drag
- ✅ Mobile: Haptic feedback on drag start/end
- ✅ Mobile: Scale animation during drag
- ✅ Mobile: Reorder mode toggle
- ✅ Reorder persists to database
- ✅ Works within same parent only (no cross-parent drag for now)
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify.
