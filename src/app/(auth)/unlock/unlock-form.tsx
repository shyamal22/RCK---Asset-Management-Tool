"use client";
import { useMachineFeedback } from "@/components/auth/machine-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { passkeyUnlockAction, passkeyUnlockOptionsAction, unlockWithPinAction } from "../unlock-actions";

export function UnlockForm({ hasPin, hasPasskey }: { hasPin: boolean; hasPasskey: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useMachineFeedback(pending, error);

  const done = (r: { ok: boolean; error?: string }) => {
    if (r.ok) return router.replace("/");
    if (r.error === "signed-out") return router.replace("/sign-in");
    setPin("");
    setError(r.error ?? "Try again");
  };

  return (
    <div className="grid gap-4">
      {hasPasskey ? (
        <Button
          size="lg"
          className="h-16 text-body"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                const opts = await passkeyUnlockOptionsAction();
                done(await passkeyUnlockAction(await startAuthentication({ optionsJSON: opts })));
              } catch {
                setError("Face ID / fingerprint didn't work. Use your PIN.");
              }
            })
          }
        >
          Unlock with Face ID / fingerprint
        </Button>
      ) : null}
      {hasPin ? (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => done(await unlockWithPinAction(pin)));
          }}
        >
          <div className="auth-card">
          <Field
            id="pin"
            label="PIN"
            placeholder="PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="text-center text-title1 tracking-[0.5em]"
            autoFocus={!hasPasskey}
          />
          </div>
          <SubmitButton pending={pending} disabled={pin.length < 4}>
            Unlock
          </SubmitButton>
        </form>
      ) : null}
      <FormError message={error} />
    </div>
  );
}
