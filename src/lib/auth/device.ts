import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { adminDb } from "@db/client";
import { passkeys, trustedDevices, users, verifiedSessions } from "@db/schema";
import { UNLOCK_IDLE_HOURS } from "./policy";

export const DEVICE_COOKIE = "wd";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

async function deviceToken(create: boolean) {
  const store = await cookies();
  let token = store.get(DEVICE_COOKIE)?.value;
  if (!token && create) {
    token = randomBytes(32).toString("base64url");
    store.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return token;
}

export async function currentDevice(userId: string) {
  const token = await deviceToken(false);
  if (!token) return null;
  const [d] = await adminDb
    .select()
    .from(trustedDevices)
    .where(and(eq(trustedDevices.userId, userId), eq(trustedDevices.tokenHash, hash(token)), isNull(trustedDevices.revokedAt)));
  return d ?? null;
}

/** Called right after a successful sign-in. Registers the device; trusts it unless a second step is needed. */
export async function registerDevice(opts: { userId: string; companyId: string; label: string; trusted: boolean }) {
  const token = (await deviceToken(true))!;
  const existing = await currentDevice(opts.userId);
  if (existing) {
    await adminDb.update(trustedDevices).set({ lastSeenAt: new Date() }).where(eq(trustedDevices.id, existing.id));
    return existing;
  }
  const [d] = await adminDb
    .insert(trustedDevices)
    .values({
      companyId: opts.companyId,
      userId: opts.userId,
      tokenHash: hash(token),
      label: opts.label.slice(0, 120),
      verifiedAt: opts.trusted ? new Date() : null,
      unlockedUntil: new Date(Date.now() + UNLOCK_IDLE_HOURS * 3600_000),
    })
    .returning();
  return d;
}

export async function markDeviceVerified(deviceId: string) {
  await adminDb.update(trustedDevices).set({ verifiedAt: new Date() }).where(eq(trustedDevices.id, deviceId));
}

export async function markSessionVerified(opts: { sessionId: string; userId: string; companyId: string; deviceId: string }) {
  await adminDb
    .insert(verifiedSessions)
    .values({ sessionId: opts.sessionId, userId: opts.userId, companyId: opts.companyId, deviceId: opts.deviceId })
    .onConflictDoNothing();
}

/** True when the user has set an unlock method (PIN or passkey) — only then does the app lock. */
export async function hasUnlockMethod(userId: string) {
  const r = await adminDb.execute(sql`
    select (select pin_hash is not null from public.users where id = ${userId})
        or exists (select 1 from public.passkeys where user_id = ${userId} and revoked_at is null) as yes`);
  return Boolean((r as unknown as { yes: boolean }[])[0]?.yes);
}

export async function isUnlocked(deviceId: string) {
  const [d] = await adminDb
    .select({ id: trustedDevices.id })
    .from(trustedDevices)
    .where(and(eq(trustedDevices.id, deviceId), gt(trustedDevices.unlockedUntil, new Date())));
  return !!d;
}

/** Sliding unlock window; only writes when it has moved by more than an hour. */
export async function touchUnlock(deviceId: string, force = false) {
  const until = new Date(Date.now() + UNLOCK_IDLE_HOURS * 3600_000);
  const cond = force
    ? eq(trustedDevices.id, deviceId)
    : and(eq(trustedDevices.id, deviceId), sql`coalesce(${trustedDevices.unlockedUntil}, now()) < ${new Date(until.getTime() - 3600_000).toISOString()}::timestamptz`);
  await adminDb.update(trustedDevices).set({ unlockedUntil: until, lastSeenAt: new Date() }).where(cond);
}

export async function lockDevice(deviceId: string) {
  await adminDb.update(trustedDevices).set({ unlockedUntil: new Date(0) }).where(eq(trustedDevices.id, deviceId));
}

export async function userPasskeys(userId: string) {
  return adminDb
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.userId, userId), isNull(passkeys.revokedAt)));
}

export async function setChallenge(deviceId: string, challenge: string | null) {
  await adminDb
    .update(trustedDevices)
    .set({ webauthnChallenge: challenge, challengeExpiresAt: challenge ? new Date(Date.now() + 5 * 60_000) : null })
    .where(eq(trustedDevices.id, deviceId));
}

export { users };
