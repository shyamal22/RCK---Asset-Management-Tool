import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { formatDate, formatDateTime } from "@/lib/dates";
import { STATUS_LABELS, STATUS_TONE, UNIT_LABELS, formatReading } from "@/lib/assets/labels";
import { getAsset, photoUrls, recentReadings, runAs } from "@/lib/assets/queries";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { ReadingForm } from "./reading-form";
import { flagsFor, listReports } from "@/lib/breakdowns/queries";
import { SEVERITY, ago } from "@/lib/breakdowns/labels";
import { FlagBadge } from "@/components/assets/flag-badge";

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("assets", "view");
  const { id } = await params;
  const data = await runAs(me, async (tx) => {
    const a = await getAsset(tx, id);
    return a
      ? {
          a,
          readings: await recentReadings(tx, a.id),
          flag: (await flagsFor(tx, [a.id]))[a.id],
          reports: can(me.actor, "defects", "view") ? await listReports(tx, { status: "open", asset: a.id }) : [],
        }
      : null;
  });
  if (!data) notFound();
  const { a, readings, flag, reports } = data;
  const photo = a.photo_path ? (await photoUrls([a.photo_path]))[a.photo_path] : undefined;
  const canEdit = can(me.actor, "assets", "edit");
  const details: [string, string | null][] = [
    ["Type", a.type_name],
    ["Make", a.make],
    ["Model", a.model],
    ["Year", String(a.year)],
    ["Yard", a.site_name],
    ["Crew", a.crew_name],
    ["Owner", a.owner_name],
    ["Rego", a.rego],
    ["VIN / serial", a.vin_serial],
  ];
  return (
    <div className="grid max-w-3xl gap-6">
      <header className="flex items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card sm:size-32">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={photo} alt={`${a.code} ${a.name}`} className="size-full object-cover" />
          ) : (
            <Truck className="size-10 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-bold">
            {a.code} <span className="font-normal">{a.name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot tone={STATUS_TONE[a.status]} label={STATUS_LABELS[a.status]} />
            {flag ? <FlagBadge {...flag} /> : null}
          </div>
          <p className="text-lg">
            <span className="font-bold tabular-nums" data-testid="current-reading">
              {formatReading(a.current_reading, a.tracking_unit)}
            </span>
            {a.current_reading_at ? <span className="text-sm text-muted-foreground tabular-nums"> · {formatDate(a.current_reading_at)}</span> : null}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {can(me.actor, "defects", "create") ? (
          <Button asChild size="lg" variant="accent">
            <Link href={`/reports/new?asset=${a.id}`}>Report damage</Link>
          </Button>
        ) : null}
        {canEdit ? (
          <Button asChild variant="outline" size="lg" className="h-12 w-fit">
            <Link href={`/setup/assets/${a.id}`}>Edit asset</Link>
          </Button>
        ) : null}
      </div>

      {reports.length ? (
        <section aria-labelledby="open-reports-h" className="grid gap-2">
          <h2 id="open-reports-h" className="text-xl font-bold">Reports</h2>
          <ul className="grid gap-2">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="press surface flex min-h-14 items-center justify-between gap-3 p-3">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{r.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {r.raised_by_name ?? "Someone"} · {ago(r.created_at)}
                    </span>
                  </span>
                  <StatusDot tone={SEVERITY[r.severity].tone} label={SEVERITY[r.severity].label} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Details" className="grid gap-2">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1">
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        {a.notes ? <p className="whitespace-pre-wrap">{a.notes}</p> : null}
      </section>

      <section aria-labelledby="readings-h" className="grid gap-3">
        <h2 id="readings-h" className="text-xl font-bold">{UNIT_LABELS[a.tracking_unit].name}</h2>
        {canEdit ? (
          <div className="max-w-sm">
            <ReadingForm assetId={a.id} unitName={UNIT_LABELS[a.tracking_unit].name} />
          </div>
        ) : null}
        {readings.length ? (
          <ul className="grid gap-1" aria-label="Recent readings">
            {readings.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
                <span className="font-bold tabular-nums">
                  {formatReading(r.reading, r.unit)}
                  {r.lower_than_previous ? <span className="ml-2 font-normal text-status-red">Lower than previous</span> : null}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(r.read_at)}
                  {r.entered_by ? ` · ${r.entered_by}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
