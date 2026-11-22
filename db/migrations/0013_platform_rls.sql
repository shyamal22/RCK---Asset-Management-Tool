-- KRE platform: KRE admins (users of the platform company with a platform_admins row) manage client
-- companies. They never see client data, except through time-limited, read-only support access,
-- which is logged in the client's own audit log. Suspended companies' users see nothing.

create unique index companies_one_platform on public.companies (is_platform) where is_platform;

alter table public.platform_admins enable row level security;
alter table public.director_invites enable row level security;
alter table public.support_access enable row level security;
revoke all on public.platform_admins, public.director_invites, public.support_access from anon, authenticated;

-- Column grants: platform/suspended flags are visible like the rest of the company row.
grant select (is_platform, suspended_at) on public.companies to authenticated;

-- Active, verified KRE admin (always needs a verified session, whatever their user type).
create or replace function app.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins pa
      join public.users u on u.id = pa.user_id
      join public.companies c on c.id = u.company_id
    where pa.user_id = auth.uid() and pa.revoked_at is null
      and c.is_platform and c.suspended_at is null
      and u.status = 'active' and app.access_ok() and app.session_verified())
$$;

-- KRE admin currently holds support access to this company.
create or replace function app.has_support(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_company is not null and app.is_platform_admin() and exists (
    select 1 from public.support_access s
    where s.admin_user_id = auth.uid() and s.company_id = p_company
      and s.ended_at is null and now() >= s.starts_at and now() < s.ends_at)
$$;

-- Users of a suspended company resolve to no company → zero data access.
create or replace function app.current_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.company_id from public.users u join public.companies c on c.id = u.company_id
  where u.id = auth.uid() and u.status = 'active' and c.suspended_at is null and app.access_ok()
$$;

-- Generic permission check: + read-only support branch (view actions only, never writes).
create or replace function app.allows(p_area text, p_action text, p_company uuid, p_crew uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (p_company is not distinct from app.current_company_id()
     and app.current_company_id() is not null
     and case app.permission_scope(p_area, p_action)
           when 'all' then true
           when 'crew' then p_crew is not null and p_crew = app.current_crew_id()
           when 'own' then p_owner is not null and p_owner = auth.uid()
           else false
         end)
     or (p_action in ('view', 'view_pending') and app.has_support(p_company))
$$;

-- Hand-written read policies get the same read-only support branch.
drop policy companies_read on public.companies;
create policy companies_read on public.companies for select to authenticated
  using ((id = app.current_company_id() and deleted_at is null) or app.has_support(id));
drop policy sites_read on public.sites;
create policy sites_read on public.sites for select to authenticated
  using (company_id = app.current_company_id() or app.has_support(company_id));
drop policy crews_read on public.crews;
create policy crews_read on public.crews for select to authenticated
  using (company_id = app.current_company_id() or app.has_support(company_id));
drop policy owner_entities_read on public.owner_entities;
create policy owner_entities_read on public.owner_entities for select to authenticated
  using (company_id = app.current_company_id() or app.has_support(company_id));
drop policy user_flags_read on public.user_flags;
create policy user_flags_read on public.user_flags for select to authenticated
  using (company_id = app.current_company_id() or app.has_support(company_id));
drop policy temp_access_read on public.temp_access;
create policy temp_access_read on public.temp_access for select to authenticated
  using (company_id = app.current_company_id() or app.has_support(company_id));
drop policy users_read_company on public.users;
create policy users_read_company on public.users for select to authenticated
  using ((company_id = app.current_company_id()
          and (status = 'active' or app.can('users', 'view') or app.can('users', 'view_pending')))
         or app.has_support(company_id));

-- Sign-up links of suspended companies are dead.
create or replace function public.signup_company(p_code text)
returns table (name text) language sql stable security definer set search_path = '' as $$
  select c.name from public.companies c
  where c.signup_code = p_code and c.signup_enabled and c.deleted_at is null and c.suspended_at is null
$$;

-- New auth user from a sign-up link → PENDING, or an active Director if a KRE admin invited this email.
create or replace function app.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := new.raw_user_meta_data->>'company_code';
  v_company uuid;
  v_invite public.director_invites;
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'New user');
begin
  if v_code is null then
    return new; -- created by an admin/system path that makes its own profile
  end if;
  select id into v_company from public.companies
   where signup_code = v_code and signup_enabled and deleted_at is null and suspended_at is null;
  if v_company is null then
    raise exception 'Sign-up link is not valid';
  end if;
  select * into v_invite from public.director_invites i
   where i.company_id = v_company and new.email is not null and lower(i.email) = lower(new.email)
     and i.accepted_at is null and i.revoked_at is null
   order by i.created_at desc limit 1;
  if v_invite.id is not null then
    -- Unconfirmed accounts can't sign in, so this only takes effect once the code sent to the invited email is entered.
    insert into public.users (id, company_id, name, email, mobile, status, user_type, approved_by, approved_at)
    values (new.id, v_company, v_name, new.email, new.phone, 'active', 'director', v_invite.invited_by, now());
    update public.director_invites set accepted_at = now(), accepted_user_id = new.id where id = v_invite.id;
    insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
    values (v_company, new.id, 'invite_accepted', 'user', new.id::text,
            jsonb_build_object('name', v_name, 'email', new.email, 'user_type', 'director', 'invite_id', v_invite.id));
    return new;
  end if;
  insert into public.users (id, company_id, name, email, mobile, status)
  values (new.id, v_company, v_name, new.email, new.phone, 'pending');
  insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
  values (v_company, new.id, 'sign_up', 'user', new.id::text,
          jsonb_build_object('name', new.raw_user_meta_data->>'name', 'email', new.email, 'mobile', new.phone));
  return new;
end $$;

-- Audit viewer label for an actor: their name, or "KRE support (name)" for a KRE admin.
create or replace function public.audit_actor_name(p_actor uuid, p_company uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
           when u.company_id = p_company then u.name
           when c.is_platform then 'KRE support (' || u.name || ')'
         end
  from public.users u join public.companies c on c.id = u.company_id
  where u.id = p_actor
    and (p_company = app.current_company_id() or app.has_support(p_company) or app.is_platform_admin())
$$;

-- ── KRE admin functions (all re-check app.is_platform_admin) ──────────────────────────────

create or replace function app.require_platform_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_platform_admin() then raise exception 'Not permitted'; end if;
end $$;

create or replace function app.client_company(p_company uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.companies where id = p_company and not is_platform and deleted_at is null) then
    raise exception 'No such company';
  end if;
  return p_company;
end $$;

create or replace function public.kre_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select app.is_platform_admin() $$;

create or replace function public.kre_companies()
returns table (id uuid, name text, created_at timestamptz, setup_completed_at timestamptz, suspended_at timestamptz,
               active_users bigint, pending_users bigint, invite_email text, invite_accepted boolean,
               support_ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_platform_admin();
  return query
  select c.id, c.name, c.created_at, c.setup_completed_at, c.suspended_at,
         (select count(*) from public.users u where u.company_id = c.id and u.status = 'active'),
         (select count(*) from public.users u where u.company_id = c.id and u.status = 'pending'),
         i.email, i.accepted_at is not null,
         (select max(s.ends_at) from public.support_access s
           where s.company_id = c.id and s.admin_user_id = auth.uid() and s.ended_at is null and now() < s.ends_at)
  from public.companies c
  left join lateral (select d.email, d.accepted_at from public.director_invites d
                      where d.company_id = c.id and d.revoked_at is null order by d.created_at desc limit 1) i on true
  where not c.is_platform and c.deleted_at is null
  order by c.name;
end $$;

create or replace function public.kre_company_users(p_company uuid)
returns table (id uuid, name text, email text, mobile text, user_type public.user_type,
               status public.user_status, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_platform_admin();
  perform app.client_company(p_company);
  return query select u.id, u.name, u.email, u.mobile, u.user_type, u.status, u.created_at
    from public.users u where u.company_id = p_company order by u.status, u.name;
end $$;

create or replace function public.kre_signup_code(p_company uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_code text;
begin
  perform app.require_platform_admin();
  select signup_code into v_code from public.companies where id = app.client_company(p_company);
  return v_code;
end $$;

create or replace function public.kre_invite_director(p_company uuid, p_name text, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform app.require_platform_admin();
  perform app.client_company(p_company);
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter the Director''s name'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email'; end if;
  if exists (select 1 from public.users where company_id = p_company and user_type = 'director' and status = 'active') then
    raise exception 'This company already has a Director';
  end if;
  update public.director_invites set revoked_at = now()
   where company_id = p_company and accepted_at is null and revoked_at is null;
  insert into public.director_invites (company_id, name, email, invited_by)
  values (p_company, trim(p_name), lower(trim(p_email)), auth.uid()) returning id into v_id;
  -- A disabled sign-up link would block the invite.
  update public.companies set signup_enabled = true where id = p_company and not signup_enabled;
  perform app.write_audit(p_company, 'invite', 'director_invite', v_id::text, null,
    jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email))));
  return v_id;
end $$;

create or replace function public.kre_create_company(p_name text, p_director_name text, p_director_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_platform uuid;
begin
  perform app.require_platform_admin();
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter the company name'; end if;
  if exists (select 1 from public.companies where lower(name) = lower(trim(p_name)) and deleted_at is null) then
    raise exception 'A company with that name already exists';
  end if;
  select id into v_platform from public.companies where is_platform;
  insert into public.companies (name) values (trim(p_name)) returning id into v_company;
  -- Same permission rows as every company (generated from src/lib/permissions/map.ts).
  insert into public.user_type_permissions (company_id, user_type, area, action, scope, required_flag)
  select v_company, user_type, area, action, scope, required_flag
    from public.user_type_permissions where company_id = v_platform;
  perform app.write_audit(v_company, 'create', 'company', v_company::text, null,
    jsonb_build_object('name', trim(p_name), 'created_by', 'KRE admin'));
  perform public.kre_invite_director(v_company, p_director_name, p_director_email);
  return v_company;
end $$;

create or replace function public.kre_set_suspended(p_company uuid, p_suspended boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.require_platform_admin();
  perform app.client_company(p_company);
  if p_suspended and coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  update public.companies set suspended_at = case when p_suspended then now() end where id = p_company;
  perform app.write_audit(p_company, case when p_suspended then 'suspend' else 'reactivate' end, 'company',
    p_company::text, null, jsonb_build_object('reason', nullif(trim(p_reason), '')));
end $$;

create or replace function public.kre_start_support(p_company uuid, p_reason text, p_hours integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_ends timestamptz := now() + make_interval(hours => p_hours);
begin
  perform app.require_platform_admin();
  perform app.client_company(p_company);
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  if p_hours is null or p_hours < 1 or p_hours > 168 then raise exception 'Support access is 1 hour to 7 days'; end if;
  update public.support_access set ended_at = now(), ended_by = auth.uid()
   where company_id = p_company and admin_user_id = auth.uid() and ended_at is null and now() < ends_at;
  insert into public.support_access (company_id, admin_user_id, reason, ends_at)
  values (p_company, auth.uid(), trim(p_reason), v_ends) returning id into v_id;
  perform app.write_audit(p_company, 'support_access_start', 'support_access', v_id::text, null,
    jsonb_build_object('reason', trim(p_reason), 'ends_at', v_ends, 'read_only', true));
  return v_id;
end $$;

create or replace function public.kre_invite_details(p_company uuid)
returns table (id uuid, name text, email text, created_at timestamptz, accepted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_platform_admin();
  return query select d.id, d.name, d.email, d.created_at, d.accepted_at from public.director_invites d
    where d.company_id = app.client_company(p_company) and d.revoked_at is null order by d.created_at desc limit 1;
end $$;

-- My active support access to a client (KRE admin side).
create or replace function public.kre_my_support(p_company uuid)
returns table (id uuid, reason text, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_platform_admin();
  return query select s.id, s.reason, s.starts_at, s.ends_at from public.support_access s
    where s.company_id = p_company and s.admin_user_id = auth.uid() and s.ended_at is null and now() < s.ends_at
    order by s.ends_at desc limit 1;
end $$;

-- Ended by the KRE admin who holds it, or by the client's Director (settings.edit).
create or replace function public.end_support_access(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.support_access;
begin
  select * into v from public.support_access where id = p_id and ended_at is null and now() < ends_at;
  if v.id is null then raise exception 'No active support access'; end if;
  if not ((app.is_platform_admin() and v.admin_user_id = auth.uid())
          or app.allows('settings', 'edit', v.company_id, null, null)) then
    raise exception 'Not permitted';
  end if;
  update public.support_access set ended_at = now(), ended_by = auth.uid() where id = p_id;
  perform app.write_audit(v.company_id, 'support_access_end', 'support_access', p_id::text, null, null);
end $$;

-- Client side: active support access to my company (shown in Setup → Company).
create or replace function public.company_support_access()
returns table (id uuid, admin_name text, reason text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, u.name, s.reason, s.starts_at, s.ends_at
  from public.support_access s join public.users u on u.id = s.admin_user_id
  where s.company_id = app.current_company_id() and app.can('settings', 'view')
    and s.ended_at is null and now() < s.ends_at
  order by s.ends_at
$$;

-- Am I in a suspended company? (drives the "account suspended" screen)
create or replace function public.my_company_suspended() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.suspended_at is not null from public.users u join public.companies c on c.id = u.company_id
                   where u.id = auth.uid()), false)
$$;

revoke all on function app.is_platform_admin(), app.has_support(uuid), app.require_platform_admin(), app.client_company(uuid) from public, anon;
grant execute on function app.is_platform_admin(), app.has_support(uuid), app.require_platform_admin(), app.client_company(uuid) to authenticated, service_role;
revoke all on function public.audit_actor_name(uuid, uuid), public.kre_is_admin(), public.kre_companies(), public.kre_company_users(uuid),
  public.kre_signup_code(uuid), public.kre_invite_details(uuid), public.kre_my_support(uuid), public.kre_invite_director(uuid, text, text), public.kre_create_company(text, text, text),
  public.kre_set_suspended(uuid, boolean, text), public.kre_start_support(uuid, text, integer), public.end_support_access(uuid),
  public.company_support_access(), public.my_company_suspended() from public, anon;
grant execute on function public.audit_actor_name(uuid, uuid), public.kre_is_admin(), public.kre_companies(), public.kre_company_users(uuid),
  public.kre_signup_code(uuid), public.kre_invite_details(uuid), public.kre_my_support(uuid), public.kre_invite_director(uuid, text, text), public.kre_create_company(text, text, text),
  public.kre_set_suspended(uuid, boolean, text), public.kre_start_support(uuid, text, integer), public.end_support_access(uuid),
  public.company_support_access(), public.my_company_suspended() to authenticated;
