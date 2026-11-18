import type { ActiveUser } from "@/lib/auth/session";
import { Count, Empty, Section } from "./section";

/** One home per user type (docs/05). Sections fill in as each milestone lands. */
export function CrewHome() {
  return (
    <div className="grid gap-4">
      <Section title="Today's pre-start">
        <Empty>No machines yet</Empty>
      </Section>
      <Section title="My faults">
        <Empty>None</Empty>
      </Section>
    </div>
  );
}

export function SupervisorHome() {
  return (
    <div className="grid gap-4">
      <Section title="Crew machines">
        <Empty>No machines yet</Empty>
      </Section>
      <Section title="Today's pre-starts">
        <Empty>No machines yet</Empty>
      </Section>
      <Section title="Open faults">
        <Empty>None</Empty>
      </Section>
    </div>
  );
}

export function WorkshopHome() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
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

export function OfficeHome({ pending }: { pending: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
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

export function DirectorHome({ pending }: { pending: number }) {
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
      <Section title="Critical defects">
        <Empty>None</Empty>
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
