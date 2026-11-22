import { redirect } from "next/navigation";
import { Screen } from "@/components/field";
import { getProfile } from "@/lib/auth/session";
import { currentDevice, isUnlocked, userPasskeys } from "@/lib/auth/device";
import { UnlockForm } from "./unlock-form";
import { Button } from "@/components/ui/button";
import { signOutAction } from "../actions";
import { sql } from "drizzle-orm";
import { adminDb } from "@db/client";

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  const p = await getProfile();
  if (!p) redirect("/sign-in");
  const device = await currentDevice(p.id);
  if (!device || (await isUnlocked(device.id))) redirect("/");
  const [{ has_pin }] = (await adminDb.execute(
    sql`select pin_hash is not null as has_pin from public.users where id = ${p.id}`,
  )) as unknown as { has_pin: boolean }[];
  const hasPasskey = (await userPasskeys(p.id)).length > 0;
  return (
    <Screen title={p.name} subtitle="Welcome back">
      <UnlockForm hasPin={has_pin} hasPasskey={hasPasskey} />
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" className="h-12 w-full text-base">
          Forgot your PIN? Sign in again
        </Button>
      </form>
    </Screen>
  );
}
