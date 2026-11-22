"use client";
import { useMachineFeedback } from "@/components/auth/machine-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/field";
import { PasswordField } from "./password-field";
import { ContactInput, toContact, type ContactValue } from "./contact-input";
import { CodeEntry } from "./code-entry";
import { resendCodeAction, signInAction } from "@/app/(auth)/actions";
import { contactSchema } from "@/lib/auth/schemas";

export function SignInForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactValue>({ method: "email", email: "", mobile: "" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(notice ?? null);
  const [verify, setVerify] = useState<ReturnType<typeof toContact> | null>(null);
  const [pending, start] = useTransition();
  const setMachine = useMachineFeedback(pending, error);

  if (verify) return <CodeEntry contact={verify} purpose="signup" onVerified={() => router.replace("/")} />;

  return (
    <form
      className="auth-rise grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const c = contactSchema.safeParse(toContact(contact));
        if (!c.success) return setError(c.error.issues[0]?.message ?? "Check your details");
        start(async () => {
          const r = await signInAction({ contact: c.data, password });
          if (r.ok) {
            setMachine("ok");
            return router.replace("/");
          }
          if (r.error === "unverified") {
            await resendCodeAction({ contact: c.data, purpose: "signup" });
            return setVerify(c.data);
          }
          setError(r.error);
        });
      }}
    >
      <div className="auth-card">
        <ContactInput value={contact} onChange={setContact} />
        <PasswordField id="password" label="Password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <FormError message={error} />
      <Link href="/reset" className="py-1 text-center text-base">
        Forgot password?
      </Link>
      <SubmitButton pending={pending} disabled={false}>
        {pending ? "Signing in…" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
