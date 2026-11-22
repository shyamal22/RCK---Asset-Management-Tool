import Link from "next/link";
import { Screen } from "@/components/field";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SsoButtons } from "@/components/auth/sso-buttons";
import { supabaseServer } from "@/lib/supabase/server";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("signup_company", { p_code: code });
  const company = (data as { name: string }[] | null)?.[0];
  if (!company) {
    return (
      <Screen title="Link not active">
        <p className="text-lg">Ask your manager for a new sign-up link.</p>
        <Link href="/sign-in" className="press inline-flex min-h-12 items-center justify-center text-base font-semibold">
          Back to sign in
        </Link>
      </Screen>
    );
  }
  return (
    <Screen title={`Join ${company.name}`} subtitle="Create your account">
      <SsoButtons signupCode={code} />
      <SignUpForm code={code} />
    </Screen>
  );
}
