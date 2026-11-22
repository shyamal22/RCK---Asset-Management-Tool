import Form from "next/form";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { getAsset, listAssets, photoUrls, runAs } from "@/lib/assets/queries";
import { AssetCard } from "@/components/assets/asset-card";
import { Button } from "@/components/ui/button";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

/** Report damage: pick the machine (search), then the form. ?asset= skips the picker (from the asset page / QR). */
export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ asset?: string; q?: string }> }) {
  const me = await requirePermission("defects", "create");
  const { asset: assetId, q } = await searchParams;
  const data = await runAs(me, async (tx) => {
    const asset = assetId ? await getAsset(tx, assetId) : null;
    return { asset, list: asset ? [] : await listAssets(tx, { q }) };
  });
  if (data.asset) {
    const a = data.asset;
    const photo = a.photo_path ? (await photoUrls([a.photo_path]))[a.photo_path] : undefined;
    return (
      <div className="grid max-w-md gap-5">
        <h1 className="text-3xl font-bold">Report damage</h1>
        <div className="surface flex items-center gap-3 p-2 pr-4">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
            {photo ? <img src={photo} alt="" className="size-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">
              {a.code} <span className="font-normal">{a.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">{a.type_name}</p>
          </div>
          <Link href="/reports/new" className="text-sm font-semibold text-[var(--indigo)]">
            Change
          </Link>
        </div>
        <ReportForm asset={{ id: a.id, code: a.code, name: a.name, unit: a.tracking_unit }} />
      </div>
    );
  }
  const photos = await photoUrls(data.list.map((x) => x.photo_path));
  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-3xl font-bold">Report damage</h1>
      <Form key={q ?? ""} action="/reports/new" className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Search" aria-label="Search machines" className="h-12 w-full min-w-0 rounded-full border border-input bg-background px-5 text-lg" />
        <Button type="submit" size="lg" className="h-12 px-6">Search</Button>
      </Form>
      <ul className="grid gap-2">
        {data.list.map((a) => (
          <li key={a.id}>
            <AssetCard a={a} photo={a.photo_path ? photos[a.photo_path] : undefined} href={`/reports/new?asset=${a.id}`} />
          </li>
        ))}
        {data.list.length === 0 ? <li className="text-muted-foreground">No machines found.</li> : null}
      </ul>
    </div>
  );
}
