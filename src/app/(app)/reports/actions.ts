"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";
import { dbMessage } from "@/lib/db-message";
import { PHOTO_BUCKET } from "@/lib/assets/queries";
import { readingInput } from "@/lib/assets/schema";
import { pgTextArray } from "@/lib/breakdowns/labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const raiseSchema = z.object({
  assetId: z.uuid("Pick the machine"),
  title: z.string().trim().min(3, "Say what's wrong in a few words").max(120),
  details: z.string().trim().min(3, "Add some details").max(2000),
  severity: z.enum(["usable", "unusable"], { error: "Is it still usable?" }),
  reading: readingInput,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Damage report: details + 1–8 photos (shrunk on the phone), uploaded privately, then raised. */
export async function raiseBreakdownAction(form: FormData): Promise<Result<{ id: string }>> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("data") ?? "{}"));
  } catch {
    return { ok: false, error: "Check the details" };
  }
  const p = raiseSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the details" };
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Add at least one photo" };
  if (files.length > 8) return { ok: false, error: "Up to 8 photos" };
  if (files.some((f) => !PHOTO_TYPES.includes(f.type) || f.size > 8 * 1024 * 1024)) return { ok: false, error: "Use JPG, PNG or WebP photos under 8 MB" };
  const d = p.data;
  try {
    return await actAs("defects", "create", async (tx, me) => {
      // The reporter must be able to see the machine (RLS).
      const [a] = (await tx.execute(sql`select id from public.assets where id = ${d.assetId}`)) as unknown as { id: string }[];
      if (!a) return { ok: false as const, error: "Not permitted" };
      const storage = supabaseAdmin().storage.from(PHOTO_BUCKET);
      const paths: string[] = [];
      for (const f of files) {
        const path = `${me.companyId}/breakdowns/${d.assetId}/${randomUUID()}.${f.type.split("/")[1].replace("jpeg", "jpg")}`;
        const up = await storage.upload(path, f, { contentType: f.type });
        if (up.error) {
          if (paths.length) await storage.remove(paths);
          return { ok: false as const, error: "A photo didn't upload. Try again." };
        }
        paths.push(path);
      }
      const [{ id }] = (await tx.execute(sql`select public.raise_breakdown(${d.assetId}, ${d.title}, ${d.details}, ${d.severity},
        ${pgTextArray(paths)}::text[], ${d.reading ?? null}, ${d.lat ?? null}, ${d.lng ?? null}) as id`)) as unknown as { id: string }[];
      revalidatePath("/reports");
      revalidatePath(`/assets/${d.assetId}`);
      return { ok: true as const, id };
    });
  } catch (e) {
    return { ok: false, error: dbMessage(e, "Couldn't send the report. Try again.") };
  }
}

export async function closeBreakdownAction(raw: unknown): Promise<Result> {
  const p = z.object({ id: z.uuid(), status: z.enum(["fixed", "dismissed"]), note: z.string().trim().max(1000) }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the details" };
  try {
    await actAs("defects", "triage", (tx) => tx.execute(sql`select public.close_breakdown(${p.data.id}, ${p.data.status}, ${p.data.note})`));
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/reports/${p.data.id}`);
  revalidatePath("/reports");
  return { ok: true };
}
