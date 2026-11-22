import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { listAssets, runAs } from "@/lib/assets/queries";
import { STATUS_LABELS } from "@/lib/assets/labels";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SetupAssetsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const me = await requirePermission("assets", "create");
  const { archived } = await searchParams;
  const list = await runAs(me, (tx) => listAssets(tx, {}));
  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-title2 font-bold">Assets</h1>
      {archived ? <p role="status">Asset archived</p> : null}
      <Button asChild size="lg" className="h-12 w-fit">
        <Link href="/setup/assets/new">Add asset</Link>
      </Button>
      <ul className="divide-y surface overflow-hidden">
        {list.map((a) => (
          <li key={a.id}>
            <Link href={`/setup/assets/${a.id}`} className="press flex min-h-14 items-center justify-between gap-3 px-4">
              <span className="truncate">
                <span className="font-bold">{a.code}</span> {a.name}
              </span>
              <span className="shrink-0 text-footnote text-muted-foreground">
                {a.type_name} · {STATUS_LABELS[a.status]}
              </span>
            </Link>
          </li>
        ))}
        {list.length === 0 ? <li className="p-4 text-muted-foreground">No assets yet.</li> : null}
      </ul>
    </div>
  );
}
