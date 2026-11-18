import { redirect } from "next/navigation";
import { sharedDevice } from "@/lib/auth/device";
import { sharedDeviceUsers } from "../switch-actions";
import { SwitchUser } from "./switch-user";

export const dynamic = "force-dynamic";

export default async function SwitchPage() {
  const shared = await sharedDevice();
  if (!shared) redirect("/sign-in");
  const people = await sharedDeviceUsers(shared.companyId);
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-3xl content-start gap-6 p-4">
      <h1 className="text-3xl font-bold">Who&apos;s using the tablet?</h1>
      <SwitchUser people={people} />
    </main>
  );
}
