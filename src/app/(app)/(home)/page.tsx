import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth/session";
import { can } from "@/lib/permissions/check";
import { listAssets, photoUrls, runAs } from "@/lib/assets/queries";
import { listReports } from "@/lib/breakdowns/queries";
import { fleetByType, fleetSummary, needsAttention, readingsToCheck } from "@/lib/home/queries";
import { CrewHome, DirectorHome, OfficeHome, SupervisorHome, WorkshopHome, type HomeData } from "@/components/home/homes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireActive();
  if (me.isPlatformAdmin) redirect("/kre");
  const t = me.userType;
  const data = await runAs(me, async (tx) => {
    if (can(me.actor, "settings", "edit")) {
      const [{ done }] = (await tx.execute(
        sql`select setup_completed_at is not null as done from public.companies where id = app.current_company_id()`,
      )) as unknown as { done: boolean }[];
      if (!done) return null;
    }
    const crewOnly = t === "supervisor" ? me.crewId : null;
    return {
      pending: can(me.actor, "users", "view_pending")
        ? Number(((await tx.execute(sql`select count(*)::int as n from public.users where status = 'pending'`)) as unknown as { n: number }[])[0].n)
        : 0,
      fleet: await fleetSummary(tx),
      attention: t === "crew" ? [] : await needsAttention(tx, 8, crewOnly),
      reports: can(me.actor, "defects", "view") ? (await listReports(tx, { status: "open" })).slice(0, t === "crew" ? 10 : 6) : [],
      machines: t === "crew" || t === "supervisor" ? await listAssets(tx, crewOnly ? { crew: crewOnly } : {}) : [],
      readings: t === "workshop" || t === "director" ? await readingsToCheck(tx) : [],
      byType: t === "director" ? await fleetByType(tx) : [],
    };
  });
  if (!data) redirect("/setup/start");
  const photos = await photoUrls([
    ...data.attention.map((a) => a.photo_path),
    ...data.machines.map((a) => a.photo_path),
    ...data.reports.map((r) => r.photo_paths[0] ?? null),
  ]);
  const d: HomeData = { ...data, name: me.name, photos };
  return (
    <div>
      {t === "crew" ? <CrewHome d={d} /> : null}
      {t === "supervisor" ? <SupervisorHome d={d} /> : null}
      {t === "workshop" ? <WorkshopHome d={d} /> : null}
      {t === "office" ? <OfficeHome d={d} /> : null}
      {t === "director" ? <DirectorHome d={d} /> : null}
    </div>
  );
}
