"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { passkeyRegisterAction, passkeyRegisterOptionsAction, setPinAction } from "@/app/(auth)/unlock-actions";

export function SecurityForms() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const r = await setPinAction(pin);
            if (r.ok) {
              setPin("");
              setMsg("PIN saved");
            } else setError(r.error);
          });
        }}
      >
        <Field
          id="new-pin"
          label="New PIN"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em]"
        />
        <Button type="submit" size="lg" className="h-12" disabled={pending || pin.length < 4}>
          Save PIN
        </Button>
      </form>
      <Button
        size="lg"
        variant="outline"
        className="h-12"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const opts = await passkeyRegisterOptionsAction();
              const r = await passkeyRegisterAction(await startRegistration({ optionsJSON: opts }));
              if (r.ok) {
                setMsg("Face ID / fingerprint added");
                router.refresh();
              } else setError(r.error);
            } catch {
              setError("This device didn't allow Face ID / fingerprint");
            }
          })
        }
      >
        Add Face ID / fingerprint
      </Button>
      {msg ? <p className="text-base">{msg}</p> : null}
      <FormError message={error} />
    </div>
  );
}
