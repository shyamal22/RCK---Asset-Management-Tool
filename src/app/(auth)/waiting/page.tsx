import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen } from "@/components/field";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/session";
import { signOutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function WaitingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");
  if (profile.status === "active") redirect("/");
  const rejected = profile.status === "rejected";
  return (
    <Screen title={rejected ? "Not approved" : "Waiting for approval"}>
      {rejected ? (
        <p className="text-lg">Talk to your manager.</p>
      ) : (
        <Button asChild size="lg" className="h-14 w-full text-lg">
          <Link href="/">Check again</Link>
        </Button>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="lg" className="h-14 w-full text-lg">
          Sign out
        </Button>
      </form>
    </Screen>
  );
}
