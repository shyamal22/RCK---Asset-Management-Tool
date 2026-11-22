import { redirect } from "next/navigation";
import { sharedDevice } from "@/lib/auth/device";
import { sharedDeviceUsers } from "../switch-actions";
import { Screen } from "@/components/field";
import { SwitchUser } from "./switch-user";

export const dynamic = "force-dynamic";

export default async function SwitchPage() {
  const shared = await sharedDevice();
  if (!shared) redirect("/sign-in");
  const people = await sharedDeviceUsers(shared.companyId);
  return (
    <Screen title="Who's using the tablet?" wide>
      <SwitchUser people={people} />
    </Screen>
  );
}
