"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";
import { parseDollars } from "@/lib/money";
import { PHOTO_BUCKET } from "@/lib/assets/queries";
import { supabaseAdmin } from "@/lib/supabase/admin";

const phone = (who: string) =>
  z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, `Enter the ${who}'s phone number`);
const schema = z.object({
  name: z.string().trim().min(2, "Enter the company name").max(100),
  nzbn: z.string().trim().regex(/^\d{13}$/, "Enter the 13-digit NZBN"),
  workshopManagerName: z.string().trim().min(2, "Enter the workshop manager's name").max(80),
  workshopManagerPhone: phone("workshop manager"),
  financeManagerName: z.string().trim().min(2, "Enter the finance manager's name").max(80),
  financeManagerPhone: phone("finance manager"),
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
    tx.execute(sql`update public.companies set name = ${p.data.name}, nzbn = ${p.data.nzbn},
      workshop_manager_name = ${p.data.workshopManagerName}, workshop_manager_phone = ${p.data.workshopManagerPhone},
      finance_manager_name = ${p.data.financeManagerName}, finance_manager_phone = ${p.data.financeManagerPhone},
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

/** Company logo for report headers (PNG/JPG/WebP, ≤2 MB; PNG keeps transparency). Director only. */
export async function uploadLogoAction(form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a logo file" };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { ok: false, error: "Use a PNG, JPG or WebP logo" };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Keep the logo under 2 MB" };
  return actAs("settings", "edit", async (tx, me) => {
    const [{ logo_path: old }] = (await tx.execute(sql`select logo_path from public.companies where id = app.current_company_id()`)) as unknown as {
      logo_path: string | null;
    }[];
    const path = `${me.companyId}/company/logo-${randomUUID()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
    const storage = supabaseAdmin().storage.from(PHOTO_BUCKET);
    const up = await storage.upload(path, file, { contentType: file.type });
    if (up.error) return { ok: false, error: "Upload failed. Try again." } as const;
    const rows = (await tx.execute(sql`update public.companies set logo_path = ${path} where id = app.current_company_id() returning id`)) as unknown as unknown[];
    if (!rows.length) {
      await storage.remove([path]);
      return { ok: false, error: "Not permitted" } as const;
    }
    if (old) await storage.remove([old]);
    revalidatePath("/setup/company");
    return { ok: true } as const;
  });
}
