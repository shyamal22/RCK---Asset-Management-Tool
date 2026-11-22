-- Explicit table privileges for signed-in users. New hosted Supabase projects no longer grant
-- anon/authenticated access to new public tables by default (local dev still did), so production
-- was missing these. Make every environment identical: no default grants, only what's listed here.
-- Row Level Security still decides which rows; these only decide which tables/columns are reachable.
-- New tables must add their own grants (see CLAUDE.md).

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;

grant select on public.audit_log to authenticated;
grant update on public.companies to authenticated;
grant select, insert, update on public.crews to authenticated;
grant select, insert, update on public.owner_entities to authenticated;
grant select, insert, update on public.sites to authenticated;
grant select, insert, update on public.temp_access to authenticated;
grant select, insert, update on public.user_flags to authenticated;
grant select on public.user_type_permissions to authenticated;

-- Column-level reads (secret columns such as signup_code, pin_hash, token hashes are never readable).
grant select (id, name, nzbn, logo_path, time_zone, currency, signup_enabled, labour_rate_cents, approval_limit_cents,
  setup_completed_at, is_platform, suspended_at, created_at, updated_at, deleted_at) on public.companies to authenticated;
grant select (id, company_id, name, email, mobile, status, user_type, crew_id, site_id, approved_at, deactivated_at,
  created_at, updated_at) on public.users to authenticated;
grant select (id, user_id, label, created_at, last_used_at, revoked_at) on public.passkeys to authenticated;
grant select (id, user_id, label, verified_at, last_seen_at, created_at, revoked_at) on public.trusted_devices to authenticated;
