-- Pre-checks (docs/07 §1). Reads follow the map: templates are company-wide (Crew need them to do a
-- check); prechecks/answers follow 'prechecks' view (Crew own, Supervisor crew, Office/Workshop/Director
-- all). Every write goes through a checked, audited function below. Nothing is ever deleted.

alter table public.precheck_templates add constraint precheck_templates_target check (num_nonnulls(asset_type_id, asset_id) = 1);
alter table public.precheck_template_items add constraint precheck_items_question check (btrim(question) <> '');
alter table public.precheck_template_items add constraint precheck_items_problem check (
  (answer_type = 'yes_no' and problem_answer in ('yes', 'no')) or (answer_type <> 'yes_no' and problem_answer is null));
alter table public.prechecks add constraint prechecks_reading check (reading >= 0);

grant select on public.precheck_templates, public.precheck_template_items, public.prechecks, public.precheck_answers to authenticated;
revoke insert, update, delete, truncate on public.precheck_templates, public.precheck_template_items, public.prechecks, public.precheck_answers from authenticated, anon;

alter table public.precheck_templates enable row level security;
alter table public.precheck_template_items enable row level security;
alter table public.prechecks enable row level security;
alter table public.precheck_answers enable row level security;

create policy precheck_templates_select on public.precheck_templates for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
create policy precheck_template_items_select on public.precheck_template_items for select to authenticated using (
  company_id = (select app.current_company_id()) or ((select app.is_platform_admin()) and app.has_support(company_id)));
create policy prechecks_select on public.prechecks for select to authenticated using (
  (company_id = (select app.current_company_id()) and case (select app.permission_scope('prechecks', 'view'))
     when 'all' then true when 'crew' then crew_id = (select app.current_crew_id()) when 'own' then done_by = (select auth.uid()) else false end)
  or ((select app.is_platform_admin()) and app.has_support(company_id)));
create policy precheck_answers_select on public.precheck_answers for select to authenticated using (
  (company_id = (select app.current_company_id()) and case (select app.permission_scope('prechecks', 'view'))
     when 'all' then true when 'crew' then crew_id = (select app.current_crew_id()) when 'own' then done_by = (select auth.uid()) else false end)
  or ((select app.is_platform_admin()) and app.has_support(company_id)));

create trigger precheck_templates_touch before update on public.precheck_templates for each row execute function app.touch_updated_at();
create trigger precheck_answers_touch before update on public.precheck_answers for each row execute function app.touch_updated_at();
create trigger precheck_templates_audit after insert or update on public.precheck_templates for each row execute function app.audit_row('company_id');
create trigger prechecks_audit after insert on public.prechecks for each row execute function app.audit_row('company_id');
create trigger precheck_answers_audit after update on public.precheck_answers for each row execute function app.audit_row('company_id');

-- The template a machine uses right now: its own override if it has one, otherwise its type's.
create or replace function public.precheck_template_for(p_asset uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select t.id from public.precheck_templates t where t.asset_id = a.id and t.is_current and t.deleted_at is null),
    (select t.id from public.precheck_templates t where t.asset_type_id = a.asset_type_id and t.company_id = a.company_id
       and t.is_current and t.deleted_at is null))
  from public.assets a
  where a.id = p_asset and a.deleted_at is null
    and (a.company_id = app.current_company_id() or app.has_support(a.company_id))
$$;

-- Workshop / Director: save a template for a machine type (or one machine). Saving makes a new version;
-- completed pre-checks keep pointing at the version they answered.
-- p_items: [{question, answer_type: condition|yes_no|text, problem_answer?: yes|no, photo_required?: bool, help?: text}]
create or replace function public.save_precheck_template(p_asset_type uuid, p_asset uuid, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := app.current_company_id(); v_old public.precheck_templates; v_id uuid; v_item jsonb; v_pos int := 0;
begin
  if v_company is null or not app.can('precheck_templates', 'edit') then raise exception 'Not permitted'; end if;
  if num_nonnulls(p_asset_type, p_asset) <> 1 then raise exception 'Pick a machine type or a machine'; end if;
  if p_asset_type is not null and not exists (select 1 from public.asset_types where id = p_asset_type and company_id = v_company and deleted_at is null) then
    raise exception 'No such machine type'; end if;
  if p_asset is not null and not exists (select 1 from public.assets where id = p_asset and company_id = v_company and deleted_at is null) then
    raise exception 'No such machine'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one check'; end if;

  select * into v_old from public.precheck_templates t
  where t.company_id = v_company and t.is_current and t.deleted_at is null
    and ((p_asset_type is not null and t.asset_type_id = p_asset_type) or (p_asset is not null and t.asset_id = p_asset))
  for update;
  if v_old.id is not null then update public.precheck_templates set is_current = false where id = v_old.id; end if;

  insert into public.precheck_templates (company_id, asset_type_id, asset_id, version, is_current, created_by)
  values (v_company, p_asset_type, p_asset, coalesce(v_old.version, 0) + 1, true, auth.uid())
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;
    if coalesce(btrim(v_item->>'question'), '') = '' then raise exception 'Check % needs a question', v_pos; end if;
    if coalesce(v_item->>'answer_type', '') not in ('condition', 'yes_no', 'text') then raise exception 'Check % needs an answer type', v_pos; end if;
    if v_item->>'answer_type' = 'yes_no' and coalesce(v_item->>'problem_answer', '') not in ('yes', 'no') then
      raise exception 'Check %: which answer is the problem, Yes or No?', v_pos; end if;
    insert into public.precheck_template_items (company_id, template_id, position, question, answer_type, problem_answer, photo_required, help)
    values (v_company, v_id, v_pos, btrim(v_item->>'question'), (v_item->>'answer_type')::public.precheck_answer_type,
            case when v_item->>'answer_type' = 'yes_no' then v_item->>'problem_answer' end,
            coalesce((v_item->>'photo_required')::boolean, true), nullif(btrim(coalesce(v_item->>'help', '')), ''));
  end loop;
  return v_id;
end $$;

-- Crew / Supervisor: submit a pre-check for a machine in their crew. Idempotent on p_id (made on the
-- phone), so a resend after a dropped reply, or an offline queue replaying, can't record it twice.
-- p_answers: [{item, answer, note?, photo?}] — one per template item.
create or replace function public.submit_precheck(
  p_id uuid, p_asset uuid, p_reading numeric, p_answers jsonb,
  p_lat double precision default null, p_lng double precision default null, p_done_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.assets; v_template uuid; v_by uuid; v_existing uuid; v_done timestamptz; v_worst public.precheck_flag := 'green';
  it public.precheck_template_items; v_ans jsonb; v_value text; v_flag public.precheck_flag; v_photo text; v_n int;
begin
  if p_id is null then raise exception 'Missing pre-check id'; end if;
  select id, done_by into v_existing, v_by from public.prechecks where id = p_id;
  if v_existing is not null then
    if v_by is distinct from auth.uid() then raise exception 'Not permitted'; end if;
    return v_existing; -- already saved: this is a resend
  end if;

  select * into a from public.assets x where x.id = p_asset and x.deleted_at is null;
  if a.id is null or not app.allows('prechecks', 'create', a.company_id, a.crew_id, auth.uid()) then raise exception 'Not permitted'; end if;
  if p_reading is null or p_reading < 0 then raise exception 'Enter the current reading'; end if;
  v_template := public.precheck_template_for(a.id);
  if v_template is null then raise exception 'No pre-check set up for this machine yet'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Answer every check'; end if;

  -- Each template item answered exactly once; nothing extra.
  select count(*) into v_n from public.precheck_template_items i where i.template_id = v_template;
  if jsonb_array_length(p_answers) <> v_n
     or (select count(distinct x->>'item') from jsonb_array_elements(p_answers) x) <> v_n
     or exists (select 1 from jsonb_array_elements(p_answers) x
                where not exists (select 1 from public.precheck_template_items i where i.template_id = v_template and i.id::text = x->>'item')) then
    raise exception 'Answer every check';
  end if;

  v_done := least(coalesce(p_done_at, now()), now());
  if v_done < now() - interval '7 days' then v_done := now(); end if;

  insert into public.prechecks (id, company_id, asset_id, crew_id, template_id, done_by, reading, lat, lng, flag, done_at)
  values (p_id, a.company_id, a.id, a.crew_id, v_template, auth.uid(), p_reading, p_lat, p_lng, 'green', v_done);

  for it in select * from public.precheck_template_items i where i.template_id = v_template order by i.position loop
    select x into v_ans from jsonb_array_elements(p_answers) x where x->>'item' = it.id::text;
    v_value := btrim(coalesce(v_ans->>'answer', ''));
    v_photo := nullif(btrim(coalesce(v_ans->>'photo', '')), '');
    if v_photo is not null and v_photo not like a.company_id::text || '/%' then raise exception 'Bad photo'; end if;
    if it.photo_required and v_photo is null then raise exception 'Add a photo for: %', it.question; end if;
    if it.answer_type = 'condition' then
      if v_value not in ('fine', 'usable', 'broken') then raise exception 'Answer: %', it.question; end if;
      v_flag := case v_value when 'fine' then 'green' when 'usable' then 'yellow' else 'red' end;
    elsif it.answer_type = 'yes_no' then
      if v_value not in ('yes', 'no') then raise exception 'Answer: %', it.question; end if;
      v_flag := case when v_value = it.problem_answer then 'red' else 'green' end;
    else
      if v_value = '' then raise exception 'Answer: %', it.question; end if;
      v_flag := 'green';
    end if;
    if v_flag = 'red' or (v_flag = 'yellow' and v_worst = 'green') then v_worst := v_flag; end if;
    insert into public.precheck_answers (company_id, precheck_id, asset_id, crew_id, done_by, item_id, position, question,
      answer_type, answer, note, photo_path, flag)
    values (a.company_id, p_id, a.id, a.crew_id, auth.uid(), it.id, it.position, it.question,
      it.answer_type, v_value, nullif(btrim(coalesce(v_ans->>'note', '')), ''), v_photo, v_flag);
  end loop;

  update public.prechecks set flag = v_worst where id = p_id;
  perform app.record_reading(a.id, p_reading, 'precheck', 'Pre-check', v_done);
  update public.assets set last_precheck_at = v_done, last_precheck_by = auth.uid()
  where id = a.id and (last_precheck_at is null or last_precheck_at <= v_done);
  return p_id;
end $$;

-- Workshop / Director: dismiss a flagged item with a reason (not a fault, already booked in...).
-- (Creating a work order from it arrives with Milestone 3.)
create or replace function public.dismiss_precheck_item(p_answer uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.precheck_answers;
begin
  select * into r from public.precheck_answers where id = p_answer;
  if r.id is null or not app.allows('defects', 'triage', r.company_id, r.crew_id, r.done_by) then raise exception 'Not permitted'; end if;
  if r.flag = 'green' then raise exception 'Nothing to dismiss'; end if;
  if r.status <> 'open' then raise exception 'Already dealt with'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  update public.precheck_answers set status = 'dismissed', closed_note = btrim(p_reason), closed_by = auth.uid(), closed_at = now()
  where id = p_answer;
end $$;

-- Machine flag (docs/07 "Asset overall flag"): open damage reports AND open yellow/red pre-check items.
-- Red beats yellow. Everyone who can see a machine sees its flag.
create or replace function public.asset_flags(p_assets uuid[])
returns table (asset_id uuid, flag text, open_reports integer)
language sql stable security definer set search_path = '' as $$
  select s.asset_id, case when bool_or(s.red) then 'red' else 'yellow' end, count(*)::int
  from (
    select b.asset_id, b.severity = 'unusable' as red from public.breakdown_reports b
    where b.asset_id = any(p_assets) and b.status = 'open'
      and (b.company_id = app.current_company_id() or app.has_support(b.company_id))
    union all
    select p.asset_id, p.flag = 'red' from public.precheck_answers p
    where p.asset_id = any(p_assets) and p.status = 'open' and p.flag in ('yellow', 'red')
      and (p.company_id = app.current_company_id() or app.has_support(p.company_id))
  ) s
  group by s.asset_id
$$;

revoke all on function public.precheck_template_for(uuid), public.save_precheck_template(uuid, uuid, jsonb),
  public.submit_precheck(uuid, uuid, numeric, jsonb, double precision, double precision, timestamptz),
  public.dismiss_precheck_item(uuid, text) from public, anon;
grant execute on function public.precheck_template_for(uuid), public.save_precheck_template(uuid, uuid, jsonb),
  public.submit_precheck(uuid, uuid, numeric, jsonb, double precision, double precision, timestamptz),
  public.dismiss_precheck_item(uuid, text) to authenticated;
