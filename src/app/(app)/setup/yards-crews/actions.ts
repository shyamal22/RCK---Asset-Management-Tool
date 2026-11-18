"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";

const TABLES = { sites: sql.raw("public.sites"), crews: sql.raw("public.crews"), owner_entities: sql.raw("public.owner_entities") };
const kind = z.enum(["sites", "crews", "owner_entities"]);
const name = z.string().trim().min(2, "At least 2 characters").max(60);
type Result = { ok: true } | { ok: false; error: string };

const done = (): Result => {
  revalidatePath("/setup/yards-crews");
  return { ok: true };
};

export async function addItemAction(raw: unknown): Promise<Result> {
  const p = z.object({ kind, name }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the name" };
  await actAs("settings", "edit", (tx) =>
    tx.execute(sql`insert into ${TABLES[p.data.kind]} (company_id, name) values (app.current_company_id(), ${p.data.name})`),
  );
  return done();
}

export async function renameItemAction(raw: unknown): Promise<Result> {
  const p = z.object({ kind, id: z.uuid(), name }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the name" };
  await actAs("settings", "edit", (tx) =>
    tx.execute(sql`update ${TABLES[p.data.kind]} set name = ${p.data.name} where id = ${p.data.id}`),
  );
  return done();
}

/** Soft delete only. */
export async function archiveItemAction(raw: unknown): Promise<Result> {
  const p = z.object({ kind, id: z.uuid() }).parse(raw);
  await actAs("settings", "edit", (tx) =>
    tx.execute(sql`update ${TABLES[p.kind]} set deleted_at = now() where id = ${p.id} and deleted_at is null`),
  );
  return done();
}
