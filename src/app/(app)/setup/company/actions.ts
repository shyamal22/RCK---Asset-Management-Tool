"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";
import { parseDollars } from "@/lib/money";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  nzbn: z.string().trim().regex(/^(\d{13})?$/, "NZBN is 13 digits").optional().default(""),
  labourRate: z.string().max(20),
  approvalLimit: z.string().max(20),
});

export async function saveCompanyAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the details" };
  let labour: number | null, limit: number | null;
  try {
    labour = parseDollars(p.data.labourRate);
    limit = parseDollars(p.data.approvalLimit);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (limit === null || limit < 0) return { ok: false, error: "Enter an approval limit" };
  await actAs("settings", "edit", (tx) =>
    tx.execute(sql`update public.companies set name = ${p.data.name}, nzbn = ${p.data.nzbn || null},
      labour_rate_cents = ${labour}, approval_limit_cents = ${limit} where id = app.current_company_id()`),
  );
  revalidatePath("/setup/company");
  return { ok: true };
}

/** Director ends a KRE admin's support access to their company (audited by the DB function). */
export async function endSupportAccessAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = z.object({ id: z.uuid() }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Unknown support access" };
  try {
    await actAs("settings", "edit", (tx) => tx.execute(sql`select public.end_support_access(${p.data.id})`));
  } catch {
    return { ok: false, error: "Couldn't end it. Refresh and try again." };
  }
  revalidatePath("/setup/company");
  return { ok: true };
}
