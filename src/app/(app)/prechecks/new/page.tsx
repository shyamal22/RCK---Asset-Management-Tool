import Link from "next/link";
import { CircleCheck, Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { getAsset, listAssets, photoUrls, runAs } from "@/lib/assets/queries";
import { templateFor } from "@/lib/prechecks/queries";
import { checkedToday } from "@/lib/prechecks/today";
import { PrecheckFlow } from "./precheck-flow";

export const dynamic = "force-dynamic";

/** Pre-start check: pick a machine (yours first), then one question per screen. ?asset= skips the picker. */
export default async function NewPrecheckPage({ searchParams }: { searchParams: Promise<{ asset?: string }> }) {
  const me = await requirePermission("prechecks", "create");
  const { asset: assetId } = await searchParams;

  if (assetId) {
    const data = await runAs(me, async (tx) => {
      const asset = await getAsset(tx, assetId);
      return { asset, template: asset ? await templateFor(tx, asset.id) : null };
    });
    const a = data.asset;
    if (!a) return <p className="py-10 text-center text-body">Machine not found</p>;
    return (
      <div className="mx-auto grid w-full max-w-md gap-5">
        <p className="text-footnote font-bold text-muted-foreground">
          {a.code} · {a.name}
        </p>
        {data.template ? (
          <PrecheckFlow
            asset={{ id: a.id, code: a.code, unit: a.tracking_unit, reading: a.current_reading != null ? Number(a.current_reading) : null }}
            items={data.template.items}
          />
        ) : (
          <p className="py-10 text-center text-body">No checks set up for {a.type_name} yet</p>
        )}
      </div>
    );
  }

  const list = await runAs(me, (tx) => listAssets(tx, me.crewId && me.userType !== "director" ? { crew: me.crewId } : {}));
  const photos = await photoUrls(list.map((a) => a.photo_path));
  return (
    <div className="mx-auto grid w-full max-w-md gap-4">
      <h1 className="text-large-title">Pre-start check</h1>
      <ul className="surface divide-y divide-border overflow-hidden" aria-label="Machines">
        {list.map((a) => {
          const done = checkedToday(a.last_precheck_at);
          const photo = a.photo_path ? photos[a.photo_path] : undefined;
          return (
            <li key={a.id}>
              <Link href={`/prechecks/new?asset=${a.id}`} aria-label={`${a.code} ${a.name}`} className="press flex min-h-16 items-center gap-3 px-3 py-2">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: photo ? undefined : "var(--brand-gradient)" }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL
                    <img src={photo} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                  ) : (
                    <Truck className="size-5 text-white/85" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-headline">{a.code}</span>
                  <span className="block truncate text-footnote text-muted-foreground">{a.name}</span>
                </span>
                {done ? <CircleCheck className="size-6 shrink-0 text-status-green" aria-label="Checked today" /> : null}
              </Link>
            </li>
          );
        })}
        {list.length === 0 ? <li className="px-4 py-6 text-center text-muted-foreground">No machines</li> : null}
      </ul>
    </div>
  );
}
