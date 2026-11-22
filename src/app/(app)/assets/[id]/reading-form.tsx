"use client";
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
          const r = await recordReadingAction({ assetId, reading });
          if (!r.ok) return setError(r.error);
          setReading("");
          setMsg(r.lower ? "Saved, but it's lower than the last reading, so the current reading wasn't changed. The workshop will check it." : "Saved");
        });
      }}
    >
      <Field id="new-reading" label={`New reading (${unitName.toLowerCase()})`} inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} />
      <FormError message={error} />
      {msg ? <p role="status">{msg}</p> : null}
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        Save reading
      </Button>
    </form>
  );
}
