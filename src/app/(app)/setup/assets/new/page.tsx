import { requirePermission } from "@/lib/auth/guard";
import { assetOptions, runAs } from "@/lib/assets/queries";
import { AssetForm, EMPTY_ASSET } from "../asset-form";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  const me = await requirePermission("assets", "create");
  const opts = await runAs(me, (tx) => assetOptions(tx));
  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-bold">Add asset</h1>
      <AssetForm initial={EMPTY_ASSET} opts={opts} />
    </div>
  );
}
