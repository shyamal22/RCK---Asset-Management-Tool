-- Asset register (Milestone 1): grants, RLS, audit, guard rails, default types, readings, unit change.

-- ── Data rules ───────────────────────────────────────────────────────────────────────────
alter table public.assets add constraint assets_code_format check (code = upper(btrim(code)) and code <> '');
alter table public.assets add constraint assets_year_range check (year between 1900 and 2100);
alter table public.assets add constraint assets_required_text check (btrim(name) <> '' and btrim(make) <> '' and btrim(model) <> '');
alter table public.assets add constraint assets_reading_positive check (current_reading is null or current_reading >= 0);
alter table public.meter_readings add constraint meter_readings_positive check (reading >= 0);
alter table public.asset_types add constraint asset_types_name check (btrim(name) <> '');
alter table public.asset_types add constraint asset_types_prefix check (code_prefix is null or code_prefix ~ '^[A-Z0-9]{1,6}$');

-- Codes are stored uppercase and trimmed whatever the client sends.
create or replace function app.normalise_asset() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.code := upper(btrim(new.code));
  new.name := btrim(new.name);
  new.make := btrim(new.make);
  new.model := btrim(new.model);
  new.rego := nullif(upper(regexp_replace(coalesce(new.rego, ''), '\s', '', 'g')), '');
  return new;
end $$;
create trigger assets_normalise before insert or update on public.assets
  for each row execute function app.normalise_asset();

-- The asset's type must belong to the same company (and yard/crew/owner too).
create or replace function app.check_asset_refs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.asset_types t where t.id = new.asset_type_id and t.company_id = new.company_id) then
    raise exception 'Unknown asset type';
  end if;
  if new.site_id is not null and not exists (select 1 from public.sites s where s.id = new.site_id and s.company_id = new.company_id) then
    raise exception 'Unknown yard';
  end if;
  if new.crew_id is not null and not exists (select 1 from public.crews c where c.id = new.crew_id and c.company_id = new.company_id) then
    raise exception 'Unknown crew';
  end if;
  if new.owner_entity_id is not null and not exists (select 1 from public.owner_entities o where o.id = new.owner_entity_id and o.company_id = new.company_id) then
    raise exception 'Unknown owner';
  end if;
  return new;
end $$;
create trigger assets_check_refs before insert or update on public.assets
  for each row execute function app.check_asset_refs();

-- Archiving (soft delete) goes through archive_asset() only; editors can still set status Disposed.
create or replace function app.guard_asset_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.company_id <> old.company_id then raise exception 'Can''t move an asset to another company'; end if;
  return new;
end $$;
create trigger assets_guard_update before update on public.assets
  for each row execute function app.guard_asset_update();

-- ── Grants (CLAUDE.md rule 1) ───────────────────────────────────────────────────────────
grant select, insert, update on public.asset_types to authenticated;
grant select on public.assets to authenticated;
grant insert (company_id, code, name, asset_type_id, make, model, year, tracking_unit, status, site_id, crew_id,
  owner_entity_id, rego, vin_serial, photo_path, notes) on public.assets to authenticated;
-- tracking_unit and readings only change through the functions below.
grant update (code, name, asset_type_id, make, model, year, status, site_id, crew_id, owner_entity_id, rego,
  vin_serial, photo_path, notes) on public.assets to authenticated;
grant select on public.meter_readings to authenticated;
grant select, insert, update on public.compliance_items to authenticated;

-- ── RLS (generated: pnpm db:policy assets assets crew_id "" --soft-delete, etc.) ─────────────
alter table public.assets enable row level security;
create policy assets_select on public.assets for select to authenticated using (app.allows('assets', 'view', company_id, crew_id::uuid, null::uuid) and deleted_at is null);
create policy assets_insert on public.assets for insert to authenticated with check (app.allows('assets', 'create', company_id, crew_id::uuid, null::uuid));
create policy assets_update on public.assets for update to authenticated using (app.allows('assets', 'edit', company_id, crew_id::uuid, null::uuid)) with check (app.allows('assets', 'edit', company_id, crew_id::uuid, null::uuid));
revoke delete, truncate on public.assets from authenticated, anon;

alter table public.compliance_items enable row level security;
create policy compliance_items_select on public.compliance_items for select to authenticated using (app.allows('docs_compliance', 'view', company_id, null::uuid, null::uuid) and deleted_at is null);
create policy compliance_items_insert on public.compliance_items for insert to authenticated with check (app.allows('docs_compliance', 'create', company_id, null::uuid, null::uuid));
create policy compliance_items_update on public.compliance_items for update to authenticated using (app.allows('docs_compliance', 'edit', company_id, null::uuid, null::uuid)) with check (app.allows('docs_compliance', 'edit', company_id, null::uuid, null::uuid));
revoke delete, truncate on public.compliance_items from authenticated, anon;

-- Asset types: everyone in the company (and support) reads; asset editors manage the list.
alter table public.asset_types enable row level security;
create policy asset_types_select on public.asset_types for select to authenticated
  using ((company_id = app.current_company_id() or app.has_support(company_id)) and deleted_at is null);
create policy asset_types_insert on public.asset_types for insert to authenticated
  with check (app.allows('assets', 'edit', company_id, null, null));
create policy asset_types_update on public.asset_types for update to authenticated
  using (app.allows('assets', 'edit', company_id, null, null)) with check (app.allows('assets', 'edit', company_id, null, null));
revoke delete, truncate on public.asset_types from authenticated, anon;

-- Readings: visible to whoever can see the asset; written only through record_meter_reading.
alter table public.meter_readings enable row level security;
create policy meter_readings_select on public.meter_readings for select to authenticated
  using (exists (select 1 from public.assets a where a.id = asset_id
                 and app.allows('assets', 'view', a.company_id, a.crew_id, null)));
revoke insert, update, delete, truncate on public.meter_readings from authenticated, anon;

-- ── Timestamps + audit (rule 4) ────────────────────────────────────────────────────────
create trigger asset_types_touch before update on public.asset_types for each row execute function app.touch_updated_at();
create trigger assets_touch before update on public.assets for each row execute function app.touch_updated_at();
create trigger compliance_items_touch before update on public.compliance_items for each row execute function app.touch_updated_at();
create trigger asset_types_audit after insert or update or delete on public.asset_types for each row execute function app.audit_row('company_id');
create trigger assets_audit after insert or update or delete on public.assets for each row execute function app.audit_row('company_id');
create trigger compliance_items_audit after insert or update or delete on public.compliance_items for each row execute function app.audit_row('company_id');

-- ── Default asset types (RCK's names and code prefixes from their current app) ──────────────
create or replace function app.seed_asset_types(p_company uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.asset_types (company_id, name, default_unit, code_prefix, sort_order)
  select p_company, t.name, t.unit::public.tracking_unit, t.prefix, t.ord
  from (values ('Miller', 'hours', 'MIL', 1), ('Paver', 'hours', 'PAV', 2), ('Roller', 'hours', 'ROL', 3),
               ('Skid steer (bobcat)', 'hours', 'BOB', 4), ('Excavator', 'hours', 'EXC', 5), ('Loader', 'hours', 'LDR', 6),
               ('Truck', 'km', 'TRK', 7), ('Transporter', 'km', 'TPT', 8), ('Trailer', 'km', 'TRL', 9),
               ('Light vehicle', 'km', 'LV', 10), ('Other', null, 'GEN', 11)) as t(name, unit, prefix, ord)
  where not exists (select 1 from public.asset_types x where x.company_id = p_company and x.deleted_at is null)
$$;
create or replace function app.on_company_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.seed_asset_types(new.id);
  return new;
end $$;
create trigger companies_seed_types after insert on public.companies
  for each row execute function app.on_company_created();
select app.seed_asset_types(id) from public.companies;

-- New permission area (map.ts: asset_tracking_unit) for existing companies.
insert into public.user_type_permissions (company_id, user_type, area, action, scope, required_flag)
select c.id, v.user_type::public.user_type, 'asset_tracking_unit', 'edit', 'all', v.flag::public.user_flag
from public.companies c cross join (values ('director', null), ('workshop', 'workshop_lead')) as v(user_type, flag)
on conflict do nothing;

-- ── Meter readings ──────────────────────────────────────────────────────────────────────
-- Records a reading in the asset's unit. Lower than the current reading → stored and flagged,
-- but the asset's current reading is not changed (Workshop checks it: meter swap or typo).
create or replace function app.record_reading(p_asset uuid, p_reading numeric, p_source public.reading_source,
  p_note text, p_read_at timestamptz)
returns table (id uuid, lower_than_previous boolean)
language plpgsql security definer set search_path = '' as $$
declare a public.assets; v_lower boolean; v_id uuid;
begin
  select * into a from public.assets x where x.id = p_asset and x.deleted_at is null;
  if a.id is null then raise exception 'No such asset'; end if;
  if p_reading is null or p_reading < 0 then raise exception 'Enter a reading'; end if;
  v_lower := a.current_reading is not null and p_reading < a.current_reading;
  insert into public.meter_readings (company_id, asset_id, reading, unit, source, read_at, entered_by, lower_than_previous, note)
  values (a.company_id, a.id, p_reading, a.tracking_unit, p_source, coalesce(p_read_at, now()), auth.uid(), v_lower, nullif(btrim(p_note), ''))
  returning meter_readings.id into v_id;
  if not v_lower and (a.current_reading_at is null or coalesce(p_read_at, now()) >= a.current_reading_at) then
    update public.assets set current_reading = p_reading, current_reading_at = coalesce(p_read_at, now()) where assets.id = a.id;
  end if;
  return query select v_id, v_lower;
end $$;
revoke all on function app.record_reading from public, anon, authenticated;

-- Manual reading by Office / Workshop / Director (assets.edit). Pre-checks get their own path in M2.
create or replace function public.record_meter_reading(p_asset uuid, p_reading numeric, p_note text default null)
returns table (id uuid, lower_than_previous boolean)
language plpgsql security definer set search_path = '' as $$
declare a public.assets;
begin
  select * into a from public.assets x where x.id = p_asset and x.deleted_at is null;
  if a.id is null or not app.allows('assets', 'edit', a.company_id, a.crew_id, null) then raise exception 'Not permitted'; end if;
  return query select * from app.record_reading(p_asset, p_reading, 'manual', p_note, now());
end $$;

-- New asset with its first reading, in one go (assets.create).
create or replace function public.create_asset(
  p_code text, p_name text, p_type uuid, p_make text, p_model text, p_year integer,
  p_unit public.tracking_unit, p_reading numeric, p_site uuid default null, p_crew uuid default null,
  p_owner uuid default null, p_rego text default null, p_vin text default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_id uuid;
begin
  if not app.allows('assets', 'create', v_company, p_crew, null) then raise exception 'Not permitted'; end if;
  if exists (select 1 from public.assets where company_id = v_company and code = upper(btrim(p_code)) and deleted_at is null) then
    raise exception 'Code % is already used', upper(btrim(p_code));
  end if;
  insert into public.assets (company_id, code, name, asset_type_id, make, model, year, tracking_unit, site_id, crew_id,
                             owner_entity_id, rego, vin_serial, notes)
  values (v_company, p_code, p_name, p_type, p_make, p_model, p_year, p_unit, p_site, p_crew, p_owner,
          p_rego, nullif(btrim(p_vin), ''), nullif(btrim(p_notes), ''))
  returning id into v_id;
  if p_reading is not null then
    perform app.record_reading(v_id, p_reading, 'manual', 'Reading when added', now());
  end if;
  return v_id;
end $$;

-- Hours ↔ Kilometres after setup: Director or Workshop lead, reason, new current reading (docs/06).
create or replace function public.change_tracking_unit(p_asset uuid, p_unit public.tracking_unit, p_reading numeric, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.assets;
begin
  select * into a from public.assets x where x.id = p_asset and x.deleted_at is null;
  if a.id is null or not app.allows('asset_tracking_unit', 'edit', a.company_id, null, null) then raise exception 'Not permitted'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  if p_unit = a.tracking_unit then raise exception 'It already uses that unit'; end if;
  if p_reading is null or p_reading < 0 then raise exception 'Enter the current reading'; end if;
  update public.assets set tracking_unit = p_unit, current_reading = null, current_reading_at = null where id = a.id;
  perform app.record_reading(a.id, p_reading, 'manual', 'Unit changed: ' || btrim(p_reason), now());
  perform app.write_audit(a.company_id, 'change_tracking_unit', 'assets', a.id::text,
    jsonb_build_object('tracking_unit', a.tracking_unit, 'current_reading', a.current_reading),
    jsonb_build_object('tracking_unit', p_unit, 'current_reading', p_reading, 'reason', btrim(p_reason)));
end $$;

-- Archive (soft delete): Director only (assets.delete), reason required, audited. History is kept.
create or replace function public.archive_asset(p_asset uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.assets;
begin
  select * into a from public.assets x where x.id = p_asset and x.deleted_at is null;
  if a.id is null or not app.allows('assets', 'delete', a.company_id, a.crew_id, null) then raise exception 'Not permitted'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  update public.assets set deleted_at = now() where id = a.id;
  perform app.write_audit(a.company_id, 'archive', 'assets', a.id::text, null, jsonb_build_object('code', a.code, 'reason', btrim(p_reason)));
end $$;

-- Next free code for a type prefix: ROL-07 → ROL-08.
create or replace function public.next_asset_code(p_type uuid) returns text
language sql stable security definer set search_path = '' as $$
  select t.code_prefix || '-' || lpad((coalesce(max((regexp_match(a.code, '^' || t.code_prefix || '-?(\d+)$'))[1]::int), 0) + 1)::text, 2, '0')
  from public.asset_types t
  left join public.assets a on a.company_id = t.company_id and a.deleted_at is null
  where t.id = p_type and t.company_id = app.current_company_id() and t.code_prefix is not null
  group by t.code_prefix
$$;

revoke all on function public.archive_asset(uuid, text), public.record_meter_reading(uuid, numeric, text), public.create_asset(text, text, uuid, text, text, integer, public.tracking_unit, numeric, uuid, uuid, uuid, text, text, text),
  public.change_tracking_unit(uuid, public.tracking_unit, numeric, text), public.next_asset_code(uuid) from public, anon;
grant execute on function public.archive_asset(uuid, text), public.record_meter_reading(uuid, numeric, text), public.create_asset(text, text, uuid, text, text, integer, public.tracking_unit, numeric, uuid, uuid, uuid, text, text, text),
  public.change_tracking_unit(uuid, public.tracking_unit, numeric, text), public.next_asset_code(uuid) to authenticated;
