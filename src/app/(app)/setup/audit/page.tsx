import Link from "next/link";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/permissions/check";
import { diff } from "@/lib/audit/diff";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { filterSchema, PAGE_SIZE, queryAudit } from "./query";

export const dynamic = "force-dynamic";

const shortDevice = (ua: string | null) => {
  if (!ua) return "";
  if (/iPhone|iPad/.test(ua)) return /iPad/.test(ua) ? "iPad" : "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS/.test(ua)) return "Mac";
  return ua.slice(0, 24);
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requirePermission("audit_log", "view");
  const f = filterSchema.parse(await searchParams);
  const { rows, people, actions, entities } = await asUser({ id: me.id, sessionId: me.sessionId }, async (tx) => ({
    rows: await queryAudit(tx, f, PAGE_SIZE + 1, (f.page - 1) * PAGE_SIZE),
    people: (await tx.execute(sql`select id, name from public.users order by name`)) as unknown as { id: string; name: string }[],
    actions: (await tx.execute(sql`select distinct action from public.audit_log order by 1`)) as unknown as { action: string }[],
    entities: (await tx.execute(sql`select distinct entity from public.audit_log order by 1`)) as unknown as { entity: string }[],
  }));
  const more = rows.length > PAGE_SIZE;
  const qs = (extra: Record<string, string | number | undefined>) =>
    new URLSearchParams(Object.entries({ ...f, ...extra }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();
  const select = "h-11 rounded-[0.875rem] border border-input bg-background px-2";

  return (
    <div className="grid gap-4">
      <h1 className="text-title2 font-bold">Audit log</h1>
      <form className="flex flex-wrap items-end gap-2" method="get">
        <label className="grid text-footnote">
          From
          <input type="date" name="from" defaultValue={f.from} className={select} />
        </label>
        <label className="grid text-footnote">
          To
          <input type="date" name="to" defaultValue={f.to} className={select} />
        </label>
        <label className="grid text-footnote">
          Person
          <select name="user" defaultValue={f.user ?? ""} className={select}>
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid text-footnote">
          Action
          <select name="action" defaultValue={f.action ?? ""} className={select}>
            <option value="">All</option>
            {actions.map((a) => (
              <option key={a.action}>{a.action}</option>
            ))}
          </select>
        </label>
        <label className="grid text-footnote">
          Record
          <select name="entity" defaultValue={f.entity ?? ""} className={select}>
            <option value="">All</option>
            {entities.map((e) => (
              <option key={e.entity}>{e.entity}</option>
            ))}
          </select>
        </label>
        <Button type="submit" className="h-11">
          Show
        </Button>
        {can(me.actor, "audit_log", "export") ? (
          <Button asChild variant="outline" className="h-11">
            <a href={`/setup/audit/export?${qs({ page: undefined })}`} download="audit-log.csv">
              Export CSV
            </a>
          </Button>
        ) : null}
      </form>

      <ul className="divide-y rounded-lg border" aria-label="Audit entries">
        {rows.slice(0, PAGE_SIZE).map((r) => {
          const changes = diff(r.before, r.after);
          return (
            <li key={r.id} className="grid gap-1 p-3">
              <div className="flex flex-wrap gap-x-3 text-callout">
                <span className="tabular-nums">{formatDateTime(r.at)}</span>
                <span className="font-bold">{r.actor ?? "System"}</span>
                <span>{r.action.replace(/_/g, " ")}</span>
                <span>{r.entity.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{shortDevice(r.device)}</span>
              </div>
              {changes.length ? (
                <details>
                  <summary className="cursor-pointer text-footnote">{changes.length} change{changes.length > 1 ? "s" : ""}</summary>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-footnote">
                    {changes.map((c) => (
                      <div key={c.field} className="contents">
                        <dt className="font-bold">{c.field}</dt>
                        <dd className="break-all">
                          {c.from ? <s className="text-muted-foreground">{c.from}</s> : null} {c.to}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
            </li>
          );
        })}
        {rows.length === 0 ? <li className="p-3">Nothing found</li> : null}
      </ul>
      <div className="flex gap-3">
        {f.page > 1 ? (
          <Button asChild variant="outline">
            <Link href={`?${qs({ page: f.page - 1 })}`}>Newer</Link>
          </Button>
        ) : null}
        {more ? (
          <Button asChild variant="outline">
            <Link href={`?${qs({ page: f.page + 1 })}`}>Older</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
