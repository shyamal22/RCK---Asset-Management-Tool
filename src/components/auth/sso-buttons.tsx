"use client";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";

const microsoft = process.env.NEXT_PUBLIC_SSO_MICROSOFT === "true";
const google = process.env.NEXT_PUBLIC_SSO_GOOGLE === "true";

/** One-tap Microsoft / Google. Hidden until the provider is configured (env flag). */
export function SsoButtons({ signupCode }: { signupCode?: string }) {
  if (!microsoft && !google) return null;
  const go = async (provider: "azure" | "google") => {
    if (signupCode) document.cookie = `signup_code=${signupCode}; path=/; max-age=900; samesite=lax`;
    await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === "azure" ? "email openid profile" : undefined,
      },
    });
  };
  return (
    <div className="grid gap-3">
      {microsoft ? (
        <Button type="button" variant="outline" size="lg" className="h-14 text-lg" onClick={() => go("azure")}>
          Continue with Microsoft
        </Button>
      ) : null}
      {google ? (
        <Button type="button" variant="outline" size="lg" className="h-14 text-lg" onClick={() => go("google")}>
          Continue with Google
        </Button>
      ) : null}
    </div>
  );
}
