"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
import { saveCompanyAction } from "./actions";

type V = {
  name: string;
  nzbn: string;
  workshopManagerName: string;
  workshopManagerPhone: string;
  financeManagerName: string;
  financeManagerPhone: string;
  labourRate: string;
  approvalLimit: string;
};

export function CompanyForm({ initial, onSaved, submitLabel = "Save" }: { initial: V; onSaved?: () => void; submitLabel?: string }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof V) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await saveCompanyAction(v);
          if (!r.ok) return setError(r.error);
          setMsg("Saved");
          onSaved?.();
        });
      }}
    >
      <Field id="company-name" label="Company name" required value={v.name} onChange={set("name")} />
      <Field id="nzbn" label="NZBN" required inputMode="numeric" maxLength={13} placeholder="13 digits" value={v.nzbn} onChange={set("nzbn")} />
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-lg font-bold">Key contacts</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="workshop-manager" label="Workshop manager" required autoComplete="off" value={v.workshopManagerName} onChange={set("workshopManagerName")} />
          <Field id="workshop-manager-phone" label="Workshop manager's phone" required type="tel" inputMode="tel" value={v.workshopManagerPhone} onChange={set("workshopManagerPhone")} />
          <Field id="finance-manager" label="Finance manager" required autoComplete="off" value={v.financeManagerName} onChange={set("financeManagerName")} />
          <Field id="finance-manager-phone" label="Finance manager's phone" required type="tel" inputMode="tel" value={v.financeManagerPhone} onChange={set("financeManagerPhone")} />
        </div>
      </fieldset>
      <Field id="labour-rate" label="Internal labour rate ($/hr ex GST)" inputMode="decimal" value={v.labourRate} onChange={set("labourRate")} />
      <Field id="approval-limit" label="Director approval limit ($ ex GST)" inputMode="decimal" value={v.approvalLimit} onChange={set("approvalLimit")} />
      <FormError message={error} />
      {msg ? <p role="status">{msg}</p> : null}
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
