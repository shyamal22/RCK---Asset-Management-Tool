import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { actAs } from "@/lib/auth/guard";
import { ForbiddenError } from "@/lib/permissions/check";
import { toCsv } from "@/lib/audit/diff";
import { formatDateTime } from "@/lib/dates";
import { filterSchema, queryAudit } from "../query";

export async function GET(request: NextRequest) {
  const f = filterSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const rows = await actAs("audit_log", "export", async (tx) => {
    const r = await queryAudit(tx, f, 50_000, 0);
    await tx.execute(sql`select public.log_export('audit_log', ${JSON.stringify({ rows: r.length, filters: f })}::jsonb)`);
    return r;
  }).catch((e) => {
    if (e instanceof ForbiddenError) return null;
    throw e;
  });
  if (!rows) return new NextResponse("Not found", { status: 404 });
  const csv = toCsv([
    ["When (NZ)", "Who", "Action", "Record", "Record id", "Device", "Before", "After"],
    ...rows.map((r) => [
      formatDateTime(r.at),
      r.actor,
      r.action,
      r.entity,
      r.entity_id,
      r.device,
      r.before ? JSON.stringify(r.before) : null,
      r.after ? JSON.stringify(r.after) : null,
    ]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="audit-log.csv"`,
    },
  });
}
