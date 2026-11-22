"use client";
import { safeAction } from "@/lib/safe-action";
import { SwitchRow } from "@/components/switch-row";
import { StatusNote } from "@/components/feedback/status-note";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { USER_TYPES, USER_TYPE_LABELS, type UserType } from "@/lib/permissions/types";
import { setActiveAction, updateAccessAction } from "../actions";

type Props = {
  user: { id: string; userType: UserType; crewId: string | null; lead: boolean; active: boolean };
  crews: { id: string; name: string }[];
  isSelf: boolean;
};

const typeOptions = USER_TYPES.map((t) => ({ value: t, label: USER_TYPE_LABELS[t] }));

export function UserAdmin({ user, crews, isSelf }: Props) {
  const [userType, setUserType] = useState(user.userType);
  const [crewId, setCrewId] = useState(user.crewId ?? "");
  const [lead, setLead] = useState(user.lead);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>, ok: string) =>
    start(async () => {
      setError(null);
      setMsg(null);
      const r = await safeAction(fn());
      if (r && !r.ok) setError(r.error ?? "Couldn't save");
      else setMsg(ok);
    });

  if (isSelf) return <p className="text-body">You can&apos;t change your own access.</p>;

  return (
    <div className="grid gap-8">
      <section className="grid gap-3" aria-label="Access">
        <Segmented label="User type" value={userType} onChange={setUserType} options={typeOptions} />
        <div className="grid gap-1.5">
          <Label htmlFor="crew">Crew</Label>
          <select id="crew" className="h-12 rounded-[0.875rem] border border-input bg-background px-3 text-body" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
            <option value="">No crew</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {userType === "workshop" ? (
          <SwitchRow label="Workshop lead" checked={lead} onCheckedChange={setLead} />
        ) : null}
        <Button
          size="lg"
          className="h-12"
          disabled={pending || !user.active}
          onClick={() => run(() => updateAccessAction({ userId: user.id, userType, crewId: crewId || null, workshopLead: lead }), "Saved")}
        >
          Save
        </Button>
      </section>

      <section className="grid gap-3 border-t pt-6">
        {user.active ? (
          <Button
            size="lg"
            variant="destructive"
            className="h-12"
            disabled={pending}
            onClick={() => {
              if (confirm("They'll be signed out everywhere and can't sign in. Their records stay.")) {
                run(() => setActiveAction({ userId: user.id, active: false }), "Deactivated");
              }
            }}
          >
            Deactivate
          </Button>
        ) : (
          <Button size="lg" className="h-12" disabled={pending} onClick={() => run(() => setActiveAction({ userId: user.id, active: true }), "Reactivated")}>
            Reactivate
          </Button>
        )}
      </section>
      <StatusNote message={msg} />
      <FormError message={error} />
    </div>
  );
}
