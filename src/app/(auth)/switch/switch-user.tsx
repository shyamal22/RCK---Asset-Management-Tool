"use client";
import { safeAction } from "@/lib/safe-action";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { switchUserAction } from "../switch-actions";

export function SwitchUser({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [who, setWho] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!who)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {people.map((p) => (
          <Button key={p.id} variant="outline" className="h-24 text-title3" onClick={() => setWho(p)}>
            {p.name}
          </Button>
        ))}
        {people.length === 0 ? <p className="text-body">No one has set a PIN yet</p> : null}
      </div>
    );

  return (
    <form
      className="grid max-w-sm gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await safeAction(switchUserAction({ userId: who.id, pin }));
          if (r.ok) return router.replace("/");
          setPin("");
          setError(r.error);
        });
      }}
    >
      <h2 className="text-title2 font-bold">{who.name}</h2>
      <Field
        id="pin"
        label="PIN"
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        className="text-center text-title1 tracking-[0.5em]"
      />
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-14 text-body" disabled={pending || pin.length < 4}>
        Go
      </Button>
      <Button type="button" variant="ghost" className="h-12" onClick={() => (setWho(null), setPin(""), setError(null))}>
        Back
      </Button>
    </form>
  );
}
