CREATE TABLE `remote_escalations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`case_ref` text NOT NULL,
	`request_key` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`state` text NOT NULL,
	`created` text NOT NULL,
	`due` text NOT NULL,
	`gateway_ref` text,
	`ack_at` text,
	`ack_by` text,
	`closed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `remote_idempotency` ON `remote_escalations` (`owner`,`request_key`);--> statement-breakpoint
CREATE TABLE `remote_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`escalation` text NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roster` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`role` text NOT NULL,
	`label` text NOT NULL,
	`destination` text NOT NULL,
	`channel` text NOT NULL,
	`starts` text NOT NULL,
	`ends` text NOT NULL
);
