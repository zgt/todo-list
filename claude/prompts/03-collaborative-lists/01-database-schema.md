# Collaborative Lists - Database Schema

Design and implement the database schema for shared/collaborative task lists with user roles, invitations, and activity tracking.

## Schema Implementation

1. **Create `shared_list` table** - `packages/db/src/schema.ts`:

   A shared list is a wrapper around a category that enables collaboration. When a user shares a category, a `shared_list` record is created.

   ```typescript
   export const SharedList = pgTable(
     "shared_list",
     (t) => ({
       id: t.uuid().notNull().primaryKey().defaultRandom(),
       categoryId: t.uuid("category_id")
         .notNull()
         .references(() => Category.id, { onDelete: "cascade" }),
       ownerId: t.text("owner_id")
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
       name: t.varchar({ length: 200 }).notNull(),
       description: t.text(),
       isPublic: t.boolean("is_public").notNull().default(false),
       inviteCode: t.varchar("invite_code", { length: 20 }).unique(),
       maxMembers: t.integer("max_members").default(10),
       createdAt: t.timestamp("created_at", { withTimezone: true, mode: "date" })
         .$defaultFn(() => new Date()).notNull(),
       updatedAt: t.timestamp("updated_at", { withTimezone: true, mode: "date" })
         .$defaultFn(() => new Date()).$onUpdate(() => new Date()),
       deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
     }),
     (table) => [
       index("shared_list_owner_id_idx").on(table.ownerId),
       index("shared_list_category_id_idx").on(table.categoryId),
       index("shared_list_invite_code_idx").on(table.inviteCode),
     ]
   );
   ```

2. **Create `list_member` table** - Tracks who has access and their role:

   ```typescript
   export const ListMember = pgTable(
     "list_member",
     (t) => ({
       id: t.uuid().notNull().primaryKey().defaultRandom(),
       sharedListId: t.uuid("shared_list_id")
         .notNull()
         .references(() => SharedList.id, { onDelete: "cascade" }),
       userId: t.text("user_id")
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
       role: t.varchar({ length: 20 }).notNull().default("viewer"),
       invitedBy: t.text("invited_by")
         .references(() => user.id, { onDelete: "set null" }),
       invitedAt: t.timestamp("invited_at", { withTimezone: true, mode: "date" })
         .$defaultFn(() => new Date()).notNull(),
       acceptedAt: t.timestamp("accepted_at", { withTimezone: true, mode: "date" }),
       status: t.varchar({ length: 20 }).notNull().default("pending"),
       createdAt: t.timestamp("created_at", { withTimezone: true, mode: "date" })
         .$defaultFn(() => new Date()).notNull(),
       updatedAt: t.timestamp("updated_at", { withTimezone: true, mode: "date" })
         .$defaultFn(() => new Date()).$onUpdate(() => new Date()),
     }),
     (table) => [
       index("list_member_shared_list_id_idx").on(table.sharedListId),
       index("list_member_user_id_idx").on(table.userId),
       index("list_member_status_idx").on(table.status),
       check("list_member_role_valid", sql`${table.role} IN ('owner', 'editor', 'viewer')`),
       check("list_member_status_valid", sql`${table.status} IN ('pending', 'accepted', 'declined', 'removed')`),
     ]
   );
   ```

3. **Create `list_activity` table** - Audit log of collaboration events:

   ```typescript
   export const ListActivity = pgTable(
     "list_activity",
     (t) => ({
       id: t.uuid().notNull().primaryKey().defaultRandom(),
       sharedListId: t.uuid("shared_list_id")
         .notNull()
         .references(() => SharedList.id, { onDelete: "cascade" }),
       userId: t.text("user_id")
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
       action: t.varchar({ length: 50 }).notNull(),
       targetType: t.varchar("target_type", { length: 20 }),
       targetId: t.uuid("target_id"),
       metadata: t.jsonb(),
       createdAt: t.timestamp("created_at", { withTimezone: true, mode: "date" })
         .$defaultFn(() => new Date()).notNull(),
     }),
     (table) => [
       index("list_activity_shared_list_id_idx").on(table.sharedListId),
       index("list_activity_user_id_idx").on(table.userId),
       index("list_activity_created_at_idx").on(table.createdAt),
       check("list_activity_action_valid", sql`${table.action} IN (
         'task_created', 'task_completed', 'task_updated', 'task_deleted',
         'member_invited', 'member_accepted', 'member_removed', 'member_role_changed',
         'list_updated', 'list_deleted'
       )`),
     ]
   );
   ```

4. **Type definitions and enums**:

   ```typescript
   export const ListMemberRole = z.enum(["owner", "editor", "viewer"]);
   export type ListMemberRole = z.infer<typeof ListMemberRole>;

   export const ListMemberStatus = z.enum(["pending", "accepted", "declined", "removed"]);
   export type ListMemberStatus = z.infer<typeof ListMemberStatus>;

   export const ListActivityAction = z.enum([
     "task_created", "task_completed", "task_updated", "task_deleted",
     "member_invited", "member_accepted", "member_removed", "member_role_changed",
     "list_updated", "list_deleted"
   ]);
   export type ListActivityAction = z.infer<typeof ListActivityAction>;
   ```

5. **Validation schemas**:

   ```typescript
   export const CreateSharedListSchema = z.object({
     categoryId: z.string().uuid(),
     name: z.string().min(1).max(200),
     description: z.string().max(1000).optional(),
     isPublic: z.boolean().optional().default(false),
     maxMembers: z.number().int().min(2).max(50).optional().default(10),
   });

   export const InviteMemberSchema = z.object({
     sharedListId: z.string().uuid(),
     email: z.string().email(),
     role: ListMemberRole.optional().default("editor"),
   });

   export const UpdateMemberRoleSchema = z.object({
     memberId: z.string().uuid(),
     role: ListMemberRole,
   });
   ```

6. **Relations**:

   ```typescript
   export const sharedListRelations = relations(SharedList, ({ one, many }) => ({
     category: one(Category, { fields: [SharedList.categoryId], references: [Category.id] }),
     owner: one(user, { fields: [SharedList.ownerId], references: [user.id] }),
     members: many(ListMember),
     activities: many(ListActivity),
   }));

   export const listMemberRelations = relations(ListMember, ({ one }) => ({
     sharedList: one(SharedList, { fields: [ListMember.sharedListId], references: [SharedList.id] }),
     user: one(user, { fields: [ListMember.userId], references: [user.id] }),
   }));

   export const listActivityRelations = relations(ListActivity, ({ one }) => ({
     sharedList: one(SharedList, { fields: [ListActivity.sharedListId], references: [SharedList.id] }),
     user: one(user, { fields: [ListActivity.userId], references: [user.id] }),
   }));
   ```

7. **Generate invite code utility**:

   ```typescript
   export function generateInviteCode(): string {
     return nanoid(12); // Short, URL-safe random string
   }
   ```

   Install nanoid: `pnpm add nanoid` in `packages/db`

8. **Push schema**: Run `pnpm db:push` and verify in `pnpm db:studio`.

## Success Criteria

- ✅ SharedList, ListMember, ListActivity tables created
- ✅ Check constraints for role, status, and action enums
- ✅ Foreign keys cascade correctly
- ✅ Indexes on all foreign keys and frequent query columns
- ✅ Relations defined between all tables
- ✅ Zod schemas for validation
- ✅ Type enums exported
- ✅ Schema push succeeds
- ✅ No TypeScript errors

Run `pnpm typecheck` and `pnpm db:push`.
