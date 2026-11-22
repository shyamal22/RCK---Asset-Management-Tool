"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { closeBreakdownAction } from "../actions";

/** Workshop / Director: close as fixed (what was done) or dismissed (why). */
export function CloseReport({ id }: { id: string }) {
  const [status, setStatus] = useState<"fixed" | "dismissed">("fixed");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="surface grid gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await closeBreakdownAction({ id, status, note });
          if (!r.ok) setError(r.error);
        });
      }}
    >
      <h2 className="text-xl font-bold">Close this report</h2>
      <Segmented
        label="Outcome"
        value={status}
        onChange={setStatus}
        options={[
          { value: "fixed", label: "Fixed" },
          { value: "dismissed", label: "Dismiss" },
        ]}
      />
      <Field
        id="close-note"
        label={status === "fixed" ? "What was done" : "Reason for dismissing"}
        placeholder={status === "fixed" ? "e.g. Replaced hose, tested under load" : "e.g. Not a fault, already booked in"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {status === "fixed" ? "Mark fixed" : "Dismiss report"}
      </Button>
    </form>
  );
}
