CREATE TYPE "public"."content_type" AS ENUM('LEAGUE', 'SUBMISSION', 'TASK', 'USER', 'COMMENT', 'ROUND');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('SPAM', 'OFFENSIVE', 'HARASSMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('PENDING', 'REVIEWED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "blocked_user" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"blocked_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content_id" text NOT NULL,
	"flagged_text" text NOT NULL,
	"matched_words" text[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text,
	"content_type" "content_type" NOT NULL,
	"content_id" text NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtask" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "notification_preferences" SET DEFAULT '{"roundStart":true,"submissionReminder":true,"votingOpen":true,"resultsAvailable":true,"sharedListActivity":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "recurrence_rule" varchar(20);--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "recurrence_interval" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "recurrence_end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "recurrence_source_id" uuid;--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_blocked_user_id_user_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtask" ADD CONSTRAINT "subtask_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_user_unique" ON "blocked_user" USING btree ("user_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX "blocked_user_user_id_idx" ON "blocked_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blocked_user_blocked_user_id_idx" ON "blocked_user" USING btree ("blocked_user_id");--> statement-breakpoint
CREATE INDEX "content_flag_content_type_id_idx" ON "content_flag" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "report_reporter_id_idx" ON "report" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "report_reported_user_id_idx" ON "report" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "report_content_type_id_idx" ON "report" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subtask_task_id_sort_order_idx" ON "subtask" USING btree ("task_id","sort_order");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_recurrence_source_id_task_id_fk" FOREIGN KEY ("recurrence_source_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_snoozed_until_idx" ON "task" USING btree ("user_id","snoozed_until");--> statement-breakpoint
CREATE INDEX "task_recurrence_source_id_idx" ON "task" USING btree ("recurrence_source_id");