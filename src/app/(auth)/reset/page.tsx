import Link from "next/link";
import { Screen } from "@/components/field";
import { ResetForm } from "@/components/auth/reset-form";

export default function ResetPage() {
  return (
    <Screen title="Reset password" subtitle="We'll email you a code">
      <ResetForm />
      <Link href="/sign-in" className="press inline-flex min-h-12 items-center justify-center text-base font-semibold">
        Back to sign in
      </Link>
    </Screen>
  );
}
