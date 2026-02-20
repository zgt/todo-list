CREATE TYPE "public"."league_status" AS ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('PENDING', 'SUBMISSION', 'LISTENING', 'VOTING', 'RESULTS', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" uuid,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) NOT NULL,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"path" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"is_leaf" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "category_no_self_reference" CHECK ("category"."parent_id" IS NULL OR "category"."parent_id" != "category"."id")
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"submission_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"status" "league_status" DEFAULT 'ACTIVE' NOT NULL,
	"invite_code" text NOT NULL,
	"songs_per_round" integer DEFAULT 1 NOT NULL,
	"max_members" integer DEFAULT 20 NOT NULL,
	"allow_downvotes" boolean DEFAULT false NOT NULL,
	"downvote_point_value" integer DEFAULT -1 NOT NULL,
	"upvote_points_per_round" integer DEFAULT 5 NOT NULL,
	"submission_window_days" integer DEFAULT 3 NOT NULL,
	"voting_window_days" integer DEFAULT 2 NOT NULL,
	"downvote_points_per_round" integer DEFAULT 3 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"creator_id" text NOT NULL,
	CONSTRAINT "league_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "league_member" (
	"id" text PRIMARY KEY NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"role" "member_role" DEFAULT 'MEMBER' NOT NULL,
	"league_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round" (
	"id" text PRIMARY KEY NOT NULL,
	"round_number" integer NOT NULL,
	"theme_name" text NOT NULL,
	"theme_description" text,
	"status" "round_status" DEFAULT 'SUBMISSION' NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"submission_deadline" timestamp with time zone NOT NULL,
	"voting_deadline" timestamp with time zone NOT NULL,
	"playlist_url" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"league_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"spotify_track_id" text NOT NULL,
	"track_name" text NOT NULL,
	"artist_name" text NOT NULL,
	"album_name" text NOT NULL,
	"album_art_url" text NOT NULL,
	"preview_url" text,
	"track_duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"round_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"reminder_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"priority" varchar(10) DEFAULT 'medium',
	"order_index" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	CONSTRAINT "task_priority_valid" CHECK ("task"."priority" IS NULL OR "task"."priority" IN ('high', 'medium', 'low'))
);
--> statement-breakpoint
CREATE TABLE "theme_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_reminders" boolean DEFAULT false NOT NULL,
	"push_reminders" boolean DEFAULT true NOT NULL,
	"reminder_offset_minutes" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "user_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"id" text PRIMARY KEY NOT NULL,
	"points" integer NOT NULL,
	"round_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"submission_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"notification_preferences" jsonb DEFAULT '{"roundStart":true,"submissionReminder":true,"votingOpen":true,"resultsAvailable":true}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league" ADD CONSTRAINT "league_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_member" ADD CONSTRAINT "league_member_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_member" ADD CONSTRAINT "league_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round" ADD CONSTRAINT "round_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_voter_id_user_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_user_id_idx" ON "category" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "category_user_id_sort_order_idx" ON "category" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "category_parent_id_idx" ON "category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "category_user_id_path_idx" ON "category" USING btree ("user_id","path");--> statement-breakpoint
CREATE INDEX "category_user_id_depth_idx" ON "category" USING btree ("user_id","depth");--> statement-breakpoint
CREATE INDEX "comment_submission_id_idx" ON "comment" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "comment_user_id_idx" ON "comment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comment_submission_user_unique" ON "comment" USING btree ("submission_id","user_id");--> statement-breakpoint
CREATE INDEX "league_creator_id_idx" ON "league" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "league_invite_code_idx" ON "league" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "league_member_user_id_idx" ON "league_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "league_member_league_user_unique" ON "league_member" USING btree ("league_id","user_id");--> statement-breakpoint
CREATE INDEX "push_token_user_id_idx" ON "push_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_token_token_unique" ON "push_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "round_league_id_idx" ON "round" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "submission_round_id_idx" ON "submission" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "submission_user_id_idx" ON "submission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submission_round_user_track_unique" ON "submission" USING btree ("round_id","user_id","spotify_track_id");--> statement-breakpoint
CREATE INDEX "task_user_id_deleted_at_order_idx" ON "task" USING btree ("user_id","deleted_at","order_index");--> statement-breakpoint
CREATE INDEX "task_user_id_completed_created_idx" ON "task" USING btree ("user_id","completed","created_at");--> statement-breakpoint
CREATE INDEX "task_user_id_archived_at_idx" ON "task" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "task_category_id_idx" ON "task" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "task_user_id_priority_completed_idx" ON "task" USING btree ("user_id","priority","completed");--> statement-breakpoint
CREATE INDEX "task_reminder_at_idx" ON "task" USING btree ("reminder_at");--> statement-breakpoint
CREATE INDEX "vote_submission_id_idx" ON "vote" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "vote_voter_id_idx" ON "vote" USING btree ("voter_id");--> statement-breakpoint
CREATE INDEX "vote_round_voter_submission_unique" ON "vote" USING btree ("round_id","voter_id","submission_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");