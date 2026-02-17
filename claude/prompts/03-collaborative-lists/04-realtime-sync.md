# Collaborative Lists - Real-time Sync

Implement real-time updates for collaborative lists so all members see changes instantly when tasks are created, updated, or completed.

## Real-time Strategy

Since the app uses tRPC with TanStack Query, the simplest approach is **polling + query invalidation** rather than WebSockets. This avoids infrastructure complexity while still providing near-real-time updates.

1. **Configure polling for shared lists** - Update tRPC query options:

   For shared list tasks, enable polling at a reasonable interval (5-10 seconds):

   ```typescript
   // In components displaying shared list tasks
   const { data: tasks } = api.task.all.useQuery(undefined, {
     refetchInterval: hasSharedLists ? 5000 : false, // Poll every 5s if user has shared lists
     refetchIntervalInBackground: false, // Don't poll when tab is hidden
   });
   ```

   For activity feed:
   ```typescript
   const { data: activity } = api.sharedList.getActivity.useQuery(
     { sharedListId },
     { refetchInterval: 10000 } // Poll every 10s
   );
   ```

2. **Create real-time hook** - `apps/nextjs/src/hooks/useSharedListSync.ts`:

   Custom hook that manages polling and provides connection status:

   ```typescript
   export function useSharedListSync(sharedListId: string | null) {
     const utils = api.useUtils();
     const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
     
     // Poll for changes
     const { data: changes } = api.sharedList.getChangesSince.useQuery(
       { sharedListId: sharedListId!, since: lastSyncedAt },
       {
         enabled: !!sharedListId,
         refetchInterval: 5000,
         onSuccess: (data) => {
           if (data.hasChanges) {
             // Invalidate task queries to refresh UI
             utils.task.all.invalidate();
             utils.sharedList.getActivity.invalidate({ sharedListId });
             setLastSyncedAt(new Date());
           }
         }
       }
     );
     
     return { lastSyncedAt, isConnected: true };
   }
   ```

3. **Add server-side change detection** - `packages/api/src/router/sharedList.ts`:

   Add a lightweight query that checks if there are new changes since a given timestamp:

   - `getChangesSince` - Check for changes in a shared list
     - Input: `{ sharedListId: string, since: Date }`
     - Count activities since the given timestamp
     - Return `{ hasChanges: boolean, changeCount: number }`
     - This is a lightweight query that avoids fetching full data on every poll

4. **Optimistic updates for mutations** - Instant UI feedback:

   When creating/completing/deleting tasks in shared lists, apply optimistic updates:

   ```typescript
   const completeMutation = api.task.update.useMutation({
     onMutate: async ({ id, completed }) => {
       await utils.task.all.cancel();
       const previous = utils.task.all.getData();
       
       utils.task.all.setData(undefined, (old) =>
         old?.map(t => t.id === id ? { ...t, completed } : t)
       );
       
       return { previous };
     },
     onError: (err, vars, context) => {
       utils.task.all.setData(undefined, context?.previous);
       toast.error("Failed to update task");
     },
     onSettled: () => {
       utils.task.all.invalidate();
     }
   });
   ```

5. **Sync indicator component** - Show sync status in UI:

   Create `SyncIndicator.tsx`:
   ```tsx
   function SyncIndicator({ lastSyncedAt }: { lastSyncedAt: Date }) {
     return (
       <div className="flex items-center gap-1 text-xs text-muted">
         <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
         <span>Synced {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}</span>
       </div>
     );
   }
   ```

6. **Mobile real-time sync** - `apps/expo/src/hooks/useSharedListSync.ts`:

   Same pattern but with React Native AppState awareness:

   ```typescript
   export function useSharedListSync(sharedListId: string | null) {
     const appState = useRef(AppState.currentState);
     const [isActive, setIsActive] = useState(true);
     
     useEffect(() => {
       const subscription = AppState.addEventListener("change", (nextState) => {
         setIsActive(nextState === "active");
         if (nextState === "active") {
           // Force refresh when app comes to foreground
           utils.task.all.invalidate();
         }
         appState.current = nextState;
       });
       return () => subscription.remove();
     }, []);
     
     // Only poll when app is active
     api.sharedList.getChangesSince.useQuery(
       { sharedListId: sharedListId!, since: lastSyncedAt },
       {
         enabled: !!sharedListId && isActive,
         refetchInterval: isActive ? 5000 : false,
       }
     );
   }
   ```

7. **Conflict resolution** - Handle simultaneous edits:

   Strategy: **Last write wins** with user notification.
   
   When a mutation fails due to version mismatch:
   - Show toast: "This task was modified by [user]. Your changes have been refreshed."
   - Invalidate queries to get latest data
   - User can re-apply their changes
   
   For task updates, use the existing `version` field on the Task table:
   ```typescript
   // In update mutation, check version
   const [updated] = await ctx.db.update(Task)
     .set({ ...updates, version: sql`${Task.version} + 1` })
     .where(and(
       eq(Task.id, input.id),
       eq(Task.version, input.expectedVersion), // Optimistic concurrency
     ))
     .returning();
   
   if (!updated) {
     throw new TRPCError({
       code: "CONFLICT",
       message: "Task was modified by another user",
     });
   }
   ```

## Future Enhancement: WebSocket Upgrade

If polling isn't fast enough, the architecture is ready for WebSocket upgrade:
- tRPC supports subscriptions via `@trpc/server/adapters/ws`
- Replace polling queries with tRPC subscriptions
- No component changes needed — just swap query for subscription

## Success Criteria

- ✅ Polling enabled for shared list data
- ✅ Changes from other users appear within 5-10 seconds
- ✅ Optimistic updates provide instant local feedback
- ✅ Sync indicator shows connection status
- ✅ App foreground/background handling (mobile)
- ✅ Conflict detection with user notification
- ✅ No excessive API calls (conditional polling)
- ✅ No TypeScript errors

Run `pnpm typecheck` to verify.
