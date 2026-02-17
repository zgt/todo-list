# Task Priority System - tRPC API Integration

## Objective
Extend the existing tRPC task router to support priority field in all CRUD operations, ensuring type-safe API integration with the new priority system.

## Technical Context
- **Stack**: tRPC v11 with type-safe procedures
- **API Location**: `packages/api/src/router/task.ts`
- **Auth Pattern**: `protectedProcedure` for user-scoped operations
- **Validation**: Zod schemas from `@acme/db/schema`
- **Dependencies**: Schema changes from previous prompt must be completed

## Current State Analysis

**Existing Task Router** (`packages/api/src/router/task.ts`):
- `all` - Get all tasks for current user
- `byId` - Get single task by ID
- `create` - Create new task
- `update` - Update existing task
- `delete` - Soft delete task

**Current Query Pattern**:
```typescript
export const taskRouter = {
  all: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, ctx.session.user.id),
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
      ),
      orderBy: [desc(Task.createdAt)],
      limit: 100,
      with: { category: true },
    });
    // ... date serialization
  }),
};
```

## Implementation Requirements

### 1. Update Query Responses

**Priority Field Inclusion**:
- All queries returning tasks must include `priority` field
- Drizzle ORM will automatically include it after schema update
- Ensure proper serialization (no special handling needed for string fields)

**No Code Changes Required** for basic inclusion - the field will automatically appear in query results once schema is updated.

### 2. Extend Filtering & Sorting

**Add Priority-Based Query**:
Create new procedure `byPriority` to fetch tasks filtered by priority level:

```typescript
byPriority: protectedProcedure
  .input(z.object({ 
    priority: TaskPriority,
    includeCompleted: z.boolean().optional().default(false)
  }))
  .query(async ({ ctx, input }) => {
    // Implementation details
  })
```

**Requirements**:
- Filter by specific priority level ("high", "medium", "low")
- Optionally include/exclude completed tasks
- Order by due date (urgent items first)
- Include category relationship
- Respect soft deletes and archive status

### 3. Update Creation & Modification

**Create Endpoint**:
- Already uses `CreateTaskSchema` which will include priority validation
- No changes needed if schema was updated correctly
- Priority will default to "medium" if not provided

**Update Endpoint**:
- Already uses `UpdateTaskSchema` which will include priority validation
- Ensure priority can be updated independently
- Allow setting priority to null to clear it

### 4. Add Utility Queries

**Priority Statistics**:
Create procedure to get count of tasks by priority for analytics:

```typescript
priorityStats: protectedProcedure.query(async ({ ctx }) => {
  // Return counts: { high: 5, medium: 12, low: 3, none: 2 }
})
```

**High Priority Tasks**:
Quick filter for urgent items:

```typescript
highPriority: protectedProcedure.query(async ({ ctx }) => {
  // Return only high priority, non-completed tasks
})
```

## Implementation Steps

### Step 1: Verify Schema Integration
1. Ensure `priority` field is in Task schema
2. Verify `CreateTaskSchema` and `UpdateTaskSchema` include priority
3. Check that types are generated correctly

### Step 2: Add Priority-Specific Queries
1. Create `byPriority` procedure with input validation
2. Implement database query with proper filters
3. Add date serialization (follow existing pattern)
4. Include error handling

### Step 3: Add Utility Procedures
1. Create `priorityStats` for task count by priority
2. Create `highPriority` for quick urgent task access
3. Ensure user scoping on all queries

### Step 4: Update Existing Queries (Optional)
1. Consider adding priority-based sorting to `all` query
2. Add priority to sort options if implementing sort parameter
3. Ensure backward compatibility

## Code Quality Standards

**tRPC Patterns**:
- Use `protectedProcedure` for all authenticated endpoints
- Always filter by `ctx.session.user.id` for user scoping
- Use Zod for input validation (import from schema package)
- Follow existing date serialization pattern

**Database Queries**:
- Use Drizzle query builder API
- Include proper indexes (already added in schema)
- Use `and()`, `eq()`, `isNull()` helpers
- Always include `with: { category: true }` for task-category relation

**Error Handling**:
- Return descriptive error messages
- Handle edge cases (task not found, unauthorized access)
- Use TypeScript error types
- Follow existing error patterns in codebase

## Expected Deliverables

1. **Updated task.ts**: Extended with priority-specific procedures
2. **Type Safety**: Full IntelliSense support for priority field
3. **Query Performance**: Efficient priority-based queries
4. **Backward Compatibility**: Existing queries continue to work
5. **Test Verification**: Manual testing confirms all procedures work

## Success Criteria

- ✅ All existing queries include priority field in responses
- ✅ `byPriority` procedure filters correctly by priority level
- ✅ `priorityStats` returns accurate counts
- ✅ `highPriority` returns only urgent, incomplete tasks
- ✅ Create and update operations handle priority correctly
- ✅ Priority defaults to "medium" when not specified
- ✅ Null priority is handled gracefully
- ✅ No TypeScript errors in packages/api
- ✅ User scoping enforced on all new procedures
- ✅ Date serialization works correctly

## Testing Checklist

After implementation:
- [ ] Type check passes: `pnpm typecheck`
- [ ] Can fetch tasks with priority field populated
- [ ] Can filter tasks by priority: "high"
- [ ] Can filter tasks by priority: "medium"
- [ ] Can filter tasks by priority: "low"
- [ ] Priority stats return correct counts
- [ ] High priority query returns only urgent tasks
- [ ] Can create task with priority
- [ ] Can update task priority
- [ ] Can set priority to null
- [ ] Priority defaults to "medium" when not specified

## Integration Notes

**Next Steps**:
After completing this API layer, the next prompts will cover:
1. Web UI components (Next.js)
2. Mobile UI components (Expo)
3. Integration with existing task display components

**tRPC Client Usage**:
Once complete, clients can call:
```typescript
// Get high priority tasks
const highPriorityTasks = api.task.highPriority.useQuery();

// Get task stats
const stats = api.task.priorityStats.useQuery();

// Filter by priority
const mediumTasks = api.task.byPriority.useQuery({ priority: "medium" });
```

**Type Safety**:
The tRPC client will automatically infer return types and input types from the server procedures, ensuring end-to-end type safety.
