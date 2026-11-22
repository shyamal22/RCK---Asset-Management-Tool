"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Field, FormError } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { USER_TYPES, USER_TYPE_LABELS, type UserType } from "@/lib/permissions/types";
import { grantActingAction, revokeActingAction, setActiveAction, updateAccessAction } from "../actions";

type Props = {
  user: { id: string; userType: UserType; crewId: string | null; lead: boolean; active: boolean };
  crews: { id: string; name: string }[];
  acting: { id: string; userType: UserType; reason: string; ends: string }[];
  isSelf: boolean;
  defaultEnd: string;
};

const typeOptions = USER_TYPES.map((t) => ({ value: t, label: USER_TYPE_LABELS[t] }));

export function UserAdmin({ user, crews, acting, isSelf, defaultEnd }: Props) {
  const [userType, setUserType] = useState(user.userType);
  const [crewId, setCrewId] = useState(user.crewId ?? "");
  const [lead, setLead] = useState(user.lead);
  const [actType, setActType] = useState<UserType>("workshop");
  const [endsOn, setEndsOn] = useState(defaultEnd);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>, ok: string) =>
    start(async () => {
      setError(null);
      setMsg(null);
      const r = await fn();
      if (r && !r.ok) setError(r.error ?? "Couldn't save");
      else setMsg(ok);
    });

  if (isSelf) return <p className="text-lg">You can&apos;t change your own access.</p>;

  return (
    <div className="grid gap-8">
      <section className="grid gap-3" aria-label="Access">
        <Segmented label="User type" value={userType} onChange={setUserType} options={typeOptions} />
        <div className="grid gap-1.5">
          <Label htmlFor="crew">Crew</Label>
          <select id="crew" className="h-12 rounded-[0.875rem] border border-input bg-background px-3 text-lg" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
            <option value="">No crew</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {userType === "workshop" ? (
          <label className="flex h-12 items-center gap-3 text-lg">
            <input type="checkbox" className="size-6" checked={lead} onChange={(e) => setLead(e.target.checked)} />
            Workshop lead
          </label>
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

      <section className="grid gap-3" aria-label="Acting access">
        <h2 className="text-xl font-bold">Acting access</h2>
        {acting.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <span>
              {USER_TYPE_LABELS[a.userType]} until {a.ends} · {a.reason}
            </span>
            <Button variant="outline" disabled={pending} onClick={() => run(() => revokeActingAction({ id: a.id, userId: user.id }), "Ended")}>
              End now
            </Button>
          </div>
        ))}
        <Segmented label="Acting as" value={actType} onChange={setActType} options={typeOptions} />
        <Field id="ends-on" label="Until" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        <Field id="reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button
          size="lg"
          variant="outline"
          className="h-12"
          disabled={pending || !user.active || reason.trim().length < 2}
          onClick={() => run(() => grantActingAction({ userId: user.id, userType: actType, endsOn, reason }), "Acting access given")}
        >
          Give acting access
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
      {msg ? <p role="status" className="text-base">{msg}</p> : null}
      <FormError message={error} />
    </div>
  );
}
