CREATE SCHEMA fn_app;
CREATE SCHEMA fn_app_test;
CREATE SCHEMA fn_private;
REVOKE ALL ON SCHEMA fn_app,fn_app_test,fn_private FROM PUBLIC,anon,authenticated;
CREATE ROLE fn_cds_backend NOLOGIN;
GRANT fn_cds_backend TO postgres;
CREATE TABLE fn_private.gateway_credentials (name text PRIMARY KEY,key_hash text NOT NULL);
ALTER TABLE fn_private.gateway_credentials ENABLE ROW LEVEL SECURITY;
SET search_path TO fn_app,pg_catalog;
CREATE TABLE "remote_escalations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"case_ref" text NOT NULL,
	"request_key" text NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"state" text NOT NULL,
	"created" text NOT NULL,
	"due" text NOT NULL,
	"gateway_ref" text,
	"ack_at" text,
	"ack_by" text,
	"closed_at" text
);

CREATE UNIQUE INDEX "remote_idempotency" ON "remote_escalations" ("owner","request_key");
CREATE TABLE "remote_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"escalation" text NOT NULL,
	"action" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "roster" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"role" text NOT NULL,
	"label" text NOT NULL,
	"destination" text NOT NULL,
	"channel" text NOT NULL,
	"starts" text NOT NULL,
	"ends" text NOT NULL
);

CREATE TABLE "demo_teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE "team_events" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"performed_role" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "team_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"role" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_by" text
);

CREATE UNIQUE INDEX "team_invite_token" ON "team_invites" ("token_hash");
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"role" text NOT NULL,
	"invite_id" text,
	"joined_at" text NOT NULL
);

CREATE UNIQUE INDEX "team_member_identity" ON "team_members" ("team_id","user_id");
CREATE UNIQUE INDEX "team_invite_single_use" ON "team_members" ("invite_id");
CREATE TABLE "team_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"case_code" text NOT NULL,
	"stage" text NOT NULL,
	"revision" bigint NOT NULL,
	"snapshot" text NOT NULL,
	"last_operation" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE "app_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"requested_role" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE UNIQUE INDEX "app_username" ON "app_profiles" ("username");
CREATE TABLE "access_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"label" text NOT NULL,
	"requested_role" text NOT NULL,
	"external_id" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"workspace_id" text,
	"patient_visit_id" text,
	"revision" bigint NOT NULL,
	"created_at" text NOT NULL,
	"reviewed_at" text,
	"reviewed_by" text,
	"reason" text
);

CREATE UNIQUE INDEX "access_alias" ON "access_accounts" ("username");
CREATE TABLE "access_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "access_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" bigint NOT NULL
);

CREATE TABLE "comm_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"message_id" text,
	"action" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "comm_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"share_phone" bigint NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE "direct_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"request_key" text NOT NULL,
	"created_at" text NOT NULL,
	"read_at" text
);

CREATE UNIQUE INDEX "message_idempotency" ON "direct_messages" ("sender","request_key");
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE "voice_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"caller" text NOT NULL,
	"callee" text NOT NULL,
	"state" text NOT NULL,
	"offer" text,
	"answer" text,
	"created" bigint NOT NULL,
	"expires" bigint NOT NULL
);

CREATE TABLE "voice_locks" (
	"user_id" text PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"expires" bigint NOT NULL
);

GRANT USAGE ON SCHEMA fn_app TO fn_cds_backend;
ALTER TABLE fn_app.remote_escalations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.remote_escalations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.remote_escalations TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.remote_escalations TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.remote_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.remote_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.remote_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.remote_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.roster ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.roster FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.roster TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.roster TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.demo_teams ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.demo_teams FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.demo_teams TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.demo_teams TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.team_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.team_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.team_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.team_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.team_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.team_invites FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.team_invites TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.team_invites TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.team_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.team_members FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.team_members TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.team_members TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.team_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.team_visits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.team_visits TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.team_visits TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.app_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.app_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.app_profiles TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.app_profiles TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.access_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.access_accounts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.access_accounts TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.access_accounts TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.access_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.access_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.access_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.access_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.access_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.access_limits TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.access_limits TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.comm_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.comm_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.comm_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.comm_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.comm_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.comm_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.comm_profiles TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.comm_profiles TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.direct_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.direct_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.direct_messages TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.direct_messages TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.push_subscriptions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.push_subscriptions TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.push_subscriptions TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.voice_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.voice_calls FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.voice_calls TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.voice_calls TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app.voice_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app.voice_locks FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app.voice_locks TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app.voice_locks TO fn_cds_backend USING (true) WITH CHECK (true);
CREATE INDEX direct_messages_recipient_created_at_idx ON fn_app.direct_messages (recipient,created_at);
CREATE INDEX direct_messages_sender_created_at_idx ON fn_app.direct_messages (sender,created_at);
CREATE INDEX access_accounts_status_created_at_idx ON fn_app.access_accounts (status,created_at);
CREATE INDEX team_events_team_id_at_idx ON fn_app.team_events (team_id,at);
CREATE INDEX team_visits_team_id_updated_at_idx ON fn_app.team_visits (team_id,updated_at);
CREATE INDEX voice_calls_caller_created_idx ON fn_app.voice_calls (caller,created);
CREATE INDEX voice_calls_callee_created_idx ON fn_app.voice_calls (callee,created);
CREATE INDEX push_subscriptions_user_id_idx ON fn_app.push_subscriptions (user_id);
SET search_path TO fn_app_test,pg_catalog;
CREATE TABLE "remote_escalations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"case_ref" text NOT NULL,
	"request_key" text NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"state" text NOT NULL,
	"created" text NOT NULL,
	"due" text NOT NULL,
	"gateway_ref" text,
	"ack_at" text,
	"ack_by" text,
	"closed_at" text
);

CREATE UNIQUE INDEX "remote_idempotency" ON "remote_escalations" ("owner","request_key");
CREATE TABLE "remote_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"escalation" text NOT NULL,
	"action" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "roster" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"role" text NOT NULL,
	"label" text NOT NULL,
	"destination" text NOT NULL,
	"channel" text NOT NULL,
	"starts" text NOT NULL,
	"ends" text NOT NULL
);

CREATE TABLE "demo_teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE "team_events" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"performed_role" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "team_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"role" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_by" text
);

CREATE UNIQUE INDEX "team_invite_token" ON "team_invites" ("token_hash");
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"role" text NOT NULL,
	"invite_id" text,
	"joined_at" text NOT NULL
);

CREATE UNIQUE INDEX "team_member_identity" ON "team_members" ("team_id","user_id");
CREATE UNIQUE INDEX "team_invite_single_use" ON "team_members" ("invite_id");
CREATE TABLE "team_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"case_code" text NOT NULL,
	"stage" text NOT NULL,
	"revision" bigint NOT NULL,
	"snapshot" text NOT NULL,
	"last_operation" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE "app_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"requested_role" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE UNIQUE INDEX "app_username" ON "app_profiles" ("username");
CREATE TABLE "access_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"label" text NOT NULL,
	"requested_role" text NOT NULL,
	"external_id" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"workspace_id" text,
	"patient_visit_id" text,
	"revision" bigint NOT NULL,
	"created_at" text NOT NULL,
	"reviewed_at" text,
	"reviewed_by" text,
	"reason" text
);

CREATE UNIQUE INDEX "access_alias" ON "access_accounts" ("username");
CREATE TABLE "access_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "access_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" bigint NOT NULL
);

CREATE TABLE "comm_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"message_id" text,
	"action" text NOT NULL,
	"at" text NOT NULL
);

CREATE TABLE "comm_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"share_phone" bigint NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE "direct_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"request_key" text NOT NULL,
	"created_at" text NOT NULL,
	"read_at" text
);

CREATE UNIQUE INDEX "message_idempotency" ON "direct_messages" ("sender","request_key");
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE "voice_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"caller" text NOT NULL,
	"callee" text NOT NULL,
	"state" text NOT NULL,
	"offer" text,
	"answer" text,
	"created" bigint NOT NULL,
	"expires" bigint NOT NULL
);

CREATE TABLE "voice_locks" (
	"user_id" text PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"expires" bigint NOT NULL
);

GRANT USAGE ON SCHEMA fn_app_test TO fn_cds_backend;
ALTER TABLE fn_app_test.remote_escalations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.remote_escalations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.remote_escalations TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.remote_escalations TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.remote_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.remote_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.remote_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.remote_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.roster ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.roster FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.roster TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.roster TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.demo_teams ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.demo_teams FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.demo_teams TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.demo_teams TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.team_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.team_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.team_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.team_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.team_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.team_invites FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.team_invites TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.team_invites TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.team_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.team_members FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.team_members TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.team_members TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.team_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.team_visits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.team_visits TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.team_visits TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.app_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.app_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.app_profiles TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.app_profiles TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.access_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.access_accounts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.access_accounts TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.access_accounts TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.access_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.access_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.access_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.access_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.access_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.access_limits TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.access_limits TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.comm_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.comm_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.comm_events TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.comm_events TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.comm_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.comm_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.comm_profiles TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.comm_profiles TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.direct_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.direct_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.direct_messages TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.direct_messages TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.push_subscriptions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.push_subscriptions TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.push_subscriptions TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.voice_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.voice_calls FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.voice_calls TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.voice_calls TO fn_cds_backend USING (true) WITH CHECK (true);
ALTER TABLE fn_app_test.voice_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fn_app_test.voice_locks FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON fn_app_test.voice_locks TO fn_cds_backend;
CREATE POLICY backend_only ON fn_app_test.voice_locks TO fn_cds_backend USING (true) WITH CHECK (true);
CREATE INDEX direct_messages_recipient_created_at_idx ON fn_app_test.direct_messages (recipient,created_at);
CREATE INDEX direct_messages_sender_created_at_idx ON fn_app_test.direct_messages (sender,created_at);
CREATE INDEX access_accounts_status_created_at_idx ON fn_app_test.access_accounts (status,created_at);
CREATE INDEX team_events_team_id_at_idx ON fn_app_test.team_events (team_id,at);
CREATE INDEX team_visits_team_id_updated_at_idx ON fn_app_test.team_visits (team_id,updated_at);
CREATE INDEX voice_calls_caller_created_idx ON fn_app_test.voice_calls (caller,created);
CREATE INDEX voice_calls_callee_created_idx ON fn_app_test.voice_calls (callee,created);
CREATE INDEX push_subscriptions_user_id_idx ON fn_app_test.push_subscriptions (user_id);
RESET search_path;
