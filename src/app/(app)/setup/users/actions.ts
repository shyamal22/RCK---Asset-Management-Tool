"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";
import { USER_TYPES } from "@/lib/permissions/types";

const approveSchema = z.object({
  userId: z.uuid(),
  userType: z.enum(USER_TYPES),
  crewId: z.uuid().nullable(),
  workshopLead: z.boolean(),
});

export async function approveUserAction(raw: unknown) {
  const v = approveSchema.parse(raw);
  await actAs("users", "approve", (tx) =>
    tx.execute(sql`select public.approve_user(${v.userId}, ${v.userType}::public.user_type, ${v.crewId},
      ${v.userType === "workshop" && v.workshopLead})`),
  );
  revalidatePath("/setup/users");
}

const rejectSchema = z.object({ userId: z.uuid(), reason: z.string().trim().min(2).max(200) });

export async function rejectUserAction(raw: unknown) {
  const v = rejectSchema.parse(raw);
  await actAs("users", "approve", (tx) => tx.execute(sql`select public.reject_user(${v.userId}, ${v.reason})`));
  revalidatePath("/setup/users");
}

const accessSchema = z.object({
  userId: z.uuid(),
  userType: z.enum(USER_TYPES),
  crewId: z.uuid().nullable(),
  workshopLead: z.boolean(),
});

type Result = { ok: true } | { ok: false; error: string };
const dbMessage = (e: unknown) => {
  const m = String((e as { cause?: { message?: string } })?.cause?.message ?? (e as Error)?.message ?? "");
  return /own access|yourself|Reason|future|90 days|Unknown crew/.test(m) ? m : "Couldn't save. Try again.";
};

export async function updateAccessAction(raw: unknown): Promise<Result> {
  const v = accessSchema.parse(raw);
  try {
    await actAs("users", "edit", (tx) =>
      tx.execute(sql`select public.update_user_access(${v.userId}, ${v.userType}::public.user_type, ${v.crewId},
        ${v.userType === "workshop" && v.workshopLead})`),
    );
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/setup/users/${v.userId}`);
  return { ok: true };
}


export async function setActiveAction(raw: unknown): Promise<Result> {
  const v = z.object({ userId: z.uuid(), active: z.boolean() }).parse(raw);
  try {
    await actAs("users", "deactivate", (tx) => tx.execute(sql`select public.set_user_active(${v.userId}, ${v.active})`));
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/setup/users/${v.userId}`);
  revalidatePath("/setup/users");
  return { ok: true };
}
