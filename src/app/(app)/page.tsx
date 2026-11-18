import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requireActive } from "@/lib/auth/session";
import { can } from "@/lib/permissions/check";
import { CrewHome, DirectorHome, OfficeHome, SupervisorHome, WorkshopHome } from "@/components/home/homes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireActive();
  const pending = can(me.actor, "users", "view_pending")
    ? Number(
        ((await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
          tx.execute(sql`select count(*)::int as n from public.users where status = 'pending'`),
        )) as unknown as { n: number }[])[0].n,
      )
    : 0;
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{me.name}</h1>
      {me.userType === "crew" ? <CrewHome /> : null}
      {me.userType === "supervisor" ? <SupervisorHome /> : null}
      {me.userType === "workshop" ? <WorkshopHome /> : null}
      {me.userType === "office" ? <OfficeHome pending={pending} /> : null}
      {me.userType === "director" ? <DirectorHome pending={pending} /> : null}
    </div>
  );
}
