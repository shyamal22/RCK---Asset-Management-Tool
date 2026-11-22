"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";
import { dbMessage } from "@/lib/db-message";
import { createAssetSchema, readingInput, updateAssetSchema } from "@/lib/assets/schema";
import { PHOTO_BUCKET } from "@/lib/assets/queries";
import { TRACKING_UNITS } from "@/lib/assets/labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };
const invalid = (e: z.ZodError): { ok: false; error: string; field?: string } => ({
  ok: false,
  error: e.issues[0]?.message ?? "Check the details",
  field: e.issues[0]?.path[0]?.toString(),
});

export async function createAssetAction(raw: unknown): Promise<Result<{ id: string }>> {
  const p = createAssetSchema.safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  try {
    const [{ id }] = (await actAs("assets", "create", (tx) =>
      tx.execute(sql`select public.create_asset(${d.code}, ${d.name}, ${d.assetTypeId}, ${d.make}, ${d.model}, ${d.year},
        ${d.trackingUnit}, ${d.reading ?? null}, ${d.siteId ?? null}, ${d.crewId ?? null}, ${d.ownerEntityId ?? null},
        ${d.rego ?? null}, ${d.vinSerial ?? null}, ${d.notes ?? null}) as id`),
    )) as unknown as { id: string }[];
    revalidatePath("/assets");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: dbMessage(e, "Couldn't add the asset. Check the details.") };
  }
}

export async function updateAssetAction(raw: unknown): Promise<Result> {
  const p = updateAssetSchema.safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  try {
    const rows = (await actAs("assets", "edit", (tx) =>
      tx.execute(sql`update public.assets set code = ${d.code}, name = ${d.name}, asset_type_id = ${d.assetTypeId},
        make = ${d.make}, model = ${d.model}, year = ${d.year}, status = ${d.status}, site_id = ${d.siteId ?? null},
        crew_id = ${d.crewId ?? null}, owner_entity_id = ${d.ownerEntityId ?? null}, rego = ${d.rego ?? null},
        vin_serial = ${d.vinSerial ?? null}, notes = ${d.notes ?? null}
        where id = ${d.id} and deleted_at is null returning id`),
    )) as unknown as unknown[];
    if (!rows.length) return { ok: false, error: "Not permitted" };
  } catch (e) {
    return { ok: false, error: dbMessage(e, "Couldn't save. Check the details.") };
  }
  revalidatePath(`/assets/${d.id}`);
  revalidatePath("/assets");
  return { ok: true };
}

export async function nextCodeAction(typeId: string): Promise<string | null> {
  if (!z.uuid().safeParse(typeId).success) return null;
  const [r] = (await actAs("assets", "create", (tx) => tx.execute(sql`select public.next_asset_code(${typeId}) as code`))) as unknown as {
    code: string | null;
  }[];
  return r?.code ?? null;
}

/** Photo arrives already resized on the phone. Stored privately; the asset row points at it. */
export async function uploadPhotoAction(form: FormData): Promise<Result> {
  const assetId = String(form.get("assetId") ?? "");
  const file = form.get("photo");
  if (!z.uuid().safeParse(assetId).success || !(file instanceof File)) return { ok: false, error: "Choose a photo" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, error: "Use a JPG, PNG or WebP photo" };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "That photo is too big" };
  return actAs("assets", "edit", async (tx, me) => {
    // RLS check first: can this person edit this asset?
    const [a] = (await tx.execute(sql`select id, photo_path from public.assets where id = ${assetId} and deleted_at is null`)) as unknown as {
      id: string;
      photo_path: string | null;
    }[];
    if (!a) return { ok: false, error: "Not permitted" } as const;
    const path = `${me.companyId}/${assetId}/${randomUUID()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
    const storage = supabaseAdmin().storage.from(PHOTO_BUCKET);
    const up = await storage.upload(path, file, { contentType: file.type });
    if (up.error) return { ok: false, error: "Upload failed. Try again." } as const;
    const rows = (await tx.execute(sql`update public.assets set photo_path = ${path} where id = ${assetId} returning id`)) as unknown as unknown[];
    if (!rows.length) {
      await storage.remove([path]);
      return { ok: false, error: "Not permitted" } as const;
    }
    if (a.photo_path) await storage.remove([a.photo_path]);
    revalidatePath(`/assets/${assetId}`);
    revalidatePath(`/setup/assets/${assetId}`);
    return { ok: true } as const;
  });
}

export async function changeUnitAction(raw: unknown): Promise<Result> {
  const p = z
    .object({ assetId: z.uuid(), unit: z.enum(TRACKING_UNITS), reading: readingInput, reason: z.string().trim().min(3, "Give a reason").max(300) })
    .safeParse(raw);
  if (!p.success) return invalid(p.error);
  if (p.data.reading === undefined) return { ok: false, error: "Enter the current reading" };
  try {
    await actAs("asset_tracking_unit", "edit", (tx) =>
      tx.execute(sql`select public.change_tracking_unit(${p.data.assetId}, ${p.data.unit}, ${p.data.reading}, ${p.data.reason})`),
    );
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/assets/${p.data.assetId}`);
  revalidatePath(`/setup/assets/${p.data.assetId}`);
  return { ok: true };
}

export async function archiveAssetAction(raw: unknown): Promise<Result> {
  const p = z.object({ assetId: z.uuid(), reason: z.string().trim().min(3, "Give a reason").max(300) }).safeParse(raw);
  if (!p.success) return invalid(p.error);
  try {
    await actAs("assets", "delete", (tx) => tx.execute(sql`select public.archive_asset(${p.data.assetId}, ${p.data.reason})`));
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath("/assets");
  redirect("/setup/assets?archived=1");
}
