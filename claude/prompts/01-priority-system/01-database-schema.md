# Task Priority System - Database Schema & Types

## Objective
Extend the existing Tokilist database schema to support a priority system for tasks, including database migrations, TypeScript types, and validation schemas.

## Technical Context
- **Stack**: Turborepo monorepo, Drizzle ORM with PostgreSQL (Neon/Supabase)
- **Schema Location**: `packages/db/src/schema.ts`
- **Validation**: Zod schemas for type-safe input validation
- **Migration**: `pnpm db:push` for schema changes
- **Current Task Schema**: Already includes fields like `title`, `description`, `completed`, `dueDate`, `categoryId`

## Current State Analysis

**Existing Task Table** (`packages/db/src/schema.ts`):
```typescript
export const Task = pgTable("task", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  categoryId: t.uuid("category_id").references(() => Category.id, { onDelete: "set null" }),
  title: t.varchar({ length: 500 }).notNull(),
  description: t.text(),
  completed: t.boolean().notNull().default(false),
  dueDate: t.timestamp("due_date", { withTimezone: true, mode: "date" }),
  // ... other fields
}));
```

**Validation Schemas**:
- `CreateTaskSchema` - For creating new tasks
- `UpdateTaskSchema` - For updating existing tasks

## Implementation Requirements

### 1. Priority Field Design

**Priority Levels** (4 options):
- `"high"` - Urgent and important
- `"medium"` - Default priority
- `"low"` - Can be deferred
- `null` - No priority set (for backwards compatibility)

**Database Implementation**:
- Add `priority` column to `task` table
- Type: `varchar` or `text` with check constraint
- Default: `"medium"` for new tasks
- Nullable: Allow `null` for backwards compatibility
- Index: Add index on `(userId, priority, completed)` for efficient filtering

### 2. Schema Extension

**Add to Task Table**:
```typescript
priority: t.varchar({ length: 10 }).default("medium"),
```

**Add Index**:
```typescript
index("task_user_id_priority_completed_idx").on(
  table.userId,
  table.priority,
  table.completed
),
```

### 3. Type Safety & Validation

**Create Priority Type**:
```typescript
export const TaskPriority = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof TaskPriority>;
```

**Update CreateTaskSchema**:
- Add `priority` field with Zod validation
- Make it optional with default value
- Ensure enum validation

**Update UpdateTaskSchema**:
- Add `priority` as optional field
- Allow setting to `null` to clear priority

### 4. Migration Considerations

**Backwards Compatibility**:
- Existing tasks without priority should default to `"medium"`
- Migration should not break existing functionality
- Consider adding check constraint for valid priority values

**Database Constraints**:
```sql
CHECK (priority IN ('high', 'medium', 'low') OR priority IS NULL)
```

## Implementation Steps

### Step 1: Extend Database Schema
1. Open `packages/db/src/schema.ts`
2. Add `priority` field to `Task` table definition
3. Add index for efficient priority-based queries
4. Add check constraint for valid priority values

### Step 2: Create Type Definitions
1. Create `TaskPriority` enum using Zod
2. Export type for use in other packages
3. Create helper type guards if needed

### Step 3: Update Validation Schemas
1. Extend `CreateTaskSchema` with priority field
2. Add validation: optional, enum validation, default value
3. Extend `UpdateTaskSchema` with priority field
4. Add validation: optional, nullable, enum validation

### Step 4: Generate Types & Push Schema
1. Run type generation: Schema changes will auto-regenerate types
2. Push to database: `pnpm db:push`
3. Verify migration in Drizzle Studio: `pnpm db:studio`

## Code Quality Standards

**TypeScript**:
- Use strict mode compliance
- Export all new types
- Use `import type` for type-only imports
- Follow existing naming conventions (PascalCase for types)

**Database**:
- Follow snake_case naming convention (configured in `drizzle.config.ts`)
- Include proper indexes for query performance
- Maintain referential integrity
- Add descriptive comments for complex constraints

**Validation**:
- Use Zod for all validation schemas
- Provide clear error messages
- Ensure backwards compatibility
- Test with edge cases (null, undefined, invalid values)

## Expected Deliverables

1. **Updated Schema File**: `packages/db/src/schema.ts` with priority field
2. **Type Exports**: New `TaskPriority` type exported from `@acme/db/schema`
3. **Updated Validators**: Extended `CreateTaskSchema` and `UpdateTaskSchema`
4. **Migration Applied**: Database schema pushed successfully
5. **Type Safety**: All TypeScript types updated and working

## Success Criteria

- ✅ `priority` field added to Task table with proper type
- ✅ Index created for efficient priority-based queries
- ✅ Check constraint ensures only valid priority values
- ✅ `TaskPriority` Zod enum created and exported
- ✅ `CreateTaskSchema` includes priority validation
- ✅ `UpdateTaskSchema` includes priority validation
- ✅ Schema push completes without errors
- ✅ Existing tasks migrate successfully with default priority
- ✅ No TypeScript errors in packages/db
- ✅ Types auto-generated and usable in other packages

## Testing Checklist

After implementation:
- [ ] Schema push succeeds: `pnpm db:push`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] Drizzle Studio shows new priority field
- [ ] Can create task with priority: "high"
- [ ] Can create task with priority: "medium"
- [ ] Can create task with priority: "low"
- [ ] Can create task without priority (defaults to "medium")
- [ ] Can update task priority
- [ ] Can set priority to null
- [ ] Invalid priority values are rejected

## Implementation Notes

**Focus on backwards compatibility** - existing tasks should continue to work seamlessly. The priority system should feel like a natural extension of the current schema, not a breaking change.

**Performance consideration** - the new index will make priority-based filtering and sorting efficient even with thousands of tasks per user.

**Next steps** - Once schema is complete, the next prompts will cover tRPC API integration and UI components.
