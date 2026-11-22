-- Damage reports are sent from yards with weak signal. If the phone loses the reply after the server has
-- saved the report, the crew member taps Send again. The form now sends its own report id (p_id), so a
-- repeat returns the report already saved instead of raising a second one (second red flag, photos, audit).
drop function if exists public.raise_breakdown(uuid, text, text, public.breakdown_severity, text[], numeric, double precision, double precision);

create function public.raise_breakdown(
  p_asset uuid, p_title text, p_details text, p_severity public.breakdown_severity, p_photos text[],
  p_reading numeric default null, p_lat double precision default null, p_lng double precision default null,
  p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); a public.assets; v_id uuid; v_by uuid; p text;
begin
  if v_company is null or not app.can('defects', 'create') then raise exception 'Not permitted'; end if;
  if p_id is not null then
    select id, raised_by into v_id, v_by from public.breakdown_reports where id = p_id;
    if v_id is not null then
      if v_by is distinct from auth.uid() then raise exception 'Not permitted'; end if;
      return v_id; -- already saved: this is a resend
    end if;
  end if;
  select * into a from public.assets x where x.id = p_asset and x.company_id = v_company and x.deleted_at is null;
  if a.id is null then raise exception 'No such asset'; end if;
  if coalesce(btrim(p_title), '') = '' then raise exception 'Say what''s wrong in a few words'; end if;
  if coalesce(btrim(p_details), '') = '' then raise exception 'Add some details'; end if;
  if coalesce(cardinality(p_photos), 0) < 1 then raise exception 'Add at least one photo'; end if;
  foreach p in array p_photos loop
    if p not like v_company::text || '/%' then raise exception 'Bad photo'; end if;
  end loop;
  insert into public.breakdown_reports (id, company_id, asset_id, crew_id, raised_by, title, details, severity, photo_paths, reading, lat, lng)
  values (coalesce(p_id, gen_random_uuid()), v_company, a.id, a.crew_id, auth.uid(), btrim(p_title), btrim(p_details), p_severity, p_photos, p_reading, p_lat, p_lng)
  on conflict (id) do nothing
  returning id into v_id;
  if v_id is null then return p_id; end if; -- two sends at once: the other one saved it
  if p_severity = 'unusable' and a.status <> 'disposed' then
    update public.assets set status = 'unusable' where id = a.id;
  end if;
  if p_reading is not null then
    perform app.record_reading(a.id, p_reading, 'manual', 'Damage report', now());
  end if;
  return v_id;
end $$;

revoke all on function public.raise_breakdown(uuid, text, text, public.breakdown_severity, text[], numeric, double precision, double precision, uuid) from public, anon;
grant execute on function public.raise_breakdown(uuid, text, text, public.breakdown_severity, text[], numeric, double precision, double precision, uuid) to authenticated;
