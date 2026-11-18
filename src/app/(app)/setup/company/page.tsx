import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import { CompanyForm } from "./company-form";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const me = await requirePermission("settings", "edit");
  const [c] = (await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
    tx.execute(sql`select name, nzbn, labour_rate_cents, approval_limit_cents from public.companies where id = app.current_company_id()`),
  )) as unknown as { name: string; nzbn: string | null; labour_rate_cents: number | null; approval_limit_cents: number }[];
  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-bold">Company</h1>
      <CompanyForm
        initial={{
          name: c.name,
          nzbn: c.nzbn ?? "",
          labourRate: c.labour_rate_cents === null ? "" : (c.labour_rate_cents / 100).toFixed(2),
          approvalLimit: (c.approval_limit_cents / 100).toFixed(2),
        }}
      />
    </div>
  );
}
