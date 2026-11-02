CREATE TABLE `voice_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`caller` text NOT NULL,
	`callee` text NOT NULL,
	`state` text NOT NULL,
	`offer` text,
	`answer` text,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `voice_locks` (
	`user_id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL,
	`expires` integer NOT NULL
);
