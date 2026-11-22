"use client";
import { StatusNote } from "@/components/feedback/status-note";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { UNIT_LABELS, type TrackingUnit } from "@/lib/assets/labels";
import { archiveAssetAction, changeUnitAction } from "../actions";

export function ChangeUnit({ assetId, unit }: { assetId: string; unit: TrackingUnit }) {
  const other: TrackingUnit = unit === "hours" ? "km" : "hours";
  const [reading, setReading] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await changeUnitAction({ assetId, unit: other, reading, reason });
          if (!r.ok) return setError(r.error);
          setMsg(`Now tracked by ${UNIT_LABELS[other].name.toLowerCase()}`);
        });
      }}
    >
      <Field id="unit-reading" label={`Current ${UNIT_LABELS[other].name.toLowerCase()}`} inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} />
      <Field id="unit-reason" label="Reason for the change" value={reason} onChange={(e) => setReason(e.target.value)} />
      <FormError message={error} />
      <StatusNote message={msg} />
      <Button type="submit" variant="outline" size="lg" className="h-12" disabled={pending}>
        Change to {UNIT_LABELS[other].name.toLowerCase()}
      </Button>
    </form>
  );
}

export function ArchiveAsset({ assetId, code }: { assetId: string; code: string }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(`Archive ${code}? It leaves all lists but its history is kept.`)) return;
        start(async () => {
          setError(null);
          const r = await archiveAssetAction({ assetId, reason });
          if (r && !r.ok) setError(r.error);
        });
      }}
    >
      <Field id="archive-reason" label="Reason for archiving (sold, scrapped…)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <FormError message={error} />
      <Button type="submit" variant="outline" size="lg" className="h-12" disabled={pending}>
        Archive asset
      </Button>
    </form>
  );
}
