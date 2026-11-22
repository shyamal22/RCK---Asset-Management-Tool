import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { ASSET_STATUSES, STATUS_LABELS } from "@/lib/assets/labels";
import { assetOptions, listAssets, photoUrls, runAs, type AssetFilters } from "@/lib/assets/queries";
import { AssetCard } from "@/components/assets/asset-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const select = "h-12 min-w-0 rounded-md border bg-background px-2 text-base";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<AssetFilters> }) {
  const me = await requirePermission("assets", "view");
  const f = await searchParams;
  const { list, opts } = await runAs(me, async (tx) => ({ list: await listAssets(tx, f), opts: await assetOptions(tx) }));
  const photos = await photoUrls(list.map((a) => a.photo_path));
  const filtered = !!(f.q || f.type || f.status || f.site || f.crew);
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Assets</h1>
        {can(me.actor, "assets", "create") ? (
          <Button asChild size="lg" className="h-12">
            <Link href="/setup/assets/new">Add asset</Link>
          </Button>
        ) : null}
      </div>
      <form key={JSON.stringify(f)} className="grid gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={f.q}
          placeholder="Search name, code or rego"
          aria-label="Search assets"
          className="h-12 rounded-md border bg-background px-3 text-lg"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select name="type" defaultValue={f.type ?? ""} aria-label="Type" className={select}>
            <option value="">All types</option>
            {opts.types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={f.status ?? ""} aria-label="Status" className={select}>
            <option value="">All statuses</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select name="site" defaultValue={f.site ?? ""} aria-label="Yard" className={select}>
            <option value="">All yards</option>
            {opts.sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select name="crew" defaultValue={f.crew ?? ""} aria-label="Crew" className={select}>
            <option value="">All crews</option>
            {opts.crews.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="h-12 flex-1">Search</Button>
          {filtered ? (
            <Button asChild variant="outline" size="lg" className="h-12">
              <Link href="/assets">Clear</Link>
            </Button>
          ) : null}
        </div>
      </form>
      <p className="text-sm text-muted-foreground" role="status">
        {list.length} {list.length === 1 ? "asset" : "assets"}
      </p>
      {list.length === 0 ? (
        <p className="text-muted-foreground">{filtered ? "Nothing matches." : "No assets yet."}</p>
      ) : (
        <ul className="grid gap-2">
          {list.map((a) => (
            <li key={a.id}>
              <AssetCard a={a} photo={a.photo_path ? photos[a.photo_path] : undefined} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
