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
