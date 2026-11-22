import { Screen } from "@/components/field";
import { ResetForm } from "@/components/auth/reset-form";

export default function ResetPage() {
  return (
    <Screen title="Reset password" subtitle="We'll email you a code">
      <ResetForm />
    </Screen>
  );
}
