import Link from "next/link";
import { sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { formatDateTime } from "@/lib/dates";
import { formatReading } from "@/lib/assets/labels";
import { photoUrls, runAs } from "@/lib/assets/queries";
import { getReport } from "@/lib/breakdowns/queries";
import { REPORT_STATUS, SEVERITY, ago } from "@/lib/breakdowns/labels";
import { StatusDot } from "@/components/status-dot";
import { CloseReport } from "./close-report";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const me = await requirePermission("defects", "view");
  const { id } = await params;
  const { sent } = await searchParams;
  const { r, company } = await runAs(me, async (tx) => ({
    r: await getReport(tx, id),
    company: ((await tx.execute(sql`select name, logo_path from public.companies where id = app.current_company_id()`)) as unknown as {
      name: string;
      logo_path: string | null;
    }[])[0],
  }));
  if (!r) notFound();
  const urls = await photoUrls([...r.photo_paths, company?.logo_path ?? null]);
  const logo = company?.logo_path ? urls[company.logo_path] : undefined;
  const sev = SEVERITY[r.severity];
  return (
    <div className="grid max-w-3xl gap-6">
      {/* Report header: company logo (Setup → Company) */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL
          <img src={logo} alt={`${company?.name ?? "Company"} logo`} className="max-h-12 w-auto max-w-[60%] object-contain" />
        ) : (
          <span className="text-lg font-bold">{company?.name}</span>
        )}
        <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Damage report</span>
      </div>
      {sent ? (
        <p role="status" className="surface p-4 font-semibold">
          Report sent. The workshop can see it now.
        </p>
      ) : null}
      <header className="grid gap-2">
        <Link href={`/assets/${r.asset_id}`} className="w-fit text-base font-semibold text-[var(--indigo)]">
          {r.code} {r.asset_name}
        </Link>
        <h1 className="text-3xl font-bold">{r.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <StatusDot tone={r.status === "open" ? sev.tone : null} label={sev.label} />
          <span className="rounded-full bg-muted px-3 py-0.5 text-sm font-semibold">{REPORT_STATUS[r.status]}</span>
          <span className="text-sm text-muted-foreground">
            {r.raised_by_name ?? "Someone"} · {ago(r.created_at)} ({formatDateTime(r.created_at)})
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Photos">
        {r.photo_paths.map((p, i) =>
          urls[p] ? (
            <a key={p} href={urls[p]} target="_blank" rel="noreferrer" className="surface block aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
              <img src={urls[p]} alt={`Damage photo ${i + 1}`} className="size-full object-cover" />
            </a>
          ) : null,
        )}
      </div>

      <section className="grid gap-2">
        <h2 className="text-xl font-bold">Details</h2>
        <p className="whitespace-pre-wrap text-lg">{r.details}</p>
        <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1 text-base">
          {r.reading ? (
            <>
              <dt className="text-muted-foreground">Reading</dt>
              <dd>{formatReading(r.reading, r.tracking_unit)}</dd>
            </>
          ) : null}
          {r.lat !== null && r.lng !== null ? (
            <>
              <dt className="text-muted-foreground">Location</dt>
              <dd>
                <a className="text-[var(--indigo)] underline" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">
                  Open in maps
                </a>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      {r.status !== "open" ? (
        <section className="surface grid gap-1 p-4">
          <h2 className="text-lg font-bold">{r.status === "fixed" ? "Fixed" : "Dismissed"}</h2>
          <p>{r.closed_note}</p>
          <p className="text-sm text-muted-foreground">
            {r.closed_by_name ?? ""} {r.closed_at ? `· ${formatDateTime(r.closed_at)}` : ""}
          </p>
        </section>
      ) : can(me.actor, "defects", "triage") ? (
        <CloseReport id={r.id} />
      ) : (
        <p className="text-muted-foreground">The workshop will look at this and close it when it&apos;s sorted.</p>
      )}
    </div>
  );
}
