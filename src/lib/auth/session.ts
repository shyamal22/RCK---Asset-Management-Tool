import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { supabaseServer } from "@/lib/supabase/server";
import type { Actor } from "@/lib/permissions/check";
import type { UserFlag, UserType } from "@/lib/permissions/types";
import { currentDevice, hasUnlockMethod, isUnlocked, sharedDevice, touchUnlock } from "./device";
import { needsSecondStep } from "./policy";

export type Profile = {
  id: string;
  sessionId: string | null;
  companyId: string;
  companyName: string;
  name: string;
  email: string | null;
  mobile: string | null;
  status: "pending" | "active" | "rejected" | "deactivated";
  userType: UserType | null; // effective (acting access applied, second step passed)
  rawUserType: UserType | null; // effective type before the second-step gate
  baseUserType: UserType | null;
  crewId: string | null;
  flags: UserFlag[];
  secondStepNeeded: boolean;
  /** KRE admin (platform level): manages client companies. */
  isPlatformAdmin: boolean;
  companySuspended: boolean;
};

export async function requestMeta() {
  const h = await headers();
  return {
    device: h.get("user-agent")?.slice(0, 300) ?? "",
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
  };
}

/** Verified identity from the session JWT (signature checked), or null. */
export const getIdentity = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return null;
  return { userId: data.claims.sub as string, sessionId: (data.claims.session_id as string | undefined) ?? null };
});

/** Signed-in user's profile, or null. Reads run as the user, so RLS applies. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const ident = await getIdentity();
  if (!ident) return null;
  const meta = await requestMeta();
  const rows = await asUser({ id: ident.userId, sessionId: ident.sessionId, ...meta }, (tx) =>
    tx.execute(sql`
      select u.id, u.company_id, u.name, u.email, u.mobile, u.status, u.user_type as base_user_type, u.crew_id,
             app.current_user_type() as user_type,
             app.current_user_type_raw() as raw_user_type,
             (select c.name from public.companies c where c.id = u.company_id) as company_name,
             app.has_flag('workshop_lead') as workshop_lead,
             public.kre_is_admin() as platform_admin,
             public.my_company_suspended() as suspended
      from public.users u where u.id = auth.uid()`),
  );
  const r = (rows as unknown as Record<string, unknown>[])[0];
  if (!r) return null;
  const rawUserType = (r.raw_user_type as UserType | null) ?? null;
  const userType = (r.user_type as UserType | null) ?? null;
  return {
    id: r.id as string,
    sessionId: ident.sessionId,
    companyId: r.company_id as string,
    companyName: (r.company_name as string | null) ?? "",
    name: r.name as string,
    email: (r.email as string | null) ?? null,
    mobile: (r.mobile as string | null) ?? null,
    status: r.status as Profile["status"],
    userType,
    rawUserType,
    baseUserType: (r.base_user_type as UserType | null) ?? null,
    crewId: (r.crew_id as string | null) ?? null,
    flags: r.workshop_lead ? ["workshop_lead"] : [],
    secondStepNeeded: needsSecondStep(rawUserType) && userType === null,
    isPlatformAdmin: !!r.platform_admin,
    companySuspended: !!r.suspended,
  };
});

export type ActiveUser = Profile & { userType: UserType; actor: Actor };

/** For pages/actions that need an approved, verified, unlocked user. Redirects otherwise. */
export async function requireActive(): Promise<ActiveUser> {
  const p = await getProfile();
  if (!p) redirect("/sign-in");
  if (p.status === "pending" || p.status === "rejected") redirect("/waiting");
  if (p.status !== "active") redirect("/sign-in?state=inactive");
  if (p.companySuspended) redirect("/sign-in?state=suspended");
  if (p.secondStepNeeded) redirect("/verify-device");
  if (!p.userType) redirect("/sign-in?state=inactive");
  const device = await currentDevice(p.id);
  const shared = device ? await sharedDevice() : null;
  if (device && shared) {
    // Shared workshop tablet: idle → back to the user list.
    if (!(await isUnlocked(device.id))) redirect("/switch");
    await touchUnlock(device.id, false, true);
  } else if (device && (await hasUnlockMethod(p.id))) {
    if (!(await isUnlocked(device.id))) redirect("/unlock");
    await touchUnlock(device.id);
  }
  return { ...p, userType: p.userType, actor: { userType: p.userType, flags: p.flags } };
}
