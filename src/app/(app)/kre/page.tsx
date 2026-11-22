import Link from "next/link";
import { sql } from "drizzle-orm";
import { asPlatformAdmin, requirePlatformAdmin } from "@/lib/platform/guard";
import { NewClientForm } from "./new-client-form";
import { clientStatus, type ClientRow } from "./status";
import { StatusDot } from "@/components/status-dot";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requirePlatformAdmin();
  const clients = (await asPlatformAdmin((tx) => tx.execute(sql`select * from public.kre_companies()`))) as unknown as ClientRow[];
  return (
    <div className="grid max-w-3xl gap-8">
      <section className="grid gap-3">
        <h1 className="text-2xl font-bold">Clients</h1>
        {clients.length === 0 ? <p className="text-muted-foreground">No clients yet.</p> : null}
        <ul className="grid gap-2">
          {clients.map((c) => {
            const s = clientStatus(c);
            return (
              <li key={c.id}>
                <Link href={`/kre/${c.id}`} className="press surface flex min-h-14 items-center justify-between gap-4 px-4 py-3">
                  <span className="font-bold">{c.name}</span>
                  <span className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{Number(c.active_users)} users</span>
                    <StatusDot tone={s.tone} label={s.label} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="grid max-w-md gap-3">
        <h2 className="text-xl font-bold">New client</h2>
        <NewClientForm />
      </section>
    </div>
  );
}
