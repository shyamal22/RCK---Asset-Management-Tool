import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth/session";
import { can } from "@/lib/permissions/check";
import { runAs } from "@/lib/assets/queries";

/**
 * Home's redirects (KRE admins → Clients, unfinished setup → first-run) run here, above the loading
 * skeleton: once a loading boundary has started streaming, a redirect becomes a second page load.
 */
export default async function HomeGate({ children }: { children: React.ReactNode }) {
  const me = await requireActive();
  if (me.isPlatformAdmin) redirect("/kre");
  if (can(me.actor, "settings", "edit")) {
    const [{ done }] = await runAs(me, async (tx) =>
      (await tx.execute(sql`select setup_completed_at is not null as done from public.companies where id = app.current_company_id()`)) as unknown as {
        done: boolean;
      }[],
    );
    if (!done) redirect("/setup/start");
  }
  return children;
}
