"use client";
import { safeAction } from "@/lib/safe-action";
import { StatusNote } from "@/components/feedback/status-note";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { recordReadingAction } from "../actions";

export function ReadingForm({ assetId, unitName }: { assetId: string; unitName: string }) {
  const [reading, setReading] = useState("");
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
          setMsg(null);
          const r = await safeAction(recordReadingAction({ assetId, reading }));
          if (!r.ok) return setError(r.error);
          setReading("");
          setMsg(r.lower ? "Saved. Lower than the last reading, so the workshop will check it." : "Saved");
        });
      }}
    >
      <Field id="new-reading" label={`New reading (${unitName.toLowerCase()})`} inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} />
      <FormError message={error} />
      <StatusNote message={msg} />
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        Save reading
      </Button>
    </form>
  );
}
