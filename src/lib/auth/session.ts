import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { supabaseServer } from "@/lib/supabase/server";
import type { Actor } from "@/lib/permissions/check";
import type { UserFlag, UserType } from "@/lib/permissions/types";

export type Profile = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  status: "pending" | "active" | "rejected" | "deactivated";
  userType: UserType | null; // effective (acting access applied)
  baseUserType: UserType | null;
  crewId: string | null;
  flags: UserFlag[];
};

export async function requestMeta() {
  const h = await headers();
  return {
    device: h.get("user-agent")?.slice(0, 300) ?? "",
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
  };
}

/** Signed-in user's profile, or null. Reads run as the user, so RLS applies. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const meta = await requestMeta();
  const rows = await asUser({ id: data.user.id, ...meta }, (tx) =>
    tx.execute(sql`
      select u.id, u.company_id, u.name, u.status, u.user_type as base_user_type, u.crew_id,
             app.current_user_type() as user_type,
             (select c.name from public.companies c where c.id = u.company_id) as company_name_visible,
             app.has_flag('workshop_lead') as workshop_lead
      from public.users u where u.id = auth.uid()`),
  );
  const r = (rows as unknown as Record<string, unknown>[])[0];
  if (!r) return null;
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    companyName: (r.company_name_visible as string | null) ?? "",
    name: r.name as string,
    status: r.status as Profile["status"],
    userType: (r.user_type as UserType | null) ?? null,
    baseUserType: (r.base_user_type as UserType | null) ?? null,
    crewId: (r.crew_id as string | null) ?? null,
    flags: r.workshop_lead ? ["workshop_lead"] : [],
  };
});

/** For pages that need an approved user. Redirects otherwise. */
export async function requireActive(): Promise<Profile & { userType: UserType; actor: Actor }> {
  const p = await getProfile();
  if (!p) redirect("/sign-in");
  if (p.status === "pending") redirect("/waiting");
  if (p.status !== "active" || !p.userType) redirect("/sign-in?state=inactive");
  return { ...p, userType: p.userType, actor: { userType: p.userType, flags: p.flags } };
}
