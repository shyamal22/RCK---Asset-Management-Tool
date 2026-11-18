import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import { ListEditor } from "./list-editor";

export const dynamic = "force-dynamic";

type Row = { id: string; name: string };

export default async function YardsCrewsPage() {
  const me = await requirePermission("settings", "edit");
  const data = await asUser({ id: me.id, sessionId: me.sessionId }, async (tx) => {
    const q = async (t: string) =>
      (await tx.execute(sql.raw(`select id, name from public.${t} where deleted_at is null order by name`))) as unknown as Row[];
    return { sites: await q("sites"), crews: await q("crews"), owners: await q("owner_entities") };
  });
  return (
    <div className="grid max-w-md gap-8">
      <ListEditor title="Yards" kind="sites" items={data.sites} />
      <ListEditor title="Crews" kind="crews" items={data.crews} />
      <ListEditor title="Owners" kind="owner_entities" items={data.owners} />
    </div>
  );
}
