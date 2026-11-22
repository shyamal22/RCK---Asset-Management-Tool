import { Screen } from "@/components/field";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SsoButtons } from "@/components/auth/sso-buttons";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const notice =
    state === "inactive"
      ? "Your account isn't active. Talk to your manager."
      : state === "no-account"
        ? "No account yet. Use your company's sign-up link first."
        : state === "suspended"
          ? "Your company's account is on hold. Talk to your manager."
          : undefined;
  return (
    <Screen title="Sign in" subtitle="Welcome back">
      <SsoButtons />
      <SignInForm notice={notice} />
    </Screen>
  );
}
