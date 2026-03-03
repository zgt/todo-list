"use strict";
var __makeTemplateObject =
  (this && this.__makeTemplateObject) ||
  function (cooked, raw) {
    if (Object.defineProperty) {
      Object.defineProperty(cooked, "raw", { value: raw });
    } else {
      cooked.raw = raw;
    }
    return cooked;
  };
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRelations =
  exports.commentRelations =
  exports.voteRelations =
  exports.submissionRelations =
  exports.roundRelations =
  exports.leagueMemberRelations =
  exports.leagueRelations =
  exports.taskListInviteRelations =
  exports.taskListMemberRelations =
  exports.taskListRelations =
  exports.subtaskRelations =
  exports.taskRelations =
  exports.categoryRelations =
  exports.UpdateTaskListSchema =
  exports.CreateTaskListSchema =
  exports.UpdateCategorySchema =
  exports.CreateCategorySchema =
  exports.UpdateSubtaskSchema =
  exports.CreateSubtaskSchema =
  exports.UpdateTaskSchema =
  exports.CreateTaskSchema =
  exports.ThemeTemplate =
  exports.userPreferenceRelations =
  exports.UserPreference =
  exports.pushTokenRelations =
  exports.PushToken =
  exports.Comment =
  exports.Vote =
  exports.Submission =
  exports.Round =
  exports.LeagueMember =
  exports.League =
  exports.TaskListInvite =
  exports.TaskListMember =
  exports.Subtask =
  exports.Task =
  exports.TaskList =
  exports.Category =
  exports.CreatePostSchema =
  exports.Post =
  exports.roundStatusEnum =
  exports.memberRoleEnum =
  exports.leagueStatusEnum =
  exports.TaskPriority =
    void 0;
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_zod_1 = require("drizzle-zod");
var v4_1 = require("zod/v4");
var auth_schema_1 = require("./auth-schema");
exports.TaskPriority = v4_1.z.enum(["high", "medium", "low"]);
// Music League Enums
exports.leagueStatusEnum = (0, pg_core_1.pgEnum)("league_status", [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);
exports.memberRoleEnum = (0, pg_core_1.pgEnum)("member_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
]);
exports.roundStatusEnum = (0, pg_core_1.pgEnum)("round_status", [
  "PENDING",
  "SUBMISSION",
  "LISTENING",
  "VOTING",
  "RESULTS",
  "COMPLETED",
]);
exports.Post = (0, pg_core_1.pgTable)("post", function (t) {
  return {
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    title: t.varchar({ length: 256 }).notNull(),
    content: t.text().notNull(),
    createdAt: t
      .timestamp({ withTimezone: true, mode: "date" })
      .$defaultFn(function () {
        return new Date();
      })
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .$defaultFn(function () {
        return new Date();
      })
      .$onUpdate(function () {
        return new Date();
      }),
  };
});
exports.CreatePostSchema = (0, drizzle_zod_1.createInsertSchema)(exports.Post, {
  title: v4_1.z.string().max(256),
  content: v4_1.z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
exports.Category = (0, pg_core_1.pgTable)(
  "category",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
      parentId: t
        .uuid("parent_id")
        // Self-reference requires explicit type assertion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .references(
          function () {
            return exports.Category.id;
          },
          { onDelete: "cascade" },
        ),
      name: t.varchar({ length: 100 }).notNull(),
      color: t.varchar({ length: 7 }).notNull(), // Hex color code
      icon: t.varchar({ length: 50 }),
      sortOrder: t.integer("sort_order").notNull().default(0),
      path: t
        .uuid("path")
        .array()
        .notNull()
        .default(
          (0, drizzle_orm_1.sql)(
            templateObject_1 ||
              (templateObject_1 = __makeTemplateObject(
                ["ARRAY[]::uuid[]"],
                ["ARRAY[]::uuid[]"],
              )),
          ),
        ),
      depth: t.integer().notNull().default(0),
      isLeaf: t.boolean("is_leaf").notNull().default(true),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        }),
      deletedAt: t.timestamp("deleted_at", {
        withTimezone: true,
        mode: "date",
      }),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("category_user_id_idx").on(table.userId),
      (0, pg_core_1.index)("category_user_id_sort_order_idx").on(
        table.userId,
        table.sortOrder,
      ),
      (0, pg_core_1.index)("category_parent_id_idx").on(table.parentId),
      (0, pg_core_1.index)("category_user_id_path_idx").on(
        table.userId,
        table.path,
      ),
      (0, pg_core_1.index)("category_user_id_depth_idx").on(
        table.userId,
        table.depth,
      ),
      (0, pg_core_1.check)(
        "category_no_self_reference",
        (0, drizzle_orm_1.sql)(
          templateObject_2 ||
            (templateObject_2 = __makeTemplateObject(
              ["", " IS NULL OR ", " != ", ""],
              ["", " IS NULL OR ", " != ", ""],
            )),
          table.parentId,
          table.parentId,
          table.id,
        ),
      ),
    ];
  },
);
exports.TaskList = (0, pg_core_1.pgTable)(
  "task_list",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      name: t.varchar({ length: 200 }).notNull(),
      description: t.text(),
      color: t.varchar({ length: 7 }),
      icon: t.varchar({ length: 50 }),
      ownerId: t
        .text("owner_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
      isDefault: t.boolean("is_default").notNull().default(false),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        }),
      deletedAt: t.timestamp("deleted_at", {
        withTimezone: true,
        mode: "date",
      }),
    };
  },
  function (table) {
    return [(0, pg_core_1.index)("task_list_owner_id_idx").on(table.ownerId)];
  },
);
exports.Task = (0, pg_core_1.pgTable)(
  "task",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
      categoryId: t.uuid("category_id").references(
        function () {
          return exports.Category.id;
        },
        { onDelete: "set null" },
      ),
      listId: t.uuid("list_id").references(
        function () {
          return exports.TaskList.id;
        },
        { onDelete: "set null" },
      ),
      title: t.varchar({ length: 500 }).notNull(),
      description: t.text(),
      completed: t.boolean().notNull().default(false),
      dueDate: t.timestamp("due_date", { withTimezone: true, mode: "date" }),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        }),
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
      deletedAt: t.timestamp("deleted_at", {
        withTimezone: true,
        mode: "date",
      }),
      lastSyncedAt: t.timestamp("last_synced_at", {
        withTimezone: true,
        mode: "date",
      }),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("task_user_id_deleted_at_order_idx").on(
        table.userId,
        table.deletedAt,
        table.orderIndex,
      ),
      (0, pg_core_1.index)("task_user_id_completed_created_idx").on(
        table.userId,
        table.completed,
        table.createdAt,
      ),
      (0, pg_core_1.index)("task_user_id_archived_at_idx").on(
        table.userId,
        table.archivedAt,
      ),
      (0, pg_core_1.index)("task_category_id_idx").on(table.categoryId),
      (0, pg_core_1.index)("task_list_id_idx").on(table.listId),
      (0, pg_core_1.index)("task_user_id_priority_completed_idx").on(
        table.userId,
        table.priority,
        table.completed,
      ),
      (0, pg_core_1.index)("task_reminder_at_idx").on(table.reminderAt),
      (0, pg_core_1.check)(
        "task_priority_valid",
        (0, drizzle_orm_1.sql)(
          templateObject_3 ||
            (templateObject_3 = __makeTemplateObject(
              ["", " IS NULL OR ", " IN ('high', 'medium', 'low')"],
              ["", " IS NULL OR ", " IN ('high', 'medium', 'low')"],
            )),
          table.priority,
          table.priority,
        ),
      ),
    ];
  },
);
exports.Subtask = (0, pg_core_1.pgTable)(
  "subtask",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      taskId: t
        .uuid("task_id")
        .notNull()
        .references(
          function () {
            return exports.Task.id;
          },
          { onDelete: "cascade" },
        ),
      title: t.varchar({ length: 500 }).notNull(),
      completed: t.boolean().notNull().default(false),
      sortOrder: t.integer("sort_order").notNull().default(0),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        }),
      completedAt: t.timestamp("completed_at", {
        withTimezone: true,
        mode: "date",
      }),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("subtask_task_id_sort_order_idx").on(
        table.taskId,
        table.sortOrder,
      ),
    ];
  },
);
exports.TaskListMember = (0, pg_core_1.pgTable)(
  "task_list_member",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      listId: t
        .uuid("list_id")
        .notNull()
        .references(
          function () {
            return exports.TaskList.id;
          },
          { onDelete: "cascade" },
        ),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
      role: t.varchar({ length: 20 }).notNull().default("editor"),
      invitedBy: t.text("invited_by").references(function () {
        return auth_schema_1.user.id;
      }),
      joinedAt: t
        .timestamp("joined_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        }),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.uniqueIndex)("task_list_member_list_user_unique").on(
        table.listId,
        table.userId,
      ),
      (0, pg_core_1.index)("task_list_member_user_id_idx").on(table.userId),
    ];
  },
);
exports.TaskListInvite = (0, pg_core_1.pgTable)(
  "task_list_invite",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      listId: t
        .uuid("list_id")
        .notNull()
        .references(
          function () {
            return exports.TaskList.id;
          },
          { onDelete: "cascade" },
        ),
      inviteCode: t.varchar("invite_code", { length: 20 }).notNull().unique(),
      role: t.varchar({ length: 20 }).notNull().default("editor"),
      maxUses: t.integer("max_uses"),
      useCount: t.integer("use_count").notNull().default(0),
      expiresAt: t.timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }),
      createdBy: t
        .text("created_by")
        .notNull()
        .references(function () {
          return auth_schema_1.user.id;
        }),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      deletedAt: t.timestamp("deleted_at", {
        withTimezone: true,
        mode: "date",
      }),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("task_list_invite_code_idx").on(table.inviteCode),
      (0, pg_core_1.index)("task_list_invite_list_id_idx").on(table.listId),
    ];
  },
);
// Music League Tables
exports.League = (0, pg_core_1.pgTable)(
  "league",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      name: t.text().notNull(),
      description: t.text(),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        })
        .notNull(),
      status: (0, exports.leagueStatusEnum)("status")
        .default("ACTIVE")
        .notNull(),
      inviteCode: t.text("invite_code").notNull().unique(),
      // Settings
      songsPerRound: t.integer("songs_per_round").default(1).notNull(),
      maxMembers: t.integer("max_members").default(20).notNull(),
      allowDownvotes: t.boolean("allow_downvotes").default(false).notNull(),
      downvotePointValue: t
        .integer("downvote_point_value")
        .default(-1)
        .notNull(),
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
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("league_creator_id_idx").on(table.creatorId),
      (0, pg_core_1.index)("league_invite_code_idx").on(table.inviteCode),
    ];
  },
);
exports.LeagueMember = (0, pg_core_1.pgTable)(
  "league_member",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      joinedAt: t
        .timestamp("joined_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      role: (0, exports.memberRoleEnum)("role").default("MEMBER").notNull(),
      leagueId: t
        .text("league_id")
        .notNull()
        .references(
          function () {
            return exports.League.id;
          },
          { onDelete: "cascade" },
        ),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("league_member_user_id_idx").on(table.userId),
      (0, pg_core_1.index)("league_member_league_user_unique").on(
        table.leagueId,
        table.userId,
      ),
    ];
  },
);
exports.Round = (0, pg_core_1.pgTable)(
  "round",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      roundNumber: t.integer("round_number").notNull(),
      themeName: t.text("theme_name").notNull(),
      themeDescription: t.text("theme_description"),
      status: (0, exports.roundStatusEnum)("status")
        .default("SUBMISSION")
        .notNull(),
      startDate: t
        .timestamp("start_date", { withTimezone: true, mode: "date" })
        .notNull()
        .default(
          (0, drizzle_orm_1.sql)(
            templateObject_4 ||
              (templateObject_4 = __makeTemplateObject(["now()"], ["now()"])),
          ),
        ),
      submissionDeadline: t
        .timestamp("submission_deadline", { withTimezone: true, mode: "date" })
        .notNull(),
      votingDeadline: t
        .timestamp("voting_deadline", { withTimezone: true, mode: "date" })
        .notNull(),
      playlistUrl: t.text("playlist_url"),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        })
        .notNull(),
      leagueId: t
        .text("league_id")
        .notNull()
        .references(
          function () {
            return exports.League.id;
          },
          { onDelete: "cascade" },
        ),
    };
  },
  function (table) {
    return [(0, pg_core_1.index)("round_league_id_idx").on(table.leagueId)];
  },
);
exports.Submission = (0, pg_core_1.pgTable)(
  "submission",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      spotifyTrackId: t.text("spotify_track_id").notNull(),
      trackName: t.text("track_name").notNull(),
      artistName: t.text("artist_name").notNull(),
      albumName: t.text("album_name").notNull(),
      albumArtUrl: t.text("album_art_url").notNull(),
      previewUrl: t.text("preview_url"),
      trackDurationMs: t.integer("track_duration_ms").notNull(),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      roundId: t
        .text("round_id")
        .notNull()
        .references(
          function () {
            return exports.Round.id;
          },
          { onDelete: "cascade" },
        ),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("submission_round_id_idx").on(table.roundId),
      (0, pg_core_1.index)("submission_user_id_idx").on(table.userId),
      // unique constraint for round+user+track
      (0, pg_core_1.index)("submission_round_user_track_unique").on(
        table.roundId,
        table.userId,
        table.spotifyTrackId,
      ),
    ];
  },
);
exports.Vote = (0, pg_core_1.pgTable)(
  "vote",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      points: t.integer("points").notNull(),
      roundId: t
        .text("round_id")
        .notNull()
        .references(
          function () {
            return exports.Round.id;
          },
          { onDelete: "cascade" },
        ),
      voterId: t
        .text("voter_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
      submissionId: t
        .text("submission_id")
        .notNull()
        .references(
          function () {
            return exports.Submission.id;
          },
          { onDelete: "cascade" },
        ),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("vote_submission_id_idx").on(table.submissionId),
      (0, pg_core_1.index)("vote_voter_id_idx").on(table.voterId),
      (0, pg_core_1.index)("vote_round_voter_submission_unique").on(
        table.roundId,
        table.voterId,
        table.submissionId,
      ),
    ];
  },
);
exports.Comment = (0, pg_core_1.pgTable)(
  "comment",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      text: t.text("text").notNull(),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      submissionId: t
        .text("submission_id")
        .notNull()
        .references(
          function () {
            return exports.Submission.id;
          },
          { onDelete: "cascade" },
        ),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("comment_submission_id_idx").on(table.submissionId),
      (0, pg_core_1.index)("comment_user_id_idx").on(table.userId),
      (0, pg_core_1.index)("comment_submission_user_unique").on(
        table.submissionId,
        table.userId,
      ),
    ];
  },
);
// Push Notification Tokens
exports.PushToken = (0, pg_core_1.pgTable)(
  "push_token",
  function (t) {
    return {
      id: t
        .text()
        .notNull()
        .primaryKey()
        .$defaultFn(function () {
          return crypto.randomUUID();
        }),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        ),
      token: t.text().notNull(),
      platform: t.text().notNull(), // 'ios' | 'android'
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        })
        .notNull(),
    };
  },
  function (table) {
    return [
      (0, pg_core_1.index)("push_token_user_id_idx").on(table.userId),
      (0, pg_core_1.index)("push_token_token_unique").on(table.token),
    ];
  },
);
exports.pushTokenRelations = (0, drizzle_orm_1.relations)(
  exports.PushToken,
  function (_a) {
    var one = _a.one;
    return {
      user: one(auth_schema_1.user, {
        fields: [exports.PushToken.userId],
        references: [auth_schema_1.user.id],
      }),
    };
  },
);
exports.UserPreference = (0, pg_core_1.pgTable)(
  "user_preference",
  function (t) {
    return {
      id: t.uuid().notNull().primaryKey().defaultRandom(),
      userId: t
        .text("user_id")
        .notNull()
        .references(
          function () {
            return auth_schema_1.user.id;
          },
          { onDelete: "cascade" },
        )
        .unique(),
      emailReminders: t.boolean("email_reminders").notNull().default(false),
      pushReminders: t.boolean("push_reminders").notNull().default(true),
      reminderOffsetMinutes: t
        .integer("reminder_offset_minutes")
        .notNull()
        .default(15),
      createdAt: t
        .timestamp("created_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .notNull(),
      updatedAt: t
        .timestamp("updated_at", { withTimezone: true, mode: "date" })
        .$defaultFn(function () {
          return new Date();
        })
        .$onUpdate(function () {
          return new Date();
        }),
    };
  },
);
exports.userPreferenceRelations = (0, drizzle_orm_1.relations)(
  exports.UserPreference,
  function (_a) {
    var one = _a.one;
    return {
      user: one(auth_schema_1.user, {
        fields: [exports.UserPreference.userId],
        references: [auth_schema_1.user.id],
      }),
    };
  },
);
exports.ThemeTemplate = (0, pg_core_1.pgTable)("theme_template", function (t) {
  return {
    id: t
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(function () {
        return crypto.randomUUID();
      }),
    name: t.text("name").notNull(),
    description: t.text("description").notNull(),
    category: t.text("category").notNull(),
  };
});
// Existing Schemas
exports.CreateTaskSchema = (0, drizzle_zod_1.createInsertSchema)(exports.Task, {
  title: v4_1.z.string().min(1, "Title is required").max(500),
  description: v4_1.z.string().max(5000).optional(),
  categoryId: v4_1.z.string().uuid().optional(),
  listId: v4_1.z.string().uuid().optional(),
  dueDate: v4_1.z.date().optional(),
  priority: exports.TaskPriority.optional().default("medium"),
  reminderAt: v4_1.z.date().optional(),
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
});
exports.UpdateTaskSchema = v4_1.z.object({
  id: v4_1.z.string().uuid(),
  title: v4_1.z.string().min(1).max(500).optional(),
  description: v4_1.z.string().max(5000).optional(),
  completed: v4_1.z.boolean().optional(),
  categoryId: v4_1.z.string().uuid().nullable().optional(),
  listId: v4_1.z.string().uuid().nullable().optional(),
  dueDate: v4_1.z.date().nullable().optional(),
  priority: exports.TaskPriority.nullable().optional(),
  orderIndex: v4_1.z.number().int().optional(),
  createdAt: v4_1.z.date().optional(),
  completedAt: v4_1.z.date().nullable().optional(),
  archivedAt: v4_1.z.date().nullable().optional(),
  reminderAt: v4_1.z.date().nullable().optional(),
  deletedAt: v4_1.z.date().nullable().optional(),
});
exports.CreateSubtaskSchema = (0, drizzle_zod_1.createInsertSchema)(
  exports.Subtask,
  {
    title: v4_1.z.string().min(1, "Title is required").max(500),
    taskId: v4_1.z.string().uuid(),
  },
).omit({
  id: true,
  completed: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});
exports.UpdateSubtaskSchema = v4_1.z.object({
  id: v4_1.z.string().uuid(),
  title: v4_1.z.string().min(1).max(500).optional(),
  completed: v4_1.z.boolean().optional(),
  sortOrder: v4_1.z.number().int().optional(),
});
exports.CreateCategorySchema = (0, drizzle_zod_1.createInsertSchema)(
  exports.Category,
  {
    name: v4_1.z.string().min(1, "Name is required").max(100),
    color: v4_1.z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
    icon: v4_1.z.string().max(50).optional(),
    sortOrder: v4_1.z.number().int().optional(),
    parentId: v4_1.z.string().uuid().optional(),
  },
).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  path: true,
  depth: true,
  isLeaf: true,
});
exports.UpdateCategorySchema = v4_1.z.object({
  id: v4_1.z.string().uuid(),
  name: v4_1.z.string().min(1).max(100).optional(),
  color: v4_1.z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  icon: v4_1.z.string().max(50).optional(),
  sortOrder: v4_1.z.number().int().optional(),
  parentId: v4_1.z.string().uuid().nullable().optional(),
});
exports.CreateTaskListSchema = (0, drizzle_zod_1.createInsertSchema)(
  exports.TaskList,
  {
    name: v4_1.z.string().min(1, "Name is required").max(200),
    description: v4_1.z.string().max(2000).optional(),
    color: v4_1.z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    icon: v4_1.z.string().max(50).optional(),
  },
).omit({
  id: true,
  ownerId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
exports.UpdateTaskListSchema = v4_1.z.object({
  id: v4_1.z.string().uuid(),
  name: v4_1.z.string().min(1).max(200).optional(),
  description: v4_1.z.string().max(2000).nullable().optional(),
  color: v4_1.z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  icon: v4_1.z.string().max(50).nullable().optional(),
});
exports.categoryRelations = (0, drizzle_orm_1.relations)(
  exports.Category,
  function (_a) {
    var one = _a.one,
      many = _a.many;
    return {
      parent: one(exports.Category, {
        fields: [exports.Category.parentId],
        references: [exports.Category.id],
        relationName: "categoryParentChild",
      }),
      children: many(exports.Category, {
        relationName: "categoryParentChild",
      }),
      tasks: many(exports.Task),
    };
  },
);
exports.taskRelations = (0, drizzle_orm_1.relations)(
  exports.Task,
  function (_a) {
    var one = _a.one,
      many = _a.many;
    return {
      category: one(exports.Category, {
        fields: [exports.Task.categoryId],
        references: [exports.Category.id],
      }),
      subtasks: many(exports.Subtask),
      list: one(exports.TaskList, {
        fields: [exports.Task.listId],
        references: [exports.TaskList.id],
      }),
    };
  },
);
exports.subtaskRelations = (0, drizzle_orm_1.relations)(
  exports.Subtask,
  function (_a) {
    var one = _a.one;
    return {
      task: one(exports.Task, {
        fields: [exports.Subtask.taskId],
        references: [exports.Task.id],
      }),
    };
  },
);
exports.taskListRelations = (0, drizzle_orm_1.relations)(
  exports.TaskList,
  function (_a) {
    var one = _a.one,
      many = _a.many;
    return {
      owner: one(auth_schema_1.user, {
        fields: [exports.TaskList.ownerId],
        references: [auth_schema_1.user.id],
      }),
      members: many(exports.TaskListMember),
      tasks: many(exports.Task),
    };
  },
);
exports.taskListMemberRelations = (0, drizzle_orm_1.relations)(
  exports.TaskListMember,
  function (_a) {
    var one = _a.one;
    return {
      list: one(exports.TaskList, {
        fields: [exports.TaskListMember.listId],
        references: [exports.TaskList.id],
      }),
      user: one(auth_schema_1.user, {
        fields: [exports.TaskListMember.userId],
        references: [auth_schema_1.user.id],
      }),
    };
  },
);
exports.taskListInviteRelations = (0, drizzle_orm_1.relations)(
  exports.TaskListInvite,
  function (_a) {
    var one = _a.one;
    return {
      list: one(exports.TaskList, {
        fields: [exports.TaskListInvite.listId],
        references: [exports.TaskList.id],
      }),
      createdByUser: one(auth_schema_1.user, {
        fields: [exports.TaskListInvite.createdBy],
        references: [auth_schema_1.user.id],
      }),
    };
  },
);
// Music League Relations
exports.leagueRelations = (0, drizzle_orm_1.relations)(
  exports.League,
  function (_a) {
    var one = _a.one,
      many = _a.many;
    return {
      creator: one(auth_schema_1.user, {
        fields: [exports.League.creatorId],
        references: [auth_schema_1.user.id],
      }),
      members: many(exports.LeagueMember),
      rounds: many(exports.Round),
    };
  },
);
exports.leagueMemberRelations = (0, drizzle_orm_1.relations)(
  exports.LeagueMember,
  function (_a) {
    var one = _a.one;
    return {
      league: one(exports.League, {
        fields: [exports.LeagueMember.leagueId],
        references: [exports.League.id],
      }),
      user: one(auth_schema_1.user, {
        fields: [exports.LeagueMember.userId],
        references: [auth_schema_1.user.id],
      }),
    };
  },
);
exports.roundRelations = (0, drizzle_orm_1.relations)(
  exports.Round,
  function (_a) {
    var one = _a.one,
      many = _a.many;
    return {
      league: one(exports.League, {
        fields: [exports.Round.leagueId],
        references: [exports.League.id],
      }),
      submissions: many(exports.Submission),
    };
  },
);
exports.submissionRelations = (0, drizzle_orm_1.relations)(
  exports.Submission,
  function (_a) {
    var one = _a.one,
      many = _a.many;
    return {
      round: one(exports.Round, {
        fields: [exports.Submission.roundId],
        references: [exports.Round.id],
      }),
      user: one(auth_schema_1.user, {
        fields: [exports.Submission.userId],
        references: [auth_schema_1.user.id],
      }),
      votes: many(exports.Vote),
      comments: many(exports.Comment),
    };
  },
);
exports.voteRelations = (0, drizzle_orm_1.relations)(
  exports.Vote,
  function (_a) {
    var one = _a.one;
    return {
      round: one(exports.Round, {
        fields: [exports.Vote.roundId],
        references: [exports.Round.id],
      }),
      voter: one(auth_schema_1.user, {
        fields: [exports.Vote.voterId],
        references: [auth_schema_1.user.id],
      }),
      submission: one(exports.Submission, {
        fields: [exports.Vote.submissionId],
        references: [exports.Submission.id],
      }),
    };
  },
);
exports.commentRelations = (0, drizzle_orm_1.relations)(
  exports.Comment,
  function (_a) {
    var one = _a.one;
    return {
      submission: one(exports.Submission, {
        fields: [exports.Comment.submissionId],
        references: [exports.Submission.id],
      }),
      user: one(auth_schema_1.user, {
        fields: [exports.Comment.userId],
        references: [auth_schema_1.user.id],
      }),
    };
  },
);
// Add relations to User for Music League
exports.userRelations = (0, drizzle_orm_1.relations)(
  auth_schema_1.user,
  function (_a) {
    var many = _a.many;
    return {
      leagues: many(exports.League),
      leagueMemberships: many(exports.LeagueMember),
      submissions: many(exports.Submission),
      votes: many(exports.Vote),
      comments: many(exports.Comment),
    };
  },
);
__exportStar(require("./auth-schema"), exports);
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
