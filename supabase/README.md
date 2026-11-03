# FN CDS — Supabase backend

Project: `pofrqinczjnufyyggdnk` (FN CDS), PostgreSQL 17.
Repository: `alaaelddinshamkh/FN-CDS-System`, branch `main`, working directory `.`.

Supabase Auth provides sign-in. The v27 application data backend uses the private `fn_app` PostgreSQL schema via the server-only `fn-database` Edge Function. The frontend/PWA remains on Sites. The old D1 binding is retained as a migration checkpoint and must not receive concurrent application writes after cutover.

The database gateway requires a separate secret configured only in the Sites server; only its hash is stored in `fn_private.gateway_credentials`. The Edge Function uses its built-in database connection to authenticate the gateway, then switches to a restricted no-login role for allowlisted parameterized application queries. Public and authenticated clients have no access to these schemas. Application role/approval checks remain mandatory on the Worker.

`config.toml` declares the function. JWT gateway verification is disabled because this endpoint performs its own server credential authentication; an Auth JWT or publishable key cannot authorize access. Never expose the gateway key to the client or GitHub. It is not the Supabase service-role key.

The migration file matches the cloud migration version. Fresh environments require a separately provisioned hashed gateway credential. Production data is not in this repository. Never apply old SQLite files under ../drizzle directly to PostgreSQL.

When application SQL changes, regenerate the catalog, test the new queries and deploy matching catalogs on both the Edge Function and Worker. Keep live and test query namespaces separated. For live PostgreSQL tests see ../scripts/run-postgres-check.mjs; only `fn_app_test` is disposable. Do not reset or truncate `fn_app`.

The native GitHub integration was shown configured by the owner. This repository now contains the PostgreSQL migration and declared Edge Function for that integration. Review the deployment result after each main-branch push; this does not deploy the Sites frontend.
