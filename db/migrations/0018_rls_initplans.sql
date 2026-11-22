-- Performance: read policies evaluate the signed-in user's company/scope ONCE per query.
-- `(select f())` becomes an InitPlan; a bare f() in a policy runs for every row (5k audit rows took ~6 s).
-- Same rules as before (see app.allows); src/lib/permissions/policy-sql.ts now generates this form.

-- Generated-style reads
drop policy audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (
  (company_id = (select app.current_company_id()) and case (select app.permission_scope('audit_log', 'view'))
     when 'all' then true when 'own' then actor_user_id = (select auth.uid()) else false end)
  or ((select app.is_platform_admin()) and app.has_support(company_id)));

drop policy assets_select on public.assets;
create policy assets_select on public.assets for select to authenticated using ((
  (company_id = (select app.current_company_id()) and case (select app.permission_scope('assets', 'view'))
     when 'all' then true when 'crew' then crew_id = (select app.current_crew_id()) else false end)
  or ((select app.is_platform_admin()) and app.has_support(company_id))) and deleted_at is null);

drop policy compliance_items_select on public.compliance_items;
create policy compliance_items_select on public.compliance_items for select to authenticated using ((
  (company_id = (select app.current_company_id()) and (select app.permission_scope('docs_compliance', 'view')) = 'all')
  or ((select app.is_platform_admin()) and app.has_support(company_id))) and deleted_at is null);

-- A reading is visible when its asset is (the assets policy applies inside this subquery).
drop policy meter_readings_select on public.meter_readings;
create policy meter_readings_select on public.meter_readings for select to authenticated
  using (exists (select 1 from public.assets a where a.id = asset_id));

-- Company reference data
drop policy companies_read on public.companies;
create policy companies_read on public.companies for select to authenticated using (
  (id = (select app.current_company_id()) and deleted_at is null) or ((select app.is_platform_admin()) and app.has_support(id)));
drop policy sites_read on public.sites;
create policy sites_read on public.sites for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
drop policy crews_read on public.crews;
create policy crews_read on public.crews for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
drop policy owner_entities_read on public.owner_entities;
create policy owner_entities_read on public.owner_entities for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
drop policy user_flags_read on public.user_flags;
create policy user_flags_read on public.user_flags for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
drop policy temp_access_read on public.temp_access;
create policy temp_access_read on public.temp_access for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
drop policy utp_read on public.user_type_permissions;
create policy utp_read on public.user_type_permissions for select to authenticated using (
  company_id = (select app.current_company_id()));
drop policy asset_types_select on public.asset_types;
create policy asset_types_select on public.asset_types for select to authenticated using (
  (company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id))) and deleted_at is null);

-- People
drop policy users_read_self on public.users;
create policy users_read_self on public.users for select to authenticated using (id = (select auth.uid()));
drop policy users_read_company on public.users;
create policy users_read_company on public.users for select to authenticated using (
  (company_id = (select app.current_company_id())
    and (status = 'active' or (select app.can('users', 'view')) or (select app.can('users', 'view_pending'))))
  or ((select app.is_platform_admin()) and app.has_support(company_id)));
drop policy trusted_devices_own on public.trusted_devices;
create policy trusted_devices_own on public.trusted_devices for select to authenticated using (user_id = (select auth.uid()));
drop policy passkeys_own on public.passkeys;
create policy passkeys_own on public.passkeys for select to authenticated using (user_id = (select auth.uid()));

-- Audit log is read newest-first per company.
create index if not exists audit_company_actor_at_idx on public.audit_log (company_id, actor_user_id, at desc);
