import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { cn } from "@/lib/utils";
import { photoUrls, runAs } from "@/lib/assets/queries";
import { listReports } from "@/lib/breakdowns/queries";
import { SEVERITY, ago } from "@/lib/breakdowns/labels";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const me = await requirePermission("defects", "view");
  const { show } = await searchParams;
  const closed = show === "closed";
  const list = await runAs(me, (tx) => listReports(tx, { status: closed ? "closed" : "open" }));
  const photos = await photoUrls(list.map((r) => r.photo_paths[0] ?? r.asset_photo));
  return (
    <div className="grid max-w-3xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Damage reports</h1>
        {can(me.actor, "defects", "create") ? (
          <Button asChild size="lg" className="h-12 bg-[var(--tangerine)] text-[var(--onyx)] hover:bg-[var(--tangerine)]/90">
            <Link href="/reports/new">Report damage</Link>
          </Button>
        ) : null}
      </div>
      <div className="flex w-fit rounded-full border border-input bg-muted p-1 text-sm font-semibold">
        <Link href="/reports" aria-current={!closed ? "page" : undefined} className={cn("rounded-full px-4 py-1.5", !closed && "bg-primary text-primary-foreground")}>
          Open
        </Link>
        <Link href="/reports?show=closed" aria-current={closed ? "page" : undefined} className={cn("rounded-full px-4 py-1.5", closed && "bg-primary text-primary-foreground")}>
          Closed
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{closed ? "No closed reports yet." : "No open damage reports."}</p>
      ) : (
        <ul className="grid gap-2">
          {list.map((r) => {
            const thumb = photos[r.photo_paths[0] ?? r.asset_photo ?? ""];
            return (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="surface flex min-h-20 items-center gap-3 p-2 pr-4 hover:bg-accent" aria-label={`${r.code} ${r.title}`}>
                  <div className={cn("size-16 shrink-0 overflow-hidden rounded-xl border-l-4 bg-muted", r.severity === "unusable" ? "border-status-red" : "border-status-yellow")}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                    {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : null}
                  </div>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-lg font-bold">
                      {r.code} <span className="font-normal">{r.title}</span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {r.raised_by_name ?? "Someone"} · {ago(r.created_at)}
                      {closed ? ` · ${r.status === "fixed" ? "Fixed" : "Dismissed"}` : ""}
                    </span>
                  </div>
                  <StatusDot tone={SEVERITY[r.severity].tone} label={SEVERITY[r.severity].label} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
