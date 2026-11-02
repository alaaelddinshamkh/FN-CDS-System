CREATE TABLE `app_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`requested_role` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_username` ON `app_profiles` (`username`);