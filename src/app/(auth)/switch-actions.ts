"use server";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { adminDb } from "@db/client";
import { users } from "@db/schema";
import { lockDevice, makeShared, registerDevice, sharedDevice, stopShared, touchUnlock, currentDevice } from "@/lib/auth/device";
import { PIN, SHARED_DEVICE_TYPES } from "@/lib/auth/policy";
import { requestMeta, requireActive } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { can } from "@/lib/permissions/check";

type Result = { ok: true } | { ok: false; error: string };

export async function sharedDeviceUsers(companyId: string) {
  return adminDb
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.companyId, companyId),
        eq(users.status, "active"),
        inArray(users.userType, [...SHARED_DEVICE_TYPES]),
        isNotNull(users.pinHash),
        isNotNull(users.email),
      ),
    )
    .orderBy(users.name);
}

/** Switch the shared tablet to another person, proven by their personal PIN. */
export async function switchUserAction(raw: unknown): Promise<Result> {
  const { userId, pin } = z.object({ userId: z.uuid(), pin: z.string().max(12) }).parse(raw);
  const shared = await sharedDevice();
  if (!shared) return { ok: false, error: "This isn't a shared tablet" };
  const eligible = await sharedDeviceUsers(shared.companyId);
  if (!eligible.some((u) => u.id === userId)) return { ok: false, error: "Not available on this tablet" };

  const r = await adminDb.execute(sql`
    update public.users set
      failed_pin_attempts = case when pin_hash = extensions.crypt(${pin}, pin_hash) then 0 else failed_pin_attempts + 1 end
    where id = ${userId} returning failed_pin_attempts = 0 as ok, failed_pin_attempts as fails, email`);
  const row = (r as unknown as { ok: boolean; fails: number; email: string }[])[0];
  const audit = (action: string) =>
    adminDb.execute(sql`insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, device, after)
      values (${shared.companyId}, ${userId}, ${action}, 'user', ${userId}, ${shared.label},
              ${JSON.stringify({ shared_device: shared.id })}::jsonb)`);
  if (!row?.ok) {
    await audit("switch_failed");
    if (row && row.fails >= PIN.maxFailures) {
      await adminDb.update(users).set({ pinHash: null, failedPinAttempts: 0 }).where(eq(users.id, userId));
      return { ok: false, error: "Too many wrong PINs. Sign in with your password to set a new PIN." };
    }
    return { ok: false, error: `Wrong PIN. ${PIN.maxFailures - (row?.fails ?? 0)} tries left.` };
  }

  // Mint a session for that person without emailing anything.
  const link = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email: row.email });
  if (link.error || !link.data.properties?.hashed_token) return { ok: false, error: "Try again" };
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "local" });
  const v = await supabase.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
  if (v.error || !v.data.session) return { ok: false, error: "Try again" };
  const meta = await requestMeta();
  const device = await registerDevice({ userId, companyId: shared.companyId, label: meta.device, trusted: false });
  await touchUnlock(device.id, true, true);
  await audit("switch_user");
  return { ok: true };
}

/** "Done" on a shared tablet: lock and go back to the user list. */
export async function leaveSharedAction() {
  const me = await requireActive();
  const device = await currentDevice(me.id);
  if (device) await lockDevice(device.id);
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "local" });
}

export async function setSharedTabletAction(raw: unknown): Promise<Result> {
  const { shared, label } = z.object({ shared: z.boolean(), label: z.string().trim().min(2).max(60) }).parse(raw);
  const me = await requireActive();
  if (!(me.userType === "director" || can(me.actor, "work_orders", "assign"))) return { ok: false, error: "Not permitted" };
  if (shared) await makeShared({ companyId: me.companyId, userId: me.id, label });
  else await stopShared();
  await adminDb.execute(sql`insert into public.audit_log (company_id, actor_user_id, action, entity, after)
    values (${me.companyId}, ${me.id}, ${shared ? "shared_device_on" : "shared_device_off"}, 'device', ${JSON.stringify({ label })}::jsonb)`);
  return { ok: true };
}
