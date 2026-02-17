# Sub-tasks - Database Schema

Extend the Task table to support hierarchical sub-tasks using a self-referencing parent relationship with depth limits and ordering.

## Schema Changes

1. **Add fields to Task table** in `packages/db/src/schema.ts`:

   ```typescript
   // Add these fields to the existing Task pgTable definition:
   parentTaskId: t.uuid("parent_task_id")
     .references((): any => Task.id, { onDelete: "cascade" }),
   depth: t.integer().notNull().default(0),
   isSubtask: t.boolean("is_subtask").notNull().default(false),
   ```

   The `parentTaskId` is a self-reference — when a parent task is deleted, all sub-tasks cascade delete.

   `depth` tracks nesting level: 0 = top-level task, 1 = sub-task, 2 = sub-sub-task.

   `isSubtask` is a convenience boolean (always true when parentTaskId is not null).

2. **Add indexes**:

   ```typescript
   // Add to existing Task table indexes:
   index("task_parent_task_id_idx").on(table.parentTaskId),
   index("task_parent_task_id_order_idx").on(table.parentTaskId, table.orderIndex),
   ```

3. **Add check constraint** for max depth:

   ```typescript
   check("task_max_depth", sql`${table.depth} <= 3`),
   ```

   This limits nesting to 3 levels deep (task → sub-task → sub-sub-task → sub-sub-sub-task). Adjust as needed.

4. **Update Task relations**:

   ```typescript
   export const taskRelations = relations(Task, ({ one, many }) => ({
     category: one(Category, {
       fields: [Task.categoryId],
       references: [Category.id],
     }),
     reminders: many(TaskReminder),
     // Add these:
     parent: one(Task, {
       fields: [Task.parentTaskId],
       references: [Task.id],
       relationName: "taskParentChild",
     }),
     subtasks: many(Task, {
       relationName: "taskParentChild",
     }),
   }));
   ```

5. **Update validation schemas**:

   Update `CreateTaskSchema`:
   ```typescript
   export const CreateTaskSchema = createInsertSchema(Task, {
     title: z.string().min(1, "Title is required").max(500),
     description: z.string().max(5000).optional(),
     categoryId: z.string().uuid().optional(),
     dueDate: z.date().optional(),
     priority: TaskPriority.optional(),
     parentTaskId: z.string().uuid().optional(), // Add this
   }).omit({
     id: true,
     userId: true,
     createdAt: true,
     updatedAt: true,
     completedAt: true,
     archivedAt: true,
     orderIndex: true,
     version: true,
     deletedAt: true,
     lastSyncedAt: true,
     depth: true,      // Calculated, not user-provided
     isSubtask: true,  // Calculated, not user-provided
   });
   ```

   Update `UpdateTaskSchema`:
   ```typescript
   // Add to existing UpdateTaskSchema:
   parentTaskId: z.string().uuid().nullable().optional(),
   ```

6. **Create sub-task specific schemas**:

   ```typescript
   export const CreateSubtaskSchema = z.object({
     parentTaskId: z.string().uuid(),
     title: z.string().min(1).max(500),
     description: z.string().max(5000).optional(),
     dueDate: z.date().optional(),
     priority: TaskPriority.optional(),
   });

   export const ReorderSubtasksSchema = z.object({
     parentTaskId: z.string().uuid(),
     orderedIds: z.array(z.string().uuid()),
   });

   export const MoveTaskSchema = z.object({
     taskId: z.string().uuid(),
     newParentId: z.string().uuid().nullable(), // null = promote to top-level
   });
   ```

7. **Push schema**: Run `pnpm db:push` and verify in `pnpm db:studio`.

## Migration Considerations

- Existing tasks will have `parentTaskId: null`, `depth: 0`, `isSubtask: false` — no data migration needed
- The self-referencing foreign key requires the `: any` type assertion in Drizzle (same pattern as Category.parentId)
- Cascade delete ensures deleting a parent removes all children

## Success Criteria

- ✅ `parentTaskId` field added with self-referencing foreign key
- ✅ `depth` and `isSubtask` fields added
- ✅ Indexes for efficient sub-task queries
- ✅ Max depth constraint (3 levels)
- ✅ Cascade delete on parent removal
- ✅ Task relations include `parent` and `subtasks`
- ✅ Validation schemas updated
- ✅ New sub-task specific schemas created
- ✅ Schema push succeeds
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm db:push`.
