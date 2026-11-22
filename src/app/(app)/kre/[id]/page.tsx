import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { formatDate, formatDateTime } from "@/lib/dates";
import { publicEnv } from "@/lib/env";
import { asPlatformAdmin, requirePlatformAdmin } from "@/lib/platform/guard";
import { USER_TYPE_LABELS } from "@/lib/permissions/types";
import { clientStatus, type ClientRow } from "../status";
import { StatusDot } from "@/components/status-dot";
import { EndSupportButton, InviteDirectorForm, ResendInviteButton, StartSupportForm, SuspendControls } from "./controls";

export const dynamic = "force-dynamic";

type Invite = { name: string; email: string; created_at: string; accepted_at: string | null };
type Person = { id: string; name: string; email: string | null; mobile: string | null; user_type: keyof typeof USER_TYPE_LABELS | null; status: string };
type Support = { id: string; reason: string; ends_at: string };
type Named = { id: string; name: string };

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invited?: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const { invited } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await asPlatformAdmin(async (tx) => {
    const [client] = (await tx.execute(sql`select * from public.kre_companies() where id = ${id}`)) as unknown as ClientRow[];
    if (!client) return null;
    const q = async <T,>(s: ReturnType<typeof sql>) => (await tx.execute(s)) as unknown as T[];
    const [invite] = await q<Invite>(sql`select * from public.kre_invite_details(${id})`);
    const [{ code }] = await q<{ code: string }>(sql`select public.kre_signup_code(${id}) as code`);
    const people = await q<Person>(sql`select * from public.kre_company_users(${id})`);
    const [support] = await q<Support>(sql`select * from public.kre_my_support(${id})`);
    // Only returns rows while support access is active (RLS).
    const yards = await q<Named>(sql`select id, name from public.sites where company_id = ${id} and deleted_at is null order by name`);
    const crews = await q<Named>(sql`select id, name from public.crews where company_id = ${id} and deleted_at is null order by name`);
    return { client, invite, code, people, support, yards, crews };
  });
  if (!data) notFound();
  const { client, invite, code, people, support, yards, crews } = data;
  const status = clientStatus(client);
  const joinUrl = `${publicEnv().NEXT_PUBLIC_APP_URL}/join/${code}`;
  const hasDirector = people.some((p) => p.user_type === "director" && p.status === "active");

  return (
    <div className="grid max-w-3xl gap-8">
      <header className="grid gap-1">
        <h1 className="text-title2 font-bold">{client.name}</h1>
        <StatusDot tone={status.tone} label={status.label} />
      </header>

      {invited ? (
        <p role="status" className="rounded-xl border p-3">
          {invited === "email" ? "Invite emailed" : "Email not set up. Send the link below."}
        </p>
      ) : null}

      <section className="grid gap-3" aria-labelledby="director-h">
        <h2 id="director-h" className="text-title3 font-bold">Director</h2>
        {invite?.accepted_at || hasDirector ? (
          <p>{invite ? `${invite.name} (${invite.email}) signed up ${formatDate(invite.accepted_at ?? invite.created_at)}` : "Signed up"}</p>
        ) : invite ? (
          <div className="grid gap-3">
            <p>
              Invited {invite.name} ({invite.email}) · {formatDate(invite.created_at)}
            </p>
            <p className="break-all rounded-xl border p-3 font-mono text-footnote" data-testid="invite-url">
              {joinUrl}
            </p>
            <ResendInviteButton companyId={client.id} />
          </div>
        ) : null}
        {!hasDirector ? (
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold">{invite ? "Invite someone else" : "Invite a Director"}</summary>
            <div className="mt-3 max-w-md">
              <InviteDirectorForm companyId={client.id} />
            </div>
          </details>
        ) : null}
      </section>

      <section className="grid gap-3" aria-labelledby="people-h">
        <h2 id="people-h" className="text-title3 font-bold">People</h2>
        {people.length === 0 ? <p className="text-muted-foreground">Nobody has signed up yet.</p> : null}
        <ul className="grid gap-1">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>
                <span className="font-bold">{p.name}</span> <span className="text-muted-foreground">{p.email ?? p.mobile}</span>
              </span>
              <span className="text-footnote">{p.status === "active" && p.user_type ? USER_TYPE_LABELS[p.user_type] : p.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3" aria-labelledby="support-h">
        <h2 id="support-h" className="text-title3 font-bold">Support access</h2>
        {support ? (
          <div className="grid gap-3">
            <p>
              Read-only until {formatDateTime(support.ends_at)}. Reason: {support.reason}
            </p>
            <EndSupportButton companyId={client.id} supportId={support.id} />
            <div className="grid gap-2 rounded-xl border p-3">
              <p className="font-bold">Yards</p>
              <p>{yards.map((y) => y.name).join(", ") || "None"}</p>
              <p className="font-bold">Crews</p>
              <p>{crews.map((c) => c.name).join(", ") || "None"}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-md">
            <StartSupportForm companyId={client.id} />
          </div>
        )}
      </section>

      <section className="grid max-w-md gap-3" aria-labelledby="hold-h">
        <h2 id="hold-h" className="text-title3 font-bold">Account</h2>
        <SuspendControls companyId={client.id} suspended={!!client.suspended_at} />
      </section>
    </div>
  );
}
