-- Generic permission check used by every generated policy (src/lib/permissions/policy-sql.ts).
create or replace function app.allows(p_area text, p_action text, p_company uuid, p_crew uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_company is not distinct from app.current_company_id()
     and app.current_company_id() is not null
     and case app.permission_scope(p_area, p_action)
           when 'all' then true
           when 'crew' then p_crew is not null and p_crew = app.current_crew_id()
           when 'own' then p_owner is not null and p_owner = auth.uid()
           else false
         end
$$;
revoke all on function app.allows(text, text, uuid, uuid, uuid) from public, anon;
grant execute on function app.allows(text, text, uuid, uuid, uuid) to authenticated, service_role;

-- What the signed-in user may do (drives the UI; the server and RLS still enforce).
create or replace function public.my_permissions()
returns table (area text, action text, scope public.permission_scope)
language sql stable security definer set search_path = '' as $$
  select distinct on (p.area, p.action) p.area, p.action, p.scope
  from public.user_type_permissions p
  where p.company_id = app.current_company_id()
    and p.user_type = app.current_user_type()
    and (p.required_flag is null or app.has_flag(p.required_flag))
  order by p.area, p.action, case p.scope when 'all' then 0 when 'crew' then 1 else 2 end
$$;
revoke all on function public.my_permissions() from public, anon;
grant execute on function public.my_permissions() to authenticated;

-- Users: colleagues see active users; pending/rejected only for those allowed.
drop policy users_read_company on public.users;
create policy users_read_company on public.users for select to authenticated
  using (company_id = app.current_company_id()
         and (status = 'active' or app.can('users', 'view') or app.can('users', 'view_pending')));
create policy users_update on public.users for update to authenticated
  using (app.allows('users', 'edit', company_id, null, null))
  with check (app.allows('users', 'edit', company_id, null, null));
revoke update on public.users from authenticated;
grant update (name, email, mobile, user_type, crew_id, site_id, hourly_cost_rate_cents) on public.users to authenticated;

-- Company settings and reference data: settings.edit
create policy companies_update on public.companies for update to authenticated
  using (app.allows('settings', 'edit', id, null, null)) with check (app.allows('settings', 'edit', id, null, null));
create policy sites_write on public.sites for insert to authenticated with check (app.allows('settings', 'edit', company_id, null, null));
create policy sites_update on public.sites for update to authenticated using (app.allows('settings', 'edit', company_id, null, null));
create policy crews_write on public.crews for insert to authenticated with check (app.allows('settings', 'edit', company_id, null, null));
create policy crews_update on public.crews for update to authenticated using (app.allows('settings', 'edit', company_id, null, null));
create policy owner_entities_write on public.owner_entities for insert to authenticated with check (app.allows('settings', 'edit', company_id, null, null));
create policy owner_entities_update on public.owner_entities for update to authenticated using (app.allows('settings', 'edit', company_id, null, null));

-- Flags and acting access: users.edit
create policy user_flags_write on public.user_flags for insert to authenticated with check (app.allows('users', 'edit', company_id, null, null));
create policy user_flags_update on public.user_flags for update to authenticated using (app.allows('users', 'edit', company_id, null, null));
create policy temp_access_write on public.temp_access for insert to authenticated with check (app.allows('users', 'edit', company_id, null, null));
create policy temp_access_update on public.temp_access for update to authenticated using (app.allows('users', 'edit', company_id, null, null));

-- Audit log: Director reads all of their company; Workshop reads own entries.
-- Inserts only via app.write_audit (security definer); no direct writes from the API.
create policy audit_read on public.audit_log for select to authenticated
  using (app.allows('audit_log', 'view', company_id, null, actor_user_id));
revoke insert on public.audit_log from authenticated;

-- Nothing is ever hard-deleted through the API.
revoke delete, truncate on all tables in schema public from authenticated, anon;
