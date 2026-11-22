import Link from "next/link";
import { SlidersHorizontal, Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { cn } from "@/lib/utils";
import { ASSET_STATUSES, STATUS_LABELS } from "@/lib/assets/labels";
import { assetOptions, listAssets, photoUrls, runAs, typeBays, type AssetFilters } from "@/lib/assets/queries";
import { AssetCard } from "@/components/assets/asset-card";
import { Showroom } from "@/components/assets/showroom";
import { BayRail } from "@/components/assets/bay-rail";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Params = AssetFilters & { view?: string };
const select = "h-12 min-w-0 rounded-[0.875rem] border border-input bg-background px-3 text-base";

/** Link to this page with some filters changed (empty value removes it). */
function href(f: Params, change: Partial<Params>) {
  const next = { ...f, ...change };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/assets?${qs}` : "/assets";
}

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const me = await requirePermission("assets", "view");
  const f = await searchParams;
  const { list, bays, opts } = await runAs(me, async (tx) => ({
    list: await listAssets(tx, f),
    bays: await typeBays(tx, f),
    opts: await assetOptions(tx),
  }));
  const photos = await photoUrls([...list.map((a) => a.photo_path), ...bays.map((b) => b.photo_path)]);
  const filtered = !!(f.q || f.type || f.status || f.site || f.crew);
  const moreFilters = !!(f.site || f.crew);
  const total = bays.reduce((n, b) => n + Number(b.n), 0);
  const listView = f.view === "list";

  return (
    <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Assets</h1>
        {can(me.actor, "assets", "create") ? (
          <Button asChild size="lg" className="h-12">
            <Link href="/setup/assets/new">Add asset</Link>
          </Button>
        ) : null}
      </div>

      <form key={JSON.stringify(f)} className="grid gap-2" role="search">
        {f.type ? <input type="hidden" name="type" value={f.type} /> : null}
        {f.view ? <input type="hidden" name="view" value={f.view} /> : null}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Search name, code or rego"
            aria-label="Search assets"
            className="h-12 w-full min-w-0 rounded-full border border-input bg-background px-5 text-lg"
          />
          <Button type="submit" size="lg" className="h-12 px-6">
            Search
          </Button>
        </div>
        <details className="group" open={moreFilters || undefined}>
          <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-full px-1 py-1 text-base font-semibold text-[var(--indigo)]">
            <SlidersHorizontal className="size-4" aria-hidden /> Filter
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <Button type="submit" variant="outline" size="lg" className="h-12">
              Apply
            </Button>
          </div>
        </details>
      </form>

      {/* Type bays: pick a kind of machine */}
      <BayRail label="Asset types" className="bay-rail -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:-mx-10 md:px-10">
        <TypeBay label="All" n={total} href={href(f, { type: "" })} active={!f.type} photo={null} />
        {bays.map((b) => (
          <TypeBay
            key={b.id}
            label={b.name}
            n={Number(b.n)}
            href={href(f, { type: b.id })}
            active={f.type === b.id}
            photo={b.photo_path ? photos[b.photo_path] : null}
          />
        ))}
      </BayRail>

      {/* Status chips */}
      <BayRail label="Quick filters" className="bay-rail -mx-5 flex gap-2 overflow-x-auto px-5 md:-mx-10 md:px-10">
        {["", ...ASSET_STATUSES.filter((s) => s !== "disposed")].map((s) => (
          <Link
            key={s || "all"}
            href={href(f, { status: s })}
            aria-current={(f.status ?? "") === s ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
              (f.status ?? "") === s ? "border-[var(--onyx)] bg-[var(--onyx)] text-white" : "border-input bg-background",
            )}
          >
            {s ? STATUS_LABELS[s as keyof typeof STATUS_LABELS] : "All statuses"}
          </Link>
        ))}
      </BayRail>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          <span>
            {list.length} {list.length === 1 ? "asset" : "assets"}
          </span>
          {filtered ? (
            <>
              {" · "}
              <Link href={f.view ? `/assets?view=${f.view}` : "/assets"} className="font-semibold text-[var(--indigo)]">
                Clear
              </Link>
            </>
          ) : null}
        </p>
        <div className="flex rounded-full border border-input bg-muted p-1 text-sm font-semibold">
          <Link href={href(f, { view: "" })} aria-current={!listView ? "page" : undefined} className={cn("rounded-full px-4 py-1.5", !listView && "bg-primary text-primary-foreground")}>
            Showroom
          </Link>
          <Link href={href(f, { view: "list" })} aria-current={listView ? "page" : undefined} className={cn("rounded-full px-4 py-1.5", listView && "bg-primary text-primary-foreground")}>
            List
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{filtered ? "Nothing matches." : "No assets yet."}</p>
      ) : listView ? (
        <ul className="grid gap-2">
          {list.map((a) => (
            <li key={a.id}>
              <AssetCard a={a} photo={a.photo_path ? photos[a.photo_path] : undefined} />
            </li>
          ))}
        </ul>
      ) : (
        <Showroom key={`${f.type}-${f.status}-${f.q}-${f.site}-${f.crew}`} items={list.map((a) => ({ ...a, photo: a.photo_path ? photos[a.photo_path] : undefined }))} />
      )}
    </div>
  );
}

function TypeBay({ label, n, href, active, photo }: { label: string; n: number; href: string; active: boolean; photo: string | null }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      aria-label={`${label}, ${n}`}
      className={cn(
        "group relative flex h-36 w-28 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[1.5rem] border-2 bg-muted transition-transform",
        active ? "border-[var(--indigo)] shadow-[0_14px_28px_-14px_var(--indigo)]" : "border-transparent hover:-translate-y-0.5",
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-[var(--brand-gradient)]" style={{ background: "var(--brand-gradient)" }}>
          <Truck className="size-9 text-white/80" aria-hidden />
        </span>
      )}
      <span className="relative bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2.5 text-left text-white">
        <span className="block text-sm leading-tight font-bold">{label}</span>
        <span className="text-xs opacity-80">{n}</span>
      </span>
      {active ? <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-[var(--tangerine)] ring-2 ring-white" aria-hidden /> : null}
    </Link>
  );
}
