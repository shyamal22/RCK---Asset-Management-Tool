import QRCode from "qrcode";
import { sql } from "drizzle-orm";
import { asUser } from "@db/client";
import { requirePermission } from "@/lib/auth/guard";
import { publicEnv } from "@/lib/env";
import { SignupLinkControls } from "./controls";

export const dynamic = "force-dynamic";

export default async function SignupLinkPage() {
  const me = await requirePermission("settings", "edit");
  const rows = await asUser({ id: me.id }, (tx) =>
    tx.execute(sql`select public.my_signup_code() as code,
      (select signup_enabled from public.companies where id = app.current_company_id()) as enabled`),
  );
  const { code, enabled } = (rows as unknown as { code: string; enabled: boolean }[])[0];
  const url = `${publicEnv().NEXT_PUBLIC_APP_URL}/join/${code}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 240 });
  return (
    <div className="grid max-w-md gap-6">
      <h1 className="text-2xl font-bold">Sign-up link</h1>
      <div className={enabled ? "" : "opacity-30"} aria-label="Sign-up QR code" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="break-all rounded-md border p-3 font-mono text-sm" data-testid="signup-url">
        {url}
      </p>
      <SignupLinkControls enabled={enabled} />
    </div>
  );
}
