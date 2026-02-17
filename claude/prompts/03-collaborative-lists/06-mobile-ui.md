# Collaborative Lists - Mobile UI (Expo/React Native)

Build mobile collaboration features including sharing, member management, invite handling, and activity feeds using React Native patterns.

## Components

1. **Share Sheet** - `apps/expo/src/components/ShareSheet.tsx`:

   Bottom sheet for sharing a category. Triggered from category long-press or options menu.

   Two states:
   - **Not shared**: Create shared list form (name, description, create button)
   - **Already shared**: Show invite code, invite by email, member list, settings

   ```tsx
   <BottomSheet visible={visible} onClose={onClose}>
     <ScrollView className="p-4">
       {!sharedList ? (
         <>
           <Text className="text-xl font-bold text-primary mb-4">Share List</Text>
           <TextInput placeholder="List name" value={name} onChangeText={setName} />
           <TextInput placeholder="Description (optional)" value={desc} onChangeText={setDesc} />
           <Button onPress={handleCreate} className="mt-4">Create Shared List</Button>
         </>
       ) : (
         <>
           <Text className="text-xl font-bold text-primary mb-4">Manage Sharing</Text>
           <InviteCodeCard code={sharedList.inviteCode} />
           <InviteByEmail sharedListId={sharedList.id} />
           <MemberList members={members} isOwner={isOwner} />
         </>
       )}
     </ScrollView>
   </BottomSheet>
   ```

2. **Invite Code Card** - `apps/expo/src/components/InviteCodeCard.tsx`:

   Display invite code with copy and share functionality.

   ```tsx
   <View className="p-4 bg-surface rounded-lg border border-default mb-4">
     <Text className="text-sm text-muted mb-2">Invite Link</Text>
     <View className="flex-row items-center gap-2">
       <Text className="flex-1 text-primary font-mono text-sm" numberOfLines={1}>
         {inviteUrl}
       </Text>
       <TouchableOpacity onPress={copyToClipboard}>
         <CopyIcon size={20} color="#50C878" />
       </TouchableOpacity>
       <TouchableOpacity onPress={shareInvite}>
         <ShareIcon size={20} color="#50C878" />
       </TouchableOpacity>
     </View>
   </View>
   ```

   Use React Native `Share.share()` for native share sheet:
   ```typescript
   const shareInvite = async () => {
     await Share.share({
       message: `Join my Tokilist: ${inviteUrl}`,
       url: inviteUrl, // iOS
     });
   };
   ```

3. **Member List** - `apps/expo/src/components/MemberList.tsx`:

   Display members with role badges and management actions.

   Each row:
   - Avatar circle with initials
   - Name and email
   - Role badge (color-coded)
   - Swipe actions (change role, remove) — owner only

   ```tsx
   <FlatList
     data={members}
     keyExtractor={(item) => item.id}
     renderItem={({ item: member }) => (
       <Swipeable
         enabled={isOwner && member.role !== "owner"}
         renderRightActions={() => (
           <View className="flex-row">
             <SwipeAction label="Role" onPress={() => showRolePicker(member)} color="blue" />
             <SwipeAction label="Remove" onPress={() => removeMember(member.id)} color="red" />
           </View>
         )}
       >
         <View className="flex-row items-center p-3 gap-3">
           <AvatarCircle name={member.user.name} size={40} />
           <View className="flex-1">
             <Text className="text-primary font-medium">{member.user.name}</Text>
             <Text className="text-sm text-muted">{member.user.email}</Text>
           </View>
           <RoleBadge role={member.role} />
           {member.status === "pending" && (
             <Badge label="Pending" color="yellow" />
           )}
         </View>
       </Swipeable>
     )}
   />
   ```

4. **Pending Invites Screen** - `apps/expo/src/components/PendingInvites.tsx`:

   Banner or section showing pending invitations.

   ```tsx
   {pendingInvites.map(invite => (
     <View key={invite.id} className="p-4 mb-2 bg-primary/10 border border-primary/30 rounded-lg">
       <Text className="text-primary font-semibold">
         Invited to "{invite.sharedList.name}"
       </Text>
       <Text className="text-sm text-muted mt-1">
         By {invite.invitedByUser.name}
       </Text>
       <View className="flex-row gap-2 mt-3">
         <Button onPress={() => accept(invite.id)} className="flex-1">Accept</Button>
         <Button variant="outline" onPress={() => decline(invite.id)} className="flex-1">Decline</Button>
       </View>
     </View>
   ))}
   ```

5. **Activity Feed** - `apps/expo/src/components/ActivityFeed.tsx`:

   Bottom sheet or separate screen showing collaboration history.

   ```tsx
   <FlatList
     data={activities}
     keyExtractor={(item) => item.id}
     renderItem={({ item }) => (
       <View className="flex-row items-start gap-3 p-3">
         <AvatarCircle name={item.user.name} size={32} />
         <View className="flex-1">
           <Text className="text-sm text-primary">
             <Text className="font-semibold">{item.user.name}</Text>
             {" "}{formatActivityAction(item)}
           </Text>
           <Text className="text-xs text-muted mt-1">
             {formatDistanceToNow(item.createdAt, { addSuffix: true })}
           </Text>
         </View>
       </View>
     )}
     onEndReached={loadMore}
     onEndReachedThreshold={0.5}
   />
   ```

   Trigger: "Activity" button in shared list header or tab.

6. **Deep Link Handling** - Handle invite links opening the app:

   Configure Expo Router for deep linking:
   
   URL scheme: `tokilist://invite/{code}` and `https://tokilist.app/invite/{code}`

   Create `apps/expo/src/app/invite/[code].tsx`:
   ```tsx
   export default function InvitePage() {
     const { code } = useLocalSearchParams<{ code: string }>();
     const joinMutation = api.sharedList.joinByCode.useMutation();
     
     // If authenticated, show join button
     // If not, redirect to sign in then back here
     
     return (
       <View className="flex-1 items-center justify-center p-8">
         <UsersIcon size={48} color="#50C878" />
         <Text className="text-2xl font-bold text-primary mt-4">
           You've been invited!
         </Text>
         <Text className="text-muted text-center mt-2">
           Join "{listDetails?.name}" on Tokilist
         </Text>
         <Button onPress={handleJoin} className="mt-6 w-full">
           Join List
         </Button>
       </View>
     );
   }
   ```

7. **Shared List Visual Indicators**:

   Update task cards and category list:
   - Small "shared" icon (UsersIcon) next to shared categories
   - Avatar stack showing members on shared category header
   - Subtle border/color change on tasks from shared lists
   - "Shared with X people" subtitle on category

8. **Push Notifications for Shared List Events** (optional enhancement):

   When a member creates/completes a task in a shared list, send push notification to other members:
   - "Matt completed 'Buy groceries' in Shopping List"
   - "Sarah added a new task to Project Tasks"
   
   This can be implemented later using Expo Push Notifications (requires server-side push token management). For now, polling handles updates.

## Success Criteria

- ✅ Can share a category from mobile
- ✅ Can copy and share invite link natively
- ✅ Member list displays with role badges
- ✅ Owner can change roles via swipe
- ✅ Owner can remove members via swipe
- ✅ Pending invites banner works
- ✅ Can accept/decline invitations
- ✅ Activity feed shows collaboration events
- ✅ Deep links open invite page
- ✅ Shared indicators on categories and tasks
- ✅ Haptic feedback on actions
- ✅ Works on both iOS and Android
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm ios`/`pnpm android` to test.
