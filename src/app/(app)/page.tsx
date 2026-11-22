import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requireActive } from "@/lib/auth/session";
import { can } from "@/lib/permissions/check";
import { redirect } from "next/navigation";
import { openCounts } from "@/lib/breakdowns/queries";
import { CrewHome, DirectorHome, OfficeHome, SupervisorHome, WorkshopHome } from "@/components/home/homes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireActive();
  if (me.isPlatformAdmin) redirect("/kre");
  if (can(me.actor, "settings", "edit")) {
    const [{ done }] = (await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
      tx.execute(sql`select setup_completed_at is not null as done from public.companies where id = app.current_company_id()`),
    )) as unknown as { done: boolean }[];
    if (!done) redirect("/setup/start");
  }
  const pending = can(me.actor, "users", "view_pending")
    ? Number(
        ((await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
          tx.execute(sql`select count(*)::int as n from public.users where status = 'pending'`),
        )) as unknown as { n: number }[])[0].n,
      )
    : 0;
  const reports = can(me.actor, "defects", "view")
    ? await asUser({ id: me.id, sessionId: me.sessionId }, (tx) => openCounts(tx))
    : { red: 0, yellow: 0, mine: 0 };
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{me.name}</h1>
      {me.userType === "crew" ? <CrewHome reports={reports} /> : null}
      {me.userType === "supervisor" ? <SupervisorHome reports={reports} /> : null}
      {me.userType === "workshop" ? <WorkshopHome reports={reports} /> : null}
      {me.userType === "office" ? <OfficeHome pending={pending} reports={reports} /> : null}
      {me.userType === "director" ? <DirectorHome pending={pending} reports={reports} /> : null}
    </div>
  );
}
