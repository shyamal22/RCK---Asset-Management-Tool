import Link from "next/link";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { runAs } from "@/lib/assets/queries";
import { formatReading } from "@/lib/assets/labels";
import { ago } from "@/lib/breakdowns/labels";
import { listPrechecks } from "@/lib/prechecks/queries";
import { FLAG_LABELS } from "@/lib/prechecks/labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DOT = { green: "bg-status-green", yellow: "bg-status-yellow", red: "bg-status-red" } as const;

/** Pre-checks tab: start one (Crew/Supervisor), recent checks, templates (Workshop/Director). */
export default async function PrechecksPage() {
  const me = await requirePermission("prechecks", "view");
  const list = await runAs(me, (tx) => listPrechecks(tx, { limit: 60 }));
  const canDo = can(me.actor, "prechecks", "create");
  const canBuild = can(me.actor, "precheck_templates", "edit");
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-large-title">Pre-checks</h1>
        {canBuild ? (
          <Button asChild variant="outline" size="lg">
            <Link href="/prechecks/templates">Templates</Link>
          </Button>
        ) : null}
      </div>
      {canDo ? (
        <Button asChild variant="accent" size="xl" className="w-full">
          <Link href="/prechecks/new">
            <ClipboardCheck aria-hidden /> Start pre-check
          </Link>
        </Button>
      ) : null}
      {list.length ? (
        <ul className="surface divide-y divide-border overflow-hidden" aria-label="Recent pre-checks">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/prechecks/${p.id}`} aria-label={`${p.code} ${p.asset_name}, ${FLAG_LABELS[p.flag]}`} className="press flex min-h-16 items-center gap-3 px-4 py-2.5">
                <span className={cn("size-3 shrink-0 rounded-full", DOT[p.flag])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">
                    <b>{p.code}</b> {p.asset_name}
                  </span>
                  <span className="block truncate text-footnote text-muted-foreground">
                    {p.done_by_name ?? "Someone"} · {ago(p.done_at)} · {formatReading(p.reading, p.tracking_unit)}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-muted-foreground">No pre-checks yet</p>
      )}
    </div>
  );
}
