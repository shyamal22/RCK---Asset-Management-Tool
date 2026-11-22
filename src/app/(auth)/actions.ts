"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { signInFailures, users } from "@db/schema";
import { markDeviceVerified, markSessionVerified, registerDevice, sharedDevice, touchUnlock } from "@/lib/auth/device";
import { isLockedOut, LOCKOUT } from "@/lib/auth/policy";
import { supabaseServer } from "@/lib/supabase/server";
import { getIdentity, requestMeta } from "@/lib/auth/session";
import { contactSchema, passwordSchema, signInSchema, signUpSchema, verifySchema } from "@/lib/auth/schemas";
import { z } from "zod";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

type Contact = z.infer<typeof contactSchema>;
const creds = (c: Contact) => (c.method === "email" ? { email: c.email } : { phone: c.mobile });

async function audit(userId: string, action: string, after?: Record<string, unknown>) {
  const meta = await requestMeta();
  await asUser({ id: userId, ...meta }, (tx) =>
    tx.execute(sql`select app.write_audit(
      (select company_id from public.users where id = auth.uid()), ${action}, 'user', ${userId},
      null, ${after ? JSON.stringify(after) : null}::jsonb)`),
  );
}

const sessionIdOf = (accessToken: string) =>
  JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()).session_id as string;

/** After any successful sign-in: remember the device; a code proved on it makes it trusted. */
async function afterSignIn(userId: string, accessToken: string, provedByCode: boolean) {
  const [u] = await adminDb.select({ companyId: users.companyId }).from(users).where(eq(users.id, userId));
  if (!u) return;
  const meta = await requestMeta();
  const device = await registerDevice({ userId, companyId: u.companyId, label: meta.device, trusted: provedByCode });
  if (provedByCode && !device.verifiedAt) await markDeviceVerified(device.id);
  if (provedByCode || device.verifiedAt) {
    await markSessionVerified({ sessionId: sessionIdOf(accessToken), userId, companyId: u.companyId, deviceId: device.id });
  }
  // A full sign-in (password or emailed code) proves more than a PIN, so it also unlocks this phone and
  // clears wrong-PIN tries. Without this, "Forgot your PIN? Sign in again" (or 5 wrong PINs) looped back
  // to the PIN screen forever.
  await touchUnlock(device.id, true, !!(await sharedDevice()));
  await adminDb.update(users).set({ failedPinAttempts: 0 }).where(eq(users.id, userId));
}

export async function signUpAction(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your details");
  const { code, name, contact, password } = parsed.data;
  const supabase = await supabaseServer();
  const company = await supabase.rpc("signup_company", { p_code: code });
  const companyName = (company.data as { name: string }[] | null)?.[0]?.name;
  if (!companyName) return fail("This sign-up link isn't active. Ask your manager for a new one.");
  const { error } = await supabase.auth.signUp({
    ...creds(contact),
    password,
    options: { data: { name, company_code: code, company_name: companyName } },
  } as Parameters<typeof supabase.auth.signUp>[0]);
  if (error) return fail(friendly(error.message));
  return { ok: true };
}

export async function verifyCodeAction(input: unknown): Promise<ActionResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter the 6-digit code");
  const { contact, token, purpose } = parsed.data;
  const supabase = await supabaseServer();
  const { data, error } =
    contact.method === "email"
      ? await supabase.auth.verifyOtp({ email: contact.email, token, type: purpose === "signup" ? "signup" : "recovery" })
      : await supabase.auth.verifyOtp({ phone: contact.mobile, token, type: purpose === "signup" ? "sms" : "sms" });
  if (error || !data.user || !data.session) return fail("That code didn't work. Check it or send a new one.");
  await afterSignIn(data.user.id, data.session.access_token, true);
  await audit(data.user.id, purpose === "signup" ? "verify" : "reset_code_verified");
  return { ok: true };
}

export async function resendCodeAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ contact: contactSchema, purpose: z.enum(["signup", "recovery"]) }).safeParse(input);
  if (!parsed.success) return fail("Check your details");
  const supabase = await supabaseServer();
  const { contact, purpose } = parsed.data;
  if (purpose === "recovery") {
    if (contact.method !== "email") return fail("Ask your Director to reset your password");
    const { error } = await supabase.auth.resetPasswordForEmail(contact.email);
    return error ? fail(friendly(error.message)) : { ok: true };
  }
  const { error } =
    contact.method === "email"
      ? await supabase.auth.resend({ type: "signup", email: contact.email })
      : await supabase.auth.resend({ type: "sms", phone: contact.mobile });
  return error ? fail(friendly(error.message)) : { ok: true };
}

export async function signInAction(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your details");
  const { contact, password } = parsed.data;
  const identifier = contact.method === "email" ? contact.email : contact.mobile;
  const since = new Date(Date.now() - LOCKOUT.windowMinutes * 60_000);
  const recent = await adminDb
    .select({ id: signInFailures.id })
    .from(signInFailures)
    .where(and(eq(signInFailures.identifier, identifier), gt(signInFailures.at, since)));
  if (isLockedOut(recent.length)) {
    return fail(`Too many tries. Wait ${LOCKOUT.windowMinutes} minutes or reset your password.`);
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ ...creds(contact), password } as Parameters<
    typeof supabase.auth.signInWithPassword
  >[0]);
  if (error || !data.user || !data.session) {
    if (error?.code === "email_not_confirmed") return fail("unverified");
    const meta = await requestMeta();
    await adminDb.insert(signInFailures).values({ identifier, ip: meta.ip });
    return fail("Email/mobile or password is wrong");
  }
  await adminDb.delete(signInFailures).where(eq(signInFailures.identifier, identifier));
  await afterSignIn(data.user.id, data.session.access_token, false);
  await audit(data.user.id, "sign_in");
  return { ok: true };
}

export async function setNewPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ password: passwordSchema }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your password");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error || !data.user) return fail(friendly(error?.message ?? "Could not set password"));
  await audit(data.user.id, "password_reset");
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) await audit(data.user.id, "sign_out");
  await supabase.auth.signOut();
  redirect("/sign-in");
}

function friendly(msg: string) {
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  if (/password/i.test(msg)) return "Choose a stronger password (at least 8 characters)";
  if (/sign-up link/i.test(msg) || /Database error/i.test(msg)) return "This sign-up link isn't active.";
  return "Something went wrong. Try again.";
}

/** Second step for Director/Office on a new device: a code to their email or mobile. */
export async function sendDeviceCodeAction(): Promise<ActionResult> {
  const ident = await getIdentity();
  if (!ident) return fail("Sign in again");
  const [u] = await adminDb.select({ email: users.email, mobile: users.mobile }).from(users).where(eq(users.id, ident.userId));
  const supabase = await supabaseServer();
  const { error } = u?.email
    ? await supabase.auth.signInWithOtp({ email: u.email, options: { shouldCreateUser: false } })
    : await supabase.auth.signInWithOtp({ phone: u!.mobile!, options: { shouldCreateUser: false } });
  return error ? fail(friendly(error.message)) : { ok: true };
}

export async function verifyDeviceCodeAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter the 6-digit code");
  const ident = await getIdentity();
  if (!ident) return fail("Sign in again");
  const [u] = await adminDb.select({ email: users.email, mobile: users.mobile }).from(users).where(eq(users.id, ident.userId));
  const supabase = await supabaseServer();
  const { data, error } = u?.email
    ? await supabase.auth.verifyOtp({ email: u.email, token: parsed.data.token, type: "email" })
    : await supabase.auth.verifyOtp({ phone: u!.mobile!, token: parsed.data.token, type: "sms" });
  if (error || !data.user || !data.session || data.user.id !== ident.userId) {
    return fail("That code didn't work. Check it or send a new one.");
  }
  await afterSignIn(data.user.id, data.session.access_token, true);
  await audit(data.user.id, "device_verified");
  return { ok: true };
}
