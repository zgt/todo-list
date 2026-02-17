# Sub-tasks - tRPC API

Extend the task router with sub-task operations including hierarchical queries, creation, reordering, and tree manipulation.

## Router Updates

1. **Update existing `all` query** in `packages/api/src/router/task.ts`:

   Modify to only return top-level tasks by default, with sub-tasks nested:

   ```typescript
   all: protectedProcedure.query(async ({ ctx }) => {
     const tasks = await ctx.db.query.Task.findMany({
       where: and(
         eq(Task.userId, ctx.session.user.id),
         isNull(Task.deletedAt),
         isNull(Task.archivedAt),
         isNull(Task.parentTaskId), // Only top-level tasks
       ),
       orderBy: [desc(Task.createdAt)],
       limit: 100,
       with: {
         category: true,
         subtasks: {
           where: and(isNull(Task.deletedAt), isNull(Task.archivedAt)),
           orderBy: [asc(Task.orderIndex)],
           with: {
             subtasks: { // 2 levels deep
               where: and(isNull(Task.deletedAt), isNull(Task.archivedAt)),
               orderBy: [asc(Task.orderIndex)],
             }
           }
         },
       },
     });
     // ... existing date serialization
   });
   ```

2. **Add new procedures** to the task router:

   **Queries**:

   - `getWithSubtasks` - Get a task with its full sub-task tree
     - Input: `{ id: string }`
     - Validate user ownership
     - Return task with nested subtasks (up to max depth)
     - Include completion stats: `{ total: number, completed: number, percentage: number }`

   - `getSubtasks` - Get direct children of a task
     - Input: `{ parentTaskId: string }`
     - Validate user owns parent task
     - Return sub-tasks ordered by orderIndex
     - Include nested sub-task counts

   **Mutations**:

   - `createSubtask` - Create a sub-task under a parent
     - Input: `CreateSubtaskSchema` (parentTaskId, title, description, dueDate, priority)
     - Validate user owns the parent task
     - Calculate depth from parent (parent.depth + 1)
     - Enforce max depth (3) — throw BAD_REQUEST if exceeded
     - Set `isSubtask: true`
     - Set `categoryId` to parent's category (inherit)
     - Auto-assign `orderIndex` (max existing + 1)
     - Return created sub-task

   - `moveTask` - Change a task's parent (or promote to top-level)
     - Input: `MoveTaskSchema` (taskId, newParentId)
     - Validate user owns both tasks
     - If newParentId is null: Promote to top-level (set parentTaskId=null, depth=0, isSubtask=false)
     - If newParentId is set: Move under new parent
       - Calculate new depth
       - Enforce max depth (check task's own sub-tree depth + new parent depth)
       - Update all descendant depths recursively
     - Update orderIndex for new sibling list

   - `reorderSubtasks` - Reorder sub-tasks within a parent
     - Input: `ReorderSubtasksSchema` (parentTaskId, orderedIds)
     - Validate user owns parent
     - Validate all orderedIds are direct children of parentTaskId
     - Update orderIndex for each sub-task based on array position
     - Use transaction for atomicity

   - `convertToSubtask` - Convert an existing top-level task to a sub-task
     - Input: `{ taskId: string, parentTaskId: string }`
     - Validate user owns both tasks
     - Validate depth limit won't be exceeded
     - Update parentTaskId, depth, isSubtask
     - Move task's own sub-tasks (update their depth)

   - `promoteToTask` - Promote a sub-task to a top-level task
     - Input: `{ taskId: string }`
     - Set parentTaskId to null, depth to 0, isSubtask to false
     - Keep existing sub-tasks (update their depths)

3. **Update existing `update` mutation**:

   When a task is completed, offer option to complete all sub-tasks:
   ```typescript
   // If completing a task with sub-tasks
   if (updates.completed === true) {
     // Auto-complete all sub-tasks
     await ctx.db.update(Task)
       .set({ completed: true, completedAt: new Date() })
       .where(and(
         eq(Task.parentTaskId, id), // Direct children only, or recursive
         eq(Task.userId, ctx.session.user.id),
         isNull(Task.deletedAt),
       ));
   }
   ```

4. **Update existing `delete` mutation**:

   Cascade delete is handled by the database foreign key, but we should soft-delete sub-tasks too:
   ```typescript
   // Soft delete all sub-tasks recursively
   async function softDeleteTree(db: Database, taskId: string, userId: string) {
     const now = new Date();
     
     // Get direct children
     const children = await db.query.Task.findMany({
       where: and(eq(Task.parentTaskId, taskId), isNull(Task.deletedAt)),
     });
     
     // Recursively delete children first
     for (const child of children) {
       await softDeleteTree(db, child.id, userId);
     }
     
     // Then delete this task
     await db.update(Task)
       .set({ deletedAt: now })
       .where(and(eq(Task.id, taskId), eq(Task.userId, userId)));
   }
   ```

5. **Progress calculation helper**:

   ```typescript
   function calculateProgress(task: TaskWithSubtasks): {
     total: number;
     completed: number;
     percentage: number;
   } {
     let total = 0;
     let completed = 0;
     
     function count(subtasks: Task[]) {
       for (const st of subtasks) {
         total++;
         if (st.completed) completed++;
         if (st.subtasks?.length) count(st.subtasks);
       }
     }
     
     if (task.subtasks?.length) {
       count(task.subtasks);
     }
     
     return {
       total,
       completed,
       percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
     };
   }
   ```

   Include progress in `getWithSubtasks` and `all` responses.

## Success Criteria

- ✅ `all` query returns only top-level tasks with nested sub-tasks
- ✅ Can create sub-tasks under a parent
- ✅ Max depth enforced (throws error at limit)
- ✅ Sub-tasks inherit parent's category
- ✅ Can reorder sub-tasks
- ✅ Can move tasks between parents
- ✅ Can promote sub-task to top-level
- ✅ Can convert top-level task to sub-task
- ✅ Completing parent completes all sub-tasks
- ✅ Deleting parent deletes all sub-tasks
- ✅ Progress calculation returns correct percentages
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify.
