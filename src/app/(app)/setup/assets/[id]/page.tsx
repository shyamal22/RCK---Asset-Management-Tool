import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { UNIT_LABELS } from "@/lib/assets/labels";
import { assetOptions, getAsset, runAs } from "@/lib/assets/queries";
import { AssetForm } from "../asset-form";
import { PhotoUpload } from "../photo-upload";
import { ArchiveAsset, ChangeUnit } from "./controls";

export const dynamic = "force-dynamic";

export default async function EditAssetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ photo?: string }> }) {
  const me = await requirePermission("assets", "edit");
  const { id } = await params;
  const { photo } = await searchParams;
  const data = await runAs(me, async (tx) => {
    const a = await getAsset(tx, id);
    return a ? { a, opts: await assetOptions(tx) } : null;
  });
  if (!data) notFound();
  const { a, opts } = data;
  return (
    <div className="grid max-w-md gap-8">
      <h1 className="text-2xl font-bold">
        Edit {a.code}
      </h1>
      {photo === "failed" ? <p role="alert" className="rounded-xl border border-destructive/40 p-3 text-destructive">Asset saved, but the photo didn&apos;t upload. Add it again here.</p> : null}
      <PhotoUpload assetId={a.id} hasPhoto={!!a.photo_path} />
      <AssetForm
        opts={opts}
        initial={{
          id: a.id,
          assetTypeId: a.type_id,
          code: a.code,
          name: a.name,
          make: a.make,
          model: a.model,
          year: String(a.year),
          trackingUnit: a.tracking_unit,
          reading: "",
          status: a.status,
          siteId: a.site_id ?? "",
          crewId: a.crew_id ?? "",
          ownerEntityId: a.owner_entity_id ?? "",
          rego: a.rego ?? "",
          vinSerial: a.vin_serial ?? "",
          notes: a.notes ?? "",
        }}
      />
      <section className="grid gap-3" aria-labelledby="unit-h">
        <h2 id="unit-h" className="text-xl font-bold">
          Tracked by {UNIT_LABELS[a.tracking_unit].name.toLowerCase()}
        </h2>
        {can(me.actor, "asset_tracking_unit", "edit") ? (
          <ChangeUnit assetId={a.id} unit={a.tracking_unit} />
        ) : (
          <p className="text-muted-foreground">Only a Director or the Workshop lead can change this.</p>
        )}
      </section>
      {can(me.actor, "assets", "delete") ? (
        <section className="grid gap-3" aria-labelledby="archive-h">
          <h2 id="archive-h" className="text-xl font-bold">Archive</h2>
          <ArchiveAsset assetId={a.id} code={a.code} />
        </section>
      ) : null}
    </div>
  );
}
