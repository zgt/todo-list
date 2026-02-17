# Collaborative Lists - Permissions & Authorization Logic

Implement authorization middleware and helper functions that enforce role-based access control for shared lists.

## Permission System

1. **Create permissions helper** - `packages/api/src/lib/permissions.ts`:

   Core authorization functions used by all collaborative list procedures.

   ```typescript
   type PermissionCheck = {
     userId: string;
     sharedListId: string;
     requiredRole?: ListMemberRole;
   };
   ```

   Functions:
   - `checkListAccess(db, { userId, sharedListId })` - Returns member record if user has access, null otherwise. Checks: member exists, status is "accepted" (or user is owner), list not deleted.
   - `checkListPermission(db, { userId, sharedListId, requiredRole })` - Like checkListAccess but also validates role level. Role hierarchy: owner > editor > viewer. Throws TRPCError if insufficient permission.
   - `isListOwner(db, { userId, sharedListId })` - Quick check if user owns the list.
   - `canEditTasks(db, { userId, sharedListId })` - Returns true if user is owner or editor.
   - `canViewTasks(db, { userId, sharedListId })` - Returns true if user has any accepted membership.
   - `canManageMembers(db, { userId, sharedListId })` - Returns true only for owner.
   - `getListsForUser(db, userId)` - Get all shared lists the user is a member of (accepted status).

2. **Role hierarchy logic**:

   ```typescript
   const ROLE_HIERARCHY: Record<ListMemberRole, number> = {
     owner: 3,
     editor: 2,
     viewer: 1,
   };

   function hasMinimumRole(userRole: ListMemberRole, requiredRole: ListMemberRole): boolean {
     return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
   }
   ```

3. **Permission matrix** - Document what each role can do:

   | Action | Owner | Editor | Viewer |
   |--------|-------|--------|--------|
   | View tasks | ✅ | ✅ | ✅ |
   | Create tasks | ✅ | ✅ | ❌ |
   | Edit tasks | ✅ | ✅ | ❌ |
   | Complete tasks | ✅ | ✅ | ❌ |
   | Delete tasks | ✅ | ✅ (own) | ❌ |
   | Invite members | ✅ | ❌ | ❌ |
   | Remove members | ✅ | ❌ | ❌ |
   | Change roles | ✅ | ❌ | ❌ |
   | Edit list settings | ✅ | ❌ | ❌ |
   | Delete list | ✅ | ❌ | ❌ |

4. **Middleware-style permission check** for tRPC procedures:

   Create a reusable pattern:
   ```typescript
   // Usage in tRPC procedures:
   const member = await checkListPermission(ctx.db, {
     userId: ctx.session.user.id,
     sharedListId: input.sharedListId,
     requiredRole: "editor",
   });
   // If this doesn't throw, user has permission
   ```

5. **Task-level permission check** - For tasks in shared lists:

   When a task belongs to a category that is shared:
   - `getTaskPermission(db, { userId, taskId })` - Check if user can access this specific task through a shared list
   - Returns: `{ canView, canEdit, canDelete, role, sharedListId }` or null if not shared
   - Logic: Task → Category → SharedList → ListMember → check role

6. **Update existing task procedures** - Modify `packages/api/src/router/task.ts`:

   The `all`, `create`, `update`, `delete` procedures need to be aware of shared lists:
   - `all` query should also return tasks from shared lists where user is a member
   - `create` should allow creating tasks in shared categories if user is editor+
   - `update` should check shared list permission if task is in shared category
   - `delete` should check permission (editors can only delete own tasks in shared lists)

   Don't break existing behavior — if a task is NOT in a shared list, existing auth (userId check) still applies.

7. **Activity logging helper**:

   ```typescript
   async function logActivity(
     db: Database,
     params: {
       sharedListId: string;
       userId: string;
       action: ListActivityAction;
       targetType?: "task" | "member" | "list";
       targetId?: string;
       metadata?: Record<string, unknown>;
     }
   ) {
     await db.insert(ListActivity).values({
       sharedListId: params.sharedListId,
       userId: params.userId,
       action: params.action,
       targetType: params.targetType,
       targetId: params.targetId,
       metadata: params.metadata,
     });
   }
   ```

   Call this helper in relevant mutations to track collaboration events.

## Success Criteria

- ✅ Permission helper functions created and exported
- ✅ Role hierarchy enforced correctly
- ✅ Owner-only actions properly restricted
- ✅ Editor can create/edit tasks but not manage members
- ✅ Viewer can only read tasks
- ✅ Task procedures updated to respect shared list permissions
- ✅ Activity logging helper works
- ✅ Existing non-shared task behavior unchanged
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify.
