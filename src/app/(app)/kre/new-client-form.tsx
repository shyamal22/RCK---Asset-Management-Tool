"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { createClientAction } from "./actions";

const EMPTY = { name: "", directorName: "", directorEmail: "" };

export function NewClientForm() {
  const [v, setV] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await createClientAction(v);
          if (!r.ok) return setError(r.error);
          router.push(`/kre/${r.id}?invited=${r.emailed ? "email" : "link"}`);
        });
      }}
    >
      <Field id="client-name" label="Company name" value={v.name} onChange={set("name")} />
      <Field id="director-name" label="Director's name" autoComplete="off" value={v.directorName} onChange={set("directorName")} />
      <Field id="director-email" label="Director's email" type="email" autoComplete="off" value={v.directorEmail} onChange={set("directorEmail")} />
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        Create and invite Director
      </Button>
    </form>
  );
}
