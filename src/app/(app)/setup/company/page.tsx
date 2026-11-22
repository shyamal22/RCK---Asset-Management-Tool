import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/dates";
import { photoUrls } from "@/lib/assets/queries";
import { CompanyForm } from "./company-form";
import { LogoUpload } from "./logo-upload";
import { SupportAccess, type ActiveSupport } from "./support-access";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const me = await requirePermission("settings", "edit");
  const [c] = (await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
    tx.execute(sql`select name, nzbn, logo_path, workshop_manager_name, workshop_manager_phone, finance_manager_name, finance_manager_phone,
      labour_rate_cents, approval_limit_cents from public.companies where id = app.current_company_id()`),
  )) as unknown as {
    name: string;
    nzbn: string | null;
    logo_path: string | null;
    workshop_manager_name: string | null;
    workshop_manager_phone: string | null;
    finance_manager_name: string | null;
    finance_manager_phone: string | null;
    labour_rate_cents: number | null;
    approval_limit_cents: number;
  }[];
  const logo = c.logo_path ? ((await photoUrls([c.logo_path]))[c.logo_path] ?? null) : null;
  const support = ((await asUser({ id: me.id, sessionId: me.sessionId }, (tx) =>
    tx.execute(sql`select * from public.company_support_access()`),
  )) as unknown as Omit<ActiveSupport, "endsLabel">[]).map((r) => ({ ...r, endsLabel: formatDateTime(r.ends_at) }));
  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-bold">Company</h1>
      <SupportAccess rows={support} />
      <LogoUpload url={logo} />
      <CompanyForm
        initial={{
          name: c.name,
          nzbn: c.nzbn ?? "",
          workshopManagerName: c.workshop_manager_name ?? "",
          workshopManagerPhone: c.workshop_manager_phone ?? "",
          financeManagerName: c.finance_manager_name ?? "",
          financeManagerPhone: c.finance_manager_phone ?? "",
          labourRate: c.labour_rate_cents === null ? "" : (c.labour_rate_cents / 100).toFixed(2),
          approvalLimit: (c.approval_limit_cents / 100).toFixed(2),
        }}
      />
    </div>
  );
}
