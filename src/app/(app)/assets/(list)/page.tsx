import Link from "next/link";
import Form from "next/form";
import { SlidersHorizontal } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { ASSET_STATUSES, STATUS_LABELS } from "@/lib/assets/labels";
import { flagsFor } from "@/lib/breakdowns/queries";
import {
  assetOptions,
  listAssets,
  photoUrls,
  runAs,
  typeBays,
  type AssetFilters,
} from "@/lib/assets/queries";
import { Orbit } from "@/components/assets/orbit";
import { ShuffleGrid } from "@/components/assets/shuffle-grid";
import { TypeRail } from "@/components/assets/type-rail";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/link-tabs";

export const dynamic = "force-dynamic";

type Params = AssetFilters & { view?: string };
const select = "h-12 min-w-0 rounded-[0.875rem] border border-input bg-background px-3 text-base";

/** Link to this page with some filters changed (empty value removes it). */
function href(f: Params, change: Partial<Params>) {
  const next = { ...f, ...change };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `/assets?${qs}` : "/assets";
}

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const me = await requirePermission("assets", "view");
  const f = await searchParams;
  // Sam, 22/11/2026: the page opens on the machine types only; picking one brings up that group.
  const chosen = !!(f.type || f.q || f.status || f.site || f.crew);
  const { list, bays, opts } = await runAs(me, async (tx) => ({
    list: chosen ? await listAssets(tx, f) : [],
    bays: await typeBays(tx, f),
    opts: await assetOptions(tx),
  }));
  const flags = await runAs(me, (tx) =>
    flagsFor(
      tx,
      list.map((a) => a.id),
    ),
  );
  const photos = await photoUrls([
    ...list.map((a) => a.photo_path),
    ...bays.map((b) => b.photo_path),
  ]);
  const items = list.map((a) => ({
    ...a,
    photo: a.photo_path ? photos[a.photo_path] : undefined,
    flag: flags[a.id],
  }));
  const filtered = !!(f.q || f.status || f.site || f.crew);
  const moreFilters = !!(f.site || f.crew);
  const total = bays.reduce((n, b) => n + Number(b.n), 0);
  const listView = f.view === "list";

  return (
    <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Assets</h1>
        {can(me.actor, "assets", "create") ? (
          <Button asChild size="lg" className="h-12">
            <Link href="/setup/assets/new">Add asset</Link>
          </Button>
        ) : null}
      </div>

      {/* Machine types: the big curved rail on arrival; once one is picked, a slim row so the wheel is on screen. */}
      <TypeRail
        compact={chosen}
        items={[
          {
            key: "all",
            label: "All",
            n: total,
            href: href(f, { type: "all" }),
            active: f.type === "all",
            photo: null,
          },
          ...bays.map((b) => ({
            key: b.id,
            label: b.name,
            n: Number(b.n),
            href: href(f, { type: b.id }),
            active: f.type === b.id,
            photo: b.photo_path ? (photos[b.photo_path] ?? null) : null,
          })),
        ]}
      />

      {total === 0 && !chosen ? (
        <p className="py-10 text-center text-muted-foreground">No assets yet.</p>
      ) : null}

      {chosen ? (
        <>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" role="status">
              <span>
                {list.length} {list.length === 1 ? "asset" : "assets"}
              </span>
              {filtered ? (
                <>
                  {" · "}
                  <Link
                    href={href({ type: f.type || "all", view: f.view }, {})}
                    className="-my-3 inline-flex min-h-11 items-center px-1 font-semibold text-[var(--indigo)]"
                  >
                    Clear
                  </Link>
                </>
              ) : null}
            </p>
            <LinkTabs
              label="View"
              items={[
                { href: href(f, { view: "" }), label: "Wheel", active: !listView },
                { href: href(f, { view: "list" }), label: "Grid", active: listView },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              {filtered ? "Nothing matches." : "None yet"}
            </p>
          ) : listView ? (
            <ShuffleGrid key={`${f.type}-${f.status}-${f.q}-${f.site}-${f.crew}`} items={items} />
          ) : (
            <Orbit key={`${f.type}-${f.status}-${f.q}-${f.site}-${f.crew}`} items={items} typeChosen={!!f.type && f.type !== "all"} />
          )}

          {/* next/form: a client-side navigation (keeps the app shell, shows progress) instead of a full reload. */}
          <Form key={JSON.stringify(f)} action="/assets" className="grid gap-2" role="search">
            {f.type ? <input type="hidden" name="type" value={f.type} /> : null}
            {f.view ? <input type="hidden" name="view" value={f.view} /> : null}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                name="q"
                type="search"
                defaultValue={f.q}
                placeholder="Search"
                aria-label="Search assets"
                className="h-12 w-full min-w-0 rounded-full border border-input bg-background px-5 text-lg"
              />
              <Button type="submit" size="lg" className="h-12 px-6">
                Search
              </Button>
            </div>
            <details className="group" open={moreFilters || undefined}>
              <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-1 text-base font-semibold text-[var(--indigo)]">
                <SlidersHorizontal className="size-4" aria-hidden /> Filter
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <select
                  name="status"
                  defaultValue={f.status ?? ""}
                  aria-label="Status"
                  className={select}
                >
                  <option value="">All statuses</option>
                  {ASSET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <select
                  name="site"
                  defaultValue={f.site ?? ""}
                  aria-label="Yard"
                  className={select}
                >
                  <option value="">All yards</option>
                  {opts.sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  name="crew"
                  defaultValue={f.crew ?? ""}
                  aria-label="Crew"
                  className={select}
                >
                  <option value="">All crews</option>
                  {opts.crews.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="lg" className="h-12">
                  Apply
                </Button>
              </div>
            </details>
          </Form>
        </>
      ) : null}
    </div>
  );
}
