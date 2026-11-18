"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { supabaseServer } from "@/lib/supabase/server";
import { requestMeta } from "@/lib/auth/session";
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
  if (error || !data.user) return fail("That code didn't work. Check it or send a new one.");
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
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ ...creds(contact), password } as Parameters<
    typeof supabase.auth.signInWithPassword
  >[0]);
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return fail("unverified");
    return fail("Email/mobile or password is wrong");
  }
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
