"use client";
import { safeAction } from "@/lib/safe-action";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { setSharedTabletAction } from "@/app/(auth)/switch-actions";

export function SharedTablet({ isShared }: { isShared: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState("Workshop tablet");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = (shared: boolean) =>
    start(async () => {
      const r = await safeAction(setSharedTabletAction({ shared, label }));
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  return (
    <section className="grid gap-3 border-t pt-6" aria-label="Shared tablet">
      {isShared ? (
        <Button variant="outline" size="lg" className="h-12" disabled={pending} onClick={() => save(false)}>
          Stop sharing this device
        </Button>
      ) : (
        <>
          <Field id="tablet-label" label="Tablet name" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button size="lg" className="h-12" disabled={pending} onClick={() => save(true)}>
            Make this a shared tablet
          </Button>
        </>
      )}
      <FormError message={error} />
    </section>
  );
}
