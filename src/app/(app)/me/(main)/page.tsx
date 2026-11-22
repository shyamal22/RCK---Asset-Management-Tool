import Link from "next/link";
import { requireActive } from "@/lib/auth/session";
import { USER_TYPE_LABELS } from "@/lib/permissions/types";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";

export default async function MePage() {
  const me = await requireActive();
  const acting = me.baseUserType !== me.userType;
  return (
    <div className="grid max-w-sm gap-4">
      <h1 className="text-2xl font-bold">{me.name}</h1>
      <p className="text-lg">
        {USER_TYPE_LABELS[me.userType]}
        {acting ? " (acting)" : ""}
        {me.flags.includes("workshop_lead") ? " · Workshop lead" : ""}
      </p>
      <Button asChild variant="outline" size="lg" className="h-14 text-lg">
        <Link href="/me/security">PIN and Face ID</Link>
      </Button>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="lg" className="h-14 w-full text-lg">
          Sign out
        </Button>
      </form>
    </div>
  );
}
