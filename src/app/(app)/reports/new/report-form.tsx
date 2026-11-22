"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { Field, FormError } from "@/components/field";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { cn } from "@/lib/utils";
import { shrinkPhoto } from "@/lib/assets/shrink";
import { raiseBreakdownAction } from "../actions";

type Asset = { id: string; code: string; name: string; unit: "hours" | "km"; photo?: string };

/** Best effort: a quick location fix if the phone allows it; never blocks the report. */
function locate(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 },
    );
  });
}

export function ReportForm({ asset }: { asset: Asset }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<"usable" | "unusable" | "">("");
  const [reading, setReading] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!photos.length) return setError("Add at least one photo");
        if (!severity) return setError("Is it still usable?");
        start(async () => {
          const where = await locate();
          const fd = new FormData();
          fd.set("data", JSON.stringify({ assetId: asset.id, title, details, severity, reading, ...(where ?? {}) }));
          photos.forEach((p) => fd.append("photos", p.file));
          const r = await raiseBreakdownAction(fd);
          if (!r.ok) return setError(r.error);
          router.push(`/reports/${r.id}?sent=1`);
        });
      }}
    >
      <div className="grid gap-2">
        <span className="text-base font-medium">Photos</span>
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          aria-label="Damage photos"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            const shrunk = await Promise.all(files.map(shrinkPhoto));
            setPhotos((ps) => [...ps, ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 8));
            e.target.value = "";
          }}
        />
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="surface relative aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.url} alt={`Damage photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-4" aria-hidden />
                <span className="sr-only">Remove photo {i + 1}</span>
              </button>
            </div>
          ))}
          {photos.length < 8 ? (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[1.25rem] border-2 border-dashed border-input text-sm font-semibold text-[var(--indigo)]"
            >
              <Camera className="size-7" aria-hidden />
              {photos.length ? "Add more" : "Add photo"}
            </button>
          ) : null}
        </div>
      </div>

      <Field id="report-title" label="What's wrong?" placeholder="e.g. Hydraulic leak on the drum" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid gap-1.5">
        <Label htmlFor="report-details" className="text-base">
          Details
        </Label>
        <textarea
          id="report-details"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Where on the machine, what happened, anything the workshop should know"
          className="rounded-[0.875rem] border border-input bg-background p-3 text-lg"
        />
      </div>

      <div className="grid gap-2">
        <span className="text-base font-medium">Can it still be used?</span>
        <div role="radiogroup" aria-label="Can it still be used?" className="grid grid-cols-2 gap-2">
          {(
            [
              ["usable", "Still usable", "bg-status-yellow"],
              ["unusable", "Unusable", "bg-status-red"],
            ] as const
          ).map(([v, label, dot]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={severity === v}
              onClick={() => setSeverity(v)}
              className={cn(
                "flex h-16 items-center justify-center gap-3 rounded-[1.25rem] border-2 text-lg font-bold transition-colors",
                severity === v ? (v === "unusable" ? "border-status-red bg-status-red/10" : "border-status-yellow bg-status-yellow/10") : "border-input",
              )}
            >
              <span className={cn("size-3.5 rounded-full", dot)} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {severity === "unusable" ? <p className="text-sm text-muted-foreground">{asset.code} will be marked Unusable until the workshop clears it.</p> : null}
      </div>

      <Field
        id="report-reading"
        label={`Current ${asset.unit === "hours" ? "hours" : "kilometres"} (if you know)`}
        inputMode="decimal"
        value={reading}
        onChange={(e) => setReading(e.target.value)}
      />
      <FormError message={error} />
      <SubmitButton pending={pending} className="w-full">
        {pending ? "Sending report…" : "Send report"}
      </SubmitButton>
    </form>
  );
}
