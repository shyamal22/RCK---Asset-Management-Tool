-- Generic row audit trigger. Attach to every domain table:
--   create trigger <t>_audit after insert or update or delete on public.<t>
--     for each row execute function app.audit_row('company_id');
-- (argument = the column holding the company id; 'id' for companies itself)
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_action text := lower(tg_op);
begin
  if tg_op = 'UPDATE' then
    if v_old = v_new then return null; end if;
    if v_old ? 'updated_at' and (v_old - 'updated_at') = (v_new - 'updated_at') then return null; end if;
    if (v_old->>'deleted_at') is null and (v_new->>'deleted_at') is not null then v_action := 'delete'; end if;
    if (v_old->>'deleted_at') is not null and (v_new->>'deleted_at') is null then v_action := 'restore'; end if;
  end if;
  perform app.write_audit(
    (v_row->>tg_argv[0])::uuid, v_action, tg_table_name, v_row->>'id',
    v_old - 'signup_code' - 'pin_hash', v_new - 'signup_code' - 'pin_hash');
  return null;
end $$;
revoke all on function app.audit_row() from public, anon, authenticated;

create trigger companies_audit after insert or update or delete on public.companies
  for each row execute function app.audit_row('id');
create trigger sites_audit after insert or update or delete on public.sites
  for each row execute function app.audit_row('company_id');
create trigger crews_audit after insert or update or delete on public.crews
  for each row execute function app.audit_row('company_id');
create trigger owner_entities_audit after insert or update or delete on public.owner_entities
  for each row execute function app.audit_row('company_id');

-- Exports are audited too (CSV/PDF from any screen).
create or replace function public.log_export(p_what text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if app.current_company_id() is null then raise exception 'Not permitted'; end if;
  perform app.write_audit(app.current_company_id(), 'export', p_what, null, null, p_details);
end $$;
revoke all on function public.log_export(text, jsonb) from public, anon;
grant execute on function public.log_export(text, jsonb) to authenticated;
