import { requireActive } from "@/lib/auth/session";
import { sharedDevice, userPasskeys } from "@/lib/auth/device";
import { can } from "@/lib/permissions/check";
import { SharedTablet } from "./shared-tablet";
import { formatDate } from "@/lib/dates";
import { SecurityForms } from "./security-forms";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const me = await requireActive();
  const keys = await userPasskeys(me.id);
  const canShare = me.userType === "director" || can(me.actor, "work_orders", "assign");
  const shared = canShare ? await sharedDevice() : null;
  return (
    <div className="grid max-w-sm gap-6">
      <h1 className="text-2xl font-bold">Unlock</h1>
      <SecurityForms />
      {keys.length ? (
        <ul className="grid gap-2" aria-label="Passkeys">
          {keys.map((k) => (
            <li key={k.id} className="rounded-xl border p-3 text-base">
              {k.label?.split(" ")[0] ?? "Device"} · {formatDate(k.createdAt)}
            </li>
          ))}
        </ul>
      ) : null}
      {canShare ? <SharedTablet isShared={!!shared} /> : null}
    </div>
  );
}
