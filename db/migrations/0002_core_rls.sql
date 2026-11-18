-- Identity helpers. SECURITY DEFINER so policies can read users/permissions without recursion.
-- A user only counts once ACTIVE: pending/rejected/deactivated users resolve to NULL and
-- therefore match no policy (zero data access).

create or replace function app.current_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.company_id from public.users u where u.id = auth.uid() and u.status = 'active'
$$;

-- Effective user type: unexpired acting access wins, else the user's own type.
create or replace function app.current_user_type() returns public.user_type
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

create or replace function app.has_flag(f public.user_flag) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_flags uf join public.users u on u.id = uf.user_id
    where uf.user_id = auth.uid() and uf.flag = f and uf.revoked_at is null and u.status = 'active')
$$;

create or replace function app.current_crew_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.crew_id from public.users u where u.id = auth.uid() and u.status = 'active'
$$;

-- Widest scope the current user holds for area/action ('all' > 'crew' > 'own'), or NULL.
create or replace function app.permission_scope(p_area text, p_action text) returns public.permission_scope
language sql stable security definer set search_path = '' as $$
  select p.scope from public.user_type_permissions p
  where p.company_id = app.current_company_id()
    and p.user_type = app.current_user_type()
    and p.area = p_area and p.action = p_action
    and (p.required_flag is null or app.has_flag(p.required_flag))
  order by case p.scope when 'all' then 0 when 'crew' then 1 else 2 end
  limit 1
$$;

create or replace function app.can(p_area text, p_action text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.permission_scope(p_area, p_action) is not null
$$;

revoke all on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated, service_role;

-- updated_at triggers
create trigger companies_touch before update on public.companies for each row execute function app.touch_updated_at();
create trigger sites_touch before update on public.sites for each row execute function app.touch_updated_at();
create trigger crews_touch before update on public.crews for each row execute function app.touch_updated_at();
create trigger owner_entities_touch before update on public.owner_entities for each row execute function app.touch_updated_at();
create trigger users_touch before update on public.users for each row execute function app.touch_updated_at();

-- Row Level Security on every table. Nothing is readable by anon.
alter table public.companies enable row level security;
alter table public.sites enable row level security;
alter table public.crews enable row level security;
alter table public.owner_entities enable row level security;
alter table public.users enable row level security;
alter table public.user_type_permissions enable row level security;
alter table public.user_flags enable row level security;
alter table public.temp_access enable row level security;
alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon;

-- Tenant isolation: active users read their own company's reference data.
create policy companies_read on public.companies for select to authenticated
  using (id = app.current_company_id() and deleted_at is null);
create policy sites_read on public.sites for select to authenticated
  using (company_id = app.current_company_id());
create policy crews_read on public.crews for select to authenticated
  using (company_id = app.current_company_id());
create policy owner_entities_read on public.owner_entities for select to authenticated
  using (company_id = app.current_company_id());
create policy utp_read on public.user_type_permissions for select to authenticated
  using (company_id = app.current_company_id());

-- Users: everyone (including PENDING) can read their own row; active users see colleagues.
create policy users_read_self on public.users for select to authenticated
  using (id = auth.uid());
create policy users_read_company on public.users for select to authenticated
  using (company_id = app.current_company_id());
-- Secret columns are never readable through the API.
revoke select on public.users from authenticated;
grant select (id, company_id, name, email, mobile, status, user_type, crew_id, site_id,
  approved_at, deactivated_at, created_at, updated_at) on public.users to authenticated;

create policy user_flags_read on public.user_flags for select to authenticated
  using (company_id = app.current_company_id());
create policy temp_access_read on public.temp_access for select to authenticated
  using (company_id = app.current_company_id());

-- Audit log is append-only for everyone, including the table owner.
create or replace function app.block_audit_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_log is append-only';
end $$;
create trigger audit_no_update before update or delete on public.audit_log
  for each row execute function app.block_audit_change();
create trigger audit_no_truncate before truncate on public.audit_log
  for each statement execute function app.block_audit_change();
revoke update, delete, truncate on public.audit_log from authenticated, service_role;
