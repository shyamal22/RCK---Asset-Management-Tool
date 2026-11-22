import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requireActive } from "@/lib/auth/session";
import { can } from "@/lib/permissions/check";
import { formatDateTime } from "@/lib/dates";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PendingUserCard } from "./pending-user-card";
import { USER_TYPE_LABELS, type UserType } from "@/lib/permissions/types";

export const dynamic = "force-dynamic";

type Pending = { id: string; name: string; email: string | null; mobile: string | null; created_at: string };

export default async function UsersPage() {
  const me = await requireActive();
  const canApprove = can(me.actor, "users", "approve");
  if (!canApprove && !can(me.actor, "users", "view_pending")) notFound();
  const canViewAll = can(me.actor, "users", "view");
  const { pending, crews, people } = await asUser({ id: me.id, sessionId: me.sessionId }, async (tx) => ({
    people: canViewAll
      ? ((await tx.execute(sql`select u.id, u.name, u.user_type, u.status, c.name as crew
          from public.users u left join public.crews c on c.id = u.crew_id
          where u.status in ('active', 'deactivated') order by u.status, u.name`)) as unknown as {
          id: string; name: string; user_type: UserType | null; status: string; crew: string | null;
        }[])
      : [],
    pending: (await tx.execute(sql`select id, name, email, mobile, created_at from public.users
      where status = 'pending' order by created_at`)) as unknown as Pending[],
    crews: (await tx.execute(sql`select id, name from public.crews where deleted_at is null order by name`)) as unknown as {
      id: string;
      name: string;
    }[],
  }));
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-bold">Waiting for approval</h1>
      {pending.length === 0 ? <p className="text-lg">No one waiting</p> : null}
      {pending.map((u) => (
        <PendingUserCard
          key={u.id}
          user={{ id: u.id, name: u.name, contact: u.email ?? u.mobile ?? "", signedUp: formatDateTime(u.created_at) }}
          crews={crews}
          canApprove={canApprove}
        />
      ))}
      {canViewAll ? (
        <>
          <h2 className="mt-6 text-2xl font-bold">People</h2>
          <ul className="divide-y rounded-lg border" aria-label="People">
            {people.map((p) => (
              <li key={p.id}>
                <Link href={`/setup/users/${p.id}`} className="press flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                  <span className={p.status === "deactivated" ? "text-muted-foreground line-through" : "font-bold"}>{p.name}</span>
                  <span className="text-right text-sm">
                    {p.user_type ? USER_TYPE_LABELS[p.user_type] : ""}
                    {p.crew ? ` · ${p.crew}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
