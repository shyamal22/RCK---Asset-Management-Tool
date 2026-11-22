"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { directorInviteEmail, sendEmail } from "@/lib/email/send";
import { asPlatformAdmin, dbMessage } from "@/lib/platform/guard";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const director = { directorName: z.string().trim().min(2, "Enter the Director's name").max(100), directorEmail: z.email("Enter a valid email") };
const createSchema = z.object({ name: z.string().trim().min(2, "Enter the company name").max(100), ...director });

async function sendInvite(companyId: string): Promise<boolean> {
  const [r] = (await asPlatformAdmin((tx) =>
    tx.execute(sql`select (select c.name from public.kre_companies() c where c.id = ${companyId}) as name,
      public.kre_signup_code(${companyId}) as code, i.name as director, i.email
      from public.kre_invite_details(${companyId}) i where i.accepted_at is null`),
  )) as unknown as { name: string; code: string; director: string; email: string }[];
  if (!r) return false;
  const url = `${publicEnv().NEXT_PUBLIC_APP_URL}/join/${r.code}`;
  return sendEmail(r.email, `Set up ${r.name} on KRE Asset Management Tool`, directorInviteEmail({ name: r.director, company: r.name, url }));
}

export async function createClientAction(raw: unknown): Promise<Result<{ id: string; emailed: boolean }>> {
  const p = createSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the details" };
  let id: string;
  try {
    [{ id }] = (await asPlatformAdmin((tx) =>
      tx.execute(sql`select public.kre_create_company(${p.data.name}, ${p.data.directorName}, ${p.data.directorEmail}) as id`),
    )) as unknown as { id: string }[];
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  const emailed = await sendInvite(id);
  revalidatePath("/kre");
  return { ok: true, id, emailed };
}

export async function inviteDirectorAction(raw: unknown): Promise<Result<{ emailed: boolean }>> {
  const p = z.object({ companyId: z.uuid(), ...director }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the details" };
  try {
    await asPlatformAdmin((tx) =>
      tx.execute(sql`select public.kre_invite_director(${p.data.companyId}, ${p.data.directorName}, ${p.data.directorEmail})`),
    );
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  const emailed = await sendInvite(p.data.companyId);
  revalidatePath(`/kre/${p.data.companyId}`);
  return { ok: true, emailed };
}

export async function resendInviteAction(raw: unknown): Promise<Result<{ emailed: boolean }>> {
  const p = z.object({ companyId: z.uuid() }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Unknown company" };
  return { ok: true, emailed: await sendInvite(p.data.companyId) };
}

export async function startSupportAction(raw: unknown): Promise<Result> {
  const p = z
    .object({ companyId: z.uuid(), reason: z.string().trim().min(3, "Give a reason").max(300), hours: z.coerce.number().int().min(1).max(168) })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the details" };
  try {
    await asPlatformAdmin((tx) => tx.execute(sql`select public.kre_start_support(${p.data.companyId}, ${p.data.reason}, ${p.data.hours})`));
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/kre/${p.data.companyId}`);
  return { ok: true };
}

export async function endSupportAction(raw: unknown): Promise<Result> {
  const p = z.object({ companyId: z.uuid(), supportId: z.uuid() }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Unknown support access" };
  try {
    await asPlatformAdmin((tx) => tx.execute(sql`select public.end_support_access(${p.data.supportId})`));
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/kre/${p.data.companyId}`);
  return { ok: true };
}

export async function setSuspendedAction(raw: unknown): Promise<Result> {
  const p = z.object({ companyId: z.uuid(), suspended: z.boolean(), reason: z.string().trim().max(300).default("") }).safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the details" };
  try {
    await asPlatformAdmin((tx) =>
      tx.execute(sql`select public.kre_set_suspended(${p.data.companyId}, ${p.data.suspended}, ${p.data.reason || null})`),
    );
  } catch (e) {
    return { ok: false, error: dbMessage(e) };
  }
  revalidatePath(`/kre/${p.data.companyId}`);
  revalidatePath("/kre");
  return { ok: true };
}
