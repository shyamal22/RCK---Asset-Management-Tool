-- Damage / breakdown reports (docs/07 §2). Reads follow the map (defects): Crew own, Supervisor crew,
-- Office/Workshop/Director all. Writes only through the functions below (checked, audited).

alter table public.breakdown_reports add constraint breakdowns_text check (btrim(title) <> '' and btrim(details) <> '');
alter table public.breakdown_reports add constraint breakdowns_photo check (cardinality(photo_paths) >= 1);

grant select on public.breakdown_reports to authenticated;
alter table public.breakdown_reports enable row level security;
create policy breakdown_reports_select on public.breakdown_reports for select to authenticated using (
  (company_id = (select app.current_company_id()) and case (select app.permission_scope('defects', 'view'))
     when 'all' then true when 'crew' then crew_id = (select app.current_crew_id()) when 'own' then raised_by = (select auth.uid()) else false end)
  or ((select app.is_platform_admin()) and app.has_support(company_id)));
revoke insert, update, delete, truncate on public.breakdown_reports from authenticated, anon;

create trigger breakdown_reports_touch before update on public.breakdown_reports for each row execute function app.touch_updated_at();
create trigger breakdown_reports_audit after insert or update on public.breakdown_reports for each row execute function app.audit_row('company_id');

-- Anyone allowed to raise defects (every user type) reports damage on one of their company's machines.
create or replace function public.raise_breakdown(
  p_asset uuid, p_title text, p_details text, p_severity public.breakdown_severity, p_photos text[],
  p_reading numeric default null, p_lat double precision default null, p_lng double precision default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); a public.assets; v_id uuid; p text;
begin
  if v_company is null or not app.can('defects', 'create') then raise exception 'Not permitted'; end if;
  select * into a from public.assets x where x.id = p_asset and x.company_id = v_company and x.deleted_at is null;
  if a.id is null then raise exception 'No such asset'; end if;
  if coalesce(btrim(p_title), '') = '' then raise exception 'Say what''s wrong in a few words'; end if;
  if coalesce(btrim(p_details), '') = '' then raise exception 'Add some details'; end if;
  if coalesce(cardinality(p_photos), 0) < 1 then raise exception 'Add at least one photo'; end if;
  foreach p in array p_photos loop
    if p not like v_company::text || '/%' then raise exception 'Bad photo'; end if;
  end loop;
  insert into public.breakdown_reports (company_id, asset_id, crew_id, raised_by, title, details, severity, photo_paths, reading, lat, lng)
  values (v_company, a.id, a.crew_id, auth.uid(), btrim(p_title), btrim(p_details), p_severity, p_photos, p_reading, p_lat, p_lng)
  returning id into v_id;
  if p_severity = 'unusable' and a.status <> 'disposed' then
    update public.assets set status = 'unusable' where id = a.id;
  end if;
  if p_reading is not null then
    perform app.record_reading(a.id, p_reading, 'manual', 'Damage report', now());
  end if;
  return v_id;
end $$;

-- Workshop / Director: close a report as fixed (what was done) or dismissed (why). When the last
-- open Unusable report on a machine closes and it's still marked Unusable, it goes back to Available.
create or replace function public.close_breakdown(p_id uuid, p_status public.breakdown_status, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.breakdown_reports; v_status public.asset_status;
begin
  select * into r from public.breakdown_reports where id = p_id;
  if r.id is null or not app.allows('defects', 'triage', r.company_id, r.crew_id, r.raised_by) then raise exception 'Not permitted'; end if;
  if r.status <> 'open' then raise exception 'This report is already closed'; end if;
  if p_status = 'open' then raise exception 'Choose fixed or dismissed'; end if;
  if coalesce(btrim(p_note), '') = '' then
    raise exception '%', case when p_status = 'fixed' then 'Say what was done' else 'Give a reason' end;
  end if;
  update public.breakdown_reports set status = p_status, closed_note = btrim(p_note), closed_by = auth.uid(), closed_at = now() where id = p_id;
  if r.severity = 'unusable' and not exists (
      select 1 from public.breakdown_reports where asset_id = r.asset_id and status = 'open' and severity = 'unusable') then
    select status into v_status from public.assets where id = r.asset_id;
    if v_status = 'unusable' then update public.assets set status = 'available' where id = r.asset_id; end if;
  end if;
end $$;

-- Flag per machine from open reports (red beats yellow), for machines the caller's company owns.
-- Everyone who can see a machine sees its flag, even if the report itself is someone else's.
create or replace function public.asset_flags(p_assets uuid[])
returns table (asset_id uuid, flag text, open_reports integer)
language sql stable security definer set search_path = '' as $$
  select b.asset_id, case when bool_or(b.severity = 'unusable') then 'red' else 'yellow' end, count(*)::int
  from public.breakdown_reports b
  where b.asset_id = any(p_assets) and b.status = 'open'
    and (b.company_id = app.current_company_id() or app.has_support(b.company_id))
  group by b.asset_id
$$;

revoke all on function public.raise_breakdown(uuid, text, text, public.breakdown_severity, text[], numeric, double precision, double precision),
  public.close_breakdown(uuid, public.breakdown_status, text), public.asset_flags(uuid[]) from public, anon;
grant execute on function public.raise_breakdown(uuid, text, text, public.breakdown_severity, text[], numeric, double precision, double precision),
  public.close_breakdown(uuid, public.breakdown_status, text), public.asset_flags(uuid[]) to authenticated;
