-- User admin goes through these functions only (permission re-checked, audited, guard rails).
revoke update on public.users from authenticated;
drop policy if exists users_update on public.users;

create or replace function app.user_snapshot(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(u) - 'pin_hash' - 'failed_pin_attempts' - 'locked_until')
         || jsonb_build_object('workshop_lead', exists (select 1 from public.user_flags f
              where f.user_id = u.id and f.flag = 'workshop_lead' and f.revoked_at is null))
  from public.users u where u.id = p_user
$$;

create or replace function public.update_user_access(
  p_user uuid, p_type public.user_type, p_crew uuid, p_workshop_lead boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_before jsonb;
begin
  if not app.can('users', 'edit') then raise exception 'Not permitted'; end if;
  if p_user = auth.uid() then raise exception 'You can''t change your own access'; end if;
  if not exists (select 1 from public.users where id = p_user and company_id = v_company and status = 'active') then
    raise exception 'No such user';
  end if;
  if p_crew is not null and not exists (select 1 from public.crews where id = p_crew and company_id = v_company) then
    raise exception 'Unknown crew';
  end if;
  v_before := app.user_snapshot(p_user);
  update public.users set user_type = p_type, crew_id = p_crew where id = p_user;
  if p_workshop_lead and p_type = 'workshop' then
    insert into public.user_flags (company_id, user_id, flag, granted_by)
    select v_company, p_user, 'workshop_lead', auth.uid()
    where not exists (select 1 from public.user_flags where user_id = p_user and flag = 'workshop_lead' and revoked_at is null);
  else
    update public.user_flags set revoked_at = now()
     where user_id = p_user and flag = 'workshop_lead' and revoked_at is null;
  end if;
  perform app.write_audit(v_company, 'update', 'user', p_user::text, v_before, app.user_snapshot(p_user));
end $$;

create or replace function public.grant_acting_access(
  p_user uuid, p_type public.user_type, p_ends_at timestamptz, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_id uuid;
begin
  if not app.can('users', 'edit') then raise exception 'Not permitted'; end if;
  if p_user = auth.uid() then raise exception 'You can''t change your own access'; end if;
  if p_ends_at <= now() then raise exception 'End date must be in the future'; end if;
  if p_ends_at > now() + interval '90 days' then raise exception 'Acting access is limited to 90 days'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if not exists (select 1 from public.users where id = p_user and company_id = v_company and status = 'active') then
    raise exception 'No such user';
  end if;
  insert into public.temp_access (company_id, user_id, user_type, reason, ends_at, granted_by)
  values (v_company, p_user, p_type, trim(p_reason), p_ends_at, auth.uid()) returning id into v_id;
  perform app.write_audit(v_company, 'grant_acting', 'user', p_user::text, null,
    jsonb_build_object('user_type', p_type, 'ends_at', p_ends_at, 'reason', p_reason));
  return v_id;
end $$;

create or replace function public.revoke_acting_access(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_user uuid;
begin
  if not app.can('users', 'edit') then raise exception 'Not permitted'; end if;
  update public.temp_access set revoked_at = now()
   where id = p_id and company_id = v_company and revoked_at is null returning user_id into v_user;
  if v_user is null then raise exception 'Not found'; end if;
  perform app.write_audit(v_company, 'revoke_acting', 'user', v_user::text, null, jsonb_build_object('temp_access_id', p_id));
end $$;

-- Deactivate (never delete): no data access at once, signed out everywhere, can't sign in.
create or replace function public.set_user_active(p_user uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_before jsonb;
begin
  if not app.can('users', 'deactivate') then raise exception 'Not permitted'; end if;
  if p_user = auth.uid() then raise exception 'You can''t deactivate yourself'; end if;
  if not exists (select 1 from public.users where id = p_user and company_id = v_company
                 and status in ('active', 'deactivated')) then
    raise exception 'No such user';
  end if;
  v_before := app.user_snapshot(p_user);
  update public.users set status = case when p_active then 'active'::public.user_status else 'deactivated'::public.user_status end,
         deactivated_at = case when p_active then null else now() end
   where id = p_user;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end where id = p_user;
  if not p_active then
    delete from auth.sessions where user_id = p_user;
    delete from public.verified_sessions where user_id = p_user;
  end if;
  perform app.write_audit(v_company, case when p_active then 'reactivate' else 'deactivate' end, 'user', p_user::text,
    v_before, app.user_snapshot(p_user));
end $$;

revoke all on function app.user_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.update_user_access, public.grant_acting_access, public.revoke_acting_access, public.set_user_active from public, anon;
grant execute on function public.update_user_access, public.grant_acting_access, public.revoke_acting_access, public.set_user_active to authenticated;
