CREATE TABLE `demo_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_events` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`visit_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`performed_role` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invite_token` ON `team_invites` (`token_hash`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`role` text NOT NULL,
	`invite_id` text,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_identity` ON `team_members` (`team_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invite_single_use` ON `team_members` (`invite_id`);--> statement-breakpoint
CREATE TABLE `team_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`case_code` text NOT NULL,
	`stage` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`last_operation` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
