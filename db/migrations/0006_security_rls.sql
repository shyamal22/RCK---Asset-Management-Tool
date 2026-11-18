alter table public.trusted_devices enable row level security;
alter table public.verified_sessions enable row level security;
alter table public.passkeys enable row level security;
alter table public.sign_in_failures enable row level security;
revoke all on public.trusted_devices, public.verified_sessions, public.passkeys, public.sign_in_failures from anon, authenticated;
-- Users can list (not change) their own devices and passkeys.
grant select (id, user_id, label, verified_at, last_seen_at, created_at, revoked_at) on public.trusted_devices to authenticated;
create policy trusted_devices_own on public.trusted_devices for select to authenticated using (user_id = auth.uid());
grant select (id, user_id, label, created_at, last_used_at, revoked_at) on public.passkeys to authenticated;
create policy passkeys_own on public.passkeys for select to authenticated using (user_id = auth.uid());

create or replace function app.session_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.verified_sessions v
    where v.user_id = auth.uid()
      and v.session_id = nullif(auth.jwt()->>'session_id', '')::uuid)
$$;

-- Type before the second-step gate (used internally).
create or replace function app.current_user_type_raw() returns public.user_type
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select t.user_type from public.temp_access t
      where t.user_id = u.id and t.revoked_at is null
        and now() >= t.starts_at and now() < t.ends_at
      order by t.created_at desc limit 1),
    u.user_type)
  from public.users u
  where u.id = auth.uid() and u.status = 'active'
$$;

-- Director/Office must be on a verified session (second step on new devices); otherwise no access.
create or replace function app.access_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app.current_user_type_raw() not in ('director', 'office') or app.session_verified(), false)
$$;

create or replace function app.current_user_type() returns public.user_type
language sql stable security definer set search_path = '' as $$
  select case when app.access_ok() then app.current_user_type_raw() end
$$;

create or replace function app.current_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.company_id from public.users u
  where u.id = auth.uid() and u.status = 'active' and app.access_ok()
$$;

revoke all on function app.session_verified(), app.current_user_type_raw(), app.access_ok() from public, anon;
grant execute on function app.session_verified(), app.current_user_type_raw(), app.access_ok() to authenticated, service_role;
