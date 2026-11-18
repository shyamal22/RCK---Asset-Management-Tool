import { redirect } from "next/navigation";
import { Screen } from "@/components/field";
import { getProfile } from "@/lib/auth/session";
import { currentDevice, markSessionVerified } from "@/lib/auth/device";
import { DeviceCode } from "./device-code";

export const dynamic = "force-dynamic";

export default async function VerifyDevicePage() {
  const p = await getProfile();
  if (!p) redirect("/sign-in");
  if (!p.secondStepNeeded) redirect("/");
  const device = await currentDevice(p.id);
  if (device?.verifiedAt && p.sessionId) {
    await markSessionVerified({ sessionId: p.sessionId, userId: p.id, companyId: p.companyId, deviceId: device.id });
    redirect("/");
  }
  return (
    <Screen title="New device">
      <DeviceCode sendTo={p.email ?? p.mobile ?? ""} />
    </Screen>
  );
}
