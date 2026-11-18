"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { sendDeviceCodeAction, verifyDeviceCodeAction } from "../actions";

export function DeviceCode({ sendTo }: { sendTo: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendDeviceCodeAction();
      if (r.ok) setSent(true);
      else setError(r.error);
    });

  if (!sent)
    return (
      <div className="grid gap-4">
        <p className="text-lg">{`We'll send a code to ${sendTo}`}</p>
        <FormError message={error} />
        <Button size="lg" className="h-14 text-lg" disabled={pending} onClick={send}>
          Send code
        </Button>
      </div>
    );

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await verifyDeviceCodeAction({ token });
          if (r.ok) router.replace("/");
          else setError(r.error);
        });
      }}
    >
      <p className="text-lg">Code sent to {sendTo}</p>
      <Field
        id="code"
        label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
        className="text-center text-2xl tracking-[0.5em]"
        autoFocus
      />
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-14 text-lg" disabled={pending || token.length !== 6}>
        Confirm
      </Button>
      <Button type="button" variant="ghost" className="h-12" disabled={pending} onClick={send}>
        Send a new code
      </Button>
    </form>
  );
}
