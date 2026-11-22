"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { endSupportAccessAction } from "./actions";

export type ActiveSupport = { id: string; admin_name: string; reason: string; ends_at: string; endsLabel: string };

/** KRE support currently able to read (not change) this company's data. */
export function SupportAccess({ rows }: { rows: ActiveSupport[] }) {
  const [pending, start] = useTransition();
  if (!rows.length) return null;
  return (
    <section className="grid gap-3 rounded-xl border p-4" aria-labelledby="support-h">
      <h2 id="support-h" className="text-body font-bold">
        KRE support access
      </h2>
      {rows.map((r) => (
        <div key={r.id} className="grid gap-2">
          <p>
            {r.admin_name} can view (not change) your data until {r.endsLabel}. Reason: {r.reason}
          </p>
          <Button variant="outline" size="lg" className="h-12" disabled={pending} onClick={() => start(async () => void (await endSupportAccessAction({ id: r.id })))}>
            End access now
          </Button>
        </div>
      ))}
    </section>
  );
}
