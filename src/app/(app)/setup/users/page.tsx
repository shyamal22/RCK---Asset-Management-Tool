import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requireActive } from "@/lib/auth/session";
import { can } from "@/lib/permissions/check";
import { formatDateTime } from "@/lib/dates";
import { notFound } from "next/navigation";
import { PendingUserCard } from "./pending-user-card";

export const dynamic = "force-dynamic";

type Pending = { id: string; name: string; email: string | null; mobile: string | null; created_at: string };

export default async function UsersPage() {
  const me = await requireActive();
  const canApprove = can(me.actor, "users", "approve");
  if (!canApprove && !can(me.actor, "users", "view_pending")) notFound();
  const { pending, crews } = await asUser({ id: me.id, sessionId: me.sessionId }, async (tx) => ({
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
    </div>
  );
}
