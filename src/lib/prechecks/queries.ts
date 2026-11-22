import "server-only";
import { sql } from "drizzle-orm";
import type { Tx } from "@db/client";
import type { AnswerType, PrecheckFlag } from "./labels";

const uuidOk = (v?: string | null): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

export type TemplateItem = {
  id: string;
  position: number;
  question: string;
  answer_type: AnswerType;
  problem_answer: "yes" | "no" | null;
  photo_required: boolean;
  help: string | null;
};

/** The questions this machine uses right now (its own override, else its type's), or null. */
export async function templateFor(tx: Tx, assetId: string): Promise<{ id: string; items: TemplateItem[] } | null> {
  if (!uuidOk(assetId)) return null;
  const [{ t }] = (await tx.execute(sql`select public.precheck_template_for(${assetId}::uuid) as t`)) as unknown as { t: string | null }[];
  if (!t) return null;
  const items = (await tx.execute(sql`select id, position, question, answer_type, problem_answer, photo_required, help
    from public.precheck_template_items where template_id = ${t} order by position`)) as unknown as TemplateItem[];
  return { id: t, items };
}

export type PrecheckRow = {
  id: string;
  asset_id: string;
  code: string;
  asset_name: string;
  asset_photo: string | null;
  done_by_name: string | null;
  done_at: string;
  reading: string;
  tracking_unit: "hours" | "km";
  flag: PrecheckFlag;
  open_items: number;
};

const LIST = sql`
  select p.id, p.asset_id, a.code, a.name as asset_name, a.photo_path as asset_photo, u.name as done_by_name, p.done_at,
         p.reading, a.tracking_unit, p.flag,
         (select count(*)::int from public.precheck_answers x where x.precheck_id = p.id and x.flag <> 'green' and x.status = 'open') as open_items
  from public.prechecks p
  join public.assets a on a.id = p.asset_id
  left join public.users u on u.id = p.done_by`;

/** RLS decides which (Crew own, Supervisor crew, others all). Newest first. */
export async function listPrechecks(tx: Tx, f: { asset?: string; limit?: number } = {}): Promise<PrecheckRow[]> {
  const where = uuidOk(f.asset) ? sql`where p.asset_id = ${f.asset}` : sql``;
  return (await tx.execute(sql`${LIST} ${where} order by p.done_at desc limit ${f.limit ?? 100}`)) as unknown as PrecheckRow[];
}

export type AnswerRow = {
  id: string;
  position: number;
  question: string;
  answer_type: AnswerType;
  answer: string;
  note: string | null;
  photo_path: string | null;
  flag: PrecheckFlag;
  status: "open" | "dismissed" | "resolved";
  closed_note: string | null;
  closed_by_name: string | null;
};

export async function getPrecheck(tx: Tx, id: string) {
  if (!uuidOk(id)) return null;
  const [p] = (await tx.execute(sql`${LIST} where p.id = ${id}`)) as unknown as PrecheckRow[];
  if (!p) return null;
  // Problems first (red, then yellow), then the rest in order.
  const answers = (await tx.execute(sql`select x.id, x.position, x.question, x.answer_type, x.answer, x.note, x.photo_path, x.flag, x.status,
      x.closed_note, c.name as closed_by_name
    from public.precheck_answers x left join public.users c on c.id = x.closed_by
    where x.precheck_id = ${id}
    order by case x.flag when 'red' then 0 when 'yellow' then 1 else 2 end, x.position`)) as unknown as AnswerRow[];
  return { ...p, answers };
}

export type TypeTemplate = { type_id: string; type_name: string; machines: number; template_id: string | null; version: number | null; items: number };

/** Every machine type with its current template (if any). */
export async function typeTemplates(tx: Tx): Promise<TypeTemplate[]> {
  return (await tx.execute(sql`
    select t.id as type_id, t.name as type_name,
           (select count(*)::int from public.assets a where a.asset_type_id = t.id and a.deleted_at is null) as machines,
           pt.id as template_id, pt.version,
           coalesce((select count(*)::int from public.precheck_template_items i where i.template_id = pt.id), 0) as items
    from public.asset_types t
    left join public.precheck_templates pt on pt.asset_type_id = t.id and pt.is_current and pt.deleted_at is null
    where t.deleted_at is null
    order by t.sort_order, t.name`)) as unknown as TypeTemplate[];
}

export async function typeTemplate(tx: Tx, typeId: string): Promise<{ type_name: string; items: TemplateItem[]; version: number | null } | null> {
  if (!uuidOk(typeId)) return null;
  const [t] = (await tx.execute(sql`select t.name as type_name, pt.id as template_id, pt.version
    from public.asset_types t
    left join public.precheck_templates pt on pt.asset_type_id = t.id and pt.is_current and pt.deleted_at is null
    where t.id = ${typeId} and t.deleted_at is null`)) as unknown as { type_name: string; template_id: string | null; version: number | null }[];
  if (!t) return null;
  const items = t.template_id
    ? ((await tx.execute(sql`select id, position, question, answer_type, problem_answer, photo_required, help
        from public.precheck_template_items where template_id = ${t.template_id} order by position`)) as unknown as TemplateItem[])
    : [];
  return { type_name: t.type_name, items, version: t.version };
}
