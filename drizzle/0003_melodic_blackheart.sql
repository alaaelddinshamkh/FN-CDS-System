CREATE TABLE `access_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`label` text NOT NULL,
	`requested_role` text NOT NULL,
	`external_id` text NOT NULL,
	`role` text,
	`status` text NOT NULL,
	`workspace_id` text,
	`patient_visit_id` text,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_alias` ON `access_accounts` (`username`);--> statement-breakpoint
CREATE TABLE `access_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
