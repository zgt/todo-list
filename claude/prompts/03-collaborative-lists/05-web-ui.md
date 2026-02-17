# Collaborative Lists - Web UI

Build web interface for sharing lists, managing members, accepting invitations, and viewing collaborative activity.

## Components

1. **Share List Dialog** - `apps/nextjs/src/app/_components/ShareListDialog.tsx`:

   Modal dialog for sharing a category as a collaborative list.

   Trigger: "Share" button on category header/context menu.

   Content:
   - If category is NOT shared yet:
     - Title: "Share this list"
     - Name field (pre-filled from category name)
     - Description field (optional)
     - Create button → calls `sharedList.create`, then shows invite section
   
   - If category IS already shared:
     - Invite code display with copy button
     - Invite link: `{appUrl}/invite/{inviteCode}`
     - "Invite by Email" section with email input + role dropdown (editor/viewer) + send button
     - Member list with role badges and remove buttons
     - Settings section (name, description, public toggle) — owner only
     - "Stop Sharing" danger button — owner only

   ```tsx
   <Dialog open={open} onOpenChange={setOpen}>
     <DialogContent className="max-w-md">
       <DialogHeader>
         <DialogTitle>Share List</DialogTitle>
       </DialogHeader>
       
       {!sharedList ? (
         <CreateSharedListForm categoryId={categoryId} />
       ) : (
         <SharedListManagement sharedList={sharedList} />
       )}
     </DialogContent>
   </Dialog>
   ```

2. **Invite Section** - `apps/nextjs/src/app/_components/InviteSection.tsx`:

   Within the share dialog, the invite UI:
   
   - **Invite link**: Read-only input with invite code URL + copy button
   - **Email invite form**: Email input + role select + "Invite" button
   - Toast on success: "Invitation sent to [email]"
   - Error handling: "User already invited", "Max members reached"

   ```tsx
   <div className="space-y-4">
     {/* Invite Link */}
     <div>
       <Label>Invite Link</Label>
       <div className="flex gap-2">
         <Input value={inviteUrl} readOnly className="flex-1" />
         <Button variant="outline" onClick={copyToClipboard}>
           <CopyIcon />
         </Button>
       </div>
     </div>
     
     {/* Email Invite */}
     <div>
       <Label>Invite by Email</Label>
       <div className="flex gap-2">
         <Input 
           type="email" 
           placeholder="teammate@example.com" 
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           className="flex-1"
         />
         <Select value={role} onValueChange={setRole}>
           <SelectItem value="editor">Editor</SelectItem>
           <SelectItem value="viewer">Viewer</SelectItem>
         </Select>
         <Button onClick={handleInvite}>Invite</Button>
       </div>
     </div>
   </div>
   ```

3. **Member List** - `apps/nextjs/src/app/_components/MemberList.tsx`:

   Display list of members with role management.

   Each row shows:
   - User avatar (or initials)
   - User name and email
   - Role badge (Owner / Editor / Viewer)
   - Role dropdown to change role (owner only, can't change self)
   - Remove button (owner only, can't remove self)
   - Status indicator for pending invites

   ```tsx
   {members.map(member => (
     <div key={member.id} className="flex items-center justify-between p-3">
       <div className="flex items-center gap-3">
         <Avatar name={member.user.name} />
         <div>
           <p className="font-medium">{member.user.name}</p>
           <p className="text-sm text-muted">{member.user.email}</p>
         </div>
       </div>
       
       <div className="flex items-center gap-2">
         {member.status === "pending" && (
           <Badge variant="outline">Pending</Badge>
         )}
         
         {isOwner && member.role !== "owner" ? (
           <Select value={member.role} onValueChange={(r) => changeRole(member.id, r)}>
             <SelectItem value="editor">Editor</SelectItem>
             <SelectItem value="viewer">Viewer</SelectItem>
           </Select>
         ) : (
           <Badge>{member.role}</Badge>
         )}
         
         {isOwner && member.role !== "owner" && (
           <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)}>
             <XIcon />
           </Button>
         )}
       </div>
     </div>
   ))}
   ```

4. **Activity Feed** - `apps/nextjs/src/app/_components/ActivityFeed.tsx`:

   Timeline of collaboration events.

   Props: `{ sharedListId: string }`

   Each activity shows:
   - User avatar and name
   - Action description (e.g., "Matt completed 'Buy groceries'")
   - Relative timestamp ("5 minutes ago")

   ```tsx
   <div className="space-y-3">
     {activities.map(activity => (
       <div key={activity.id} className="flex items-start gap-3">
         <Avatar name={activity.user.name} size="sm" />
         <div>
           <p className="text-sm">
             <span className="font-medium">{activity.user.name}</span>
             {" "}{formatActivityAction(activity)}
           </p>
           <p className="text-xs text-muted">
             {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
           </p>
         </div>
       </div>
     ))}
   </div>
   ```

   Format function:
   ```typescript
   function formatActivityAction(activity: Activity): string {
     switch (activity.action) {
       case "task_created": return "created a task";
       case "task_completed": return "completed a task";
       case "task_updated": return "updated a task";
       case "task_deleted": return "deleted a task";
       case "member_invited": return "invited a member";
       case "member_accepted": return "joined the list";
       case "member_removed": return "removed a member";
       case "member_role_changed": return "changed a member's role";
       default: return "performed an action";
     }
   }
   ```

5. **Pending Invitations Banner** - `apps/nextjs/src/app/_components/PendingInvites.tsx`:

   Show pending invitations at top of task list or in a dedicated section.

   ```tsx
   const { data: pendingInvites } = api.sharedList.getPendingInvites.useQuery();
   
   if (!pendingInvites?.length) return null;
   
   return (
     <div className="space-y-2 mb-4">
       {pendingInvites.map(invite => (
         <div key={invite.id} className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
           <div>
             <p className="font-medium text-primary">
               You've been invited to "{invite.sharedList.name}"
             </p>
             <p className="text-sm text-muted">
               Invited by {invite.invitedByUser.name}
             </p>
           </div>
           <div className="flex gap-2">
             <Button size="sm" onClick={() => acceptInvite(invite.id)}>
               Accept
             </Button>
             <Button size="sm" variant="outline" onClick={() => declineInvite(invite.id)}>
               Decline
             </Button>
           </div>
         </div>
       ))}
     </div>
   );
   ```

6. **Join by Code Page** - `apps/nextjs/src/app/invite/[code]/page.tsx`:

   Landing page when someone clicks an invite link.

   - Show shared list name and description
   - Show who created it and member count
   - "Join List" button (if authenticated)
   - "Sign in to join" button (if not authenticated, redirect after login)
   - Handle invalid/expired codes

7. **Shared List Indicators** on existing UI:

   - Category sidebar: Show "shared" icon next to shared categories
   - Task cards: Show small "shared" badge or avatar dots for shared tasks
   - Sync indicator: Show real-time sync status for shared lists

   ```tsx
   {category.isShared && (
     <div className="flex items-center gap-1">
       <UsersIcon className="w-4 h-4 text-primary" />
       <span className="text-xs text-muted">{memberCount}</span>
     </div>
   )}
   ```

## shadcn/ui Components Needed

Make sure these are installed:
```bash
pnpm ui-add
# Dialog, Select, Badge, Avatar, Input, Label, Tabs
```

## Success Criteria

- ✅ Can share a category as collaborative list
- ✅ Can copy invite link
- ✅ Can invite by email
- ✅ Can view and manage members
- ✅ Can change member roles (owner only)
- ✅ Can remove members (owner only)
- ✅ Activity feed shows recent changes
- ✅ Pending invitations banner works
- ✅ Join by code page works
- ✅ Shared list indicators on categories and tasks
- ✅ Design follows design system
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm dev:next` to test.
