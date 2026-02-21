CREATE TABLE "task_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" varchar(50),
	"owner_id" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_list_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"invite_code" varchar(20) NOT NULL,
	"role" varchar(20) DEFAULT 'editor' NOT NULL,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "task_list_invite_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "task_list_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(20) DEFAULT 'editor' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "list_id" uuid;--> statement-breakpoint
ALTER TABLE "task_list" ADD CONSTRAINT "task_list_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_invite" ADD CONSTRAINT "task_list_invite_list_id_task_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."task_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_invite" ADD CONSTRAINT "task_list_invite_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_member" ADD CONSTRAINT "task_list_member_list_id_task_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."task_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_member" ADD CONSTRAINT "task_list_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_member" ADD CONSTRAINT "task_list_member_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_list_owner_id_idx" ON "task_list" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "task_list_invite_code_idx" ON "task_list_invite" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "task_list_invite_list_id_idx" ON "task_list_invite" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_list_member_list_user_unique" ON "task_list_member" USING btree ("list_id","user_id");--> statement-breakpoint
CREATE INDEX "task_list_member_user_id_idx" ON "task_list_member" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_list_id_task_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."task_list"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_list_id_idx" ON "task" USING btree ("list_id");