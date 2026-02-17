# Collaborative Lists - tRPC API

Create tRPC router for shared list management including creation, invitations, member management, and activity feeds.

## Router Implementation

1. **Create shared list router** - `packages/api/src/router/sharedList.ts`:

   All procedures are `protectedProcedure`.

   **List Management**:
   - `create` - Share an existing category as a collaborative list
     - Input: `CreateSharedListSchema` (categoryId, name, description, isPublic, maxMembers)
     - Validate user owns the category
     - Generate unique invite code
     - Create SharedList record
     - Create ListMember for owner (role: "owner", status: "accepted")
     - Log activity: "list_created"
     - Return shared list with invite code

   - `getById` - Get shared list details with members
     - Input: `{ id: string }`
     - Check user has access (any accepted membership)
     - Return list with members (include user names/avatars) and task count

   - `getMyLists` - Get all shared lists user is part of
     - No input needed
     - Query ListMember where userId matches and status is "accepted"
     - Include SharedList details, member count, recent activity
     - Order by most recently active

   - `update` - Update shared list settings
     - Input: `{ id: string, name?: string, description?: string, isPublic?: boolean, maxMembers?: number }`
     - Owner only
     - Log activity: "list_updated"

   - `delete` - Delete shared list (unshare)
     - Input: `{ id: string }`
     - Owner only
     - Soft delete SharedList
     - Does NOT delete the category or tasks — just removes sharing
     - Log activity: "list_deleted"

   - `regenerateInviteCode` - Generate new invite code (invalidates old one)
     - Input: `{ id: string }`
     - Owner only
     - Generate and save new code

   **Member Management**:
   - `invite` - Invite a user by email
     - Input: `InviteMemberSchema` (sharedListId, email, role)
     - Owner only
     - Check max members not exceeded
     - Check user not already invited/member
     - Look up user by email in auth tables
     - If user exists: Create ListMember with status "pending"
     - If user doesn't exist: Still create invite (they can accept when they sign up)
     - Log activity: "member_invited"
     - Return invitation details

   - `joinByCode` - Join a shared list using invite code
     - Input: `{ inviteCode: string }`
     - Look up SharedList by invite code
     - Check not already a member
     - Check max members not exceeded
     - Create ListMember with role "editor" and status "accepted"
     - Log activity: "member_accepted"

   - `acceptInvite` - Accept a pending invitation
     - Input: `{ memberId: string }`
     - Validate the invite belongs to current user
     - Update status to "accepted", set acceptedAt
     - Log activity: "member_accepted"

   - `declineInvite` - Decline a pending invitation
     - Input: `{ memberId: string }`
     - Validate ownership
     - Update status to "declined"

   - `removeMember` - Remove a member from list
     - Input: `{ memberId: string }`
     - Owner only, cannot remove self
     - Update status to "removed"
     - Log activity: "member_removed"

   - `updateMemberRole` - Change a member's role
     - Input: `UpdateMemberRoleSchema` (memberId, role)
     - Owner only, cannot change own role
     - Cannot set anyone to "owner"
     - Log activity: "member_role_changed" with metadata `{ oldRole, newRole }`

   - `leave` - Leave a shared list
     - Input: `{ sharedListId: string }`
     - Cannot leave if you're the owner (must transfer or delete)
     - Update status to "removed"

   - `getMembers` - Get all members of a list
     - Input: `{ sharedListId: string }`
     - Any accepted member can view
     - Return members with user details (name, avatar, email)
     - Include role and status

   - `getPendingInvites` - Get pending invitations for current user
     - No input
     - Return all ListMember records with status "pending" for current user
     - Include SharedList details and who invited them

   **Activity Feed**:
   - `getActivity` - Get activity feed for a shared list
     - Input: `{ sharedListId: string, limit?: number, cursor?: string }`
     - Any accepted member can view
     - Return activities with user details
     - Paginated with cursor-based pagination
     - Default limit: 20

2. **Register router** in `packages/api/src/root.ts`:
   ```typescript
   import { sharedListRouter } from "./router/sharedList";
   
   export const appRouter = createTRPCRouter({
     // ... existing
     sharedList: sharedListRouter,
   });
   ```

3. **Update task router** - Modify `packages/api/src/router/task.ts`:

   - `all` query: Also include tasks from shared lists
     ```typescript
     // Get user's own tasks
     const ownTasks = await getOwnTasks(ctx);
     
     // Get tasks from shared lists
     const sharedLists = await getListsForUser(ctx.db, ctx.session.user.id);
     const sharedCategoryIds = sharedLists.map(l => l.categoryId);
     const sharedTasks = await ctx.db.query.Task.findMany({
       where: and(
         inArray(Task.categoryId, sharedCategoryIds),
         isNull(Task.deletedAt),
         isNull(Task.archivedAt),
       ),
       with: { category: true },
     });
     
     // Merge and return with a `isShared` flag
     return [...ownTasks, ...sharedTasks.map(t => ({ ...t, isShared: true }))];
     ```

   - `create` mutation: Allow creating in shared categories if user is editor+
   - `update` mutation: Check shared list permission before updating
   - `delete` mutation: Check permission (editors delete own tasks only)

   Log activities for task operations in shared lists:
   ```typescript
   if (isSharedCategory) {
     await logActivity(ctx.db, {
       sharedListId,
       userId: ctx.session.user.id,
       action: "task_created",
       targetType: "task",
       targetId: task.id,
     });
   }
   ```

## Success Criteria

- ✅ Can create a shared list from a category
- ✅ Can invite users by email
- ✅ Can join by invite code
- ✅ Can accept/decline invitations
- ✅ Can remove members (owner only)
- ✅ Can change member roles (owner only)
- ✅ Can leave a shared list
- ✅ Activity feed records all actions
- ✅ Task queries include shared list tasks
- ✅ Task mutations check shared list permissions
- ✅ Owner cannot be removed or leave
- ✅ Max member limit enforced
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify.
