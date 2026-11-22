import Link from "next/link";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CompanyPage from "../company/page";
import YardsCrewsPage from "../yards-crews/page";
import SignupLinkPage from "../signup-link/page";
import { finishSetupAction } from "./actions";

export const dynamic = "force-dynamic";

/** First-run guided setup (docs/10). Assets and pre-check template steps join in M1/M2. */
const STEPS = [
  { key: "company", label: "Company" },
  { key: "yards", label: "Yards and crews" },
  { key: "link", label: "Sign-up link" },
] as const;

export default async function StartPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const me = await requirePermission("settings", "edit");
  const { step } = await searchParams;
  const i = Math.max(0, STEPS.findIndex((s) => s.key === step));
  const [{ ready, company_ready }] = (await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
    tx.execute(sql`select (select count(*) from public.sites where deleted_at is null) > 0
                      and (select count(*) from public.crews where deleted_at is null) > 0 as ready,
                      (select nzbn is not null and workshop_manager_name is not null and finance_manager_name is not null
                         from public.companies where id = app.current_company_id()) as company_ready`),
  )) as unknown as { ready: boolean; company_ready: boolean }[];
  const blocked = (i === 0 && !company_ready) || (i === 1 && !ready);
  const next = STEPS[i + 1];

  return (
    <div className="grid max-w-md gap-6">
      <ol className="flex gap-2" aria-label="Setup steps">
        {STEPS.map((s, n) => (
          <li
            key={s.key}
            aria-current={n === i ? "step" : undefined}
            className={cn("h-1.5 flex-1 rounded-full", n <= i ? "bg-[var(--indigo)]" : "bg-muted")}
          >
            <span className="sr-only">{s.label}</span>
          </li>
        ))}
      </ol>
      {i === 1 ? <h1 className="text-2xl font-bold">{STEPS[i].label}</h1> : null}
      {i === 0 ? <CompanyPage /> : null}
      {i === 1 ? <YardsCrewsPage /> : null}
      {i === 2 ? <SignupLinkPage /> : null}
      {next ? (
        <Button asChild size="lg" className="h-14 text-lg" aria-disabled={blocked}>
          <Link href={blocked ? `?step=${STEPS[i].key}` : `?step=${next.key}`}>Next</Link>
        </Button>
      ) : (
        <form action={finishSetupAction}>
          <Button type="submit" size="lg" className="h-14 w-full text-lg">
            Finish
          </Button>
        </form>
      )}
      {i === 0 && !company_ready ? <p className="text-base">Fill in the company details and key contacts, then Save</p> : null}
      {i === 1 && !ready ? <p className="text-base">Add at least one yard and one crew</p> : null}
    </div>
  );
}
