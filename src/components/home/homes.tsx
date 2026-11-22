import type { ActiveUser } from "@/lib/auth/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Count, Empty, Section } from "./section";

export type ReportCounts = { red: number; yellow: number; mine: number };

function ReportDamage() {
  return (
    <Button asChild size="lg" className="h-14 w-full bg-[var(--tangerine)] text-lg text-[var(--onyx)] hover:bg-[var(--tangerine)]/90">
      <Link href="/reports/new">Report damage</Link>
    </Button>
  );
}

function OpenReports({ r }: { r: ReportCounts }) {
  return r.red + r.yellow ? (
    <>
      <Count n={r.red} href="/reports" label="Unusable" />
      <Count n={r.yellow} href="/reports" label="Still usable" />
    </>
  ) : (
    <Empty>None open</Empty>
  );
}

/** One home per user type (docs/05). Sections fill in as each milestone lands. */
export function CrewHome({ reports }: { reports: ReportCounts }) {
  return (
    <div className="grid gap-4">
      <ReportDamage />
      <Section title="Today's pre-start">
        <Empty>No machines yet</Empty>
      </Section>
      <Section title="My faults">
        {reports.mine ? <Count n={reports.mine} href="/reports" label="Open reports" /> : <Empty>None</Empty>}
      </Section>
    </div>
  );
}

export function SupervisorHome({ reports }: { reports: ReportCounts }) {
  return (
    <div className="grid gap-4">
      <ReportDamage />
      <Section title="Crew machines">
        <Empty>No machines yet</Empty>
      </Section>
      <Section title="Today's pre-starts">
        <Empty>No machines yet</Empty>
      </Section>
      <Section title="Open faults">
        <OpenReports r={reports} />
      </Section>
    </div>
  );
}

export function WorkshopHome({ reports }: { reports: ReportCounts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Damage reports" href="/reports">
        <OpenReports r={reports} />
      </Section>
      <Section title="Job board">
        <Empty>No jobs</Empty>
      </Section>
      <Section title="My jobs">
        <Empty>No jobs</Empty>
      </Section>
      <Section title="Services due this week">
        <Empty>None</Empty>
      </Section>
      <Section title="Low stock">
        <Empty>None</Empty>
      </Section>
    </div>
  );
}

export function OfficeHome({ pending, reports }: { pending: number; reports: ReportCounts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Damage reports" href="/reports">
        <OpenReports r={reports} />
      </Section>
      <Section title="Bills to match">
        <Empty>None</Empty>
      </Section>
      <Section title="POs awaiting approval">
        <Empty>None</Empty>
      </Section>
      <Section title="Compliance expiring in 30 days">
        <Empty>None</Empty>
      </Section>
      <Section title="Users">
        <Count n={pending} href="/setup/users" label="Waiting for approval" />
      </Section>
    </div>
  );
}

export function DirectorHome({ pending, reports }: { pending: number; reports: ReportCounts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {pending > 0 ? (
        <Section title="Users">
          <Count n={pending} href="/setup/users" label="Waiting for approval" />
        </Section>
      ) : null}
      <Section title="Spend vs budget">
        <Empty>No costs yet</Empty>
      </Section>
      <Section title="Critical defects" href="/reports">
        {reports.red ? <Count n={reports.red} href="/reports" label="Machines unusable (open reports)" /> : <Empty>None</Empty>}
      </Section>
      <Section title="Overdue services">
        <Empty>None</Empty>
      </Section>
      <Section title="Downtime">
        <Empty>None</Empty>
      </Section>
      <Section title="Cost per asset">
        <Empty>No costs yet</Empty>
      </Section>
    </div>
  );
}

export type HomeProps = { me: ActiveUser; pending: number };
