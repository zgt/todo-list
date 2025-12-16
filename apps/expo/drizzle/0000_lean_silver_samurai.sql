CREATE TABLE `local_category` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`last_synced_at` integer,
	`local_version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `local_task` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category_id` text,
	`due_date` integer,
	`order_index` integer,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`archived_at` integer,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`last_synced_at` integer,
	`local_version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_attempt_at` integer,
	`error` text
);
