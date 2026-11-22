"use client";
import { useMachineFeedback } from "@/components/auth/machine-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError } from "@/components/field";
import { PasswordField } from "./password-field";
import { CodeEntry } from "./code-entry";
import { resendCodeAction, setNewPasswordAction } from "@/app/(auth)/actions";
import { contactSchema } from "@/lib/auth/schemas";

export function ResetForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"ask" | "code" | "password">("ask");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useMachineFeedback(pending, error);
  const contact = { method: "email" as const, email: email.trim().toLowerCase() };

  if (step === "code") return <CodeEntry contact={contact} purpose="recovery" onVerified={() => setStep("password")} />;

  if (step === "password")
    return (
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await setNewPasswordAction({ password });
            if (r.ok) router.replace("/");
            else setError(r.error);
          });
        }}
      >
        <PasswordField id="new-password" label="New password" autoComplete="new-password" meter onSuggest={setPassword} value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError message={error} />
        <SubmitButton pending={pending} disabled={false}>
          Save password
        </SubmitButton>
      </form>
    );

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const c = contactSchema.safeParse(contact);
        if (!c.success) return setError("Enter a valid email");
        start(async () => {
          const r = await resendCodeAction({ contact: c.data, purpose: "recovery" });
          if (r.ok) setStep("code");
          else setError(r.error);
        });
      }}
    >
      <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <FormError message={error} />
      <SubmitButton pending={pending} disabled={false}>
        Send code
      </SubmitButton>
    </form>
  );
}
