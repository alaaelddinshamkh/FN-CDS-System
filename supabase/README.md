# Supabase connection — FN CDS

Target project: `pofrqinczjnufyyggdnk` (FN CDS), PostgreSQL 17.
Repository: `alaaelddinshamkh/FN-CDS-System`, branch `main`.

## Finish the GitHub connection
In the Supabase project dashboard, go to Settings → Integrations → GitHub Integration. Authorize the Supabase GitHub integration for this repository, choose FN-CDS-System, and set the working directory to `.`. Use main as the production branch. Automatic preview branching is optional and can add charges; it is not required for the initial connection. Verify the connected repository and deployment status in Supabase after enabling the integration.

These repository files prepare the integration; their presence alone does NOT establish the dashboard connection or activate deployments.

## Current architecture
Supabase Auth already provides application sign-in. The app backend and structured application records remain on Sites/D1. Inspection before this setup found no public Supabase tables or migration history. This folder therefore contains no database migrations or seed data. Existing SQLite migrations under ../drizzle must NOT be run on PostgreSQL.

This setup does not migrate D1 visits, approvals, messages or call signaling into Supabase. That requires PostgreSQL schemas, access policies, a backend adapter, data export/import and validation before switching production. It also does not host or redeploy the application frontend from GitHub. Continue the existing Sites publication workflow for the app itself.

For future PostgreSQL changes, use the Supabase CLI to create versioned migrations, test on a separate development database, enable appropriate RLS for exposed tables, and review before production deployment. Keep passwords, service-role keys, access tokens and production records out of Git.

Docs: https://supabase.com/docs/guides/deployment/branching/github-integration
