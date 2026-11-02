CREATE TABLE `comm_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_id` text NOT NULL,
	`message_id` text,
	`action` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comm_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`share_phone` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `direct_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`request_key` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_idempotency` ON `direct_messages` (`sender`,`request_key`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subscription` text NOT NULL,
	`created_at` text NOT NULL
);
