import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { photoUrls, runAs } from "@/lib/assets/queries";
import { formatReading } from "@/lib/assets/labels";
import { ago } from "@/lib/breakdowns/labels";
import { formatDateTime } from "@/lib/dates";
import { getPrecheck } from "@/lib/prechecks/queries";
import { FLAG_LABELS, answerLabel } from "@/lib/prechecks/labels";
import { PhotoViewer } from "@/components/photo-viewer";
import { cn } from "@/lib/utils";
import { DismissItem } from "./dismiss-item";

export const dynamic = "force-dynamic";

const DOT = { green: "bg-status-green", yellow: "bg-status-yellow", red: "bg-status-red" } as const;

/** Pre-check report (docs/07): header, then items, red/yellow first; Workshop/Director deal with flagged ones. */
export default async function PrecheckPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const me = await requirePermission("prechecks", "view");
  const { id } = await params;
  const { sent } = await searchParams;
  const p = await runAs(me, (tx) => getPrecheck(tx, id));
  if (!p) notFound();
  const urls = await photoUrls(p.answers.map((x) => x.photo_path));
  const triage = can(me.actor, "defects", "triage");

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      {sent ? (
        <p role="status" className="surface flex items-center gap-3 p-4 text-headline">
          <span className={cn("size-3 rounded-full", DOT[p.flag])} aria-hidden />
          Sent · {FLAG_LABELS[p.flag]}
        </p>
      ) : null}
      <header className="grid gap-1">
        <h1 className="text-title1">
          <Link href={`/assets/${p.asset_id}`} className="press rounded-lg">
            {p.code}
          </Link>{" "}
          <span className="font-normal">{p.asset_name}</span>
        </h1>
        <p className="text-footnote text-muted-foreground">
          {p.done_by_name ?? "Someone"} · <time dateTime={p.done_at} title={formatDateTime(p.done_at)}>{ago(p.done_at)}</time> ·{" "}
          {formatReading(p.reading, p.tracking_unit)}
        </p>
      </header>

      <ul className="grid gap-3" aria-label="Checks">
        {p.answers.map((x) => (
          <li key={x.id} className="surface grid gap-3 p-4">
            <div className="flex items-start gap-3">
              <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", DOT[x.flag])} aria-label={FLAG_LABELS[x.flag]} />
              <div className="min-w-0 flex-1">
                <p className="text-body">{x.question}</p>
                {x.note ? <p className="mt-1 text-footnote text-muted-foreground">{x.note}</p> : null}
              </div>
              <span className="shrink-0 text-headline">{answerLabel(x.answer_type, x.answer)}</span>
            </div>
            {x.photo_path && urls[x.photo_path] ? <PhotoViewer photos={[{ src: urls[x.photo_path], alt: `Photo: ${x.question}` }]} label={`Photo for ${x.question}`} /> : null}
            {x.flag !== "green" && x.status === "dismissed" ? (
              <p className="text-footnote text-muted-foreground">
                Dismissed{x.closed_by_name ? ` by ${x.closed_by_name}` : ""}: {x.closed_note}
              </p>
            ) : null}
            {x.flag !== "green" && x.status === "open" && triage ? <DismissItem id={x.id} precheckId={p.id} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
