"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminDb } from "@db/client";
import { actAs } from "@/lib/auth/guard";
import { dbMessage } from "@/lib/db-message";
import { PHOTO_BUCKET } from "@/lib/assets/queries";
import { readingInput } from "@/lib/assets/schema";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const submitSchema = z.object({
  /** Made on the phone when the check starts: a resend can't record it twice. */
  id: z.uuid(),
  assetId: z.uuid(),
  reading: readingInput.refine((v) => v !== undefined, "Enter the current reading"),
  answers: z.array(z.object({ item: z.uuid(), answer: z.string().trim().max(500), note: z.string().trim().max(1000).optional() })).min(1),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  doneAt: z.iso.datetime().optional(),
});

/** Pre-check: answers + one photo per item where taken (form field `photo:<itemId>`). */
export async function submitPrecheckAction(form: FormData): Promise<Result<{ id: string }>> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("data") ?? "{}"));
  } catch {
    return { ok: false, error: "Check the answers" };
  }
  const p = submitSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the answers" };
  const d = p.data;
  const photos = new Map<string, File>();
  for (const [k, v] of form.entries())
    if (k.startsWith("photo:") && v instanceof File && v.size > 0) {
      if (!PHOTO_TYPES.includes(v.type) || v.size > 8 * 1024 * 1024) return { ok: false, error: "Use JPG, PNG or WebP photos under 8 MB" };
      photos.set(k.slice(6), v);
    }
  try {
    return await actAs("prechecks", "create", async (tx, me) => {
      // Resend of a check that already went through (checked across all checks, so another person's id is refused).
      const [done] = (await adminDb.execute(sql`select id, done_by from public.prechecks where id = ${d.id}`)) as unknown as { id: string; done_by: string }[];
      if (done) return done.done_by === me.id ? { ok: true as const, id: done.id } : { ok: false as const, error: "Not permitted" };
      const [a] = (await tx.execute(sql`select id from public.assets where id = ${d.assetId}`)) as unknown as { id: string }[];
      if (!a) return { ok: false as const, error: "Not permitted" };
      const storage = supabaseAdmin().storage.from(PHOTO_BUCKET);
      const paths = new Map<string, string>();
      for (const [item, f] of photos) {
        // Named from the check id (and the sender), so a resend overwrites instead of duplicating.
        const path = `${me.companyId}/prechecks/${d.assetId}/${me.id}-${d.id}-${item}.${f.type.split("/")[1].replace("jpeg", "jpg")}`;
        const up = await storage.upload(path, f, { contentType: f.type, upsert: true });
        if (up.error) return { ok: false as const, error: "A photo didn't upload. Try again." };
        paths.set(item, path);
      }
      const answers = d.answers.map((x) => ({ item: x.item, answer: x.answer, note: x.note ?? null, photo: paths.get(x.item) ?? null }));
      const [{ id }] = (await tx.execute(sql`select public.submit_precheck(${d.id}::uuid, ${d.assetId}::uuid, ${d.reading!}, ${JSON.stringify(answers)}::jsonb,
        ${d.lat ?? null}, ${d.lng ?? null}, ${d.doneAt ?? null}::timestamptz) as id`)) as unknown as { id: string }[];
      revalidatePath("/prechecks");
      revalidatePath(`/assets/${d.assetId}`);
      return { ok: true as const, id };
    });
  } catch (e) {
    return { ok: false, error: dbMessage(e, "Couldn't send the pre-check. Try again.") };
  }
}

const itemSchema = z.object({
  question: z.string().trim().min(1, "Every check needs a question").max(200),
  answer_type: z.enum(["condition", "yes_no", "text"]),
  problem_answer: z.enum(["yes", "no"]).nullable().optional(),
  photo_required: z.boolean(),
  help: z.string().trim().max(300).optional(),
});

export async function saveTemplateAction(raw: unknown): Promise<Result<{ id: string }>> {
  const p = z.object({ typeId: z.uuid(), items: z.array(itemSchema).min(1, "Add at least one check").max(60) }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the template" };
  try {
    const id = await actAs("precheck_templates", "edit", async (tx) => {
      const [r] = (await tx.execute(
        sql`select public.save_precheck_template(${p.data.typeId}::uuid, null, ${JSON.stringify(p.data.items)}::jsonb) as id`,
      )) as unknown as { id: string }[];
      return r.id;
    });
    revalidatePath("/prechecks/templates");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: dbMessage(e, "Couldn't save. Try again.") };
  }
}

export async function dismissPrecheckItemAction(raw: unknown): Promise<Result> {
  const p = z.object({ id: z.uuid(), precheckId: z.uuid(), reason: z.string().trim().min(1, "Give a reason").max(500) }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Give a reason" };
  try {
    await actAs("defects", "triage", (tx) => tx.execute(sql`select public.dismiss_precheck_item(${p.data.id}::uuid, ${p.data.reason})`));
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/prechecks/${p.data.precheckId}`);
  revalidatePath("/prechecks");
  return { ok: true };
}
