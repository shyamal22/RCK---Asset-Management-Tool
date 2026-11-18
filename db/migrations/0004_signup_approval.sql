-- Audit writer. Lives in the private `app` schema (not exposed through the Supabase API),
-- so only server code running as the user (asUser) or definer functions can call it.
create or replace function app.write_audit(
  p_company uuid, p_action text, p_entity text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null,
  p_lat double precision default null, p_lng double precision default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_device text := nullif(current_setting('app.device', true), '');
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
begin
  if v_device is null and v_headers is not null then
    v_device := v_headers->>'user-agent';
  end if;
  insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, before, after, device, ip, lat, lng)
  values (p_company, auth.uid(), p_action, p_entity, p_entity_id, p_before, p_after, v_device,
          coalesce(nullif(current_setting('app.ip', true), ''), v_headers->>'x-forwarded-for'), p_lat, p_lng);
end $$;
revoke all on function app.write_audit from public, anon;
grant execute on function app.write_audit to authenticated, service_role;

-- Public: company name for a sign-up link (only if the link is enabled).
create or replace function public.signup_company(p_code text)
returns table (name text) language sql stable security definer set search_path = '' as $$
  select c.name from public.companies c
  where c.signup_code = p_code and c.signup_enabled and c.deleted_at is null
$$;
revoke all on function public.signup_company(text) from public;
grant execute on function public.signup_company(text) to anon, authenticated;

-- New auth user from a sign-up link → PENDING profile in that company. No data access until approved.
create or replace function app.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := new.raw_user_meta_data->>'company_code';
  v_company uuid;
begin
  if v_code is null then
    return new; -- created by an admin/system path that makes its own profile
  end if;
  select id into v_company from public.companies
   where signup_code = v_code and signup_enabled and deleted_at is null;
  if v_company is null then
    raise exception 'Sign-up link is not valid';
  end if;
  insert into public.users (id, company_id, name, email, mobile, status)
  values (new.id, v_company, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'New user'),
          new.email, new.phone, 'pending');
  insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
  values (v_company, new.id, 'sign_up', 'user', new.id::text,
          jsonb_build_object('name', new.raw_user_meta_data->>'name', 'email', new.email, 'mobile', new.phone));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.on_auth_user_created();

-- Approve a pending user: type, crew, Workshop lead flag. Users.approve only.
create or replace function public.approve_user(
  p_user uuid, p_type public.user_type, p_crew uuid default null, p_workshop_lead boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid := app.current_company_id();
  v_before jsonb;
begin
  if not app.can('users', 'approve') then raise exception 'Not permitted'; end if;
  select to_jsonb(u) - 'pin_hash' into v_before from public.users u
   where u.id = p_user and u.company_id = v_company and u.status = 'pending';
  if v_before is null then raise exception 'No pending user'; end if;
  if p_crew is not null and not exists (select 1 from public.crews where id = p_crew and company_id = v_company) then
    raise exception 'Unknown crew';
  end if;
  update public.users set status = 'active', user_type = p_type, crew_id = p_crew,
         approved_by = auth.uid(), approved_at = now()
   where id = p_user;
  if p_workshop_lead then
    insert into public.user_flags (company_id, user_id, flag, granted_by) values (v_company, p_user, 'workshop_lead', auth.uid());
  end if;
  perform app.write_audit(v_company, 'approve', 'user', p_user::text, v_before,
    jsonb_build_object('status', 'active', 'user_type', p_type, 'crew_id', p_crew, 'workshop_lead', p_workshop_lead));
end $$;

create or replace function public.reject_user(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id();
begin
  if not app.can('users', 'approve') then raise exception 'Not permitted'; end if;
  update public.users set status = 'rejected'
   where id = p_user and company_id = v_company and status = 'pending';
  if not found then raise exception 'No pending user'; end if;
  perform app.write_audit(v_company, 'reject', 'user', p_user::text, null, jsonb_build_object('reason', p_reason));
end $$;

-- Sign-up link management (settings.edit = Director).
create or replace function public.set_signup_link(p_enabled boolean, p_regenerate boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_code text;
begin
  if not app.can('settings', 'edit') then raise exception 'Not permitted'; end if;
  update public.companies
     set signup_enabled = p_enabled,
         signup_code = case when p_regenerate then encode(extensions.gen_random_bytes(9), 'hex') else signup_code end
   where id = v_company returning signup_code into v_code;
  perform app.write_audit(v_company, case when p_regenerate then 'regenerate' else 'update' end, 'signup_link',
    v_company::text, null, jsonb_build_object('enabled', p_enabled));
  return v_code;
end $$;

revoke all on function public.approve_user, public.reject_user, public.set_signup_link from public, anon;
grant execute on function public.approve_user, public.reject_user, public.set_signup_link to authenticated;
-- signup_code is only visible to those who may manage it.
revoke select on public.companies from authenticated;
grant select (id, name, nzbn, logo_path, time_zone, currency, signup_enabled, labour_rate_cents,
  approval_limit_cents, setup_completed_at, created_at, updated_at, deleted_at) on public.companies to authenticated;
create or replace function public.my_signup_code() returns text
language sql stable security definer set search_path = '' as $$
  select c.signup_code from public.companies c where c.id = app.current_company_id() and app.can('settings', 'edit')
$$;
revoke all on function public.my_signup_code() from public, anon;
grant execute on function public.my_signup_code() to authenticated;
