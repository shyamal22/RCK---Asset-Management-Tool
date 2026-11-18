"use server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { adminDb } from "@db/client";
import { passkeys, users } from "@db/schema";
import { currentDevice, lockDevice, setChallenge, touchUnlock, userPasskeys } from "@/lib/auth/device";
import { PIN, validPin } from "@/lib/auth/policy";
import { getIdentity, requireActive } from "@/lib/auth/session";
import { rp } from "@/lib/auth/webauthn";
import { supabaseServer } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

async function auditSystem(userId: string, action: string, after?: object) {
  await adminDb.execute(sql`insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
    select company_id, id, ${action}, 'user', id::text, ${after ? JSON.stringify(after) : null}::jsonb from public.users where id = ${userId}`);
}

async function lockedContext() {
  const ident = await getIdentity();
  if (!ident) redirect("/sign-in");
  const device = await currentDevice(ident.userId);
  if (!device) redirect("/sign-in");
  return { userId: ident.userId, device };
}

export async function unlockWithPinAction(raw: unknown): Promise<Result> {
  const pin = z.string().max(12).parse(raw);
  const { userId, device } = await lockedContext();
  const r = await adminDb.execute(sql`
    update public.users set
      failed_pin_attempts = case when pin_hash = extensions.crypt(${pin}, pin_hash) then 0 else failed_pin_attempts + 1 end
    where id = ${userId} and pin_hash is not null
    returning failed_pin_attempts = 0 as ok, failed_pin_attempts as fails`);
  const row = (r as unknown as { ok: boolean; fails: number }[])[0];
  if (row?.ok) {
    await touchUnlock(device.id, true);
    await auditSystem(userId, "unlock", { method: "pin" });
    return { ok: true };
  }
  await auditSystem(userId, "unlock_failed", { method: "pin" });
  if (!row || row.fails >= PIN.maxFailures) {
    // Too many wrong PINs: full sign-in needed.
    await adminDb.update(users).set({ failedPinAttempts: 0 }).where(eq(users.id, userId));
    await lockDevice(device.id);
    const supabase = await supabaseServer();
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, error: "signed-out" };
  }
  return { ok: false, error: `Wrong PIN. ${PIN.maxFailures - row.fails} tries left.` };
}

export async function passkeyUnlockOptionsAction() {
  const { userId, device } = await lockedContext();
  const keys = await userPasskeys(userId);
  const { rpID } = await rp();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: keys.map((k) => ({ id: k.credentialId, transports: (k.transports ?? undefined) as never })),
  });
  await setChallenge(device.id, options.challenge);
  return options;
}

export async function passkeyUnlockAction(response: AuthenticationResponseJSON): Promise<Result> {
  const { userId, device } = await lockedContext();
  const [key] = (await userPasskeys(userId)).filter((k) => k.credentialId === response.id);
  if (!key || !device.webauthnChallenge || !device.challengeExpiresAt || device.challengeExpiresAt < new Date()) {
    return { ok: false, error: "Try again" };
  }
  const { origin, rpID } = await rp();
  try {
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: device.webauthnChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: key.credentialId,
        publicKey: Buffer.from(key.publicKey, "base64url"),
        counter: key.counter,
        transports: (key.transports ?? undefined) as never,
      },
    });
    await setChallenge(device.id, null);
    if (!v.verified) return { ok: false, error: "Try again" };
    await adminDb
      .update(passkeys)
      .set({ counter: v.authenticationInfo.newCounter, lastUsedAt: new Date() })
      .where(eq(passkeys.id, key.id));
    await adminDb.update(users).set({ failedPinAttempts: 0 }).where(eq(users.id, userId));
    await touchUnlock(device.id, true);
    await auditSystem(userId, "unlock", { method: "passkey" });
    return { ok: true };
  } catch {
    await setChallenge(device.id, null);
    return { ok: false, error: "Try again" };
  }
}

// ---- My security (signed in and unlocked) ----

export async function setPinAction(raw: unknown): Promise<Result> {
  const pin = z.string().parse(raw);
  if (!validPin(pin)) return { ok: false, error: `Use ${PIN.min}–${PIN.max} digits, not 1111 or 1234` };
  const me = await requireActive();
  await adminDb.execute(sql`update public.users set pin_hash = extensions.crypt(${pin}, extensions.gen_salt('bf', 8)),
    failed_pin_attempts = 0 where id = ${me.id}`);
  await auditSystem(me.id, "pin_set");
  return { ok: true };
}

export async function passkeyRegisterOptionsAction() {
  const me = await requireActive();
  const device = await currentDevice(me.id);
  if (!device) throw new Error("No device");
  const keys = await userPasskeys(me.id);
  const { rpID, rpName } = await rp();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: me.email ?? me.mobile ?? me.name,
    userDisplayName: me.name,
    attestationType: "none",
    excludeCredentials: keys.map((k) => ({ id: k.credentialId })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });
  await setChallenge(device.id, options.challenge);
  return options;
}

export async function passkeyRegisterAction(response: RegistrationResponseJSON): Promise<Result> {
  const me = await requireActive();
  const device = await currentDevice(me.id);
  if (!device?.webauthnChallenge || !device.challengeExpiresAt || device.challengeExpiresAt < new Date()) {
    return { ok: false, error: "Try again" };
  }
  const { origin, rpID } = await rp();
  try {
    const v = await verifyRegistrationResponse({
      response,
      expectedChallenge: device.webauthnChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    await setChallenge(device.id, null);
    if (!v.verified || !v.registrationInfo) return { ok: false, error: "Try again" };
    const c = v.registrationInfo.credential;
    await adminDb.insert(passkeys).values({
      companyId: me.companyId,
      userId: me.id,
      credentialId: c.id,
      publicKey: Buffer.from(c.publicKey).toString("base64url"),
      counter: c.counter,
      transports: c.transports ?? null,
      label: device.label,
    });
    await auditSystem(me.id, "passkey_added");
    return { ok: true };
  } catch {
    await setChallenge(device.id, null);
    return { ok: false, error: "Try again" };
  }
}
