"use client";
import { safeAction } from "@/lib/safe-action";
import { useMachineFeedback } from "@/components/auth/machine-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { resendCodeAction, verifyCodeAction } from "@/app/(auth)/actions";

type Contact = { method: "email"; email: string } | { method: "mobile"; mobile: string };

export function CodeEntry({
  contact,
  purpose,
  onVerified,
  onBack,
}: {
  contact: Contact;
  purpose: "signup" | "recovery";
  onVerified: () => void;
  /** Typo in the address? Go back and fix it (an installed app has no browser back). */
  onBack?: () => void;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useMachineFeedback(pending, error);
  const sentTo = contact.method === "email" ? contact.email : contact.mobile;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await safeAction(verifyCodeAction({ contact, token, purpose }));
          if (r.ok) onVerified();
          else setError(r.error);
        });
      }}
    >
      <p className="text-lg">Code sent to {sentTo}</p>
      <div className="auth-card">
      <Field
        id="code"
        label="6-digit code"
        placeholder="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
        className="text-center text-2xl tracking-[0.5em]"
        autoFocus
      />
      </div>
      <FormError message={error} />
      {notice ? <p className="text-base">{notice}</p> : null}
      <SubmitButton pending={pending} disabled={token.length !== 6}>
        {pending ? "Checking…" : "Confirm"}
      </SubmitButton>
      <Button
        type="button"
        variant="ghost"
        className="h-12 text-base"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await safeAction(resendCodeAction({ contact, purpose }));
            setNotice(r.ok ? "New code sent" : null);
            if (!r.ok) setError(r.error);
          })
        }
      >
        Send a new code
      </Button>
      {onBack ? (
        <Button type="button" variant="ghost" className="h-12 text-base" disabled={pending} onClick={onBack}>
          {contact.method === "email" ? "Use a different email" : "Use a different number"}
        </Button>
      ) : null}
    </form>
  );
}
