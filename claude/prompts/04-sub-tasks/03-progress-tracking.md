# Sub-tasks - Progress Tracking

Implement progress calculation, visual progress indicators, and completion cascading logic for hierarchical tasks.

## Progress Calculation

1. **Create progress utility** - `packages/api/src/lib/progress.ts`:

   Reusable progress calculation for task trees:

   ```typescript
   export interface TaskProgress {
     total: number;      // Total sub-tasks (all levels)
     completed: number;  // Completed sub-tasks
     percentage: number; // 0-100
     directTotal: number;    // Direct children only
     directCompleted: number;
   }

   export function calculateProgress(subtasks: TaskWithSubtasks[]): TaskProgress {
     let total = 0;
     let completed = 0;
     let directTotal = subtasks.length;
     let directCompleted = subtasks.filter(s => s.completed).length;

     function walk(tasks: TaskWithSubtasks[]) {
       for (const task of tasks) {
         total++;
         if (task.completed) completed++;
         if (task.subtasks?.length) walk(task.subtasks);
       }
     }
     walk(subtasks);

     return {
       total,
       completed,
       percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
       directTotal,
       directCompleted,
     };
   }
   ```

2. **Include progress in API responses** - Update task queries:

   In the `all` query and `getWithSubtasks`:
   ```typescript
   const tasksWithProgress = tasks.map(task => ({
     ...task,
     progress: task.subtasks?.length
       ? calculateProgress(task.subtasks)
       : null,
   }));
   ```

3. **Completion cascade logic** - When checking/unchecking tasks:

   **Complete parent → Complete all children**:
   ```typescript
   async function completeTaskTree(db, taskId, userId) {
     const now = new Date();
     
     // Get all descendants recursively
     const descendants = await getDescendants(db, taskId);
     const allIds = [taskId, ...descendants.map(d => d.id)];
     
     await db.update(Task)
       .set({ completed: true, completedAt: now, updatedAt: now })
       .where(and(
         inArray(Task.id, allIds),
         eq(Task.userId, userId),
         isNull(Task.deletedAt),
       ));
   }
   ```

   **Uncomplete parent → Uncomplete all children** (optional, could be configurable):
   ```typescript
   async function uncompleteTaskTree(db, taskId, userId) {
     const descendants = await getDescendants(db, taskId);
     const allIds = [taskId, ...descendants.map(d => d.id)];
     
     await db.update(Task)
       .set({ completed: false, completedAt: null, updatedAt: new Date() })
       .where(and(
         inArray(Task.id, allIds),
         eq(Task.userId, userId),
       ));
   }
   ```

   **Complete last sub-task → Auto-complete parent** (optional):
   ```typescript
   async function checkParentCompletion(db, parentTaskId, userId) {
     const siblings = await db.query.Task.findMany({
       where: and(
         eq(Task.parentTaskId, parentTaskId),
         isNull(Task.deletedAt),
       ),
     });
     
     const allComplete = siblings.every(s => s.completed);
     
     if (allComplete) {
       await db.update(Task)
         .set({ completed: true, completedAt: new Date() })
         .where(eq(Task.id, parentTaskId));
     }
   }
   ```

4. **Get descendants helper**:

   ```typescript
   async function getDescendants(db, taskId): Promise<Task[]> {
     const children = await db.query.Task.findMany({
       where: and(eq(Task.parentTaskId, taskId), isNull(Task.deletedAt)),
     });
     
     const allDescendants = [...children];
     for (const child of children) {
       const grandchildren = await getDescendants(db, child.id);
       allDescendants.push(...grandchildren);
     }
     
     return allDescendants;
   }
   ```

5. **Update the task `update` mutation** to integrate cascade logic:

   ```typescript
   update: protectedProcedure
     .input(UpdateTaskSchema)
     .mutation(async ({ ctx, input }) => {
       const { id, ...updates } = input;
       
       // ... existing update logic ...
       
       // Handle completion cascading
       if (updates.completed !== undefined) {
         const task = await ctx.db.query.Task.findFirst({
           where: eq(Task.id, id),
           with: { subtasks: true },
         });
         
         if (updates.completed && task?.subtasks?.length) {
           // Completing a parent: complete all sub-tasks
           await completeTaskTree(ctx.db, id, ctx.session.user.id);
         }
         
         if (updates.completed && task?.parentTaskId) {
           // Completing a sub-task: check if parent should auto-complete
           await checkParentCompletion(ctx.db, task.parentTaskId, ctx.session.user.id);
         }
         
         if (!updates.completed && task?.parentTaskId) {
           // Uncompleting a sub-task: uncomplete parent
           await ctx.db.update(Task)
             .set({ completed: false, completedAt: null })
             .where(eq(Task.id, task.parentTaskId));
         }
       }
       
       // ... return updated task ...
     }),
   ```

## Success Criteria

- ✅ Progress calculation works for all nesting levels
- ✅ API responses include progress data
- ✅ Completing parent completes all sub-tasks
- ✅ Completing last sub-task auto-completes parent
- ✅ Uncompleting sub-task uncompletes parent
- ✅ Progress percentages are accurate
- ✅ Direct vs total counts available
- ✅ Empty sub-task list returns null progress
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify.
