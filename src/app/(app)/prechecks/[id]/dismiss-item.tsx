"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/field";
import { safeAction } from "@/lib/safe-action";
import { dismissPrecheckItemAction } from "../actions";

/** Workshop / Director: dismiss a flagged item with a reason. (Create work order arrives with Milestone 3.) */
export function DismissItem({ id, precheckId }: { id: string; precheckId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <Button variant="outline" size="lg" className="justify-self-start" onClick={() => setOpen(true)}>
        Dismiss
      </Button>
    );
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await safeAction(dismissPrecheckItemAction({ id, precheckId, reason }));
          if (!r.ok) return setError(r.error);
          router.refresh();
        });
      }}
    >
      <input
        aria-label="Reason"
        placeholder="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-12 rounded-xl border border-input bg-card px-4 text-lg"
        autoFocus
      />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending || !reason.trim()}>
          Dismiss
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
