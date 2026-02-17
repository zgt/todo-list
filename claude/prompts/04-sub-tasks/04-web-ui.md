# Sub-tasks - Web UI

Build web interface for displaying and managing hierarchical tasks with nested views, inline creation, progress bars, and tree manipulation.

## Components

1. **Sub-task List** - `apps/nextjs/src/app/_components/SubtaskList.tsx`:

   Recursive component that renders a task's sub-tasks with indentation.

   Props: `{ subtasks: Task[], parentId: string, depth: number, onToggle, onCreate, onDelete }`

   ```tsx
   function SubtaskList({ subtasks, parentId, depth, onToggle, onCreate, onDelete }) {
     if (!subtasks.length && depth > 0) return null;

     return (
       <div className={cn("space-y-1", depth > 0 && "ml-6 border-l border-default pl-3")}>
         {subtasks.map(subtask => (
           <div key={subtask.id}>
             <SubtaskItem
               task={subtask}
               depth={depth}
               onToggle={onToggle}
               onDelete={onDelete}
             />
             {subtask.subtasks?.length > 0 && (
               <SubtaskList
                 subtasks={subtask.subtasks}
                 parentId={subtask.id}
                 depth={depth + 1}
                 onToggle={onToggle}
                 onCreate={onCreate}
                 onDelete={onDelete}
               />
             )}
           </div>
         ))}
         
         {depth < 3 && (
           <AddSubtaskInline parentId={parentId} depth={depth} />
         )}
       </div>
     );
   }
   ```

2. **Sub-task Item** - `apps/nextjs/src/app/_components/SubtaskItem.tsx`:

   Individual sub-task row with checkbox, title, and actions.

   ```tsx
   function SubtaskItem({ task, depth, onToggle, onDelete }) {
     return (
       <div className="group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surface/50">
         <Checkbox
           checked={task.completed}
           onCheckedChange={(checked) => onToggle(task.id, checked)}
           className="shrink-0"
         />
         
         <span className={cn(
           "flex-1 text-sm",
           task.completed && "line-through text-muted"
         )}>
           {task.title}
         </span>
         
         {task.progress && (
           <span className="text-xs text-muted">
             {task.progress.completed}/{task.progress.total}
           </span>
         )}
         
         {task.priority && <PriorityBadge priority={task.priority} variant="compact" />}
         
         <div className="opacity-0 group-hover:opacity-100 flex gap-1">
           {depth < 3 && (
             <Button variant="ghost" size="xs" title="Add sub-task">
               <PlusIcon className="w-3 h-3" />
             </Button>
           )}
           <Button variant="ghost" size="xs" onClick={() => onDelete(task.id)}>
             <TrashIcon className="w-3 h-3" />
           </Button>
         </div>
       </div>
     );
   }
   ```

3. **Inline Add Sub-task** - `apps/nextjs/src/app/_components/AddSubtaskInline.tsx`:

   Inline text input that appears below sub-tasks for quick creation.

   ```tsx
   function AddSubtaskInline({ parentId, depth }) {
     const [isAdding, setIsAdding] = useState(false);
     const [title, setTitle] = useState("");
     const createMutation = api.task.createSubtask.useMutation();
     
     if (!isAdding) {
       return (
         <button
           onClick={() => setIsAdding(true)}
           className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted hover:text-primary w-full"
         >
           <PlusIcon className="w-3 h-3" />
           Add sub-task
         </button>
       );
     }
     
     return (
       <form onSubmit={handleSubmit} className="flex items-center gap-2 py-1 px-2">
         <div className="w-4 h-4 rounded border border-default shrink-0" />
         <input
           autoFocus
           value={title}
           onChange={(e) => setTitle(e.target.value)}
           onBlur={() => { if (!title) setIsAdding(false); }}
           onKeyDown={(e) => { if (e.key === "Escape") setIsAdding(false); }}
           placeholder="Sub-task title..."
           className="flex-1 bg-transparent text-sm outline-none text-primary placeholder:text-muted"
         />
       </form>
     );
   }
   ```

4. **Progress Bar** - `apps/nextjs/src/app/_components/TaskProgressBar.tsx`:

   Visual progress indicator for tasks with sub-tasks.

   ```tsx
   function TaskProgressBar({ progress }: { progress: TaskProgress | null }) {
     if (!progress || progress.total === 0) return null;
     
     return (
       <div className="flex items-center gap-2">
         <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
           <div
             className={cn(
               "h-full rounded-full transition-all duration-300",
               progress.percentage === 100 ? "bg-green-500" : "bg-primary"
             )}
             style={{ width: `${progress.percentage}%` }}
           />
         </div>
         <span className="text-xs text-muted whitespace-nowrap">
           {progress.completed}/{progress.total}
         </span>
       </div>
     );
   }
   ```

5. **Update Task Card** - Add progress bar and sub-task count:

   In the existing task card component, add:
   ```tsx
   {task.progress && task.progress.total > 0 && (
     <div className="mt-2">
       <TaskProgressBar progress={task.progress} />
     </div>
   )}
   ```

   Add expand/collapse toggle if task has sub-tasks:
   ```tsx
   {task.subtasks?.length > 0 && (
     <Button variant="ghost" size="xs" onClick={() => setExpanded(!expanded)}>
       <ChevronIcon className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
       <span className="text-xs text-muted ml-1">
         {task.subtasks.length} sub-tasks
       </span>
     </Button>
   )}
   
   {expanded && (
     <SubtaskList
       subtasks={task.subtasks}
       parentId={task.id}
       depth={1}
       onToggle={handleToggle}
       onCreate={handleCreate}
       onDelete={handleDelete}
     />
   )}
   ```

6. **Task Context Menu Actions** - Add sub-task operations:

   Right-click or dropdown menu on tasks:
   - "Add sub-task" — Opens inline add
   - "Convert to sub-task" — Opens parent picker dialog
   - "Promote to task" — Removes parent (only on sub-tasks)
   - "Complete all sub-tasks" — Batch complete

   ```tsx
   <DropdownMenu>
     <DropdownMenuItem onClick={() => setAddingSubtask(true)}>
       <ListTreeIcon className="mr-2" /> Add Sub-task
     </DropdownMenuItem>
     
     {!task.isSubtask && (
       <DropdownMenuItem onClick={() => setShowParentPicker(true)}>
         <ArrowDownIcon className="mr-2" /> Convert to Sub-task
       </DropdownMenuItem>
     )}
     
     {task.isSubtask && (
       <DropdownMenuItem onClick={() => promoteTask(task.id)}>
         <ArrowUpIcon className="mr-2" /> Promote to Task
       </DropdownMenuItem>
     )}
   </DropdownMenu>
   ```

7. **Parent Picker Dialog** - For "Convert to Sub-task" and "Move" operations:

   Dialog showing a searchable list of tasks to pick as parent.
   - Filter out: the task itself, its descendants (prevent cycles), tasks at max depth
   - Show category and current sub-task count
   - Search by title

## Success Criteria

- ✅ Sub-tasks display nested with indentation
- ✅ Can expand/collapse sub-task trees
- ✅ Inline sub-task creation works
- ✅ Progress bar shows on tasks with sub-tasks
- ✅ Checkbox toggles cascade correctly
- ✅ Can add sub-tasks at any level (up to max depth)
- ✅ Context menu shows sub-task actions
- ✅ Can convert task to sub-task
- ✅ Can promote sub-task to top-level
- ✅ Completed sub-tasks show strikethrough
- ✅ Design follows design system
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm dev:next` to test.
