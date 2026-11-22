import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import type { UserType } from "@/lib/permissions/types";
import { UserAdmin } from "./user-admin";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requirePermission("users", "edit");
  const data = await asUser({ id: me.id, sessionId: me.sessionId }, async (tx) => {
    const [user] = (await tx.execute(sql`select u.id, u.name, u.email, u.mobile, u.status, u.user_type, u.crew_id,
        exists (select 1 from public.user_flags f where f.user_id = u.id and f.flag = 'workshop_lead' and f.revoked_at is null) as lead
      from public.users u where u.id = ${id} and u.status in ('active', 'deactivated')`)) as unknown as {
      id: string; name: string; email: string | null; mobile: string | null; status: string;
      user_type: UserType; crew_id: string | null; lead: boolean;
    }[];
    const crews = (await tx.execute(sql`select id, name from public.crews where deleted_at is null order by name`)) as unknown as {
      id: string; name: string;
    }[];
    return { user, crews };
  });
  if (!data.user) notFound();
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-bold">{data.user.name}</h1>
      <p className="text-base">{data.user.email ?? data.user.mobile}</p>
      <UserAdmin
        user={{ id: data.user.id, userType: data.user.user_type, crewId: data.user.crew_id, lead: data.user.lead, active: data.user.status === "active" }}
        crews={data.crews}
        isSelf={me.id === data.user.id}
      />
    </div>
  );
}
