import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const TaskPriority = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

// Music League Enums
export const leagueStatusEnum = pgEnum("league_status", [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
]);

export const roundStatusEnum = pgEnum("round_status", [
  "PENDING",
  "SUBMISSION",
  "LISTENING",
  "VOTING",
  "RESULTS",
  "COMPLETED",
]);

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t
    .timestamp({ withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const Category = pgTable(
  "category",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: t
      .uuid("parent_id")
      // Self-reference requires explicit type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .references((): any => Category.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 100 }).notNull(),
    color: t.varchar({ length: 7 }).notNull(), // Hex color code
    icon: t.varchar({ length: 50 }),
    sortOrder: t.integer("sort_order").notNull().default(0),
    path: t
      .uuid("path")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    depth: t.integer().notNull().default(0),
    isLeaf: t.boolean("is_leaf").notNull().default(true),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  }),
  (table) => [
    index("category_user_id_idx").on(table.userId),
    index("category_user_id_sort_order_idx").on(table.userId, table.sortOrder),
    index("category_parent_id_idx").on(table.parentId),
    index("category_user_id_path_idx").on(table.userId, table.path),
    index("category_user_id_depth_idx").on(table.userId, table.depth),
    check(
      "category_no_self_reference",
      sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`,
    ),
  ],
);

export const TaskList = pgTable(
  "task_list",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    name: t.varchar({ length: 200 }).notNull(),
    description: t.text(),
    color: t.varchar({ length: 7 }),
    icon: t.varchar({ length: 50 }),
    ownerId: t
      .text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isDefault: t.boolean("is_default").notNull().default(false),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  }),
  (table) => [index("task_list_owner_id_idx").on(table.ownerId)],
);

export const Task = pgTable(
  "task",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: t
      .uuid("category_id")
      .references(() => Category.id, { onDelete: "set null" }),
    listId: t
      .uuid("list_id")
      .references(() => TaskList.id, { onDelete: "set null" }),
    title: t.varchar({ length: 500 }).notNull(),
    description: t.text(),
    completed: t.boolean().notNull().default(false),
    dueDate: t.timestamp("due_date", { withTimezone: true, mode: "date" }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    completedAt: t.timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    archivedAt: t.timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    reminderAt: t.timestamp("reminder_at", {
      withTimezone: true,
      mode: "date",
    }),
    reminderSentAt: t.timestamp("reminder_sent_at", {
      withTimezone: true,
      mode: "date",
    }),
    priority: t.varchar({ length: 10 }).default("medium"),
    orderIndex: t.integer("order_index"),
    version: t.integer().notNull().default(1),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    lastSyncedAt: t.timestamp("last_synced_at", {
      withTimezone: true,
      mode: "date",
    }),
    // Snooze
    snoozedUntil: t.timestamp("snoozed_until", {
      withTimezone: true,
      mode: "date",
    }),
    // Recurrence
    recurrenceRule: t.varchar("recurrence_rule", { length: 20 }), // 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    recurrenceInterval: t.integer("recurrence_interval").default(1),
    recurrenceEndDate: t.timestamp("recurrence_end_date", {
      withTimezone: true,
      mode: "date",
    }),
    recurrenceSourceId: t
      .uuid("recurrence_source_id")
      // Self-reference requires explicit type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .references((): any => Task.id, { onDelete: "set null" }),
  }),
  (table) => [
    index("task_user_id_deleted_at_order_idx").on(
      table.userId,
      table.deletedAt,
      table.orderIndex,
    ),
    index("task_user_id_completed_created_idx").on(
      table.userId,
      table.completed,
      table.createdAt,
    ),
    index("task_user_id_archived_at_idx").on(table.userId, table.archivedAt),
    index("task_category_id_idx").on(table.categoryId),
    index("task_list_id_idx").on(table.listId),
    index("task_user_id_priority_completed_idx").on(
      table.userId,
      table.priority,
      table.completed,
    ),
    index("task_reminder_at_idx").on(table.reminderAt),
    index("task_snoozed_until_idx").on(table.userId, table.snoozedUntil),
    index("task_recurrence_source_id_idx").on(table.recurrenceSourceId),
    check(
      "task_priority_valid",
      sql`${table.priority} IS NULL OR ${table.priority} IN ('high', 'medium', 'low')`,
    ),
  ],
);

export const Subtask = pgTable(
  "subtask",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    taskId: t
      .uuid("task_id")
      .notNull()
      .references(() => Task.id, { onDelete: "cascade" }),
    title: t.varchar({ length: 500 }).notNull(),
    completed: t.boolean().notNull().default(false),
    sortOrder: t.integer("sort_order").notNull().default(0),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    completedAt: t.timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
  }),
  (table) => [
    index("subtask_task_id_sort_order_idx").on(table.taskId, table.sortOrder),
  ],
);

export const TaskListMember = pgTable(
  "task_list_member",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    listId: t
      .uuid("list_id")
      .notNull()
      .references(() => TaskList.id, { onDelete: "cascade" }),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: t.varchar({ length: 20 }).notNull().default("editor"),
    showInFilter: t
      .boolean("show_in_filter")
      .notNull()
      .default(true),
    invitedBy: t.text("invited_by").references(() => user.id),
    joinedAt: t
      .timestamp("joined_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  }),
  (table) => [
    uniqueIndex("task_list_member_list_user_unique").on(
      table.listId,
      table.userId,
    ),
    index("task_list_member_user_id_idx").on(table.userId),
  ],
);

export const TaskListInvite = pgTable(
  "task_list_invite",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    listId: t
      .uuid("list_id")
      .notNull()
      .references(() => TaskList.id, { onDelete: "cascade" }),
    inviteCode: t.varchar("invite_code", { length: 20 }).notNull().unique(),
    role: t.varchar({ length: 20 }).notNull().default("editor"),
    maxUses: t.integer("max_uses"),
    useCount: t.integer("use_count").notNull().default(0),
    expiresAt: t.timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdBy: t
      .text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  }),
  (table) => [
    index("task_list_invite_code_idx").on(table.inviteCode),
    index("task_list_invite_list_id_idx").on(table.listId),
  ],
);

// Music League Tables

export const League = pgTable(
  "league",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: t.text().notNull(),
    description: t.text(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
    status: leagueStatusEnum("status").default("ACTIVE").notNull(),
    inviteCode: t.text("invite_code").notNull().unique(),

    // Settings
    songsPerRound: t.integer("songs_per_round").default(1).notNull(),
    maxMembers: t.integer("max_members").default(20).notNull(),
    allowDownvotes: t.boolean("allow_downvotes").default(false).notNull(),
    downvotePointValue: t.integer("downvote_point_value").default(-1).notNull(),
    upvotePointsPerRound: t
      .integer("upvote_points_per_round")
      .default(5)
      .notNull(),
    submissionWindowDays: t
      .integer("submission_window_days")
      .default(3)
      .notNull(),
    votingWindowDays: t.integer("voting_window_days").default(2).notNull(),
    downvotePointsPerRound: t
      .integer("downvote_points_per_round")
      .default(3)
      .notNull(),
    isPublic: t.boolean("is_public").default(false).notNull(),

    // Relations
    creatorId: t
      .text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (table) => [
    index("league_creator_id_idx").on(table.creatorId),
    index("league_invite_code_idx").on(table.inviteCode),
  ],
);

export const LeagueMember = pgTable(
  "league_member",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    joinedAt: t
      .timestamp("joined_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    role: memberRoleEnum("role").default("MEMBER").notNull(),

    leagueId: t
      .text("league_id")
      .notNull()
      .references(() => League.id, { onDelete: "cascade" }),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (table) => [
    index("league_member_user_id_idx").on(table.userId),
    index("league_member_league_user_unique").on(table.leagueId, table.userId),
  ],
);

export const Round = pgTable(
  "round",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundNumber: t.integer("round_number").notNull(),
    themeName: t.text("theme_name").notNull(),
    themeDescription: t.text("theme_description"),
    status: roundStatusEnum("status").default("SUBMISSION").notNull(),
    startDate: t
      .timestamp("start_date", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    submissionDeadline: t
      .timestamp("submission_deadline", { withTimezone: true, mode: "date" })
      .notNull(),
    votingDeadline: t
      .timestamp("voting_deadline", { withTimezone: true, mode: "date" })
      .notNull(),
    playlistUrl: t.text("playlist_url"),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),

    leagueId: t
      .text("league_id")
      .notNull()
      .references(() => League.id, { onDelete: "cascade" }),
  }),
  (table) => [index("round_league_id_idx").on(table.leagueId)],
);

export const Submission = pgTable(
  "submission",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    spotifyTrackId: t.text("spotify_track_id").notNull(),
    trackName: t.text("track_name").notNull(),
    artistName: t.text("artist_name").notNull(),
    albumName: t.text("album_name").notNull(),
    albumArtUrl: t.text("album_art_url").notNull(),
    previewUrl: t.text("preview_url"),
    trackDurationMs: t.integer("track_duration_ms").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),

    roundId: t
      .text("round_id")
      .notNull()
      .references(() => Round.id, { onDelete: "cascade" }),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (table) => [
    index("submission_round_id_idx").on(table.roundId),
    index("submission_user_id_idx").on(table.userId),
    // unique constraint for round+user+track
    index("submission_round_user_track_unique").on(
      table.roundId,
      table.userId,
      table.spotifyTrackId,
    ),
  ],
);

export const Vote = pgTable(
  "vote",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    points: t.integer("points").notNull(),

    roundId: t
      .text("round_id")
      .notNull()
      .references(() => Round.id, { onDelete: "cascade" }),

    voterId: t
      .text("voter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    submissionId: t
      .text("submission_id")
      .notNull()
      .references(() => Submission.id, { onDelete: "cascade" }),
  }),
  (table) => [
    index("vote_submission_id_idx").on(table.submissionId),
    index("vote_voter_id_idx").on(table.voterId),
    index("vote_round_voter_submission_unique").on(
      table.roundId,
      table.voterId,
      table.submissionId,
    ),
  ],
);

export const Comment = pgTable(
  "comment",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    text: t.text("text").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),

    submissionId: t
      .text("submission_id")
      .notNull()
      .references(() => Submission.id, { onDelete: "cascade" }),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (table) => [
    index("comment_submission_id_idx").on(table.submissionId),
    index("comment_user_id_idx").on(table.userId),
    index("comment_submission_user_unique").on(
      table.submissionId,
      table.userId,
    ),
  ],
);

// UGC Moderation Enums
export const reportStatusEnum = pgEnum("report_status", [
  "PENDING",
  "REVIEWED",
  "DISMISSED",
]);

export const reportReasonEnum = pgEnum("report_reason", [
  "SPAM",
  "OFFENSIVE",
  "HARASSMENT",
  "OTHER",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "LEAGUE",
  "SUBMISSION",
  "TASK",
  "USER",
  "COMMENT",
  "ROUND",
]);

// UGC Moderation Tables

export const Report = pgTable(
  "report",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reporterId: t
      .text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reportedUserId: t
      .text("reported_user_id")
      .references(() => user.id, { onDelete: "set null" }),
    contentType: contentTypeEnum("content_type").notNull(),
    contentId: t.text("content_id").notNull(),
    reason: reportReasonEnum("reason").notNull(),
    details: t.text("details"),
    status: reportStatusEnum("status").default("PENDING").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("report_reporter_id_idx").on(table.reporterId),
    index("report_reported_user_id_idx").on(table.reportedUserId),
    index("report_content_type_id_idx").on(table.contentType, table.contentId),
    index("report_status_idx").on(table.status),
  ],
);

export const BlockedUser = pgTable(
  "blocked_user",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedUserId: t
      .text("blocked_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("blocked_user_unique").on(table.userId, table.blockedUserId),
    index("blocked_user_user_id_idx").on(table.userId),
    index("blocked_user_blocked_user_id_idx").on(table.blockedUserId),
  ],
);

// Content flag for soft moderation
export const ContentFlag = pgTable(
  "content_flag",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contentType: contentTypeEnum("content_type").notNull(),
    contentId: t.text("content_id").notNull(),
    flaggedText: t.text("flagged_text").notNull(),
    matchedWords: t.text("matched_words").array().notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("content_flag_content_type_id_idx").on(
      table.contentType,
      table.contentId,
    ),
  ],
);

export const reportRelations = relations(Report, ({ one }) => ({
  reporter: one(user, {
    fields: [Report.reporterId],
    references: [user.id],
    relationName: "reportReporter",
  }),
  reportedUser: one(user, {
    fields: [Report.reportedUserId],
    references: [user.id],
    relationName: "reportReportedUser",
  }),
}));

export const blockedUserRelations = relations(BlockedUser, ({ one }) => ({
  user: one(user, {
    fields: [BlockedUser.userId],
    references: [user.id],
    relationName: "blockerUser",
  }),
  blockedUser: one(user, {
    fields: [BlockedUser.blockedUserId],
    references: [user.id],
    relationName: "blockedUserTarget",
  }),
}));

// Push Notification Tokens
export const PushToken = pgTable(
  "push_token",
  (t) => ({
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: t.text().notNull(),
    platform: t.text().notNull(), // 'ios' | 'android'
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("push_token_user_id_idx").on(table.userId),
    index("push_token_token_unique").on(table.token),
  ],
);

export const pushTokenRelations = relations(PushToken, ({ one }) => ({
  user: one(user, {
    fields: [PushToken.userId],
    references: [user.id],
  }),
}));

export const UserPreference = pgTable("user_preference", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  emailReminders: t.boolean("email_reminders").notNull().default(false),
  pushReminders: t.boolean("push_reminders").notNull().default(true),
  reminderOffsetMinutes: t
    .integer("reminder_offset_minutes")
    .notNull()
    .default(15),
  createdAt: t
    .timestamp("created_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp("updated_at", { withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}));

export const userPreferenceRelations = relations(UserPreference, ({ one }) => ({
  user: one(user, {
    fields: [UserPreference.userId],
    references: [user.id],
  }),
}));

export const ThemeTemplate = pgTable("theme_template", (t) => ({
  id: t
    .text()
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: t.text("name").notNull(),
  description: t.text("description").notNull(),
  category: t.text("category").notNull(),
}));

// Existing Schemas
export const RecurrenceRule = z.enum([
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);
export type RecurrenceRule = z.infer<typeof RecurrenceRule>;

export const CreateTaskSchema = createInsertSchema(Task, {
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional(),
  listId: z.string().uuid().optional(),
  dueDate: z.date().optional(),
  priority: TaskPriority.optional().default("medium"),
  reminderAt: z.date().optional(),
  recurrenceRule: RecurrenceRule.optional(),
  recurrenceInterval: z.number().int().min(1).max(365).optional(),
  recurrenceEndDate: z.date().optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  archivedAt: true,
  reminderSentAt: true,
  orderIndex: true,
  version: true,
  deletedAt: true,
  lastSyncedAt: true,
  snoozedUntil: true,
  recurrenceSourceId: true,
});

export const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  listId: z.string().uuid().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  priority: TaskPriority.nullable().optional(),
  orderIndex: z.number().int().optional(),
  createdAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  archivedAt: z.date().nullable().optional(),
  reminderAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  recurrenceRule: RecurrenceRule.nullable().optional(),
  recurrenceInterval: z.number().int().min(1).max(365).nullable().optional(),
  recurrenceEndDate: z.date().nullable().optional(),
});

export const CreateSubtaskSchema = createInsertSchema(Subtask, {
  title: z.string().min(1, "Title is required").max(500),
  taskId: z.string().uuid(),
}).omit({
  id: true,
  completed: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const CreateTaskWithSubtasksSchema = CreateTaskSchema.extend({
  subtasks: z.array(z.object({ title: z.string().min(1).max(500) })).optional(),
});

export const UpdateSubtaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const CreateCategorySchema = createInsertSchema(Category, {
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  path: true,
  depth: true,
  isLeaf: true,
});

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const CreateTaskListSchema = createInsertSchema(TaskList, {
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
}).omit({
  id: true,
  ownerId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const UpdateTaskListSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  icon: z.string().max(50).nullable().optional(),
});

export const categoryRelations = relations(Category, ({ one, many }) => ({
  parent: one(Category, {
    fields: [Category.parentId],
    references: [Category.id],
    relationName: "categoryParentChild",
  }),
  children: many(Category, {
    relationName: "categoryParentChild",
  }),
  tasks: many(Task),
}));

export const taskRelations = relations(Task, ({ one, many }) => ({
  category: one(Category, {
    fields: [Task.categoryId],
    references: [Category.id],
  }),
  subtasks: many(Subtask),
  list: one(TaskList, {
    fields: [Task.listId],
    references: [TaskList.id],
  }),
  recurrenceSource: one(Task, {
    fields: [Task.recurrenceSourceId],
    references: [Task.id],
    relationName: "taskRecurrence",
  }),
  recurrenceChildren: many(Task, {
    relationName: "taskRecurrence",
  }),
}));

export const subtaskRelations = relations(Subtask, ({ one }) => ({
  task: one(Task, {
    fields: [Subtask.taskId],
    references: [Task.id],
  }),
}));

export const taskListRelations = relations(TaskList, ({ one, many }) => ({
  owner: one(user, {
    fields: [TaskList.ownerId],
    references: [user.id],
  }),
  members: many(TaskListMember),
  tasks: many(Task),
}));

export const taskListMemberRelations = relations(TaskListMember, ({ one }) => ({
  list: one(TaskList, {
    fields: [TaskListMember.listId],
    references: [TaskList.id],
  }),
  user: one(user, {
    fields: [TaskListMember.userId],
    references: [user.id],
  }),
}));

export const taskListInviteRelations = relations(TaskListInvite, ({ one }) => ({
  list: one(TaskList, {
    fields: [TaskListInvite.listId],
    references: [TaskList.id],
  }),
  createdByUser: one(user, {
    fields: [TaskListInvite.createdBy],
    references: [user.id],
  }),
}));

// Music League Relations

export const leagueRelations = relations(League, ({ one, many }) => ({
  creator: one(user, {
    fields: [League.creatorId],
    references: [user.id],
  }),
  members: many(LeagueMember),
  rounds: many(Round),
}));

export const leagueMemberRelations = relations(LeagueMember, ({ one }) => ({
  league: one(League, {
    fields: [LeagueMember.leagueId],
    references: [League.id],
  }),
  user: one(user, {
    fields: [LeagueMember.userId],
    references: [user.id],
  }),
}));

export const roundRelations = relations(Round, ({ one, many }) => ({
  league: one(League, {
    fields: [Round.leagueId],
    references: [League.id],
  }),
  submissions: many(Submission),
}));

export const submissionRelations = relations(Submission, ({ one, many }) => ({
  round: one(Round, {
    fields: [Submission.roundId],
    references: [Round.id],
  }),
  user: one(user, {
    fields: [Submission.userId],
    references: [user.id],
  }),
  votes: many(Vote),
  comments: many(Comment),
}));

export const voteRelations = relations(Vote, ({ one }) => ({
  round: one(Round, {
    fields: [Vote.roundId],
    references: [Round.id],
  }),
  voter: one(user, {
    fields: [Vote.voterId],
    references: [user.id],
  }),
  submission: one(Submission, {
    fields: [Vote.submissionId],
    references: [Submission.id],
  }),
}));

export const commentRelations = relations(Comment, ({ one }) => ({
  submission: one(Submission, {
    fields: [Comment.submissionId],
    references: [Submission.id],
  }),
  user: one(user, {
    fields: [Comment.userId],
    references: [user.id],
  }),
}));

// Add relations to User for Music League
export const userRelations = relations(user, ({ many }) => ({
  leagues: many(League),
  leagueMemberships: many(LeagueMember),
  submissions: many(Submission),
  votes: many(Vote),
  comments: many(Comment),
}));

export * from "./auth-schema";
