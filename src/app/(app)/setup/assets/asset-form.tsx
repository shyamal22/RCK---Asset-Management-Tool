"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Field, FormError } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { ASSET_STATUSES, STATUS_LABELS, UNIT_LABELS, type AssetStatus, type TrackingUnit } from "@/lib/assets/labels";
import type { Option, TypeOption } from "@/lib/assets/queries";
import { shrinkPhoto } from "@/lib/assets/shrink";
import { createAssetAction, nextCodeAction, updateAssetAction } from "./actions";

export type AssetFormValues = {
  id?: string;
  assetTypeId: string;
  code: string;
  name: string;
  make: string;
  model: string;
  year: string;
  trackingUnit: TrackingUnit | "";
  reading: string;
  status: AssetStatus;
  siteId: string;
  crewId: string;
  ownerEntityId: string;
  rego: string;
  vinSerial: string;
  notes: string;
};

export const EMPTY_ASSET: AssetFormValues = {
  assetTypeId: "", code: "", name: "", make: "", model: "", year: "", trackingUnit: "", reading: "",
  status: "available", siteId: "", crewId: "", ownerEntityId: "", rego: "", vinSerial: "", notes: "",
};

type Opts = { types: TypeOption[]; sites: Option[]; crews: Option[]; owners: Option[] };

function Select({ id, label, value, onChange, options, empty }: { id: string; label: string; value: string; onChange: (v: string) => void; options: Option[]; empty: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-[0.875rem] border border-input bg-background px-3 text-lg">
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Big tap target: take or choose a photo; shows the preview. Required for new assets. */
function PhotoPicker({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="grid gap-1.5">
      <input
        ref={input}
        id="asset-photo"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Asset photo"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          onFile(f ? await shrinkPhoto(f) : null);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="surface relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview
          <img src={preview} alt="Photo of the new asset" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent text-[var(--indigo)]">
              <Camera className="size-7" aria-hidden />
            </span>
            <span className="text-base font-semibold text-foreground">Take or choose a photo</span>
            <span className="text-sm">Shows on the asset card</span>
          </span>
        )}
        {preview ? <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white">Change photo</span> : null}
      </button>
    </div>
  );
}

export function AssetForm({ initial, opts }: { initial: AssetFormValues; opts: Opts }) {
  const editing = !!initial.id;
  const [photo, setPhoto] = useState<File | null>(null);
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [suggestedUnit, setSuggestedUnit] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof AssetFormValues>(k: K) => (val: AssetFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const text = (k: keyof AssetFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value as never);

  const pickType = (typeId: string) => {
    const t = opts.types.find((x) => x.id === typeId);
    setV((s) => ({ ...s, assetTypeId: typeId, trackingUnit: !editing && t?.default_unit ? t.default_unit : s.trackingUnit }));
    setSuggestedUnit(!editing && t?.default_unit ? `Suggested for ${t.name}. Change it if this one is different.` : null);
    if (!editing && !v.code.trim() && t?.code_prefix) {
      start(async () => {
        const code = await nextCodeAction(typeId);
        if (code) setV((s) => (s.code.trim() ? s : { ...s, code }));
      });
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          if (!editing && !photo) return setError("Add a photo of the machine");
          if (editing) {
            const r = await updateAssetAction(v);
            if (!r.ok) return setError(r.error);
            router.push(`/assets/${initial.id}`);
          } else {
            const fd = new FormData();
            fd.set("data", JSON.stringify(v));
            fd.set("photo", photo!);
            const r = await createAssetAction(fd);
            if (!r.ok) return setError(r.error);
            router.push(r.photoSaved ? `/assets/${r.id}` : `/setup/assets/${r.id}?photo=failed`);
          }
          router.refresh();
        });
      }}
    >
      {editing ? null : <PhotoPicker file={photo} onFile={setPhoto} />}
      <Select id="asset-type" label="Type" value={v.assetTypeId} onChange={pickType} options={opts.types} empty="Pick a type" />
      <Field id="asset-code" label="Code" autoCapitalize="characters" value={v.code} onChange={text("code")} />
      <Field id="asset-name" label="Name" value={v.name} onChange={text("name")} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="asset-make" label="Make" value={v.make} onChange={text("make")} />
        <Field id="asset-model" label="Model" value={v.model} onChange={text("model")} />
      </div>
      <Field id="asset-year" label="Year" inputMode="numeric" maxLength={4} value={v.year} onChange={text("year")} />

      {editing ? null : (
        <>
          <div className="grid gap-1.5">
            <span className="text-base font-medium">Track servicing by</span>
            <Segmented
              label="Track servicing by"
              value={v.trackingUnit as TrackingUnit}
              onChange={(u) => {
                set("trackingUnit")(u);
                setSuggestedUnit(null);
              }}
              options={[
                { value: "hours", label: UNIT_LABELS.hours.name },
                { value: "km", label: UNIT_LABELS.km.name },
              ]}
            />
            {suggestedUnit ? <p className="text-sm text-muted-foreground">{suggestedUnit}</p> : null}
          </div>
          <Field
            id="asset-reading"
            label={v.trackingUnit ? `Current ${UNIT_LABELS[v.trackingUnit].name.toLowerCase()}` : "Current reading"}
            inputMode="decimal"
            value={v.reading}
            onChange={text("reading")}
          />
        </>
      )}

      {editing ? (
        <div className="grid gap-1.5">
          <Label htmlFor="asset-status" className="text-base">
            Status
          </Label>
          <select id="asset-status" value={v.status} onChange={(e) => set("status")(e.target.value as AssetStatus)} className="h-12 rounded-[0.875rem] border border-input bg-background px-3 text-lg">
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Select id="asset-site" label="Yard" value={v.siteId} onChange={set("siteId")} options={opts.sites} empty="No yard" />
      <Select id="asset-crew" label="Crew" value={v.crewId} onChange={set("crewId")} options={opts.crews} empty="No crew" />
      <Select id="asset-owner" label="Owner" value={v.ownerEntityId} onChange={set("ownerEntityId")} options={opts.owners} empty="Not set" />
      <div className="grid grid-cols-2 gap-3">
        <Field id="asset-rego" label="Rego" autoCapitalize="characters" value={v.rego} onChange={text("rego")} />
        <Field id="asset-vin" label="VIN / serial" value={v.vinSerial} onChange={text("vinSerial")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="asset-notes" className="text-base">
          Notes
        </Label>
        <textarea id="asset-notes" rows={3} value={v.notes} onChange={text("notes")} className="rounded-[0.875rem] border border-input bg-background p-3 text-lg" />
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {editing ? "Save" : "Add asset"}
      </Button>
    </form>
  );
}
