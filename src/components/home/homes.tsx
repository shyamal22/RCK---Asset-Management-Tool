import Link from "next/link";
import { UserPlus, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportRow } from "@/lib/breakdowns/queries";
import type { AssetRow } from "@/lib/assets/queries";
import type { AttentionRow, FleetSummary, ReadingAlert, TypeRow } from "@/lib/home/queries";
import { AttentionStrip, FleetByType, FleetTiles, Greeting, MachineStrip, Panel, ReadingAlerts, ReportFeed } from "./widgets";

/** Everything a home screen might show; each user type picks what matters to them (docs/05). */
export type HomeData = {
  name: string;
  pending: number;
  fleet: FleetSummary;
  attention: AttentionRow[];
  reports: ReportRow[];
  machines: AssetRow[];
  readings: ReadingAlert[];
  byType: TypeRow[];
  photos: Record<string, string>;
};

/** The crew's two jobs: the daily pre-start is the one primary (tangerine) action; damage is secondary. */
function CrewActions() {
  return (
    <div className="grid gap-3 md:flex">
      <Button asChild variant="accent" size="xl" className="w-full md:w-fit">
        <Link href="/prechecks/new">
          <ClipboardCheck aria-hidden /> Start pre-check
        </Link>
      </Button>
      <Button asChild variant="outline" size="xl" className="w-full md:w-fit">
        <Link href="/reports/new">Report damage</Link>
      </Button>
    </div>
  );
}

function Pending({ n }: { n: number }) {
  return (
    <Panel title="Waiting for approval" href="/setup/users">
      {n ? (
        <Link href="/setup/users" className="press flex min-h-14 items-center gap-3 rounded-xl p-1.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-[var(--indigo)]">
            <UserPlus className="size-5" aria-hidden />
          </span>
          <span className="text-body">
            <span className="font-bold tabular-nums">{n}</span> to approve
          </span>
        </Link>
      ) : (
        <p className="text-muted-foreground">None</p>
      )}
    </Panel>
  );
}

export function CrewHome({ d }: { d: HomeData }) {
  const mine = d.reports;
  return (
    <div className="grid gap-5">
      <Greeting />
      <CrewActions />
      <Panel title="My machines" href="/assets?type=all">
        <MachineStrip items={d.machines} photos={d.photos} />
      </Panel>
      <Panel title="My reports" href="/reports">
        <ReportFeed reports={mine} photos={d.photos} empty="None open" />
      </Panel>
    </div>
  );
}

export function SupervisorHome({ d }: { d: HomeData }) {
  return (
    <div className="grid gap-5">
      <Greeting />
      <CrewActions />
      <Panel title="Needs attention" href="/assets?view=list">
        <AttentionStrip rows={d.attention} photos={d.photos} />
      </Panel>
      <Panel title="Crew machines" href="/assets?type=all">
        <MachineStrip items={d.machines} photos={d.photos} />
      </Panel>
      <Panel title="Open reports" href="/reports">
        <ReportFeed reports={d.reports} photos={d.photos} />
      </Panel>
    </div>
  );
}

export function WorkshopHome({ d }: { d: HomeData }) {
  return (
    <div className="grid gap-5">
      <Greeting />
      <FleetTiles s={d.fleet} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Damage reports" href="/reports">
          <ReportFeed reports={d.reports} photos={d.photos} />
        </Panel>
        <Panel title="Readings to check">
          <ReadingAlerts rows={d.readings} />
        </Panel>
      </div>
      <Panel title="Needs attention" href="/assets?view=list">
        <AttentionStrip rows={d.attention} photos={d.photos} />
      </Panel>
    </div>
  );
}

export function OfficeHome({ d }: { d: HomeData }) {
  return (
    <div className="grid gap-5">
      <Greeting />
      <FleetTiles s={d.fleet} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Pending n={d.pending} />
        <Panel title="Damage reports" href="/reports">
          <ReportFeed reports={d.reports} photos={d.photos} />
        </Panel>
      </div>
    </div>
  );
}

export function DirectorHome({ d }: { d: HomeData }) {
  return (
    <div className="grid gap-5">
      <Greeting />
      {d.pending ? <Pending n={d.pending} /> : null}
      <FleetTiles s={d.fleet} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Fleet by type" href="/assets">
          <FleetByType rows={d.byType} />
        </Panel>
        <Panel title="Damage reports" href="/reports">
          <ReportFeed reports={d.reports} photos={d.photos} />
        </Panel>
      </div>
      <Panel title="Needs attention" href="/assets?view=list">
        <AttentionStrip rows={d.attention} photos={d.photos} />
      </Panel>
    </div>
  );
}
